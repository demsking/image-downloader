# Node Image Downloader

A Node.js module for downloading an image to disk from a given URL.

[![npm](https://img.shields.io/npm/v/image-downloader.svg)](https://www.npmjs.com/package/image-downloader)
[![Build status](https://gitlab.com/demsking/image-downloader/badges/main/pipeline.svg)](https://gitlab.com/demsking/image-downloader/pipelines)
[![Test coverage](https://gitlab.com/demsking/image-downloader/badges/main/coverage.svg)](https://gitlab.com/demsking/image-downloader/pipelines)
[![Buy me a beer](https://img.shields.io/badge/Buy%20me-a%20beer-1f425f.svg)](https://www.buymeacoffee.com/demsking)

## Design goals

- **Streaming by default** — the response body is piped straight to the
  destination file; there is no in-memory copy of the image.
- **One runtime dependency** — `follow-redirects`, and nothing else. Adding a
  second one is a decision to be argued for, not a convenience.
- **Bounded resources** — a socket-inactivity `timeout` and a `maxContentLength`
  cap keep a stalled or oversized response from pinning the promise open or
  filling the disk.
- **Safe file names** — the file name is derived from an untrusted URL, so it is
  decoded once, checked for NUL bytes, reduced to a basename, and verified to
  stay inside `options.dest`.
- **Predictable failure** — errors arrive as a rejected promise carrying a
  `code` (see [Error handling](#error-handling)); nothing is written to stdout
  and no callback is required.
- **No surprises for the caller** — `options` is never mutated, and redirect
  handling cannot leak the caller's credentials to a server-chosen origin.
- **Typed** — a hand-written `index.d.ts` ships with the package, so the
  `Options` type and its defaults are visible in an editor.

## How it works

A call to `image(options)` runs through six steps:

1. **Validation** — `options.url` and `options.dest` are required; a missing one
   rejects the promise rather than throwing. (The one synchronous failure is a
   non-object argument, e.g. `image(null)`, which the parameter destructuring
   rejects.)
2. **Destination resolution** — an absolute `options.dest` is used as given. A
   relative one is resolved against `process.cwd()`, the directory the calling
   process was started in, so `dest: 'images'` writes next to the script that
   was run rather than inside the installed module.
3. **Filename derivation** — when `extractFilename` is `true` and `dest` has no
   extension, the file name is taken from the URL pathname: percent-encoding is
   decoded first, a NUL byte is refused, `path.basename` strips the directories,
   and the result must resolve inside `dest`. Otherwise `dest` is the file name,
   exactly as it was given.
4. **Request** — only `http:` and `https:` are accepted, and the protocol is
   checked before any socket or file is opened. `options.headers` is copied, so
   the redirect machinery cannot delete headers from the caller's object.
5. **Streaming to disk** — a non-200 status rejects the download and the body is
   drained. Otherwise the response is written to `dest`, guarded by a write
   flag set that includes `O_NOFOLLOW` where the platform defines it. A declared
   `content-length` is only a fast path out of an oversize download; the running
   byte count is the enforcement point.
6. **Settlement** — the promise resolves with `{ filename }` where `filename` is
   the resolved destination. Any error destroys the write stream and the
   request so the file descriptor and the socket are released, and removes the
   partially written destination: the promise only rejects once no partial file
   is left behind.

## Install

```sh
npm install --save image-downloader
```

## Options

- **url** (_required_) - the image URL to download
- **dest** (_required_) - the image destination. Can be a directory or a
  filename; a relative path is resolved against `process.cwd()`. If a directory
  is given, ID will automatically extract the image filename from
  `options.url` (see usage bellow)
- **extractFilename** - boolean indicating whether the image filename will be
  automatically extracted from `options.url` or not. Set to `false` to have
  `options.dest` without a file extension for example. (default: `true`)
- **headers** - HTTP headers (default: `{}`)
- **timeout** - socket inactivity timeout in milliseconds, not a deadline for
  the whole download. Set to `0` to disable it (default: `60000`)
- **maxContentLength** - maximum number of bytes accepted for the download,
  counted on the wire (the response is never decompressed); a larger response
  is rejected with an `ERR_RESPONSE_TOO_LARGE` error. Set to `0` to disable the
  limit (default: `104857600`, 100 MiB). A numeric string is accepted, so a
  value coming from a config file or the environment is honoured.
- **maxRedirects** - the maximum number of allowed redirects; if exceeded, an
  error will be emitted. (default: `21`)
- **beforeRedirect** - called before each redirect is followed, with the request
  options that will be used for the redirected request. Throw from the hook to
  cancel the download. The module's own cross-origin credential stripping runs
  after the hook returns, so the hook cannot re-enable it.

For advanced options, see [Node.js `http.request()`'s options documentation](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_http_request_url_options_callback)

## Error handling

Failures are reported as a rejected promise. Match on `error.code` where one is
set, and on `error.message` otherwise:

| `code`                                       | Raised when                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ERR_INVALID_FILENAME`                       | The URL path cannot produce a safe file name: invalid percent-encoding, a NUL byte, or a name that resolves outside `options.dest` (CWE-22).                                                                       |
| `ERR_UNSUPPORTED_PROTOCOL`                   | `options.url` is not an `http:` or `https:` URL. Rejected before any socket or file is opened.                                                                                                                     |
| `ERR_RESPONSE_TOO_LARGE`                     | The response exceeds `maxContentLength`, whether it declared so in `content-length` or simply kept sending.                                                                                                        |
| errno codes (`ELOOP`, `EACCES`, `ENOSPC`, …) | Propagated unchanged from the filesystem or the socket.                                                                                                                                                            |
| — (message `TimeoutError`)                   | The socket was idle for `options.timeout` milliseconds. The class lives in `lib/TimeoutError.js` and is not re-exported by the package entry point, so match on the message unless you require that path directly. |
| — (other messages)                           | A missing required option, a non-200 status code, or any network error surfaced by the HTTP client.                                                                                                                |

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
- **No symlink write-through** - the final path component of `options.dest` is
  opened with `O_NOFOLLOW` where the platform provides it, so a symlink at that
  path cannot make the download overwrite another file (CWE-59). A symlinked
  *directory* component is still followed, exactly as a plain `open(2)` would:
  the destination directory is yours to control. On failure the socket and the
  file descriptor are released and a partial destination file is removed.

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

## Contribute

Please follow [CONTRIBUTING.md](https://gitlab.com/demsking/image-downloader/blob/main/CONTRIBUTING.md).

## License

Under the MIT license. See [LICENSE](https://gitlab.com/demsking/image-downloader/blob/main/LICENSE) file for more details.
