'use strict';

const path = require('path');
const request = require('./lib/request');

module.exports.image = (options = {}) => {
  if (!options.url) {
    return Promise.reject(new Error('The options.url is required'));
  }

  if (!options.dest) {
    return Promise.reject(new Error('The options.dest is required'));
  }

  options = Object.assign({ extractFilename: true }, options);

  if (options.extractFilename) {
    if (!path.extname(options.dest)) {
      const url = require('url');
      const pathname = url.parse(options.url).pathname;
      const basename = path.basename(pathname);
      const decodedBasename = decodeURIComponent(basename);

      options.dest = path.join(options.dest, decodedBasename);
    }
  }

  return request(options);
};
