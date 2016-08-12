define({ "api": [
  {
    "type": "post",
    "url": "/ldap/auth",
    "title": "Perform ldap authentication",
    "name": "LDAPAuth",
    "description": "<p>Perform ldap authentication using username / password params</p>",
    "group": "Local",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>LDAP Username</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>LDAP password</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jwt",
            "description": "<p>JWT token</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/ldap.js",
    "groupTitle": "Local"
  },
  {
    "type": "post",
    "url": "/local/auth",
    "title": "Perform authentication",
    "name": "LocalAuth",
    "description": "<p>Perform authentication using username(or email) and SCA password get JWT token.</p>",
    "group": "Local",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username or email address</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>SCA local Password</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jwt",
            "description": "<p>JWT token</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/local.js",
    "groupTitle": "Local"
  },
  {
    "type": "post",
    "url": "/signup",
    "title": "Register new user",
    "name": "Signup",
    "description": "<p>Register new user with username and email</p>",
    "group": "Local",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "username",
            "description": "<p>Username</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>Password</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "email",
            "description": "<p>Email</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/signup.js",
    "groupTitle": "Local"
  },
  {
    "type": "put",
    "url": "/profile",
    "title": "Set user profile",
    "description": "<p>Update user's auth profile</p>",
    "name": "PutProfile",
    "group": "Profile",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>A valid JWT token (Bearer:)</p>"
          }
        ]
      }
    },
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "fullname",
            "description": "<p>User's fullname</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jwt",
            "description": "<p>New JWT token</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/root.js",
    "groupTitle": "Profile"
  },
  {
    "type": "get",
    "url": "/health",
    "title": "Get API status",
    "description": "<p>Get current API status</p>",
    "name": "GetHealth",
    "group": "System",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "status",
            "description": "<p>'ok' or 'failed'</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/root.js",
    "groupTitle": "System"
  },
  {
    "type": "post",
    "url": "/refresh",
    "title": "Refresh JWT Token.",
    "description": "<p>JWT Token normally lasts for a few hours. Application should call this API periodically to get it refreshed before it expires.</p>",
    "name": "Refresh",
    "group": "User",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>A valid JWT token (Bearer:)</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "Object",
            "optional": false,
            "field": "jwt",
            "description": "<p>New JWT token</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers/root.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/me",
    "title": "Get user details",
    "name": "SendEmailNotification",
    "description": "<p>Rreturns things that user might want to know about himself. password_hash will be set to true if the password is set, otherwise null</p>",
    "group": "User",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>A valid JWT token &quot;Bearer: xxxxx&quot;</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n{\n    \"username\": \"hayashis\",\n    \"fullname\": \"Soichi Hayashi\",\n    \"email\": \"hayashis@iu.edu\",\n    \"email_confirmed\": true,\n    \"iucas\": \"hayashis\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "api/controllers/root.js",
    "groupTitle": "User"
  },
  {
    "type": "get",
    "url": "/user/groups/:id",
    "title": "Get list of group IDS that user is member of",
    "name": "UserGroups",
    "description": "<p>Only for admin</p>",
    "group": "User",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "authorization",
            "description": "<p>A valid JWT token &quot;Bearer: xxxxx&quot;</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK\n[ 1,2,3 ]",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "api/controllers/root.js",
    "groupTitle": "User"
  }
] });