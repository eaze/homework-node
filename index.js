'use strict';

var async = require('async');
var Xray = require('x-ray');
var tar = require('tar');
var fs = require('fs-extra');
var wget = require('wget');
var zlib = require('zlib');

var tgzDir = './tarballs/';
var pkgDir = './packages/';

module.exports = downloadPackages;

function downloadPackages (count, callback) {
  captureMostDependedPackages(
    count,
    downloadPackageTarballs.bind(this, callback)
  );
}

function downloadPackageTarballs(callback, err, results) {
  async.map(
    results,
    downloadPackageTarball,
    extractPackageTarballs.bind(this, callback)
  );
}

function extractPackageTarballs(callback, err, results) {
  async.map(
    results,
    extractPackageTarball,
    callback
  );
}

function captureMostDependedPackages(count, callback) {
  var x = Xray();
  x('https://www.npmjs.com/browse/depended', '.package-details', [{
    name: 'h3 a',
    version: 'a.type-neutral-1'
  }])
    .paginate('.pagination .next@href')
    .limit(Math.ceil(count/36))
    (function(err, results) {
      if (err) throw Error(err);
      results = results.slice(0, count);
      callback(null, results);
    });
}

function downloadPackageTarball(pkg, callback) {
  var registryUrl = 'http://registry.npmjs.org/';

  var filename = isScoped(pkg)
    ? pkg.name.split('/')[1] + '-' + pkg.version
    : pkg.name + '-' + pkg.version;

  var pkgTarballUrl = registryUrl + pkg.name + '/-/' + filename + '.tgz';

  fs.ensureDir(tgzDir, function downloadTgz() {
    var pkgLocation = isScoped(pkg)
      ? tgzDir + pkg.name.replace('/','-') + '-' + pkg.version
      : tgzDir + filename + '.tgz';

    var download = wget.download(pkgTarballUrl, pkgLocation);

    download
      .on('error', function onError(err) {
        callback(err);
      })
      .on('end', function onEnd() {
        var result = {
          name: pkg.name,
          version: pkg.version,
          location: pkgLocation
        };
        console.log('Downloaded ' + result.name + ' to ' + result.location);
        callback(null, result);
      });
  });
}

function extractPackageTarball(pkg, callback) {
  var extractDir = isScoped(pkg)
    ? pkgDir + pkg.name.replace('/','-')
    : pkgDir + pkg.name;

  fs.ensureDir(extractDir, function extractTgz() {
    fs
      .createReadStream(pkg.location)
      .pipe(new zlib.Gunzip())
      .pipe(tar.x({
        strip: 1,
        C: extractDir
      }))
      .on('error', function onError(err) {
        callback(err);
      })
      .on('end', function onEnd() {
        console.log('Extracted ' + pkg.location + ' to ' + extractDir);
        callback(null, extractDir);
      });
    });
}

function isScoped(pkg) {
  return pkg.name.includes('@');
}