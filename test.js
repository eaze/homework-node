'use strict'

const test = require('tape')
const series = require('run-series')
const fs = require('fs')
const folderSize = require('get-folder-size')
const download = require('./')

test('download', function (t) {
  t.plan(3)

  const COUNT = parseInt(process.env.COUNT, 10) || 10

  series([
    (callback) => download(COUNT, callback),
    verifyCount,
    verifySize,
    verifyLodash
  ], t.end)

  function verifyCount (callback) {
    fs.readdir('./packages', function (err, files) {
      if (err) return callback(err)
      // Filter .gitignore and other hidden files
      files = files.filter((file) => !/^\./.test(file))
      t.equal(files.length, COUNT, `has ${COUNT} files`)
      callback()
    })
  }

  // FIXME: this is inaccurate when scoped packages are downloaded:
  // https://docs.npmjs.com/misc/scope#requiring-scoped-packages
  function verifySize (callback) {
    folderSize('./packages', function (err, size) {
      if (err) return callback(err)
      t.ok(size / 1024 > 5 * COUNT, 'min 5k per package')
      callback()
    })
  }

  function verifyLodash (callback) {
    const _ = require('./packages/lodash')
    t.equal(typeof _.map, 'function', '_.map exists')
    callback()
  }
})
