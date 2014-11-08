/**
 * Created by joelsaxton on 10/18/14.
 */

// Node modules
var app_root = __dirname,
express = require('express'),
mongodb = require('mongodb'),
objectid = mongodb.ObjectID,
bodyParser = require('body-parser'),
jade = require('jade'),
iniparser = require('iniparser'),
stylus = require('stylus'),
nib = require('nib'),
admin = require('./routes/admin'),
rest = require('./routes/rest');

// Parse configuration file using Iniparser module
iniparser.parse('./config.ini', function(err,data){
    if (err){ console.log("An error occurred parsing the config.ini file");}
    var host = data.host,
    db = data.database,
    configtable = data.configtable,
    serverport = data.serverport,
    dbport = data.dbport,
    dbuser = data.dbuser,
    dbpassword = data.dbpassword,
    idroutes = data.idroutes,
    requireauth = data.requireauth,
    authtable = data.authtable;

    console.log('Config.ini loaded. Host: %s:%d , Database: %s:%d , Config table: %s', host, serverport, db, dbport, configtable);
    startServer(host, db, dbuser, dbpassword, serverport, dbport, configtable, idroutes, requireauth, authtable, objectid);
});

// Connect to database and build all routes
function startServer(host, db, dbuser, dbpassword, serverport, dbport, configtable, idroutes, requireauth, authtable, objectid) {

    // Create Express server with body-parser module
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Use Stylus/Nib CSS compiler module for views
    function compile(str, path) {
        return stylus(str).set('filename', path).use(nib());
    }

    // Use Jade as view engine and compile CSS with Stylus/Nib
    app.set('views', app_root + '/views');
    app.set('view engine', 'jade');
    app.use(stylus.middleware({ src: app_root + '/public', compile: compile}));
    app.use(express.static(app_root + '/public'));

    // Create db connection string
    var connection = 'mongodb://' + dbuser + ':' + dbpassword + '@' + host + ':' + dbport + '/' + db;

    // Connect to Database and start REST API Server
    mongodb.connect(connection, function(err, database) {
        if (err) {
            console.log('There was an error connecting to MongoDB.');
        }
        console.log('Connection made to ' + connection);

        // Initialize connection to config table
        var configCollection = database.collection(configtable);

        // If authentication is required, use auth middleware
        if (requireauth) {
            var restAuth = require('./helpers/restAuth');
            restAuth.createAccessTokenRoute(app, database, authtable);
            app.use(restAuth.checkAuth(database, authtable));
        }

        // Register Administration Console Routes and REST API routes
        admin.loadAdminRoutes(app, configCollection, database);
        rest.loadRestRoutes(app, configCollection, database, configtable, idroutes, requireauth, objectid);
    });

    // Start server
    app.listen(serverport, function () {
        console.log('Express server on http://localhost:%d in %s mode\nCTRL + C to shutdown', serverport, app.settings.env);
    });
}

/*
 CONFIGURATION COLLECTION SCHEMA
 label: String,
 method: String,
 route: String,
 table: String,
 query: String,
 params: Object,
 collection: configtable
*/