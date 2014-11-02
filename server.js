/**
 * Created by joelsaxton on 10/18/14.
 */

// Node modules
var app_root = __dirname,
express = require('express'),
mongodb = require('mongodb'),
bodyParser = require('body-parser'),
jade = require('jade'),
iniparser = require('iniparser'),
stylus = require('stylus'),
nib = require('nib');

// Parse configuration file using Iniparser module
iniparser.parse('./config.ini', function(err,data){
    if (err){ console.log("An error occurred parsing the config.ini file");}
    var host = data.host;
    var db = data.database;
    var configtable = data.configtable;
    var serverport = data.serverport;
    var dbport = data.dbport;
    var dbuser = data.dbuser;
    var dbpassword = data.dbpassword;

    console.log('Config.ini loaded. Host: %s:%d , Database: %s:%d , Config table: %s', host, serverport, db, dbport, configtable);
    startServer(host, db, dbuser, dbpassword, serverport, dbport, configtable);
});

// Connect to database and build all routes
function startServer(host, db, dbuser, dbpassword, serverport, dbport, configtable) {

    // Create Express server with body parser module
    var app = express();
    app.use(bodyParser.json());       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
        extended: true
    }));

    // Use Stylus/Nib CSS compiler module for views
    function compile(str, path) {
        return stylus(str).set('filename', path).use(nib());
    }

    // Use Jade as view engine
    app.set('views', app_root + '/views');
    app.set('view engine', 'jade');
    app.use(stylus.middleware({ src: app_root + '/public', compile: compile}));
    app.use(express.static(app_root + '/public'));

    // Create db connection string
    var connection = 'mongodb://' + dbuser + ':' + dbpassword + '@' + host + ':' + dbport + '/' + db;

    // Connect to Database and start REST API Server
    mongodb.connect(connection, function(err, db) {
        if (err) {
            console.log('There was an error connecting to MongoDB.');
        }
        console.log('Connection made to ' + connection);

        // Initialize connection to config table
        var configCollection = db.collection(configtable);

        /**
         * CONFIGURATION COLLECTION SCHEMA
            label: String,
            method: String,
            route: String,
            table: String,
            query: String,
            params: Object,
            collection: configtable
        */

        // Register Administration Console Routes
        require('./routes/admin')(app, configCollection);

        // Register REST API routes from config table
        require('./routes/rest')(app, configCollection, db);

    });

    // Start server
    app.listen(serverport, function () {
        console.log('Express server on http://localhost:%d in %s mode\nCTRL + C to shutdown', serverport, app.settings.env);
    });
}