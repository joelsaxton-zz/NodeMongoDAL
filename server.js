/**
 * Created by joelsaxton on 10/18/14.
 */

var app_root = __dirname,
express = require('express'),
mongodb = require('mongodb'),
bodyParser = require('body-parser'),
jade = require('jade'),
iniparser = require('iniparser'),
stylus = require('stylus'),
nib = require('nib');

// Parse configuration file
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

function startServer(host, db, dbuser, dbpassword, serverport, dbport, configtable) {
    // Create server
    var app = express();
    function compile(str, path) {
        return stylus(str).set('filename', path).use(nib());
    }
    app.set('views', app_root + '/views');
    app.set('view engine', 'jade');
    app.use(stylus.middleware({ src: app_root + '/public', compile: compile}));
    app.use(express.static(app_root + '/public'));

    // View settings
    app.set('views', app_root + '/views');
    app.set('view engine', 'jade');

    // Database settings
    var connection = 'mongodb://' + dbuser + ':' + dbpassword + '@' + host + ':' + dbport + '/' + db;
    mongodb.connect(connection, function(err, db) {
        if (err) {
            console.log('There was an error connecting to MongoDB.');
        }
        console.log('Connection made to ' + connection);
        var configCollection = db.collection(configtable);

//          Config collection model
//            label: String,
//            method: String,
//            route: String,
//            table: String,
//            query: String,
//            params: Object,
//            collection: configtable

        // Create all REST API routes from config table
        configCollection.find({}).toArray(function (err, data) {
            if (!err) {
                // Process each route in loop from data pulled from config collection
                for (var route in data) {

                    (function() {
                        var newData = data[route];
                        console.log('Route found: ' + newData['label']);
                        var method = newData['method'];
                        var dynamicQuery = newData['query'];
                        var dynamicCollection = db.collection(newData['table']);

                        // Create Express route
                        app[method]('/' + newData['route'], function (req, res) {
                            var dynamicQueryObj = {};
                            var projection = {'_id' : 0};
                            // Set Mongo query object
                            if (Object.keys(newData['params']).length > 0) {
                                for (var p in newData['params']) {
                                    if (req.query[p]){
                                        if(newData['params'][p] == 'Int'){
                                            dynamicQueryObj[p] = parseInt(req.query[p]);
                                        } else {
                                            dynamicQueryObj[p] = req.query[p];
                                        }
                                    }
                                }
                            }

                            // Return 400 Bad Request error if no params provided
                            if (Object.keys(dynamicQueryObj).length == 0) {
                                return res.status(400).send({success: false, code: 400, error: "No request parameters provided"});
                            }

                            // Create query
                            dynamicCollection[dynamicQuery](dynamicQueryObj, projection).toArray(function (err, data) {
                                if (!err) {
                                    // 200 OK
                                    return res.status(200).send({success: true, code: 200, count: data.length, results: data});
                                } else {
                                    // 500 Internal Server (Mongodb) Error
                                    console.log(err);
                                    return res.send({success: false, code: 500, error: err});
                                }
                            });
                        });
                    })();
                }

            } else {
                console.log(err);
                process.exit('Unable to get REST API routes from configuration table');
            }
        });

        // Create /admin static route and read in all routes from config collection to display on /admin page
        app.get('/admin', function (req, res) {
            return configCollection.find({}).toArray(function (err, data) {
                if (!err) {
                    res.render('admin',
                        { title: 'REST API Admin Panel',
                            data: data
                        }
                    );
                } else {
                    console.log('Error rendering the /admin page: ' + err);
                    res.render('error',
                        { title: 'REST API Admin - Error!',
                            data: err
                        }
                    );
                }
            });
        });
    });

    // Start server
    app.listen(serverport, function () {
        console.log('Express server on http://localhost:%d in %s mode\nCTRL + C to shutdown', serverport, app.settings.env);
    });
}