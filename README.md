# image-downloader
A Nodejs module for downloading image to disk from a given URL

[![Build Status](https://travis-ci.org/demsking/image-downloader.svg?branch=master)](https://travis-ci.org/demsking/image-downloader)
[![bitHound Overall Score](https://www.bithound.io/github/demsking/image-downloader/badges/score.svg)](https://www.bithound.io/github/demsking/image-downloader)
[![bitHound Dependencies](https://www.bithound.io/github/demsking/image-downloader/badges/dependencies.svg)](https://www.bithound.io/github/demsking/image-downloader/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/demsking/image-downloader/badges/devDependencies.svg)](https://www.bithound.io/github/demsking/image-downloader/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/demsking/image-downloader/badges/code.svg)](https://www.bithound.io/github/demsking/image-downloader)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

# Install
```sh
npm install --save image-downloader
```

# Usage
```js
var image_downloader = require('image-downloader');

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

## License

Under the MIT license. See [LICENSE](https://github.com/demsking/image-downloader/blob/master/LICENSE) file for more details.
