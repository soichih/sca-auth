import { Controller, Next } from '@nestjs/common';
import { Get, UseGuards, Param, Put } from '@nestjs/common';
import { Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OrcidOauthGuard } from '../auth/guards/oauth.guards';
import { UserService } from '../users/user.service';
import { GroupService } from '../groups/group.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  checkUser,
  decodeJWT,
  createClaim,
  signJWT,
  queuePublisher,
} from '../utils/common.utils';
import { settingsCallback, ttl, orcid } from '../auth/constants';
import axios from 'axios';
import passport = require('passport');
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { RabbitMQ } from '../rabbitmq/rabbitmq.service';

interface DefaultData {
  fullname?: string;
  email?: string;
  username?: string;
}

@Controller('orcid')
export class OrcidController {
  private readonly orcidStrategy: any;

  constructor(
    private readonly userService: UserService,
    private readonly groupService: GroupService,
    private queuePublisher: RabbitMQ,
  ) {
    // Here we'll initialize your orcidStrategy
    this.orcidStrategy = new OAuth2Strategy(
      {
        clientID: process.env.ORCID_CLIENT_ID,
        clientSecret: process.env.ORCID_CLIENT_SECRET,
        callbackURL: process.env.ORCID_CALLBACK_URL,
        authorizationURL: process.env.ORCID_AUTHORIZATION_URL,
        tokenURL: process.env.ORCID_TOKEN_URL,
        scope: '/authenticate',
      },
      async (accessToken, refreshToken, profile, _needed, cb) => {
        console.debug(
          'orcid loading userinfo ..',
          accessToken,
          refreshToken,
          profile,
        );
        const user = await this.userService.findOne({
          'ext.orcid': profile.orcid,
        });
        cb(null, user, profile);
      },
    );

    this.orcidStrategy.name = 'orcid';
    passport.use(this.orcidStrategy);

    OAuth2Strategy.prototype.authorizationParams = function (options) {
      return { selected_idp: options.idp };
    };
  }

  @Get('signin')
  signIn(@Req() req, @Res() res, @Next() next: any) {
    console.log('orcid signin');
    (passport.authenticate as any)(this.orcidStrategy.name, {
      idp: req.query.idp,
    })(req, res, next);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    // This route is protected by Orcid authentication
    // NestJS will automatically redirect the user to Orcid for authentication
    (passport.authenticate as any)(
      this.orcidStrategy.name,
      async (err, user, profile) => {
        console.debug('orcid callback', profile);
        if (err) {
          console.error(err);
          return res.redirect(
            '/auth/#!/signin?msg=' + 'Failed to authenticate orcid',
          );
        }
        let userParsedfromCookie = null;
        if (req.cookies['associate_jwt'])
          userParsedfromCookie = decodeJWT(req.cookies['associate_jwt']);
        console.log('userParsedFromCookie', userParsedfromCookie);

        if (userParsedfromCookie) {
          res.clearCookie('associate_jwt');
          if (user) {
            // sub is the unique identifier for the user and found in another account
            const messages = [
              {
                type: 'error',
                message:
                  'There is another account with the same ORCID registered. Please contact support.',
              },
            ];

            res.cookie('messages', JSON.stringify(messages), { path: '/' });
            return res.redirect(settingsCallback);
          } else {
            const userRecord = await this.userService.findOne({
              sub: userParsedfromCookie.sub,
            });

            if (!userRecord) {
              throw new Error(
                "Couldn't find user record with sub:" +
                  userParsedfromCookie.sub,
              );
            }

            userRecord.ext.orcid = profile.orcid;
            await this.userService.updatebySub(userRecord.sub, userRecord);

            const messages = [
              {
                type: 'success',
                message: 'Successfully associated your ORCID account',
              },
            ];

            res.cookie('messages', JSON.stringify(messages), { path: '/' });
            return res.redirect(settingsCallback);
          }
        } else {
          console.info('handling orcid callback');
          if (!user) {
            console.info('new user - registering');
            if (orcid.autoRegister) {
              console.info('auto registering');
              this.registerNewUser(profile, res);
            } else {
              console.info('redirecting to signin');
              res.redirect(
                '/auth/#!/signin?msg=' +
                  'Your ORCID account(' +
                  profile.orcid +
                  ') is not yet registered. Please login using your username/password first, then associate your InCommon account inside the account settings.',
              );
            }
          }
          if (checkUser(user, req)?.message) {
            return new Error(checkUser(user, req).message);
          }

          const claim = await createClaim(
            user,
            this.userService,
            this.groupService,
          );
          user.times.orcid_login = new Date();
          user.reqHeaders = req.headers;
          await this.userService.updatebySub(user.sub, user);
          // publish to rabbitmq
          await this.queuePublisher.publishToQueue(
            'user.login.' + user.sub,
            JSON.stringify({
              type: 'orcid',
              username: user.username,
              exp: claim.exp,
              headers: req.headers,
            }),
          );
          const jwt = signJWT(claim);
          res.redirect('/auth/#!/success/' + jwt);
        }
      },
    )(req, res);
  }

  async registerNewUser(profile: any, res: Response) {
    try {
      const detail = await axios.get(
        'https://pub.orcid.org/v2.1/' + profile.orcid + '/record',
      );

      const ext = {
        orcid: profile.orcid,
      };

      const _default: DefaultData = {};

      if (detail.data.person) {
        if (detail.data.person.name) {
          _default.fullname = `${detail.data.person.name['given-names'].value} ${detail.data.person.name['family-name'].value}`;
        }

        if (detail.data.person.emails) {
          detail.data.person.emails.email.forEach((email) => {
            if (email.primary) _default.email = email.email;
          });
        }
      }

      // guest user id from email
      if (_default.email) {
        _default.username = _default.email.split('@')[0];
      }

      const temp_jwt = signJWT({
        exp: (Date.now() + ttl) / 1000,
        ext,
        _default,
      });

      console.info(`signed temporary jwt token for orcid signup: ${temp_jwt}`);
      console.debug(JSON.stringify(profile, null, 4));

      res.redirect(`/auth/#!/signup/${temp_jwt}`);
    } catch (error) {
      throw new Error(`Failed to get orcid detail: ${error.message}`);
    }
  }

  @Get('associate/:jwt')
  async associate(
    @Param('jwt') jwt: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const userParsedfromCookie = decodeJWT(jwt);
    console.log('userParsedFromCookie', userParsedfromCookie);

    if (!userParsedfromCookie) {
      throw new Error('Failed to parse jwt');
    }

    res.cookie('associate_jwt', jwt, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 5, //5 minutes
    });
    (passport.authenticate as any)(this.orcidStrategy.name)(req, res);
  }

  @Put('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@Req() req, @Res() res) {
    const user = await this.userService.findOnebySub(req.user.sub);
    if (!user) {
      // throw new Error(`Couldn't find user record with sub: ${req.user.sub}`);
      return res.status(401).send(`Couldn't find user record`);
    }

    user.ext.orcid = null;
    await this.userService.updatebySub(user.sub, user);

    return res.json({
      message: 'Successfully disconnected ORCID account.',
      user,
    });
  }
}