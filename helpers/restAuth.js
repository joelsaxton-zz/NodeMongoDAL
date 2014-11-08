/**
 * Created by joelsaxton on 11/7/14.
 */
module.exports.checkAuth = function (db, authtable) {

    return function(req, res, next){
        if (req.path != '/access/') {

            if (!req.query.token) {
                return res.status(401).send({success: false, code: 401, error: "Authentication Required"});
            }

            isValidToken(req.query.token, db, authtable, function(response){
                if (response) {
                    next();
                } else {
                    return res.status(401).send({success: false, code: 401, error: "Invalid Token"});
                }
            });
        }
    }

}

module.exports.createAccessTokenRoute = function(app, db, authtable) {

    var collection = db.collection(authtable);

    app.post('/access', function (req, res) {
        if (req.query.client && req.query.secret) {
            var query = {};
            query.client = req.query.client;
            query.secret = req.query.secret;
        } else {
            return res.status(400).send({success: false, code: 400, error: "client and secret are required fields"});
        }

        // Find user/secret combination
        collection.find(query).toArray(function (err, data) {
            if (!err) {
                // success
                if (data.length == 1){
                    var token = createToken(32);
                    collection.update(query, {$set: {token: token}}, function(err, data){
                        if (!err) {
                            return res.status(200).send({success: true, code: 200, token: token});
                        } else {
                            return res.status(500).send({success: false, code: 500, error: "Failed to save token. Please re-try"});
                        }
                    });

                // failure
                } else {
                    return res.status(401).send({success: false, code: 401, error: 'Invalid client and/or secret'});
                }
            } else {
                // 500 Internal Server (Mongodb) Error
                console.log(err);
                return res.status(500).send({success: false, code: 500, error: "Internal Server Error"});
            }
        });
    });
}


function createToken(length) {
    var chars =  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var token = '';
    for (var i = length; i > 0; --i) token += chars[Math.round(Math.random() * (chars.length - 1))];
    return token;
}

function isValidToken(token, db, authtable, callback){

    var collection = db.collection(authtable);
    var query = {token: token};
    // Find if token exists
    collection.find(query).toArray(function (err, data) {
        if (!err) {
            // success
            if (data.length == 1){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            // 500 Internal Server (Mongodb) Error
            console.log(err);
            return res.status(500).send({success: false, code: 500, error: "Internal Server Error"});
        }
    });

}