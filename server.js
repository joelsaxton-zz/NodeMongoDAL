/**
 * Created by joelsaxton on 10/18/14.
 */

var app_root = __dirname,
express = require('express'),
mongoose = require('mongoose'),
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
    mongoose.connect(connection);
    console.log('Connection made to ' + connection);

    // Config collection model
    var configSchema = new mongoose.Schema({
        label: String,
        method: String,
        route: String,
        table: String,
        query: String,
        params: Object
    }, { collection: configtable });

    var configModel = mongoose.model('config', configSchema);

    // Get route data and build routes dynamically from config collection
    configModel.find(function (err, data) {
        if (!err) {
            // Process each route in loop from data pulled from config collection
            for (var route in data) {

                var newData = data[route];
                console.log('Route found: ' + newData['label']);
                var newModel = mongoose.model(newData['label'], configSchema);
                var method = newData['method'];
                var dynamicQuery = newData['query'];

                app[method]('/' + newData['route'], function (req, res) {
                    var dynamicQueryObj = {};

                    // Set Mongo query object dynamically
                    if (Object.keys(newData['params']).length > 0){
                        for (var p in newData['params']){
                            dynamicQueryObj[p] = req.query[p];
                        }
                    }

                    return newModel[dynamicQuery](dynamicQueryObj, function (err, data) {
                        if (!err) {
                            return res.status(200).send(data);
                        } else {
                            console.log(err);
                            return res.send('ERROR');
                        }
                    });
                });
            }
        } else {
            console.log(err);
            process.exit('Unable to get REST API routes from configuration table');
        }
        
    });

    // Read in routes from config collection to display on /admin page
    app.get('/admin', function (req, res) {
        return configModel.find(function (err, data) {
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

    // Start server
    app.listen(serverport, function () {
        console.log('Express server on http://localhost:%d in %s mode\nCTRL + C to shutdown', serverport, app.settings.env);
    });
}