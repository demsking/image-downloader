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
```

# License
This library is licensed under the MIT license.
