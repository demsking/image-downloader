'use strict'

const request = require('request')
const path = require('path')
const fs = require('fs')

const onError = (err, options) => {
  if (options.done) {
    return options.done(err)
  }
  throw err
}

module.exports = (options) => {
  if (!options.url) {
    throw new Error('The option url is required')
  }

  if (!options.dest) {
    throw new Error('The option dest is required')
  }

  request({url: options.url, encoding: null}, (err, res, body) => {
    if (err) {
      return onError(err, options)
    }

    if (body && res.statusCode === 200) {
      if (!fs.existsSync(options.dest)) {
        fs.mkdirSync(options.dest)
        console.log("Destination folder didn't existed. Folder created.")
      }

      if (!path.extname(options.dest)) {
        options.dest = path.join(options.dest, path.basename(options.url))
      }

      fs.writeFile(options.dest, body, 'binary', (err) => {
        if (err) {
          return onError(err, options)
        }
        options.done && options.done(false, options.dest, body)
      })
    } else {
      if (!body) {
        return onError(new Error('Image loading error - empty body. URL: ' + options.url), options)
      }
      onError(new Error('Image loading error - ' + res.statusCode + '. URL: ' + options.url), options)
    }
  })
}
