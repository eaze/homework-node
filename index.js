'use strict'

const fs = require('fs');
const async = require('async');
const request = require('request');
const cp = require('child_process');
const popularUrl = 'https://www.npmjs.com/browse/depended?offset=';

module.exports = downloadPackages;

function downloadPackages(count, callback) {
  const pages = Math.ceil(count / 36);

  async.times(pages, (n, next) => {

    getMatches(`${popularUrl}${(n * 36)}`, next);

  }, (err, matches) => {
    if (err) return callback(err);

    matches = matches.reduce((a, c) => a.concat(c), []).slice(0, count);
    clean((err) => {
      if (err) return callback(err);
      return downloadAndExpand(matches, callback);
    });
  });
}


function getMatches(url, cb) {
  request(url, (err, resp, html) => {
    if (err) return callback(err);

    let matches = html.match(/\/([a-z0-9-_]+)">([0-9.]+[^<]*)/g);
    if (!matches || !matches[0]) return cb(new Error('No matches found in html.'));

    return cb(null, matches);
  });
}

function clean(cb) {
  fs.readdir('./packages', (err, files) => {
    if (err) return cb(err);

    files = files.filter((file) => !/^\./.test(file));
    if (!files || files.length === 0) return cb(null);

    files.unshift('-rf');
    cp.execFile('rm', files, { cwd: './packages' }, (err) => {
      if (err) return cb(err);
      cb(null);
    });
  });
}

function downloadAndExpand(matchArr, cb) {
  async.eachLimit(matchArr, 10, (match, cb) => {
    const pkgName = match.split('/')[1].split('">')[0];
    const opts = { cwd: './packages' };
    let tarName;

    async.series([
      (cb) => cp.exec(`npm pack ${pkgName}`, opts, (err, sout, serr) => {
        if (err) return cb(err);
        tarName = sout.trim();
        cb(null);
      }),
      (cb) => fs.mkdir(`./packages/${pkgName}`, cb),
      (cb) => cp.exec(`tar -xvf ${tarName} -C ${pkgName} --strip-components 1`, opts, cb),
      (cb) => cp.exec(`rm -rf ${tarName}`, opts, cb)
    ], (err) => {
      if (err) return cb(err);
      cb(null);
    });
  }, (err) => {
    if (err) return cb(err);
    cb(null);
  });
}
