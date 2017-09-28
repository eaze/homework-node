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
      // also filter out dirs for scoped modules,
      // they will be accounted for later
      let unscoped_dirs = files.filter((file) => !/^[\@\.]/.test(file))
      let num_dirs = unscoped_dirs.length;
      let scoped_dirs = files.filter((file) => /^[\@]/.test(file));
      if ( scoped_dirs.length === 0 ) {
        t.equal(num_dirs, COUNT, `has ${COUNT} files`)
        callback()
      }
      else {
        let scoped_dirs_scraped = 0;
        for ( let i in scoped_dirs ) {
          let scoped_dir = scoped_dirs[i];
          fs.readdir('./packages/'+scoped_dir, function (err, files) {
            if (err) return callback(err)
            // assumes no second degree scoped modules, i sont think that this is supported
            num_dirs += files.filter((file) => !/^[\@\.]/.test(file)).length
            scoped_dirs_scraped += 1;
            if ( scoped_dirs_scraped >= scoped_dirs.length ) {
              t.equal(num_dirs, COUNT, `has ${COUNT} files`)
              callback()
            }
          })
        }  
      }  
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
