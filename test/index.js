'use strict'

const fs = require('fs')
const downloader = require('..')
const assert = require('assert')

require('request').Request = function ({ url, callback }) {
  if (/error/.test(url)) {
    return callback(new Error())
  }

  if (/success/.test(url)) {
    return callback(null, { statusCode: 200 }, 'binary body')
  }

  if (/empty-body/.test(url)) {
    return callback(null, { statusCode: 204 }, null)
  }

  callback(null, { statusCode: 404 }, 'non empty body')
}

/* global describe it */

describe('options', () => {
  it('should failed with !options.url === true', (done) => {
    assert.throws(() => downloader({
      url: null,
      dest: '/tmp'
    }))
    done()
  })

  it('should failed with !options.dest === true', (done) => {
    assert.throws(() => downloader({
      url: 'http://someurl.com/image.jpg',
      dest: null
    }))
    done()
  })
})

describe('download an image', () => {
  it('should save image with the original filename', (done) => {
    downloader({
      url: 'http://someurl.com/image-success.jpg',
      dest: '/tmp',
      done: (err, filename, image) => {
        if (err) {
          throw err
        }
        assert.doesNotThrow(() => fs.accessSync(filename), Error)
        done()
      }
    })
  })

  it('should save image with an another filename', (done) => {
    downloader({
      url: 'http://someurl.com/image-success.jpg',
      dest: '/tmp/image-newname.jpg',
      done: (err, filename, image) => {
        if (err) {
          throw err
        }
        assert.doesNotThrow(() => fs.accessSync(filename), Error)
        done()
      }
    })
  })

  it('should failed with an error', (done) => {
    downloader({
      url: 'http://someurl.com/image-error.jpg',
      dest: '/tmp',
      done: (err, filename, image) => {
        assert.equal(err instanceof Error, true)
        done()
      }
    })
  })

  it('should failed with an empty body', (done) => {
    downloader({
      url: 'http://someurl.com/image-empty-body.jpg',
      dest: '/tmp',
      done: (err, filename, image) => {
        assert.equal(image, null)
        assert.equal(err instanceof Error, true)
        done()
      }
    })
  })

  it('should failed with an I/O error', (done) => {
    downloader({
      url: 'http://someurl.com/image-success.jpg',
      dest: '/root/an/non/existence/dest',
      done: (err, filename, image) => {
        assert.equal(err instanceof Error, true)
        done()
      }
    })
  })

  it('should throw on failure', (done) => {
    assert.throws(() => downloader({
      url: 'http://someurl.com/image.jpg',
      dest: '/tmp'
    }))
    done()
  })
})
