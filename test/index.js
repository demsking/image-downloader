/* eslint-disable no-sync */
/* eslint-disable sort-keys */
/* eslint-disable arrow-body-style */
/* eslint-disable max-lines-per-function */
/* eslint-disable require-unicode-regexp */
/* global describe it expect __dirname */

'use strict';

const fs = require('fs');
const path = require('path');
const nock = require('nock');

nock('http://someurl.com')
  .get(/success/)
  .times(100)
  .replyWithFile(200, path.join(__dirname, 'fixtures/android.jpg'), {
    'Content-Type': 'image/jpeg',
  });

nock('https://someurl.com')
  .get(/success/)
  .times(100)
  .replyWithFile(200, path.join(__dirname, 'fixtures/android.jpg'), {
    'Content-Type': 'image/jpeg',
  });

nock('https://someurl.com')
  .get(/timeout/)
  .delayConnection(5000)
  .times(100)
  .replyWithFile(200, path.join(__dirname, 'fixtures/android.jpg'), {
    'Content-Type': 'image/jpeg',
  });

nock('http://someurl.com')
  .get(/error/)
  .times(100)
  .reply(404, 'Not Found');

const download = require('..');
const { TimeoutError } = require('../lib/TimeoutError');

describe('options', () => {
  it('should failed with !options.url === true', (done) => {
    download.image({ url: null, dest: '/tmp' })
      .then(() => done(new Error('Should throw an error')))
      .catch(() => done());
  });

  it('should failed with !options.dest === true', (done) => {
    download.image({ url: 'http://someurl.com/image.jpg', dest: null })
      .then(() => done(new Error('Should throw an error')))
      .catch(() => done());
  });
})

describe('download an image', () => {
  it('should save image with the original filename', () => {
    return download.image({ url: 'http://someurl.com/image%20success.png', dest: '/tmp' }).then(({ filename }) => {
      expect(filename).toEqual('/tmp/image success.png');
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });

  it('should failed with too short timeout', (done) => {
    download.image({ url: 'https://someurl.com/image-timeout.png', timeout: 2000, dest: '/tmp' })
      .then(() => done(new Error('Should throw an error')))
      .catch((err) => {
        expect(err).toBeInstanceOf(TimeoutError);
        done();
      });
  });

  it('should succeed with HTTPS', () => {
    return download.image({ url: 'https://someurl.com/image%20success.png', dest: '/tmp' }).then(({ filename }) => {
      expect(filename).toEqual('/tmp/image success.png');
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });

  it('should save image with the decoded filename', () => {
    return download.image({ url: 'http://someurl.com/image-success.png', dest: '/tmp' }).then(({ filename }) => {
      expect(filename).toEqual('/tmp/image-success.png');
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });

  it('should save image with an another filename', () => {
    return download.image({ url: 'http://someurl.com/image-success.jpg', dest: '/tmp/image-newname.jpg' }).then(({ filename }) => {
      expect(filename).toEqual('/tmp/image-newname.jpg');
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });

  it('should save image with options.extractFilename and a defined options.dest without file extension', () => {
    const options = {
      url: 'http://someurl.com/image-success.jpg',
      dest: '/tmp/image-newname',
      extractFilename: false,
    };

    return download.image(options).then(({ filename }) => {
      expect(filename).toEqual('/tmp/image-newname');
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });

  it('should failed with an error', (done) => {
    download.image({ url: 'http://someurl.com/image-error.jpg', dest: '/tmp' })
      .then(() => done(new Error('Should throw an error')))
      .catch((err) => {
        expect(err).toBeInstanceOf(Error);
        done();
      });
  });

  it('should save image with a complex url params', () => {
    const options = {
      url: 'http://someurl.com/success-image-with-complex-params.jpg?_nc_cat=1&_nc_ht=scontent.fdad3-1.fna&oh=88171697ef1cf5baf3f887436259273d&oe=5CAD866C',
      dest: '/tmp',
    };

    return download.image(options).then(({ filename }) => {
      expect(filename).toBeDefined();
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });
});

describe('Issues', () => {
  it('#27 - dest: directory cannot contain a dot', () => {
    return download.image({ url: 'http://someurl.com/image-success.png', dest: './test/fixtures/someurl.com' }).then(({ filename }) => {
      expect(filename).toMatch(/test\/fixtures\/someurl\.com$/);
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });
});
