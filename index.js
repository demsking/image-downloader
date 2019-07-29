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

const downloader = (options = {}) => {
  if (!options.url) {
    throw new Error('The options.url is required')
  }

  if (!options.dest) {
    throw new Error('The options.dest is required')
  }

  options = Object.assign({ extractFilename: true }, options)

  const done = options.done

  delete options.done
  options.encoding = null

  request(options, (err, res, body) => {
    if (err) {
      return onError(err, done)
    }

    if (body && (res.statusCode === 200 || res.statusCode === 201)) {
      if (options.extractFilename) {
        if (!path.extname(options.dest)) {
          const url = require('url')
          const pathname = url.parse(options.url).pathname
          const basename = path.basename(pathname)
          const decodedBasename = decodeURIComponent(basename)

          options.dest = path.join(options.dest, decodedBasename)
        }
      }

      fs.writeFile(options.dest, body, 'binary', (err) => {
        if (err) {
          return onError(err, done)
        }

        if (typeof done === 'function') {
          done(false, options.dest, body)
        }
      })
    } else {
      if (!body) {
        return onError(new Error(`Image loading error - empty body. URL: ${options.url}`), done)
      }
      onError(new Error(`Image loading error - ${res.statusCode}. URL: ${options.url}`), done)
    }
  })
}

downloader.image = (options = {}) => new Promise((resolve, reject) => {
  options.done = (err, dest, body) => {
    if (err) {
      return reject(err)
    }
    resolve({ filename: dest, image: body })
  }

  downloader(options)
})

module.exports = downloader
