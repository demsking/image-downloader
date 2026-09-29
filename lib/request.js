const { constants, createWriteStream } = require('fs');
const { TimeoutError } = require('./TimeoutError.js');
const { http, https } = require('follow-redirects');

/**
 * Socket inactivity timeout applied when `options.timeout` is not a finite,
 * non-negative number. Without a timeout a stalled server keeps the socket and
 * the pending promise alive forever (CWE-400).
 */
const DEFAULT_TIMEOUT = 60 * 1000;

/**
 * Maximum number of bytes written to `dest` when `options.maxContentLength` is
 * not a non-negative number. A remote server must not be able to fill the local
 * disk (CWE-770). Set `maxContentLength: 0` (or `Infinity`) to disable it.
 */
const DEFAULT_MAX_CONTENT_LENGTH = 100 * 1024 * 1024;

/**
 * Headers that hold no credentials, and are therefore the only ones forwarded
 * to a different origin when a redirect is followed. The redirect target is
 * chosen by the remote server, never by the caller, so `authorization`,
 * `cookie`, `proxy-authorization` and any custom authentication header
 * (`x-api-key`, `x-auth-token`, …) must not follow it outside the caller's
 * origin (CWE-200, CWE-522).
 */
const CROSS_ORIGIN_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'dnt',
  'if-match',
  'if-modified-since',
  'if-none-match',
  'if-range',
  'if-unmodified-since',
  'pragma',
  'range',
  'te',
  'user-agent',
]);

/**
 * Refuse to open an existing symlink: whoever can drop one inside the
 * destination directory could otherwise have the download overwrite any file
 * the process can write (CWE-59). `O_NOFOLLOW` is not defined on every
 * platform, in which case the default `w` behaviour is kept.
 */
/* eslint-disable-next-line no-bitwise */
const WRITE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | (constants.O_NOFOLLOW || 0);

/**
 * The origin of an absolute URL, or `null` when it cannot be determined.
 */
const originOf = (value) => {
  try {
    return new URL(value).origin;
  } catch (error) {
    return null;
  }
};

const isTooLarge = (length, maxContentLength) => maxContentLength > 0 && length > maxContentLength;

const responseTooLarge = (maxContentLength) => {
  const error = new Error(`Response exceeds the maxContentLength of ${maxContentLength} bytes`);

  error.code = 'ERR_RESPONSE_TOO_LARGE';

  return error;
};

const unsupportedProtocol = (protocol) => {
  const error = new Error(`Unsupported protocol: ${protocol}`);

  error.code = 'ERR_UNSUPPORTED_PROTOCOL';

  return error;
};

/**
 * Removes every caller header that is not safe to send to another origin.
 */
const dropCredentials = (options, previousUrl) => {
  const from = originOf(previousUrl);
  const to = originOf(`${options.protocol}//${options.host}${options.path || ''}`);

  // Same origin, so the caller headers still describe the request. An origin
  // that cannot be determined is treated as a different one (fail closed).
  if (from !== null && from === to) {
    return;
  }

  const headers = {};

  Object.keys(options.headers || {}).forEach((name) => {
    if (CROSS_ORIGIN_HEADERS.has(name.toLowerCase())) {
      headers[name] = options.headers[name];
    }
  });

  options.headers = headers;

  // `auth` is expanded into a Basic `authorization` header by the HTTP client.
  delete options.auth;
};

module.exports = ({ url, dest, ...options }) => new Promise((resolve, reject) => {
  let target;

  try {
    target = new URL(url);
  } catch (error) {
    reject(error);

    return;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    reject(unsupportedProtocol(target.protocol));

    return;
  }

  const {
    beforeRedirect,
    maxContentLength: maxContentLengthOption,
    timeout: timeoutOption,
    ...requestOptions
  } = options;

  const timeout = Number.isFinite(timeoutOption) && timeoutOption >= 0
    ? timeoutOption
    : DEFAULT_TIMEOUT;

  const maxContentLength = typeof maxContentLengthOption === 'number' && maxContentLengthOption >= 0
    ? maxContentLengthOption
    : DEFAULT_MAX_CONTENT_LENGTH;

  let request = null;
  let writeStream = null;
  let received = 0;
  let settled = false;

  // The redirect machinery deletes headers from the object it is given; work on
  // a copy so the caller's `options.headers` is left untouched.
  requestOptions.headers = { ...requestOptions.headers };

  // Every failure path releases the socket and the file descriptor, and a
  // download settles exactly once (CWE-772).
  const settle = (error, result) => {
    if (settled) {
      return;
    }

    settled = true;

    if (error) {
      if (writeStream) {
        writeStream.destroy();
      }

      // Destroying the request closes the socket and stops the response.
      if (request) {
        request.destroy();
      }

      reject(error);
    } else {
      resolve(result);
    }
  };

  const onResponse = (res) => {
    // An aborted or reset response must not become an unhandled error event.
    res.on('error', settle);

    if (res.statusCode !== 200) {
      // Consume response data to free up memory
      res.resume();
      settle(new Error(`Request Failed.\nStatus Code: ${res.statusCode}`));

      return;
    }

    // `content-length` is optional, so it is a fast path out of an oversize
    // download rather than the enforcement point.
    const declaredLength = Number(res.headers['content-length']);

    if (Number.isFinite(declaredLength) && isTooLarge(declaredLength, maxContentLength)) {
      res.resume();
      settle(responseTooLarge(maxContentLength));

      return;
    }

    writeStream = createWriteStream(dest, { flags: WRITE_FLAGS });
    writeStream.on('error', settle);

    res.on('data', (chunk) => {
      received += chunk.length;

      if (isTooLarge(received, maxContentLength)) {
        settle(responseTooLarge(maxContentLength));
      }
    });

    res.pipe(writeStream).once('close', () => settle(null, { filename: dest }));
  };

  request = (target.protocol === 'https:' ? https : http).get(url, {
    ...requestOptions,
    timeout,
    beforeRedirect: (redirectOptions, redirectResponse, requestDetails) => {
      if (typeof beforeRedirect === 'function') {
        beforeRedirect(redirectOptions, redirectResponse, requestDetails);
      }

      // Last word: no caller credential follows a server-chosen redirect.
      dropCredentials(redirectOptions, requestDetails && requestDetails.url);
    },
  }, onResponse);

  request.on('timeout', () => settle(new TimeoutError()));
  request.on('error', settle);
});
