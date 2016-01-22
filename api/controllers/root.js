
//contrib
var express = require('express');
var router = express.Router();
var passport = require('passport');
var passport_localst = require('passport-local').Strategy;
var winston = require('winston');
var jwt = require('express-jwt');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var jwt_helper = require('../jwt_helper');

var db = require('../models');

router.post('/refresh', jwt({secret: config.auth.public_key}), function(req, res, next) {
    db.User.findOne({where: {id: req.user.sub}}).then(function(user) {
        //return res.send(500, new Error("test"));
        if (!user) return next(new Error("can't find user id:"+req.user.sub));
        var claim = jwt_helper.createClaim(user);
        var jwt = jwt_helper.signJwt(claim);
        return res.json({jwt: jwt});
    });
});

router.get('/health', function(req, res) {
    res.json({status: 'ok'});
});

//server side config need to render ui (public)
router.get('/config', function(req, res) {
    var c = {};
    if(config.local) {
        c.local = {};
    }
    if(config.iucas) {
        c.iucas = {};
    }
    if(config.git) {
        c.git = {};
    }
    if(config.x509) {
        c.x509= {};
    }
    if(config.google) {
        c.google= {};
    }
    res.json(c); 
});

//returns things that user might want to know about himself.
//password_hash will be set to true if the password is set, otherwise null
router.get('/me', jwt({secret: config.auth.public_key}), function(req, res) {
    db.User.findOne({
        where: {id: req.user.sub},
        //password_hash is replace by true/false right below
        attributes: ['username', 'email', 'email_confirmed', 'iucas', 'googleid', 'gitid', 'x509dns', 'times', 'password_hash'],
    }).then(function(user) {
        if(!user) return res.status(404).end();
        if(user.password_hash) user.password_hash = true;
        res.json(user);
    });
});

//return list of all users (minus password)
router.get('/users', jwt({secret: config.auth.public_key}), function(req, res) {
    if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.User.findAll({
        //password_hash is replace by true/false right below
        attributes: [
            'id', 'username', 'password_hash', 
            'email', 'email_confirmed', 'iucas', 'googleid', 'gitid', 'x509dns', 
            'times', 'scopes', 'active'],
    }).then(function(users) {
        users.forEach(function(user) {
            if(user.password_hash) user.password_hash = true;
        });
        res.json(users);
    });
});

//return detail from just one user (somewhat redundant from /users ??)
router.get('/user/:id', jwt({secret: config.auth.public_key}), function(req, res) {
    if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.User.findOne({
        where: {id: req.params.id},
        attributes: [
            'id', 'username', 
            'email', 'email_confirmed', 'iucas', 'googleid', 'gitid', 'x509dns', 
            'times', 'scopes', 'active'],
    }).then(function(user) {
        res.json(user);
    });
});
router.put('/user/:id', jwt({secret: config.auth.public_key}), function(req, res, next) {
    if(!~req.user.scopes.sca.indexOf("admin")) return res.send(401);
    db.User.findOne({where: {id: req.body.id}}).then(function(user) {
        if (!user) return next(new Error("can't find user id:"+req.body.id));
        user.update(req.body).then(function(err) {
            res.json({message: "User updated successfully"});
        });
    });
});


module.exports = router;