/* eslint-disable no-sync */
/* eslint-disable sort-keys */
/* eslint-disable arrow-body-style */
/* eslint-disable max-lines-per-function */
/* eslint-disable require-unicode-regexp */
/* global describe it expect beforeEach afterEach */

'use strict';

const fs = require('fs');
const os = require('os');
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

nock('http://cdn.shopify.com')
  .get('/s/files/1/0516/7244/9178/products/SteelCutOats1.jpg')
  .reply(301, '', { location: 'http://someurl.com/image-success.png' });

nock('http://someurl.com')
  .get(/%[0-9A-Fa-f]{2}/)
  .times(200)
  .reply(200, 'attacker-bytes', { 'Content-Type': 'image/jpeg' });

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

  it('#29 - 301 status code while downloading image', () => {
    return download.image({ url: 'http://cdn.shopify.com/s/files/1/0516/7244/9178/products/SteelCutOats1.jpg', dest: '/tmp/SteelCutOats1.jpg' }).then(({ filename }) => {
      expect(filename).toMatch(/tmp\/SteelCutOats1\.jpg$/);
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });
});

describe('path traversal protection (CWE-22)', () => {
  let root = '';
  let uploads = '';

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-downloader-'));
    uploads = path.join(root, 'uploads');
    fs.mkdirSync(uploads);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const malicious = (url) => download.image({ url, dest: uploads });

  it('keeps an encoded parent-directory segment inside dest', () => {
    const sentinel = path.join(root, 'sentinel.txt');

    fs.writeFileSync(sentinel, 'ORIGINAL');

    return malicious('http://someurl.com/images/%2e%2e%2fsentinel.txt').then(({ filename }) => {
      expect(filename).toEqual(path.join(uploads, 'sentinel.txt'));
      expect(fs.readFileSync(filename, 'utf8')).toEqual('attacker-bytes');
      expect(fs.readFileSync(sentinel, 'utf8')).toEqual('ORIGINAL');
    });
  });

  it('keeps an encoded absolute path inside dest', () => {
    return malicious('http://someurl.com/%2fetc%2fpasswd').then(({ filename }) => {
      expect(filename).toEqual(path.join(uploads, 'passwd'));
      expect(path.dirname(filename)).toEqual(uploads);
    });
  });

  it('rejects a decoded basename of ".."', () => {
    return expect(malicious('http://someurl.com/a%2f%2e%2e')).rejects.toMatchObject({ code: 'ERR_INVALID_FILENAME' });
  });

  it('rejects a decoded basename of "."', () => {
    return expect(malicious('http://someurl.com/a%2f%2e')).rejects.toMatchObject({ code: 'ERR_INVALID_FILENAME' });
  });

  it('rejects a pathname without a file name', () => {
    return expect(malicious('http://someurl.com/')).rejects.toMatchObject({ code: 'ERR_INVALID_FILENAME' });
  });

  it('rejects a malformed percent-encoded path instead of throwing', () => {
    return expect(malicious('http://someurl.com/images/%E0%A4%A')).rejects.toMatchObject({ code: 'ERR_INVALID_FILENAME' });
  });

  it('rejects a NUL byte in the file name', () => {
    return expect(malicious('http://someurl.com/images/image%00.jpg')).rejects.toMatchObject({ code: 'ERR_INVALID_FILENAME' });
  });

  it('rejects an invalid url instead of throwing', () => {
    return download.image({ url: 'not a valid url', dest: uploads })
      .catch((error) => error)
      .then((error) => {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/Invalid URL/);
      });
  });

  it('does not decode the file name twice', () => {
    return malicious('http://someurl.com/images/%252e%252e%252fsentinel.txt').then(({ filename }) => {
      expect(filename).toEqual(path.join(uploads, '%2e%2e%2fsentinel.txt'));
    });
  });

  it('never escapes dest through an encoded Windows separator', () => {
    return malicious('http://someurl.com/images/%2e%2e%5csentinel.txt').then(({ filename }) => {
      expect(path.dirname(filename)).toEqual(uploads);
    });
  });
});
