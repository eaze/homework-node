'use strict'

const request = require('request');
const cheerio = require('cheerio');
const { exec } = require('child_process');

let finishedCallback;
let downloadCount = 0;
let targetCount = 0;

function downloadPackages (count, callback) {
  finishedCallback = callback;
  targetCount = count;
  getPackageNames(count, 0);
}

function getPackageNames (packageCount, offset) {
  // TODO: npm returns 36 per page.  If count > 36, get multiple pages
  request('https://www.npmjs.com/browse/depended?offset=' + offset, function (error, response, html) {
    if (!error && response.statusCode == 200) {
      const npmDependencyHtml = cheerio.load(html);
      npmDependencyHtml('a.name').each(function(i, element){
        const packageName = npmDependencyHtml(this).text();
        if(i < packageCount) {
          downloadPackage(packageName);
        }
      });
    }
  });
}

function downloadPackage(packageName) {
  // make a CLI call to get the tarball url, cURL that url, and unpack:
  const execCommand = `mkdir -p packages/${packageName}; npm v ${packageName} dist.tarball | xargs curl | tar -xz --directory packages/${packageName}/ --strip 1`;
  exec(execCommand, (err, stdout, stderr) => {
    if(++downloadCount == targetCount) {
      finishedCallback();
    }
  });
}

module.exports = downloadPackages
