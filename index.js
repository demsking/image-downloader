var request = require('request');
var path = require('path');
var fs = require('fs');

function on_error(err, options) {
    if (options.done) {
        return options.done(err);
    }
    
    throw err;
}

module.exports = function(options) {
    if (!options.url) {
        throw new Error('The option dest is required');
    }
    
    if (!options.dest) {
        throw new Error('The option dest is required');
    }
    
    request({url: options.url, encoding: null}, function (err, res, body) {
        if (err) { 
            on_error(err, options);
        }

        if (body && res.statusCode === 200) {
            if (!path.extname(options.dest)) {
                options.dest = path.join(options.dest, path.basename(options.url));
            }
            
            fs.writeFile(options.dest, body, 'binary', function(err){
                if (err) {
                    on_error(err, options);
                }
                options.done && options.done(false, options.dest, body)
            });
        } else {
            if (!body) { 
                on_error(new Error('Image loading error - empty body. URL: ' + options.url), options); 
            } else { 
                on_error(new Error('Image loading error - ' + res.statusCode + '. URL: ' + options.url), options); 
            }
        }
    });
};
