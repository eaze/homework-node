'use strict'

const request = require('request');
const async = require('async');
const popularUrl = 'https://www.npmjs.com/browse/depended?offset=';

module.exports = downloadPackages

function downloadPackages(count, callback) {
  const pages = Math.ceil(count / 36);

  async.times(pages, (n, next) => {
    getMatches(`${popularUrl}${(n * 36)}`, next);
  }, (err, matches) => {
    if (err) return callback(err);

    matches = matches.reduce((a, c) => a.concat(c), []).slice(0, count);
    const cleanMatches = clean(matches);
    return callback(null, cleanMatches);
  });
}


function getMatches(url, cb) {
  request(url, (err, resp, html) => {
    if (err) return callback(err);

    let matches = html.match(/\/([a-z0-9-_]+)">([0-9.]+[^<]*)/g);

    return cb(null, matches);
  });
}

function clean(matchArr) {
  let cleanObj = {};
  matchArr.forEach(m => {
    let nameAndVersion = m.split('/')[1].split('">');
    console.log(nameAndVersion);
    //TODO create downloadable tarball urls from this split
    // it's time to change this to an async loop to remove the necessity of looping twice
  });
}
