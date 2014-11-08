module.exports.loadRestRoutes = function(app, configCollection, db, configtable, idroutes, requireauth, objectid) {

    // Load basic (non-custom) _id based routes if idroute params is true
    loadBasicIdRoutes(app, db, configtable, idroutes, requireauth, objectid);

    // Load administrator defined dynamic routes
    loadAdminDefinedRoutes(app, configCollection, db, requireauth);

}


// Create basic _id GET, POST, PUT routes @todo - DELETE routes
function loadBasicIdRoutes(app, db, configtable, idroutes, requireauth, objectid){
    // If option enabled create _id routes
    if (idroutes){
        console.log('Configuration value "idroutes" set to true, default routes will be loaded');
        // Get list of collections for _id GET/PUT routes
        db.collectionNames(function(err, names){
            var collections = [];
            for (var name in names){
                var coll = names[name].name.split('.')[1];
                if (coll != 'system' && coll != configtable){
                    collections.push(coll);
                }
            }
            for (var route in collections){
                // Set vars
                var collection = db.collection(collections[route]);

                // Create Express GET route
                app.get('/' + collections[route] + '/:id', function (req, res) {
                    // Return 400 Bad Request error if no params provided
                    if (typeof req.params.id == 'undefined') {
                        return res.status(400).send({success: false, code: 400, error: "No _id parameter provided"});
                    } else {
                        var query = {};
                        query._id = objectid(req.params.id);
                    }

                    // Create GET _id query
                    collection.find(query).toArray(function (err, data) {
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

                // Create Express POST route
                app.post('/' + collections[route], function (req, res) {
                    var dynamicQueryObj = {};
                    // Set Mongo query object
                    if (Object.keys(req.query).length > 0) {
                        for (var p in req.query) {
                            if (temp = req.query[p]) {
                                if (!isNaN(temp + 0)) {
                                    dynamicQueryObj[p] = parseInt(req.query[p]);
                                } else {
                                    dynamicQueryObj[p] = req.query[p];
                                }
                            }
                        }
                    } else {
                        return res.status(400).send({success: false, code: 400, error: "No POST fields provided"});
                    }

                    // Create POST (insert) query
                    collection.insert(dynamicQueryObj, function (err, data) {
                        if (!err) {
                            // 200 OK
                            return res.status(200).send({success: true, code: 200, results: data});
                        } else {
                            // 500 Internal Server (Mongodb) Error
                            console.log(err);
                            return res.send({success: false, code: 500, error: "Internal Server Error"});
                        }
                    });
                });

                // Create Express PUT route
                app.put('/' + collections[route] + '/:id', function (req, res) {
                    // Return 400 Bad Request error if no params provided
                    if (typeof req.params.id == 'undefined' || Object.keys(req.query).length == 0) {
                        return res.status(400).send({success: false, code: 400, error: "No _id or request parameters provided"});
                    }
                    var dynamicQueryObj = {};
                    // Set Mongo query object
                    if (Object.keys(req.query).length > 0) {
                        for (var p in req.query) {
                            if (temp = req.query[p]) {
                                if (!isNaN(temp + 0)) {
                                    dynamicQueryObj[p] = parseInt(req.query[p]);
                                } else {
                                    dynamicQueryObj[p] = req.query[p];
                                }
                            }
                        }
                    }

                    var query = {};
                    var setFields = {};
                    query._id = objectid(req.params.id);
                    setFields.$set = dynamicQueryObj;
                    console.log(setFields);

                    // Create PUT _id query
                    collection.update(query, setFields, function (err, data) {
                        if (!err) {
                            // 200 OK
                            return res.status(200).send({success: true, code: 200, results: data});
                        } else {
                            // 500 Internal Server (Mongodb) Error
                            console.log(err);
                            return res.send({success: false, code: 500, error: "Internal Server Error"});
                        }
                    });
                });
            }
        });
    } else {
        console.log('Configuration value "idroutes" set to false, default routes will not be loaded');
    }
}


// Load admin-defined REST API routes from config table and create Express routes
function loadAdminDefinedRoutes(app, configCollection, db, requireauth){
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
                    var dynamicRoute = newData['route'];

                    // Create Express route
                    app[method]('/' + dynamicRoute, function (req, res) {
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
