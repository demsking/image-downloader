# Node Image Downloader

A Node module for downloading image to disk from a given URL

[![npm](https://img.shields.io/npm/v/image-downloader.svg)](https://www.npmjs.com/package/image-downloader)
[![Build status](https://gitlab.com/demsking/image-downloader/badges/main/pipeline.svg)](https://gitlab.com/demsking/image-downloader/pipelines)
[![Test coverage](https://gitlab.com/demsking/image-downloader/badges/main/coverage.svg)](https://gitlab.com/demsking/image-downloader/pipelines)
[![Buy me a beer](https://img.shields.io/badge/Buy%20me-a%20beer-1f425f.svg)](https://www.buymeacoffee.com/demsking)

## Install

```sh
npm install --save image-downloader
```

## Options

- **url** (_required_) - the image URL to download
- **dest** (_required_) - the image destination. Can be a directory or a
  filename. If a directory is given, ID will automatically extract the image
  filename from `options.url` (see usage bellow)
- **extractFilename** - boolean indicating whether the image filename will be
  automatically extracted from `options.url` or not. Set to `false` to have
  `options.dest` without a file extension for example. (default: `true`)
- **headers** - HTTP headers (default: `{}`)
- **timeout** - socket inactivity timeout in milliseconds, not a deadline for
  the whole download (default: `60000`)
- **maxContentLength** - maximum number of bytes accepted for the download; a
  larger response is rejected with an `ERR_RESPONSE_TOO_LARGE` error. Set to
  `0` to disable the limit (default: `104857600`, 100 MiB)
- **maxRedirects** - the maximum number of allowed redirects; if exceeded, an
  error will be emitted. (default: `21`)

For advanced options, see [Node.js `http.request()`'s options documentation](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_http_request_url_options_callback)

## Security

Only `http:` and `https:` URLs are supported. Beyond that:

- **No path traversal** - the file name is decoded before its basename is taken
  and the result is checked to stay inside `options.dest` (CWE-22). A file name
  that would escape it is rejected with an `ERR_INVALID_FILENAME` error.
- **Credentials stay on their origin** - a redirect target is chosen by the
  remote server, not by your code, so only a small set of safe headers
  (`accept`, `accept-encoding`, `accept-language`, `cache-control`, `dnt`,
  `if-*`, `pragma`, `range`, `te`, `user-agent`) is forwarded to a different
  origin. `authorization`, `cookie`, `proxy-authorization` and any custom
  authentication header are dropped (CWE-200, CWE-522).
- **Bounded downloads** - the response body is limited by
  `maxContentLength` and the socket by `timeout`, so a remote server cannot
  fill the local disk or keep the promise pending forever (CWE-770).
- **No symlink write-through** - `options.dest` is opened with `O_NOFOLLOW`
  where the platform provides it, so a symlink placed in the destination
  directory cannot make the download overwrite another file (CWE-59). On
  failure the socket and the file descriptor are released.

Redirect targets are not filtered: up to `maxRedirects` redirects are followed
to whatever host they point at. When `options.url` comes from an untrusted
source, validate it and use `beforeRedirect` to refuse unexpected hosts (this
also covers server-side request forgery against internal services).

## Usage

Download to a directory and save with the original filename

```js
const download = require("image-downloader");

const options = {
  url: "http://someurl.com/image.jpg",
  dest: "/path/to/dest", // will be saved to /path/to/dest/image.jpg
};

download
  .image(options)
  .then(({ filename }) => {
    console.log("Saved to", filename); // saved to /path/to/dest/image.jpg
  })
  .catch((err) => console.error(err));
```

Download to a directory and save with an another filename

```js
const download = require("image-downloader");

options = {
  url: "http://someurl.com/image2.jpg",
  dest: "/path/to/dest/photo.jpg", // will be saved to /path/to/dest/photo.jpg
};

download
  .image(options)
  .then(({ filename }) => {
    console.log("Saved to", filename); // saved to /path/to/dest/photo.jpg
  })
  .catch((err) => console.error(err));
```

Download with another filename without extension

```js
const download = require('image-downloader');

options = {
  url: 'http://someurl.com/image3.jpg',
  dest: '/path/to/dest/photo',         // will be saved to /path/to/dest/photo
  extractFilename: false,
};

download.image(options)
  .then(({ filename }) => {
    console.log('Saved to', filename), // saved to /path/to/dest/photo
  })
  .catch((err) => console.error(err));
```

## Development Setup

1. [Install Devbox](https://www.jetify.com/devbox/docs/installing_devbox/)

2. [Install `direnv` with your OS package manager](https://direnv.net/docs/installation.html#from-system-packages)

3. [Hook it `direnv` into your shell](https://direnv.net/docs/hook.html)

4. **Load environment**

   At the top-level of your project run:

   ```sh
   direnv allow
   ```

   > The next time you will launch your terminal and enter the top-level of your
   > project, `direnv` will check for changes and will automatically load the
   > Devbox environment.

5. **Install dependencies**

   ```sh
   npm install
   ```

## Contribute

Please follow [CONTRIBUTING.md](https://gitlab.com/demsking/image-downloader/blob/main/CONTRIBUTING.md).

## License

Under the MIT license. See [LICENSE](https://gitlab.com/demsking/image-downloader/blob/main/LICENSE) file for more details.
