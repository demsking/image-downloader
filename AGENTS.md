# AGENTS.md

Guidance for coding agents working in this repository. See
[README.md](README.md) for the user-facing API and [CONTRIBUTING.md](CONTRIBUTING.md)
for the human contribution process.

## What this is

`image-downloader` is a small, published npm module (CommonJS, no build step,
no transpiler) that streams a remote image to a local file. `index.js` is shipped
to npm exactly as written.

- **Version**: 4.3.0, license MIT, published from GitLab CI on git tags.
- **Runtime dependency**: exactly one — `follow-redirects` (which wraps Node's
  `http`/`https` and follows redirects). Think hard before adding another.
- **Public API**: `require('image-downloader').image(options)` →
  `Promise<{ filename }>`, plus the `Options` type in [index.d.ts](index.d.ts).
  Nothing else is exported; `lib/` is internal.

## Commands

```sh
npm install            # at the repo root only — see "Dependency rules"
npm test               # jest --coverage (collects coverage by default)
npm run lint           # eslint .
npm run lint:fix       # eslint --fix .
npx jest test/index.js -t "name of one test"   # single test, fast
npx jest --detectOpenHandles                   # diagnose the "did not exit" note
```

- There is **no build, dist, or codegen step**. Edit the source and it is live.
- Dev environment is [devbox](https://www.jetify.com/devbox) + `direnv`
  ([devbox.json](devbox.json) pins `nodejs@16`, loaded by [.envrc](.envrc)). The
  host toolchain also works — verified on Node 24 / npm 11.
- `engines` in [package.json](package.json) says `>=6.10.1`, but that is **stale**:
  `index.js` uses optional catch binding and the global `URL` (Node 10+), and
  `test/index.js` uses `fs.rmSync` (Node 14.14+). Treat **Node ≥ 10 for library
  code, ≥ 14.14 for tests**, and do not "restore" 6.x syntax.

## Layout

| Path | Role |
| --- | --- |
| [index.js](index.js) | Public entry point: validates `url`/`dest`, resolves a relative `dest`, derives a safe file name from the URL, delegates to `lib/request.js`. |
| [lib/request.js](lib/request.js) | The download itself: protocol check, timeout and size limits, redirect credential handling, streaming to disk, single-settlement lifecycle. |
| [lib/TimeoutError.js](lib/TimeoutError.js) | `class TimeoutError extends Error` (name only, no custom `code`). Imported by tests from `lib/`, **not** re-exported by `index.js`. |
| [index.d.ts](index.d.ts) | Hand-written ambient `declare module 'image-downloader'` declarations. Not generated, not type-checked by any command — update it by hand. |
| [test/index.js](test/index.js) | The entire test suite (one file, Jest). |
| [test/fixtures/android.jpg](test/fixtures/android.jpg) | The 167-byte image served by mock responses. |

## Security invariants — do not regress these

Security work is the dominant theme of this codebase. Each hardening has a
comment citing the CWE and a matching `describe` block in `test/index.js`. If you
touch one of these paths, keep the comment and extend the corresponding suite.

- **Protocol allowlist** — only `http:`/`https:`; anything else rejects with
  `ERR_UNSUPPORTED_PROTOCOL` before any socket or file is opened.
- **Path traversal (CWE-22)** — in `index.js`, `decodeURIComponent` runs **before**
  `path.basename` (the reverse order lets `%2f` become a separator after
  decoding), NUL bytes are rejected, the path is never decoded twice, and the
  result is verified to stay inside `options.dest` via `isInside`.
- **Credential leakage on redirect (CWE-200/CWE-522)** — `CROSS_ORIGIN_HEADERS`
  is an **allowlist**; every other caller header, plus `options.auth`, is dropped
  when the redirect target's origin differs. An undeterminable origin fails
  closed. The module's own `beforeRedirect` runs *after* a caller hook so it has
  the last word.
- **Unbounded resources (CWE-400/CWE-770)** — `DEFAULT_TIMEOUT` (60 s socket
  inactivity) and `DEFAULT_MAX_CONTENT_LENGTH` (100 MiB). `content-length` is
  only a fast path; the running byte count is the enforcement point. Setting
  `maxContentLength: 0` disables the limit.
- **Symlink write-through (CWE-59)** — `WRITE_FLAGS` includes `O_NOFOLLOW` where
  the platform defines it.
- **Single settlement (CWE-772)** — all success *and* failure paths go through
  the local `settle()`, which releases the write stream and destroys the request
  exactly once.
- **No caller mutation** — `follow-redirects` deletes headers from the object it
  is handed, so `requestOptions.headers` is copied before the request is built;
  `download.image()` must never mutate the caller's `options`.

Named error codes in use: `ERR_INVALID_FILENAME`, `ERR_RESPONSE_TOO_LARGE`,
`ERR_UNSUPPORTED_PROTOCOL`, plus propagated Node errno codes (e.g. `ELOOP`).

## Code conventions

Enforced by [.eslintrc.yaml](.eslintrc.yaml) (`eslint:recommended` +
`airbnb-base` + `plugin:import/recommended`) — `npm run lint` is clean today, so
**run it after editing**; `npm run lint:fix` handles most of it.

- **CommonJS only.** `require`/`module.exports`, never `import`/`export` (the
  `sourceType: module` parser option is not a signal to change this).
- **Relative requires must carry the `.js` extension** —
  `require('./lib/request.js')`. `import/extensions` is set to `always` with
  `ignorePackages: false`.
- Single quotes, semicolons, 2-space indent, LF, final newline, `max-len` 128
  ([.editorconfig](.editorconfig), `.eslintrc.yaml`).
- `arrow-parens: always`; trailing commas on multiline arrays/objects but **not**
  on function arguments/params.
- `padding-line-between-statements` is strict: blank line before every `return`,
  and around block-like statements. This is why the source looks airy — match it.
- `no-console` is an **error**. This is a library: surface failures through
  rejected promises and `Error` objects with a `code`.
- House style for errors is a tiny factory returning the error:

  ```js
  const unsupportedProtocol = (protocol) => {
    const error = new Error(`Unsupported protocol: ${protocol}`);

    error.code = 'ERR_UNSUPPORTED_PROTOCOL';

    return error;
  };
  ```

- Prefer small arrow-function helpers with a JSDoc block that explains **why**
  (and cites the CWE where relevant), not what. Option and constant defaults live
  at module top-level with a comment naming the consequence of omitting them.
- Asymmetric `// eslint-disable-next-line` comments are used narrowly
  (`no-bitwise`); do not add blanket disables to source files.

## Testing conventions

Jest, [jest.config.js](jest.config.js): `collectCoverage: true`,
`collectCoverageFrom: ['index.js', 'lib/**']`, `testMatch: ['<rootDir>/test/*.js']`.
There is **no `coverageThreshold`**, but coverage is a published CI artifact and
sits around 97% — keep it there or higher (add a test, don't lower coverage).

- One suite file, `test/index.js`. It opens with file-wide disables
  (`no-sync`, `sort-keys`, `arrow-body-style`, `max-lines-per-function`,
  `require-unicode-regexp`) and a `/* global describe it expect beforeEach afterEach */`
  comment. Add new globals to that comment rather than importing them.
- HTTP is mocked with **nock** interceptors registered at module top-level with
  `.times(100)`; several tests intentionally share hosts (`http://someurl.com`,
  `https://someurl.com`). Be careful that a new interceptor does not shadow an
  existing one.
- Tests that need real streaming/lifecycle behaviour (size limits, timeouts,
  socket teardown) start a **real `http.createServer` on `127.0.0.1:0`** instead
  of using nock. Follow that pattern rather than mocking streams.
- Filesystem tests create a temp dir with `fs.mkdtempSync(os.tmpdir())` in
  `beforeEach` and remove it with `fs.rmSync(..., { recursive: true, force: true })`
  in `afterEach`. Do not write to a fixed path.
- Older tests still write to literal `/tmp/...` paths; that is legacy, and
  `test/fixtures/someurl.com` is a gitignored artifact created by the issue-#27
  regression test. A test run therefore dirties the tree with ignored files —
  check `git status` rather than assuming a clean tree means a clean run.
- Platform-conditional tests use an alias: `const itNoFollow = fs.constants.O_NOFOLLOW ? it : it.skip;`.
- **Known, expected noise**: Jest prints *"did not exit one second after the test
  run has completed"* because of a deliberately held-open socket in the timeout
  test. The run still passes; do not chase it unless you changed that test.
- Group new security tests under a `describe` naming the CWE, e.g.
  `describe('path traversal protection (CWE-22)', ...)`, matching the four
  existing CWE-named suites (`CWE-22`, `CWE-200`, `CWE-770`, `CWE-59`) plus
  `request lifecycle`.

## Dependency rules

- All dependencies live at the **repo root**. `package-lock.json` is tracked and
  CI runs `npm ci`, so commit the lockfile whenever `package.json` changes and
  never hand-edit it.
- **Never run `npm install`/`npm init` inside a subdirectory** (`test/`, `lib/`,
  a scratch dir). npm treats the nearest parent without its own `package.json`
  as the project and can prune the root `node_modules`, silently breaking the
  suite. Use `npm install --prefix <dir>` for experiments and check
  `git status` for unexpected `package.json`/`package-lock.json` edits right after.
- `npm audit --production` must pass in CI (`allow_failure: false`).

## Keeping the public surface in sync

Three files describe the same options and drift easily. A change to an option
means touching all three:

1. [lib/request.js](lib/request.js) — where the option is actually read.
2. [README.md](README.md) — the `## Options` list and, for security-relevant
   behaviour, the `## Security` section.
3. [index.d.ts](index.d.ts) — the `Options` type, with a `@default` tag.

Note the subtlety already encoded in the types: `timeout` is **excluded** from
`Pick<RequestOptions, ...>` and redeclared, because the module redefines it as a
socket-inactivity timeout rather than Node's semantics; `maxRedirects` likewise
comes from `follow-redirects`. Apply the same reasoning when exposing any other
`http.request` option.

## Git and CI

- Current development branch is `dev`; per [CONTRIBUTING.md](CONTRIBUTING.md),
  branch features off `dev` as `feature/<name>` and open a merge request.
- Commit subjects follow Conventional Commits with a scope, as in the existing
  history: `fix(security): ...`, `chore(lint): ...`, `docs(readme): ...`.
- [.gitlab-ci.yml](.gitlab-ci.yml) runs on every change: `npm ci` then
  `npm run lint`, `npm outdated` (non-blocking), `npm audit --production`
  (**blocking**), and `npm it` on both `node:current-alpine` and
  `node:lts-alpine`. Lint or tests failing means the pipeline fails; `npm test`
  writing the `coverage/` report is what CI parses for the coverage badge.
- `.npmignore` excludes `test`, `coverage`, `*.yml`, `*.config.js` and dotfiles,
  so the published tarball contains `index.js`, `index.d.ts`, `lib/` and docs.
  Adding a new runtime file means confirming it is not accidentally excluded.

## Working agreement

- Prefer the smallest change that keeps the existing design: one runtime
  dependency, no build step, no new abstraction layers.
- Before calling work done: `npm run lint` and `npm test` both clean, and the
  matching test exists for any behaviour you added or fixed.
- This is a security-sensitive downloader with an untrusted URL and an
  attacker-controlled server on the other end. Assume both are hostile.
