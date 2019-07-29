'use strict'

const fs = require('fs')
const download = require('..')
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
    assert.throws(() => download({
      url: null,
      dest: '/tmp'
    }))
    done()
  })

  it('should failed with !options.dest === true', (done) => {
    assert.throws(() => download({
      url: 'http://someurl.com/image.jpg',
      dest: null
    }))
    done()
  })
})

describe('download an image', () => {
  it('should save image with the original filename', (done) => {
    download({
      url: 'http://someurl.com/image%20success.jpg',
      dest: '/tmp',
      done: (err, filename, image) => {
        if (err) {
          throw err
        }
        assert.doesNotThrow(() => fs.accessSync(filename), Error)
        assert.equal(filename, '/tmp/image success.jpg')
        done()
      }
    })
  })

  it('should save image with the decoded filename', (done) => {
    download({
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
    download({
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

  it('should save image with options.extractFilename and a defined options.dest without file extension', (done) => {
    download({
      url: 'http://someurl.com/image-success.jpg',
      dest: '/tmp/image-newname',
      extractFilename: false,
      done: (err, filename, image) => {
        if (err) {
          throw err
        }
        assert.doesNotThrow(() => fs.accessSync(filename), Error)
        assert.equal(filename, '/tmp/image-newname')
        done()
      }
    })
  })

  it('should save image without a callback', () => {
    download({
      url: 'http://someurl.com/image-success.jpg',
      dest: '/tmp'
    })
  })

  it('should failed with an error', (done) => {
    download({
      url: 'http://someurl.com/image-error.jpg',
      dest: '/tmp',
      done: (err, filename, image) => {
        assert.equal(err instanceof Error, true)
        done()
      }
    })
  })

  it('should failed with an empty body', (done) => {
    download({
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
    const options = {
      url: 'http://someurl.com/image-success.jpg',
      dest: '/root/an/non/existence/dest'
    }

    download.image(options)
      .then(() => done(new Error('should failed with an I/O error')))
      .catch(() => done())
  })

  it('should throw on failure', (done) => {
    assert.throws(() => download({
      url: 'http://someurl.com/image.jpg',
      dest: '/tmp'
    }))
    done()
  })

  it('should save image using Promise', (done) => {
    download.image({
      url: 'http://someurl.com/image-success.jpg',
      dest: '/tmp'
    }).then(({ filename, image }) => {
      assert.doesNotThrow(() => fs.accessSync(filename), Error)
      done()
    })
  })

  it('should failed using Promise', (done) => {
    download.image({
      url: 'http://someurl.com/image-error.jpg',
      dest: '/tmp'
    }).catch((err) => {
      assert.equal(err instanceof Error, true)
      done()
    })
  })

  it('should save image with a complex url params', () => {
    return download.image({
      url: 'http://someurl.com/success-image-with-complex-params.jpg?_nc_cat=1&_nc_ht=scontent.fdad3-1.fna&oh=88171697ef1cf5baf3f887436259273d&oe=5CAD866C',
      dest: '/tmp'
    }).then(({ filename }) => {
      assert.equal(filename, '/tmp/success-image-with-complex-params.jpg')
    })
  })
})
