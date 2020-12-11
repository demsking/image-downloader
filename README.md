# Node Image Downloader

A Node module for downloading image to disk from a given URL

[![npm](https://img.shields.io/npm/v/image-downloader.svg)](https://www.npmjs.com/package/image-downloader)
[![Build status](https://gitlab.com/demsking/image-downloader/badges/master/pipeline.svg)](https://gitlab.com/demsking/image-downloader/pipelines)
[![Test coverage](https://gitlab.com/demsking/image-downloader/badges/master/coverage.svg)](https://gitlab.com/demsking/image-downloader/pipelines)
[![Buy me a beer](https://img.shields.io/badge/Buy%20me-a%20beer-1f425f.svg)](https://www.buymeacoffee.com/demsking)

## Install

```sh
npm install --save image-downloader
```

## Options

- **url** (*required*) - the image URL to download
- **dest** (*required*) - the image destination. Can be a directory or a
  filename. If a directory is given, ID will automatically extract the image
  filename from `options.url` (see usage bellow)
- **extractFilename** - boolean indicating whether the image filename will be
  automatically extracted from `options.url` or not. Set to `false` to have
  `options.dest` without a file extension for example. (default: `true`)
- **headers** - HTTP headers (default: `{}`)
- **timeout** - milliseconds before a request times out

For advanced options, see [Node.js `http.request()`'s options documentation](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_http_request_url_options_callback)

## Syntax

```ts
declare module download {
  image(options: Options): Promise<{ filename: string }>;
}
```

## Usage

Download to a directory and save with the original filename

```js
const download = require('image-downloader')

const options = {
  url: 'http://someurl.com/image.jpg',
  dest: '/path/to/dest'                // will be saved to /path/to/dest/image.jpg
}

download.image(options)
  .then(({ filename }) => {
    console.log('Saved to', filename)  // saved to /path/to/dest/image.jpg
  })
  .catch((err) => console.error(err))
```

Download to a directory and save with an another filename

```js
const download = require('image-downloader')

options = {
  url: 'http://someurl.com/image2.jpg',
  dest: '/path/to/dest/photo.jpg'      // will be saved to /path/to/dest/photo.jpg
}

download.image(options)
  .then(({ filename }) => {
    console.log('Saved to', filename)  // saved to /path/to/dest/photo.jpg
  })
  .catch((err) => console.error(err))

```

Download with another filename without extension

```js
const download = require('image-downloader')

options = {
  url: 'http://someurl.com/image3.jpg',
  dest: '/path/to/dest/photo',         // will be saved to /path/to/dest/photo
  extractFilename: false
}

download.image(options)
  .then(({ filename }) => {
    console.log('Saved to', filename)  // saved to /path/to/dest/photo
  })
  .catch((err) => console.error(err))
```

## License

Under the MIT license. See [LICENSE](https://gitlab.com/demsking/image-downloader/blob/master/LICENSE) file for more details.
