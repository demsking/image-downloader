'use strict';

const fs = require('fs');
const { TimeoutError } = require('./TimeoutError');

module.exports = ({ url, dest, ...options }) => new Promise((resolve, reject) => {
  const request = url.trim().startsWith('https') ? require('https') : require('http');

  request
    .get(url, options, (res) => {
      if (res.statusCode !== 200) {
        // Consume response data to free up memory
        res.resume();
        reject(new Error('Request Failed.\n' +
                         `Status Code: ${res.statusCode}`));

        return;
      }

      res.pipe(fs.createWriteStream(dest)).once('close', () => resolve({ filename: dest }));
    })
    .on('timeout', () => reject(new TimeoutError()))
    .on('error', reject);
});
