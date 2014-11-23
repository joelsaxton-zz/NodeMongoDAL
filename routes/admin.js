module.exports.loadAdminRoutes = function(app, configCollection, db, idroutes, configtable){

// Create /admin GET route and read in all routes from config collection to display on /admin page
    app.get('/admin', function (req, res) {
        configCollection.find({}).toArray(function (err, data) {
            if (!err) {
                var tableData = {'userdefined' : {'get' : [], 'put' : [], 'post' : []} , 'auto' : []};
                for (var route in data){
                    switch (data[route].method){
                        case 'get':
                            tableData.userdefined.get.push(data[route]);
                            break;
                        case 'put':
                            tableData.userdefined.put.push(data[route]);
                            break;
                        case 'post':
                            tableData.userdefined.post.push(data[route]);
                            break;
                    }
                }

                // Render automatic _id routes if idroutes = 'true'
                if (idroutes.toLowerCase() == 'true'){
                    // Get list of collections for _id GET/PUT/POST routes
                    db.collectionNames(function(err, names) {
                        for (var name in names) {
                            var coll = names[name].name.split('.')[1];
                            if (coll != 'restauth' && coll != 'system' && coll != configtable) {
                                tableData.auto.push(coll);
                            }
                        }
                        console.log(tableData);
                        res.render('admin',
                            { title: 'REST API Admin Panel',
                                data: tableData,
                                idroutes: true,
                                update: req.query.update,
                                route: req.query.route
                            }
                        );
                    });
                } else {
                    res.render('admin',
                        { title: 'REST API Admin Panel',
                            data: tableData,
                            idroutes: false,
                            update: req.query.update,
                            route: req.query.route
                        }
                    );
                }

            } else {
                console.log('Error rendering the /admin page: ' + err);
                res.render('error',
                    { title: 'REST API Admin - could not load Admin page!',
                        data: err
                    }
                );
            }
        });
    });


    // Create /admin POST route to create new routes in config table when form is submitted from /admin page
    app.post('/admin', function (req, res) {
        var obj = {};
        obj.label = req.body.label;
        obj.method = req.body.method;
        obj.route = req.body.route;
        obj.table = req.body.table;
        obj.query = req.body.query;

        // parse param fields
        req.body.params = req.body.params.replace(/\s+/g, '');
        var params = req.body.params.split(',');
        var final = {};
        for (var param in params){
            var items = params[param].split(':');
            var field = items[0];
            var dataType = items[1];
            final[field] = dataType;
        }
        obj.params = final;

        // Insert new route into config table
        configCollection.insert(obj, function(err, data){
            if (!err){
                var rest = require('./rest');
                rest.loadRestRoutes(app, configCollection, db);
                res.redirect('/admin' + '?update=success&route=' + req.body.label);
            } else {
                console.log('Error POSTing new route to /admin: ' + err);
                res.redirect('/admin' + '?update=failure&route=' + req.body.label);
            }
        })
    });
}



