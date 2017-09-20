'use strict'

const request = require('request')
const path = require('path')
const fs = require('fs')
const EventEmitter = require('events').EventEmitter

class PromiseEmitter extends EventEmitter {
  // Define a Promise with a function taking two parameters:
  // a `resolve` function and `reject` function
  constructor (executor) {
    super() // Extend the EventEmitter super class

    // When `resolve` is called with a value, it emits a `resolve` event
    // passing the value downstream. Similarly for `reject`
    var resolve = (value) => { this.emit('resolve', value) }
    var reject = (reason) => { this.emit('reject', reason) }

    if (executor) executor(resolve, reject)
  }

  // Add downstream resolve and reject listeners
  then (resolveHandler, rejectHandler) {
    var promise = new Promise()

    // When a `resolve` event upstream is fired, execute the `resolveHandler`
    // and pass the `resolve` event downstream with the result
    if (resolveHandler) {
      var resolve = (data) => {
        var result = resolveHandler(data)
        promise.emit('resolve', result)
      }

      this.on('resolve', resolve)
    }

    // When a `reject` event upstream is fired, execute the `rejectHandler`
    // and pass the `reject` event downstream with the result
    if (rejectHandler) {
      var reject = (data) => {
        var result = rejectHandler(data)
        promise.emit('reject', result)
      }

      this.on('reject', reject)
    } else {
      // Downstream listeners always listen to `reject` so that an
      // eventual `catch` can intercept them
      this.on('reject', (data) => { promise.emit('reject', data) })
    }

    return promise
  }

  // Handle an error from a rejected Promise upstream
  catch (handler) {
    this.on('reject', handler)
  }
}

const validOptions = ({ url, dest }) => {
  if (!url) {
    throw new Error('The option url is required')
  }

  if (!dest) {
    throw new Error('The option dest is required')
  }
}

const onError = (err, done) => {
  if (done) {
    return done(err)
  }
  throw err
}

const download = (url, dest, done) => (err, res, body) => {
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
}

const downloader = ({ url, dest, progress = false, done }) => {
  validOptions({ url, dest })

  const requestOptions = { url: url, encoding: null }

  if (progress) {
    return require('request-progress')(
      request(requestOptions, download(url, dest, done)))
  }

  return request(requestOptions, download(url, dest, done))
}

downloader.image = ({ url, dest, progress = false }) => {
  validOptions({ url, dest })

  return new Promise((resolve, reject) => {
    downloader({ url, dest, progress,
      done: (err, dest, body) => {
        if (err) {
          return reject(err)
        }
        resolve({ filename: dest, image: body })
      }
    })
  })
}

module.exports = downloader
