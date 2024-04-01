import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import zxcvbn from 'zxcvbn-typescript';
import * as nodemailer from 'nodemailer';
import { uuid } from 'uuidv4';
import { Message } from '../schema/message';
import { private_key, public_key, ttl } from '../auth/constants';

import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { User } from 'src/schema/user.schema';
import { UserService } from 'src/users/user.service';
import { Group } from 'src/schema/group.schema';
import { GroupService } from 'src/groups/group.service';

class QueuePublisher {
  private static instance: QueuePublisher;
  private client: ClientProxy;

  private constructor() {
    const clientOptions: ClientOptions = {
      transport: Transport.RMQ,
      options: {
        // urls: ['amqp://guest:guest@localhost:5672/brainlife?heartbeat=30'],
        urls: [
          'amqp://guest:guest@brainlife_rabbitmq:5672/brainlife?heartbeat=30',
        ],
        queue: 'user-messages',
        queueOptions: {
          durable: false,
        },
      },
    };

    this.client = ClientProxyFactory.create(clientOptions);
    this.client.connect().catch(console.error);
  }

  public static getInstance(): QueuePublisher {
    if (!QueuePublisher.instance) {
      QueuePublisher.instance = new QueuePublisher();
    }
    return QueuePublisher.instance;
  }

  public async publishToQueue(key: string, message: string): Promise<void> {
    this.client.emit<any>(key, new Message(message)).subscribe({
      next: () => console.log(key, message),
      error: (err) => console.error(err),
    });
  }
}
export const queuePublisher = QueuePublisher.getInstance();

export const authDefault = {
  ext: {
    x509dns: [],
    openids: [],
  },
  scopes: {
    brainlife: ['user'],
  },
  email_confirmed: false,
};

export function signJWT(payload: object) {
  const options = {
    algorithm: process.env.JWT_ALGORITHM as jwt.Algorithm, // add the assertion here
    // add other options as required
  };
  return jwt.sign(payload, private_key, options);
}

export function decodeJWT(token: string) {
  const options = {
    algorithms: [process.env.JWT_ALGORITHM as jwt.Algorithm], // add the assertion here
    // add other options as required
  };
  return jwt.verify(token, public_key, options);
}

export function hashPassword(password: string): any {
  // check if password is strong enough
  const strength = zxcvbn(password);

  if (strength.score == 0) {
    // return this object {message: strength.feedback.warning+" - "+strength.feedback.suggestions.toString()}
    return {
      message:
        strength.feedback.warning +
        ' - ' +
        strength.feedback.suggestions.toString(),
    };
  }
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt); // hash the password
}

export function checkPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash); // compare the password
}

export function createmailTransport() {
  // create reusable transporter object using the default SMTP transport
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT as string),
    secure: false, // true for 465, false for other ports
    // auth: {
    //     user: process.env.EMAIL_USER, // generated ethereal user
    //     pass: process.env.EMAIL_PASS, // generated ethereal password
    // },
  });
}

export async function sendEmail(
  to: string,
  from: string,
  subject: string,
  text: string,
): Promise<any> {
  // send mail with defined transport object
  return await createmailTransport()
    .sendMail({
      from: from, // sender address
      to: to, // list of receivers
      subject: subject, // Subject line
      text: text, // plain text body
    })
    .then((info: any) => {
      console.log('email sent', info);
      return info;
    })
    .catch((err: Error) => {
      console.log('failed to send email', err);
      return err;
    });
}

export async function sendEmailConfirmation(user: any): Promise<any> {
  if (!user.email_confirmation_token) {
    // TODO maybe this should be moved to user service
    user.email_confirmation_token = uuid();
    await user.save();
  }
  const url = process.env.URL_REFERRER || 'http://localhost:8000';
  const confirmationUrl =
    url + '#!/confirm_email/' + user.sub + '/' + user.email_confirmation_token;
  const text = `
Hello!
If you have created a new account, please visit the following URL to confirm your email address:

${confirmationUrl}
`;

  return await sendEmail(
    user.email,
    process.env.EMAIL_FROM,
    'Account Confirmation',
    text,
  );
}

export async function sendPasswordReset(user: any): Promise<any> {
  const url = process.env.URL_REFERRER || 'http://localhost:8000';
  const forgotPasswordUrl = url + '#!/forgotpass/' + user.password_reset_token;
  const text = `
Hello!
If you have requested to reset your password, please visit the following URL to reset your password:

${forgotPasswordUrl}
`;

  return sendEmail(
    user.email,
    process.env.EMAIL_FROM,
    'Password reset instruction',
    text,
  );
}

//TODO ask for improvment and provide suggestion
export function checkUser(user: any, req: any): any {
  let error = null;
  if (!user.active)
    error = {
      message: 'Account is disabled. Please contact the administrator.',
      code: 'inactive',
    };
  if (process.env.EMAIL_ENABLED === 'true' && user.email_confirmed == false)
    error = {
      message: 'Email is not confirmed yet',
      path: '/confirm_email/' + user.sub,
      code: 'un_confirmed',
    };
  return error;
}
//TODO improved ??
export function intersect_scopes(o1, o2) {
  // const intersect = {};
  // for (const k in o1) {
  //   const v1 = o1[k];
  //   if (o2[k] === undefined) continue; //key doesn't exist in o2..
  //   const v2 = o2[k];
  //   //if(typeof v1 ! = typeof v2) return; //type doesn't match
  //   const vs = [];
  //   v1.forEach(function (v) {
  //     if (~v2.indexOf(v)) vs.push(v);
  //   });
  //   intersect[k] = vs;
  // }
  // return intersect;
  const intersect = {};
  for (const k in o1) {
    const v1 = o1[k];
    if (o2[k] === undefined) continue; //key doesn't exist in o2..
    var v2 = o2[k];
    //if(typeof v1 ! = typeof v2) return; //type doesn't match
    var vs = [];
    v1.forEach(function (v) {
      if (~v2.indexOf(v)) vs.push(v);
    });
    intersect[k] = vs;
  }
  return intersect;
}

export async function createClaim(
  user: any,
  userService: UserService,
  groupService: GroupService,
): Promise<any> {
  const adminGroups = await groupService.findBy({
    active: true,
    admins: user._id,
  });
  const adminGids = adminGroups.map((group) => group.id);
  const memberGroups = await groupService.findBy({
    active: true,
    members: user._id,
  });
  const memberGids = memberGroups.map((group) => group.id);

  const gids = [...adminGids, 0];
  memberGids.forEach((gid) => {
    if (!gids.includes(gid)) gids.push(gid);
  });
  // console.log('User in create claim', user);
  return {
    iss: process.env.ISSUER,
    exp: (Date.now() + ttl) / 1000,
    scopes: user?.scopes,
    sub: user?.sub,
    gids,
    profile: {
      username: user?.username,
      email: user?.email,
      fullname: user?.fullname,
      aup: user?.profile?.private?.aup,
    },
    _id: user?._id
  };
}

export function hasScope(user: any, role: string): boolean {
  if (!user) return false;
  if (!user.scopes) return false;
  if (user.scopes.brainlife && user.scopes.brainlife.includes("admin")) return true;
  if (!user.scopes.auth) return false;
  if (!~user.scopes.auth.indexOf(role)) return false;
  return true;
}


export function sendSuccessMessage(res, messageText) {
  const message = [
    {
      type: 'success',
      message: messageText,
    },
  ];
  res.cookie('messages', JSON.stringify(message), { path: '/' });
}

export function sendErrorMessage(res, messageText) {
  const message = [
    {
      type: 'error',
      message: messageText,
    },
  ];
  res.cookie('messages', JSON.stringify(message), { path: '/' });
}

export function sendSuccessMessageInUrl(messageText) {
  return `?successMessage=${encodeURIComponent(JSON.stringify(messageText))}`;
}

export function sendErrorMessageInURL(messageText) {
  return `?errorMessage=${encodeURIComponent(messageText)}`;
}

export function YOUR_ACCOUNT_ALREADY_ASSOCIATED_ERROR(provider: string): string {
  return (
    'Your account is already associated to another ' +
    provider +
    ' account. Please signoff / login with your ' +
    provider +
    ' account.'
  );
}

export function ANOTHER_ACCOUNT_ALREADY_ASSOCIATED_ERROR(
  provider: string,
): string {
  return (
    'There is another account with the same ' +
    provider +
    ' account registered. Please contact support.'
  );
}

export const LOGGED_IN_W_DIFFERENT_ACCOUNT_ERROR = 'You are already logged in with a different account. Please logout and try again.';

export const LOGGED_IN_W_DIFFERENT_ACCOUNT_ERROR_SAME_PROVIDER = 'You are already logged in with a different account with same provider. Please logout and try again.';

export function ACCOUNT_SUCCESSFULLY_ASSOCIATED(provider: string): string {
  return 'Successfully associated ' + provider + ' account.';
}
export { ttl };
