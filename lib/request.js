const { createWriteStream } = require('fs');
const { TimeoutError } = require('./TimeoutError.js');
const { http, https } = require('follow-redirects');

module.exports = ({ url, dest, ...options }) => new Promise((resolve, reject) => {
  const request = url.trimLeft().startsWith('https') ? https : http;

  request
    .get(url, options, (res) => {
      if (res.statusCode !== 200) {
        // Consume response data to free up memory
        res.resume();
        reject(new Error(`Request Failed.\nStatus Code: ${res.statusCode}`));

        return;
      }

      res.pipe(createWriteStream(dest))
        .on('error', reject)
        .once('close', () => resolve({ filename: dest }));
    })
    .on('timeout', () => reject(new TimeoutError()))
    .on('error', reject);
});
