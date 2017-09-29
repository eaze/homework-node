'use strict'

const test = require('tape')
const series = require('run-series')
const fs = require('fs')
const folderSize = require('get-folder-size')
const download = require('./')
const jsdom = require("jsdom");
const request = require('request');

test('download', function (t) {
    t.plan(4)

    const COUNT = parseInt(process.env.COUNT, 10) || 10

    series([
        (callback) => download(COUNT, callback),
        verifyCount,
        verifySize,
        verifyLodash,
        crossCheck
    ], t.end)

    function verifyCount (callback) {
        fs.readdir('./packages', function (err, files) {
            if (err) return callback(err)
            // Filter .gitignore and other hidden files
            // also filter out dirs for scoped modules,
            // they will be accounted for later
            let unscoped_dirs = files.filter((file) => !/^[\@\.]/.test(file))
            let num_dirs = unscoped_dirs.length;

            // scoped dirs must be handled differently,
            // for example, there are many popular modules
            // under the scope @angular: @angular/core, @angular/http etc..
            // for these we cannot simply count the top level dir ( there is
            // only one ), we have to go into this dir and count the subdirs
            let scoped_dirs = files.filter((file) => /^[\@]/.test(file));
            if ( scoped_dirs.length === 0 ) {
                // if no scoped dirs we re done
                t.equal(num_dirs, COUNT, `has ${COUNT} files`)
                callback()
            }
            else {
                // scrape the subdirs of each scope
                let scoped_dirs_scraped = 0;
                for ( let i in scoped_dirs ) {
                    let scoped_dir = scoped_dirs[i];
                    fs.readdir('./packages/'+scoped_dir, function (err, files) {
                        if (err) return callback(err)
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


    // I discovered a github repo that updates the top 1000 most depended on packages daily.
    // this check acts as a cross/sanity check.  The list here is not necessarily the
    // "source of truth", and could lead to false positives ( for instance if the owners algorithm
    // is wrong or their server goes down and doesn't update the list ), but it could also help
    // find/root cause issues that other methods would not, for instance if the styling changes on 
    // the main npm page.  Because there are inconsistencies between the two sources definitions of
    // top packages, I will grab the COUNT/2 top packages from this list and check that they are all
    // in the packages dir
    function crossCheck(callback) {
        let url = 'https://gist.github.com/anvaka/8e8fa57c7ee1350e3491#file-01-most-dependent-upon-md';
        let packageList = [];
        request({uri: url}, ( error, response, body ) => {
            jsdom.env(body, (err, window) => { 
                let index = 0;
                let lists =  window.document.getElementsByTagName('ol');
                for ( let list of lists ) {
                    let pkgs = list.getElementsByTagName('li');
                    for ( let pkg of pkgs ) {
                        let links = pkg.getElementsByTagName('a');
                        if ( links.length === 1 ) {
                            packageList.push( links[0].innerHTML );
                            index += 1;
                        }
                        if ( index >= COUNT/2 ) {
                            for ( pkg of packageList ) {
                                let pkgCopy = pkg;
                                // in the provided function verifyLodash require is called.
                                // this works if all of the depended upon modules are on our
                                // system, but will not work in general, since per instructions
                                // I am not installing the packages, I am simply downloading and
                                // untarring their source code.  Thus I have replaced the "require"
                                // with fs.stat for this check.
                                fs.stat( 'packages/'+pkgCopy, ( err, stat ) => {
                                    if ( err  ) {
                                        t.error( err, pkgCopy+' not found' ); 
                                        callback();
                                    }
                                });
                            }
                            t.ok( true, 'Cross check packages found' );
                            callback();
                            return;
                        }
                    }
                }
            });
        })
    }
})
