/* eslint-disable strict */
module.exports = {
  collectCoverage: true,
  collectCoverageFrom: [
    'index.js',
    'lib/**',
    '!.eslintrc.js',
    '!test/**',
    '!demo/**',
    '!dist/**',
    '!coverage/**',
    '!**/node_modules/**',
  ],
  expand: true,
  moduleFileExtensions: [
    'js',
    'json',
  ],
  notify: true,
  testMatch: ['<rootDir>/test/*.js'],
}
