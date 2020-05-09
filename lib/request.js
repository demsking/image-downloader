'use strict';

const fs = require('fs');

module.exports = ({ url, dest, ...options }) => new Promise((resolve, reject) => {
  (url.trim().startsWith('https') ? require('https') : require('http'))
    .get(url, options, (res) => {
      if (res.statusCode !== 200 && res.statusCode !== 201) {
        // Consume response data to free up memory
        res.resume();
        reject(new Error('Request Failed.\n' +
                         `Status Code: ${res.statusCode}`));

        return;
      }

      res.pipe(fs.createWriteStream(dest)).once('close', () => resolve({ filename: dest }));
    })
    .on('error', reject);
});
