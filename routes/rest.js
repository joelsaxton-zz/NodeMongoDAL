module.exports.loadRestRoutes = function(app, configCollection, db) {

// Load REST API routes from config table and create Express routes
    configCollection.find({}).toArray(function (err, data) {
        if (!err) {
            // Process each route with data pulled from config collection
            for (var route in data) {
                (function () {
                    var newData = data[route];
                    console.log('Route found: ' + newData['label']);
                    var method = newData['method'];
                    var dynamicQuery = newData['query'];
                    var dynamicCollection = db.collection(newData['table']);

                    // Create Express route
                    app[method]('/' + newData['route'], function (req, res) {
                        var dynamicQueryObj = {};
                        var queryOption = {}; // Empty for a GET or POST, must be used in a PUT to $SET updated fields
                        // Set Mongo query object
                        if (Object.keys(newData['params']).length > 0) {
                            for (var p in newData['params']) {
                                if (req.query[p]) {
                                    if (newData['params'][p] == 'Int') {
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
                        dynamicCollection[dynamicQuery](dynamicQueryObj, queryOption).toArray(function (err, data) {
                            if (!err) {
                                // 200 OK
                                return res.status(200).send({success: true, code: 200, count: data.length, results: data});
                            } else {
                                // 500 Internal Server (Mongodb) Error
                                console.log(err);
                                return res.send({success: false, code: 500, error: "Internal Server Error"});
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
}