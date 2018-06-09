# Node Image Downloader
A Node module for downloading image to disk from a given URL

[![npm](https://img.shields.io/npm/v/image-downloader.svg)](https://www.npmjs.com/package/image-downloader) [![Build status](https://gitlab.com/demsking/image-downloader/badges/master/build.svg)](https://gitlab.com/demsking/image-downloader/commits/master) [![Test coverage](https://gitlab.com/demsking/image-downloader/badges/master/coverage.svg)](https://gitlab.com/demsking/image-downloader/pipelines)

## Install
```sh
npm install --save image-downloader
```

## Options
- **url** (*required*) - the image URL to download
- **dest** (*required*) - the image destination. Can be a directory or a filename (see usage bellow)
- **headers** - HTTP headers (default: {})
- **followRedirect** - follow HTTP 3xx responses as redirects (default: true)
- **followAllRedirects** - follow non-GET HTTP 3xx responses as redirects (default: false)
- **maxRedirects** - the maximum number of redirects to follow (default: 10)
- **timeout** - integer containing the number of milliseconds to wait for a server to send response headers (and start the response body) before aborting the request

## Usage with Promise
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
  })
  .catch((err) => {
    console.error(err)
  })

// Download to a directory and save with an another filename
options = {
  url: 'http://someurl.com/image2.jpg',
  dest: '/path/to/dest/photo.jpg'        // Save to /path/to/dest/photo.jpg
}

download.image(options)
  .then(({ filename, image }) => {
    console.log('File saved to', filename)
  })
  .catch((err) => {
    console.error(err)
  })
```

## Usage with async/await
```js
const options = {
  url: 'http://someurl.com/image.jpg',
  dest: '/path/to/dest'                  
}

async function downloadIMG() {
  try {
    const { filename, image } = await download.image(options)
    console.log(filename) // => /path/to/dest/image.jpg 
  } catch (e) {
    console.error(e)
  }
}

downloadIMG()
```

## Previous API (deprecated)
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

Under the MIT license. See [LICENSE](https://gitlab.com/demsking/image-downloader/blob/master/LICENSE) file for more details.
