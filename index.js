var request = require('request');
var path = require('path');
var fs = require('fs');

module.exports = function(urls, dest, done) {
    if (typeof urls == 'string') {
        urls = [urls];
    }
    
    for (var url of urls) {
        (function(url) {
            request({url: url, encoding: null}, function (err, res, body) {
                if (err) { return callback(err); }

                if (body && res.statusCode === 200) {
                    var filename = path.join(dest, path.basename(url));
                    
                    fs.writeFile(filename, body, 'binary', function(err){
                        if (err) {
                            throw err;
                        }
                        done(false, filename, body)
                    });
                } else {
                    if (!body) { 
                        return done(new Error('Image loading error - empty body. URL: ' + url)); 
                    } else { 
                        return done(new Error('Image loading error - ' + res.statusCode + '. URL: ' + url)); 
                    }
                }
            });
        })(url);
    }
};
