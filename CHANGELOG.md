# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
Release checklist:
1. Move the pending entries out of `Unreleased` into a new
   `## [x.y.z] - YYYY-MM-DD` section.
2. Bump `version` in package.json and the two root `version` fields of
   package-lock.json to x.y.z (`npm version x.y.z --no-git-tag-version`).
3. Commit as `chore(release): x.y.z` and create the annotated tag `vx.y.z`.
4. Refresh the compare links at the bottom of this file.
-->

## [Unreleased]

## [4.3.1] - 2026-10-02

### Security

- Fix path traversal in automatic filename extraction.
- Prevent downloaded files from escaping the configured destination directory.
- Reject malformed percent-encoding and NUL bytes.

Security: CVE-2026-103648
CWE-22

Credit: Amirhossein Roustaei (@eternullsec), EterNull Security.

### Added

- `ERR_INVALID_FILENAME` error code, set on every error returned when the URL
  path cannot yield a safe file name inside `options.dest`.

### Changed

- `options.dest` is resolved to an absolute path _before_ the file name is
  extracted, and the extracted path is validated to stay strictly inside it.
- Invalid input now rejects the returned promise instead of throwing
  synchronously; this covers malformed URLs and malformed percent-encoding.

### Fixed

- A file name that decodes to a parent- or current-directory reference no longer
  makes the download target the destination directory itself.

## [4.3.0] - 2022-05-04

### Added

- `maxRedirects` option to cap the number of redirects followed (default: `21`).
- HTTP redirects are followed automatically.

### Changed

- URLs are parsed with the WHATWG `URL` API instead of the legacy `url` module.
- Redirect handling moved from `request` to `follow-redirects`.

## [4.2.0] - 2022-04-11

### Added

- TypeScript definitions (`index.d.ts`), so the module can be consumed from
  TypeScript projects without extra typings.

### Changed

- Development environment reproducible with Nix and `direnv`; dev dependencies
  refreshed and the Jest notify option disabled.

## [4.1.0] - 2022-02-25

### Fixed

- A destination directory whose name contains a dot (for example
  `/srv/uploads.v2`) is no longer mistaken for a file name.

### Changed

- Relative destinations are resolved to an absolute path before downloading.

## [4.0.3] - 2021-07-13

### Fixed

- Errors raised by the write stream (permission denied, missing directory, disk
  full, …) now reject the promise instead of surfacing as an unhandled event.

## [4.0.2] - 2020-12-11

### Added

- `TimeoutError` is emitted when `options.timeout` elapses.

### Fixed

- `options.timeout` is now forwarded to the HTTP request, so it is actually
  applied.

## [4.0.1] - 2020-05-10

### Fixed

- Version metadata in `package-lock.json`.

## [4.0.0] - 2020-05-10

### Changed

- **Breaking:** the `request` dependency was replaced by a minimal built-in
  `http`/`https` implementation. The `request`-specific options `followRedirect`,
  `followAllRedirects` and `maxRedirects` are no longer supported.

### Added

- `timeout` option support.

### Removed

- `request` dependency.

## [3.5.0] - 2019-07-29

### Added

- `extractFilename` option to opt out of extracting a file name from the URL.
- `followAllRedirects` option.

### Fixed

- The extracted image file name is percent-decoded before being saved.

## [3.4.2] - 2018-12-08

### Fixed

- Malformed generated file name on Windows.

### Changed

- Upgraded to `request@2.88.0`; test suite migrated from Mocha to Jest and CI
  moved to GitLab Pipelines.

## [3.4.1] - 2018-06-09

### Changed

- Project moved from GitHub to GitLab.

## [3.4.0] - 2018-05-31

### Fixed

- HTTP status code `201` (Created) is accepted as a successful download.

## [3.3.0] - 2017-09-20

### Added

- Any additional option is forwarded to the underlying HTTP request.

## [3.2.2] - 2017-06-02

### Added

- Promise support, making the module usable with `async`/`await`.

---

Releases published before 3.2.2 (2017-04-09) predate this changelog.

[Unreleased]: https://gitlab.com/demsking/image-downloader/-/compare/v4.3.1...main
[4.3.1]: https://gitlab.com/demsking/image-downloader/-/compare/v4.3.0...v4.3.1
[4.3.0]: https://gitlab.com/demsking/image-downloader/-/compare/v4.2.0...v4.3.0
[4.2.0]: https://gitlab.com/demsking/image-downloader/-/compare/v4.1.0...v4.2.0
[4.1.0]: https://gitlab.com/demsking/image-downloader/-/compare/v4.0.3...v4.1.0
[4.0.3]: https://gitlab.com/demsking/image-downloader/-/compare/v4.0.2...v4.0.3
[4.0.2]: https://gitlab.com/demsking/image-downloader/-/compare/v4.0.1...v4.0.2
[4.0.1]: https://gitlab.com/demsking/image-downloader/-/compare/v4.0.0...v4.0.1
[4.0.0]: https://gitlab.com/demsking/image-downloader/-/compare/v3.5.0...v4.0.0
[3.5.0]: https://gitlab.com/demsking/image-downloader/-/compare/v3.4.2...v3.5.0
[3.4.2]: https://gitlab.com/demsking/image-downloader/-/compare/v3.4.1...v3.4.2
[3.4.1]: https://gitlab.com/demsking/image-downloader/-/compare/v3.4.0...v3.4.1
[3.4.0]: https://gitlab.com/demsking/image-downloader/-/compare/3.3.0...v3.4.0
[3.3.0]: https://gitlab.com/demsking/image-downloader/-/compare/3.2.2...3.3.0
[3.2.2]: https://gitlab.com/demsking/image-downloader/-/compare/v3.2.1...3.2.2
