'use strict'

const Promise = require('bluebird');
const cheerio = require('cheerio');
const request = Promise.promisify(require("request"));
const downloadNpmPackage = require('download-npm-package');

const NPM_PACKAGE_PAGE_SIZE = 36;

function getPackageNames (count) {
  let packageNames = [];

  function getPackagePage(offset) {
    return request('https://www.npmjs.com/browse/depended?offset=' + offset)
    .then(response => {
      const $ = cheerio.load(response.body);
      // scrape the package names from the npm website
      $('a.name').each(function(i, element){
        const packageName = $(this).text();
        packageNames.push(packageName);
      });
      // npm returns 36 package names per page of results...
      // If we don't have enough, get another page recursively.
      if(packageNames.length < count) {
        offset += NPM_PACKAGE_PAGE_SIZE;
        return getPackagePage(offset);
      } else {
        return packageNames.slice(0,count);
      }
    });
  }

  return getPackagePage(0);
}

function getPackages(packageNameArray) {
  return Promise.map(packageNameArray, packageName => {
    return downloadNpmPackage({
      arg: `${packageName}@latest`,
      dir: 'packages'
    })
  })
}

function downloadPackages (count, callback) {
  getPackageNames(count)
    .then(getPackages)
    .finally(callback);
}

module.exports = downloadPackages;
