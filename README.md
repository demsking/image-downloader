# image-downloader
A Nodejs module for downloading image to disk from a given URL

# Install
```sh
npm install --save image-downloader
```

# Usage
```js
var image_downloader = require('image-downloader');

image_downloader(['www.someurl.com/image.jpg'], '/path/to/dest', function(err, filename, image) {
    if (err) {
        throw err;
    }
    console.log('File saved to', filename);
});

// Download to a directory and save with the original filename
var options = {
    url: 'http://someurl.com/image.jpg',
    dest: '/path/to/dest',                  // Save to /path/to/dest/image.jpg
    done: function(err, filename, image) {
        if (err) {
            throw err;
        }
        console.log('File saved to', filename);
    },
};
image_downloader(options);

// Download to a directory and save with an another filename
options = {
    url: 'http://someurl.com/image2.jpg',
    dest: '/path/to/dest/photo.jpg',        // Save to /path/to/dest/photo.jpg
    done: function(err, filename, image) {
        if (err) {
            throw err;
        }
        console.log('File saved to', filename);
    },
};
image_downloader(options);
```

Note: This throws an error when `options.done` not specified. 

# License
This library is licensed under the MIT license.
