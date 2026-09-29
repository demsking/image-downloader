/* eslint-disable no-sync */
/* eslint-disable sort-keys */
/* eslint-disable arrow-body-style */
/* eslint-disable max-lines-per-function */
/* eslint-disable require-unicode-regexp */
/* global describe it expect beforeEach afterEach */

const fs = require('fs');
const http = require('http');
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
const { TimeoutError } = require('../lib/TimeoutError.js');

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
});

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

  it('#30 - dot in dest directory name causes Error: EISDIR: illegal operation on a directory', () => {
    return download.image({ url: 'http://someurl.com/image-success.png', dest: '/tmp/eco-nor.no' }).then(({ filename }) => {
      expect(filename).toMatch(/tmp\/eco-nor\.no$/);
      expect(() => fs.accessSync(filename)).not.toThrow();
    });
  });

  it('#31 - a relative dest is resolved against process.cwd()', () => {
    const cwd = process.cwd();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-downloader-cwd-'));
    const downloads = path.join(root, 'downloads');

    fs.mkdirSync(downloads);
    // __dirname and the cwd are the same directory in this repository, so the
    // only way to tell the two resolutions apart is to move the process.
    process.chdir(root);

    return download.image({ url: 'http://someurl.com/image-success.png', dest: 'downloads' })
      .then(({ filename }) => {
        expect(filename).toEqual(path.join(downloads, 'image-success.png'));
        expect(() => fs.accessSync(filename)).not.toThrow();
      })
      .finally(() => {
        process.chdir(cwd);
        fs.rmSync(root, { recursive: true, force: true });
      });
  });
});

describe('path traversal protection (CWE-22)', () => {
  let root;
  let uploads;

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

describe('redirect credential protection (CWE-200)', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-downloader-redirect-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const credentials = {
    accept: 'image/jpeg',
    authorization: 'Bearer AUTH_SECRET',
    cookie: 'session=COOKIE_SECRET',
    'proxy-authorization': 'Basic PROXY_SECRET',
    'x-api-key': 'CUSTOM_SECRET',
  };

  const redirecting = (origin, location) => {
    const captured = {};

    nock(origin).get('/start.jpg').reply(302, '', { location });
    nock(location.split('/').slice(0, 3).join('/')).get('/hidden.jpg').reply(function capture() {
      captured.headers = this.req.headers;

      return [200, 'attacker-bytes', { 'Content-Type': 'image/jpeg' }];
    });

    return captured;
  };

  it('does not forward credentials to another origin', () => {
    const captured = redirecting('http://origin.test', 'http://target.test/hidden.jpg');

    return download.image({
      url: 'http://origin.test/start.jpg',
      dest: path.join(root, 'cross-origin.jpg'),
      headers: credentials,
    }).then(() => {
      expect(captured.headers).toBeDefined();
      expect(captured.headers).not.toHaveProperty('authorization');
      expect(captured.headers).not.toHaveProperty('cookie');
      expect(captured.headers).not.toHaveProperty('proxy-authorization');
      expect(captured.headers).not.toHaveProperty('x-api-key');
      expect(captured.headers).toHaveProperty('accept', 'image/jpeg');
    });
  });

  it('does not forward credentials to a subdomain of the original host', () => {
    const captured = redirecting('http://example.com', 'http://evil.example.com/hidden.jpg');

    return download.image({
      url: 'http://example.com/start.jpg',
      dest: path.join(root, 'subdomain.jpg'),
      headers: credentials,
    }).then(() => {
      expect(captured.headers).toBeDefined();
      expect(captured.headers).not.toHaveProperty('authorization');
      expect(captured.headers).not.toHaveProperty('x-api-key');
    });
  });

  it('keeps the caller headers on a same-origin redirect', () => {
    const captured = redirecting('http://someurl.com', 'http://someurl.com/hidden.jpg');

    return download.image({
      url: 'http://someurl.com/start.jpg',
      dest: path.join(root, 'same-origin.jpg'),
      headers: { 'x-api-key': 'SAME_ORIGIN_SECRET' },
    }).then(() => {
      expect(captured.headers).toHaveProperty('x-api-key', 'SAME_ORIGIN_SECRET');
    });
  });

  it('does not mutate the caller headers object', () => {
    const captured = redirecting('http://origin.test', 'http://target.test/hidden.jpg');
    const headers = { accept: 'image/jpeg', authorization: 'Bearer AUTH_SECRET' };

    return download.image({
      url: 'http://origin.test/start.jpg',
      dest: path.join(root, 'untouched.jpg'),
      headers,
    }).then(() => {
      expect(captured.headers).not.toHaveProperty('authorization');
      expect(headers).toEqual({ accept: 'image/jpeg', authorization: 'Bearer AUTH_SECRET' });
    });
  });

  it('rejects a redirect whose location is not a valid url', () => {
    nock('http://someurl.com').get('/bad-origin.jpg').reply(302, '', { location: 'http://bad host/hidden.jpg' });

    return download.image({
      url: 'http://someurl.com/bad-origin.jpg',
      dest: path.join(root, 'bad-origin.jpg'),
      headers: { 'x-api-key': 'CUSTOM_SECRET' },
    }).then(
      () => { throw new Error('Should have been rejected'); },
      (error) => {
        expect(error).toBeInstanceOf(Error);
      }
    );
  });

  it('still calls a caller-provided beforeRedirect hook', () => {
    const captured = redirecting('http://someurl.com', 'http://someurl.com/hidden.jpg');

    let hook = null;

    return download.image({
      url: 'http://someurl.com/start.jpg',
      dest: path.join(root, 'hook.jpg'),
      headers: { 'x-api-key': 'SAME_ORIGIN_SECRET' },
      beforeRedirect: (options, response, request) => {
        hook = { statusCode: response.statusCode, from: request.url };
      },
    }).then(() => {
      expect(captured.headers).toHaveProperty('x-api-key', 'SAME_ORIGIN_SECRET');
      expect(hook).toEqual({ statusCode: 302, from: 'http://someurl.com/start.jpg' });
    });
  });

  it('ignores a hook that rewrites the host of a cross-origin redirect', () => {
    const state = { headers: null };
    const target = http.createServer((request, response) => {
      state.headers = request.headers;
      response.writeHead(200, { 'Content-Type': 'image/jpeg' });
      response.end('attacker-bytes');
    });
    const origin = http.createServer((request, response) => {
      response.writeHead(302, { location: `http://127.0.0.1:${target.address().port}/hidden.jpg` });
      response.end();
    });

    const listening = (server) => new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    return listening(origin)
      .then(() => listening(target))
      .then(() => download.image({
        url: `http://127.0.0.1:${origin.address().port}/start.jpg`,
        dest: path.join(root, 'rewritten-host.jpg'),
        headers: { 'x-api-key': 'CUSTOM_SECRET' },
        // An old `host` value must not be able to disguise the real target.
        beforeRedirect: (options) => {
          options.host = `127.0.0.1:${origin.address().port}`;
        },
      }))
      .then(() => {
        expect(state.headers).not.toHaveProperty('x-api-key');
      })
      .finally(() => {
        origin.close();
        target.close();
      });
  });

  it('still drops credentials when a hook removes the redirect host and hostname', () => {
    const state = { headers: null };
    const target = http.createServer((request, response) => {
      state.headers = request.headers;
      response.writeHead(200, { 'Content-Type': 'image/jpeg' });
      response.end('attacker-bytes');
    });
    const origin = http.createServer((request, response) => {
      response.writeHead(302, { location: `http://127.0.0.1:${target.address().port}/hidden.jpg` });
      response.end();
    });

    const listening = (server) => new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    return listening(origin)
      .then(() => listening(target))
      .then(() => download.image({
        url: `http://127.0.0.1:${origin.address().port}/start.jpg`,
        dest: path.join(root, 'deleted-hostname.jpg'),
        headers: { 'x-api-key': 'CUSTOM_SECRET' },
        beforeRedirect: (options) => {
          delete options.host;
          delete options.hostname;
        },
      }).catch(() => {}))
      .then(() => {
        expect(state.headers || {}).not.toHaveProperty('x-api-key');
      })
      .finally(() => {
        origin.close();
        target.close();
      });
  });
});

describe('download limits (CWE-770)', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-downloader-limits-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const serve = (handler, run) => new Promise((resolve, reject) => {
    const server = http.createServer(handler);

    server.unref();
    server.listen(0, '127.0.0.1', () => run(server).then(resolve, reject).finally(() => server.close()));
  });

  it('rejects a declared body larger than maxContentLength without writing a file', () => {
    const dest = path.join(root, 'declared.jpg');
    const body = Buffer.alloc(4096);

    return serve((request, response) => {
      request.on('error', () => {});
      response.on('error', () => {});
      response.writeHead(200, { 'Content-Length': body.length, 'Content-Type': 'image/jpeg' });
      response.end(body);
    }, (server) => download.image({
      url: `http://127.0.0.1:${server.address().port}/image.jpg`,
      dest,
      maxContentLength: 1024,
    }).then(
      () => { throw new Error('Should have been rejected'); },
      (error) => {
        expect(error.code).toBe('ERR_RESPONSE_TOO_LARGE');
        expect(fs.existsSync(dest)).toBe(false);
      }
    ));
  });

  it('downloads without a limit when maxContentLength is 0', () => {
    const dest = path.join(root, 'unlimited.jpg');
    const body = Buffer.alloc(4096);

    return serve((request, response) => {
      request.on('error', () => {});
      response.on('error', () => {});
      response.writeHead(200, { 'Content-Length': body.length, 'Content-Type': 'image/jpeg' });
      response.end(body);
    }, (server) => download.image({
      url: `http://127.0.0.1:${server.address().port}/image.jpg`,
      dest,
      maxContentLength: 0,
    }).then(({ filename }) => {
      expect(fs.statSync(filename).size).toBe(body.length);
    }));
  });

  it('honours a numeric string for maxContentLength', () => {
    const dest = path.join(root, 'numeric-string.jpg');
    const body = Buffer.alloc(4096);

    return serve((request, response) => {
      request.on('error', () => {});
      response.on('error', () => {});
      response.writeHead(200, { 'Content-Length': body.length, 'Content-Type': 'image/jpeg' });
      response.end(body);
    }, (server) => download.image({
      url: `http://127.0.0.1:${server.address().port}/image.jpg`,
      dest,
      maxContentLength: '1024',
    }).then(
      () => { throw new Error('Should have been rejected'); },
      (error) => {
        expect(error.code).toBe('ERR_RESPONSE_TOO_LARGE');
        expect(fs.existsSync(dest)).toBe(false);
      }
    ));
  });

  it('aborts a chunked body that grows past maxContentLength and removes the partial file', () => {
    const dest = path.join(root, 'chunked.jpg');

    return serve((request, response) => {
      request.on('error', () => {});
      response.on('error', () => {});
      response.writeHead(200, { 'Content-Type': 'image/jpeg' });
      response.write(Buffer.alloc(2048));
      response.write(Buffer.alloc(2048));
      response.end();
    }, (server) => download.image({
      url: `http://127.0.0.1:${server.address().port}/image.jpg`,
      dest,
      maxContentLength: 1024,
    }).then(
      () => { throw new Error('Should have been rejected'); },
      (error) => {
        expect(error.code).toBe('ERR_RESPONSE_TOO_LARGE');
        expect(fs.existsSync(dest)).toBe(false);
      }
    ));
  });

  it('removes the partial file when a started download times out', () => {
    const dest = path.join(root, 'stalled.jpg');

    return serve((request, response) => {
      request.on('error', () => {});
      response.on('error', () => {});
      response.writeHead(200, { 'Content-Type': 'image/jpeg' });
      response.write(Buffer.alloc(100));
      // Never end: the socket goes idle and the timeout fires.
    }, (server) => download.image({
      url: `http://127.0.0.1:${server.address().port}/image.jpg`,
      dest,
      timeout: 250,
    }).then(
      () => { throw new Error('Should have been rejected'); },
      (error) => {
        expect(error).toBeInstanceOf(TimeoutError);
        expect(fs.existsSync(dest)).toBe(false);
      }
    ));
  });
});

describe('filesystem write protection (CWE-59)', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-downloader-symlink-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const itNoFollow = fs.constants.O_NOFOLLOW ? it : it.skip;

  itNoFollow('refuses to overwrite the target of a symlinked destination', () => {
    const content = path.join(root, 'shadow.txt');
    const link = path.join(root, 'image.jpg');

    fs.writeFileSync(content, 'ORIGINAL');
    fs.symlinkSync(content, link);

    nock('http://someurl.com').get('/symlink.jpg').reply(200, 'attacker-bytes', { 'Content-Type': 'image/jpeg' });

    return expect(download.image({ url: 'http://someurl.com/symlink.jpg', dest: link }))
      .rejects.toMatchObject({ code: 'ELOOP' })
      .then(() => {
        expect(fs.readFileSync(content, 'utf8')).toEqual('ORIGINAL');
      });
  });
});

describe('request lifecycle', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-downloader-lifecycle-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('rejects a protocol that is not http(s) without writing anything', () => {
    return expect(download.image({ url: 'file:///etc/passwd', dest: root }))
      .rejects.toMatchObject({ code: 'ERR_UNSUPPORTED_PROTOCOL' })
      .then(() => {
        expect(fs.existsSync(path.join(root, 'passwd'))).toBe(false);
      });
  });

  it('rejects an invalid url when no file name has to be extracted', () => {
    return expect(download.image({ url: 'not a valid url', dest: path.join(root, 'out.jpg') }))
      .rejects.toThrow(/Invalid URL/);
  });

  it('applies the 60000 ms socket inactivity timeout by default', () => {
    const followRedirects = require('follow-redirects');
    const original = followRedirects.http.get;
    let captured = null;

    followRedirects.http.get = (url, options, callback) => {
      captured = options;

      return original.call(followRedirects.http, url, options, callback);
    };

    nock('http://someurl.com').get('/default-timeout.jpg').reply(200, 'image-bytes', { 'Content-Type': 'image/jpeg' });

    return download.image({
      url: 'http://someurl.com/default-timeout.jpg',
      dest: path.join(root, 'default-timeout.jpg'),
    }).then(() => {
      expect(captured.timeout).toBe(60000);
    }).finally(() => {
      followRedirects.http.get = original;
    });
  });

  it('destroys the connection when a request times out', () => {
    const dest = path.join(root, 'timeout.jpg');
    const state = { closed: false };

    const server = http.createServer(() => {});

    server.unref();
    server.on('connection', (socket) => {
      socket.on('close', () => {
        state.closed = true;
      });
    });

    return new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        download.image({
          url: `http://127.0.0.1:${server.address().port}/image.jpg`,
          dest,
          timeout: 250,
        }).then(
          () => reject(new Error('Should have been rejected')),
          (error) => {
            try {
              expect(error).toBeInstanceOf(TimeoutError);
            } catch (assertion) {
              reject(assertion);

              return;
            }

            // The remote end must observe the closed socket
            setTimeout(resolve, 200);
          }
        );
      });
    }).then(() => {
      expect(state.closed).toBe(true);
    }).finally(() => server.close());
  });
});
