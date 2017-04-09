'use strict'

const request = require('request')
const path = require('path')
const fs = require('fs')

const onError = (err, done) => {
  if (done) {
    return done(err)
  }
  throw err
}

const downloader = ({ url, dest, done }) => {
  if (!url) {
    throw new Error('The option url is required')
  }

  if (!dest) {
    throw new Error('The option dest is required')
  }

  request({ url: url, encoding: null }, (err, res, body) => {
    if (err) {
      return onError(err, done)
    }

    if (body && res.statusCode === 200) {
      if (!path.extname(dest)) {
        dest = path.join(dest, path.basename(url))
      }

      fs.writeFile(dest, body, 'binary', (err) => {
        if (err) {
          return onError(err, done)
        }
        done && done(false, dest, body)
      })
    } else {
      if (!body) {
        return onError(new Error('Image loading error - empty body. URL: ' + url), done)
      }
      onError(new Error('Image loading error - ' + res.statusCode + '. URL: ' + url), done)
    }
  })
}

downloader.image = ({ url, dest }) => new Promise((resolve, reject) => {
  downloader({
    url,
    dest,
    done: (err, dest, body) => {
      if (err) {
        return reject(err)
      }
      resolve({ filename: dest, image: body })
    }
  })
})

module.exports = downloader
