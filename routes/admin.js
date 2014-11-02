module.exports = function(app, configCollection){

// Create /admin GET route and read in all routes from config collection to display on /admin page
    app.get('/admin', function (req, res) {
        configCollection.find({}).toArray(function (err, data) {
            if (!err) {
                var tableData = {'get' : [], 'put' : [], 'post' : []};
                for (var route in data){
                    switch (data[route].method){
                        case 'get':
                            tableData.get.push(data[route]);
                            break;
                        case 'put':
                            tableData.put.push(data[route]);
                            break;
                        case 'post':
                            tableData.post.push(data[route]);
                            break;
                    }
                }
                res.render('admin',
                    { title: 'REST API Admin Panel',
                        data: tableData,
                        update: req.query.update,
                        route: req.query.route
                    }
                );
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
        configCollection.insert(obj, function(err, data){
            if (!err){
                res.redirect('/admin' + '?update=success&route=' + req.body.label);
            } else {
                console.log('Error posting new route to /admin: ' + err);
                res.redirect('/admin' + '?update=failure&route=' + req.body.label);
            }
        })
    });
}
