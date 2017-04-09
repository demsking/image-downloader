# image-downloader
A Nodejs module for downloading image to disk from a given URL

[![Standard - JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

[![Build Status](https://travis-ci.org/demsking/image-downloader.svg?branch=master)](https://travis-ci.org/demsking/image-downloader)
[![bitHound Overall Score](https://www.bithound.io/github/demsking/image-downloader/badges/score.svg)](https://www.bithound.io/github/demsking/image-downloader)
[![bitHound Dependencies](https://www.bithound.io/github/demsking/image-downloader/badges/dependencies.svg)](https://www.bithound.io/github/demsking/image-downloader/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/demsking/image-downloader/badges/code.svg)](https://www.bithound.io/github/demsking/image-downloader)

# Install
```sh
npm install --save image-downloader
```

# Usage with Promise
```js
const download = require('image-downloader')

// Download to a directory and save with the original filename
const options = {
  url: 'http://someurl.com/image.jpg',
  dest: '/path/to/dest'                  // Save to /path/to/dest/image.jpg
}

download.image(options)
  .then(({ filename, image }) => {
    console.log('File saved to', filename)
  }).catch((err) => {
    throw err
  })

// Download to a directory and save with an another filename
options = {
  url: 'http://someurl.com/image2.jpg',
  dest: '/path/to/dest/photo.jpg'        // Save to /path/to/dest/photo.jpg
}

download.image(options)
  .then(({ filename, image }) => {
    console.log('File saved to', filename)
  }).catch((err) => {
    throw err
  })
```

# Usage with async/await
```js
const options = {
  url: 'http://someurl.com/image.jpg',
  dest: '/path/to/dest'                  
}

try {
  const { filename, image } = await download.image(options)
  console.log(filename) // => /path/to/dest/image.jpg
} catch (e) {
  throw e
}
```

# Previous API (deprecated)
Previously `image-downloader` used a callback model. This still working, but its deprecated.

```js
const downloader = require('image-downloader')

// Download to a directory and save with the original filename
const options = {
  url: 'http://someurl.com/image.jpg',
  dest: '/path/to/dest',                  // Save to /path/to/dest/image.jpg
  done: function(err, filename, image) {
    if (err) {
      throw err
    }
    console.log('File saved to', filename)
  }
}
downloader(options)

// Download to a directory and save with an another filename
options = {
  url: 'http://someurl.com/image2.jpg',
  dest: '/path/to/dest/photo.jpg',        // Save to /path/to/dest/photo.jpg
  done: function(err, filename, image) {
    if (err) {
      throw err
    }
    console.log('File saved to', filename)
  }
}
downloader(options)
```

## License

Under the MIT license. See [LICENSE](https://github.com/demsking/image-downloader/blob/master/LICENSE) file for more details.
