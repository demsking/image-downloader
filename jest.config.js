module.exports = {
  expand: true,
  notify: true,
  testMatch: [
    '<rootDir>/test/*.js'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'index.js',
    'lib/**',
    '!.eslintrc.js',
    '!test/**',
    '!demo/**',
    '!dist/**',
    '!coverage/**',
    '!**/node_modules/**'
  ],
  moduleFileExtensions: [
    'js',
    'json'
  ]
}
