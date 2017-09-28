'use strict'
const request = require('request');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const cp = require('child_process');
var JSON5 = require('json5');
const NPM = '/usr/local/bin/npm';
const TAR = '/usr/bin/tar';


class Dependencies{
    constructor() {
        this.dom = {};
        this.offset=0;
        this.downloadPackages = this.downloadPackages.bind(this);
    }
    requestCallback(error, response, body) {
        this.dom = new JSDOM(body);
        // it is possible to simply call getElementsByClassName('name'), but I believe this
        // is more error prone, since the name class would be more likely to be reused for a non
        // package than the package-details class
        let packages = this.dom.window.document.documentElement.getElementsByClassName('package-details');
        let package_names = [];
        let offset = this.offset;
        let names;
        // iterate over each package parsed, populate array of package names
        for ( let i in packages ) {
            if ( package_names.length  + offset >= this.count ) {
                break
            }
            let pkg = packages[i];
            try {
                names = pkg.getElementsByClassName('name');
            } catch ( e ) {
                console.log( "Error: ", e);
                continue;
            }
            if ( names.length !== 1 ) {
                console.log( "Error:", names );
                continue;
            }
            package_names.unshift(names[0].href.replace('/package/', ''));
        }

        let new_offset = offset + package_names.length;
        if ( new_offset < this.count ) {
            let url = 'https://www.npmjs.com/browse/depended?offset='+new_offset;
            request(url, this.requestCallback.bind(this));
        }

        let packages_downloaded = offset;
        for ( let i in  package_names ) {
            let pkg_name = package_names[i];
            let child = cp.spawn(NPM, [ 'pack', pkg_name ] );
            child.stdout.on('data', (data) => { 
                // note double quotes, to ensure proper handling of special chars
                let cmd = 'mkdir -p "packages/'+pkg_name+ '"; '+TAR+' -xzvf '+data.toString().trim() + ' -C "packages/'+pkg_name+'" --strip-components=1';

                // spawn seems to fail for large tarballs, for example rxjs
                let untar = cp.exec(cmd);
                untar.on('error', ( err ) => { console.log( "Error: ", err ) } );
                untar.on('exit', (code,signal) => {
                    packages_downloaded += 1;
                    if ( packages_downloaded >= this.count ) {
                        this.callback();
                    }
                });
            });
        }
        this.offset = new_offset;
    }

    downloadPackages(count, callback) {
        this.count = parseInt(count);
        this.callback = callback;
        let url = 'https://www.npmjs.com/browse/depended?offset='+this.offset;
        request(url, this.requestCallback.bind(this));
    }
};

const deps = new Dependencies();
module.exports = deps.downloadPackages;
