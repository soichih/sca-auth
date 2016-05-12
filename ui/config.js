'use strict';

//this is checked in to git as default
//nothing sensitive should go here (since it will be published via web server anyway)

angular.module('app.config', [])
.constant('appconf', {

    title: 'Authentication Service',

    admin_email: 'hayashis@iu.edu',
    logo_400_url: 'images/soichidev.jpg',

    //URL for auth service API
    api: '../api/auth',
    
    //URL for x509 validation API
    x509api: 'https://localhost:9443',

    //shared servive api and ui urls (for menus and stuff)
    shared_api: '../api/shared',
    shared_url: '../shared',

    //default location to redirect after successful login
    default_redirect_url: '../profile', 

    jwt_id: 'jwt',
    iucas_url: 'https://cas.iu.edu/cas/login',
});

