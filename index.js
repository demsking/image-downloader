const path = require('path');
const request = require('./lib/request');

const invalidFilename = (reason) => {
  const error = new Error(`Invalid filename extracted from options.url: ${reason}`);

  error.code = 'ERR_INVALID_FILENAME';

  return error;
};

/**
 * Derives a single, safe file name from an untrusted URL pathname (CWE-22).
 *
 * The pathname is decoded *before* its basename is taken. Doing it the other
 * way around leaves %2f (and %5c) as ordinary characters inside the "file
 * name", where they turn back into path separators once decoded and escape
 * the destination directory.
 */
const filenameFromPathname = (pathname) => {
  let decoded;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw invalidFilename('the URL path is not correctly percent-encoded');
  }

  // A NUL byte can truncate a path in some syscalls; never let one through.
  if (decoded.includes('\0')) {
    throw invalidFilename('the URL path contains a NUL byte');
  }

  return path.basename(decoded);
};

/**
 * Tells whether `file` resolves to an entry strictly inside `directory`.
 */
const isInside = (file, directory) => {
  const relative = path.relative(directory, file);

  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
};

module.exports.image = ({ extractFilename = true, ...options } = {}) => {
  if (!options.url) {
    return Promise.reject(new Error('The options.url is required'));
  }

  if (!options.dest) {
    return Promise.reject(new Error('The options.dest is required'));
  }

  if (!path.isAbsolute(options.dest)) {
    options.dest = path.resolve(__dirname, options.dest);
  }

  if (extractFilename && !path.extname(options.dest)) {
    const directory = options.dest;

    let resolved;

    try {
      resolved = path.join(directory, filenameFromPathname(new URL(options.url).pathname));
    } catch (error) {
      return Promise.reject(error);
    }

    // Normalise, then refuse anything that does not land inside the destination.
    if (!isInside(resolved, directory)) {
      return Promise.reject(invalidFilename('the URL path does not resolve to a file inside options.dest'));
    }

    options.dest = resolved;
  }

  return request(options);
};
