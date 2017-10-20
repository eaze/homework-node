/**
 * @file index.js
 * @author Christopher Oyler <christopher.oyler@gmail.com>
 * @date 10/20/2017
 * @desc program to download tgz packages from npm registry and unpack them
 */

'use strict'

const fs = require('fs');
const async = require('async');
const request = require('request');
const cp = require('child_process');
const popularUrl = 'https://www.npmjs.com/browse/depended?offset=';

module.exports = downloadPackages;

/**
 * @function downloadPackages - primary function for this program and the only export
 * @param {number} count - the number of popular packages to download
 * @param {function} callback - a non-optional callback function to fire when complete
 * @fires getMatches
 * @fires clean
 * @fires downloadAndExpand
 */
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

/**
 * @function getMatches - a scraping function to pull in html from npmjs.com and select popular packages
 * @param {string} url - a preformatted url string with query param for npm pagination
 * @param {function} cb - a non-optional callback function to fire when complete
 * @returns {array} matches - an array of strings of matched packages
 */
function getMatches(url, cb) {
  request(url, (err, resp, html) => {
    if (err) return callback(err);

    let matches = html.match(/\/([a-z0-9-_]+)">([0-9.]+[^<]*)/g);
    if (!matches || !matches[0]) return cb(new Error('No matches found in html.'));

    return cb(null, matches);
  });
}

/**
 * @function clean - a function to clean ./packages prior to downloading new items
 * @param {function} cb - a non-optional callback to fire when complete
 */
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

/**
 * @function downloadAndExpand - bread and butter, does most of the work for this program
 * it fires a series of child_process and file system calls using the npm cli and native methods
 * to download the tgz of a package, unpack that, and remove the tgz when finished
 * @param {array} matchArr - a flattened array of matched package strings
 * @param {function} cb - a non-optional callback to fire when complete
 */
function downloadAndExpand(matchArr, cb) {
  //limit concurrency to 10 downloads
  async.eachLimit(matchArr, 10, (match, cb) => {
    const pkgName = match.split('/')[1].split('">')[0];
    const opts = { cwd: './packages' };
    let tarName;

    async.series([
      //npm command to get the tgz
      (cb) => cp.exec(`npm pack ${pkgName}`, opts, (err, sout, serr) => {
        if (err) return cb(err);
        tarName = sout.trim();
        cb(null);
      }),
      //create the directory for the package name, without the version info
      (cb) => fs.mkdir(`./packages/${pkgName}`, cb),
      //unpack the tarball, and strip the "package" folder it would otherwise create
      (cb) => cp.exec(`tar -xvf ${tarName} -C ${pkgName} --strip-components 1`, opts, cb),
      //remove the tgz file when complete
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
