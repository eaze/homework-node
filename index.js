'use strict'
const request = require('request');
const jsdom = require("jsdom");
const cp = require('child_process');
var JSON5 = require('json5');
const NPM = '/usr/local/bin/npm';
const TAR = '/usr/bin/tar';
const tar = require('tar');
const fs = require('fs');

class Dependencies{
    constructor() {
        this.offset=0;
        this.downloadPackages = this.downloadPackages.bind(this);
        this.CMDLINE_MODE = parseInt(process.env.CMDLINE_MODE) || 0
    }
    requestCallback(error, response, body) {
        jsdom.env(body, function (err, window) {
            // it is possible to simply call getElementsByClassName('name'), but I believe this
            // is more error prone, since the name class would be more likely to be reused for a non
            // package than the package-details class
            let packages = window.document.documentElement.getElementsByClassName('package-details');
            let package_names = [];
            let offset = this.offset;
            let names;
            // iterate over each package parsed, populate array of package names
            for ( let i in packages ) {
                if ( package_names.length  + offset >= this.count ) {
                    break
                }
                let pkg = packages[i];
                if ( typeof pkg.getElementsByClassName !== 'function' ) {
                    continue;
                }
                names = pkg.getElementsByClassName('name');
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
    
            this.downloadAndUntarPackages( package_names, offset );
            this.offset = new_offset;
        }.bind(this));
    }

    // Packages can be downloaded and untarred either through cmdline utilities
    // or node based packages. The node packages make more use of streams, which
    // I was recommended by interviewer.
    downloadAndUntarPackages( package_names, packages_downloaded ) {
        if ( this.CMDLINE_MODE ) {
            console.log( "JG: CMDLINE_MODE" );
            this.downloadAndUntarPackagesCmdline( package_names, packages_downloaded );
        } else {
            console.log( "JG: STREAM_MODE" );
            this.downloadAndUntarPackagesStream( package_names, packages_downloaded );
        }
    }

    downloadAndUntarPackagesCmdline( package_names, packages_downloaded ) {
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
    }

    downloadAndUntarPackagesStream( package_names, packages_downloaded ) {
        for ( let i in  package_names ) {
            let pkg_name = package_names[i];
            let child = cp.spawn(NPM, [ 'pack', pkg_name ] );
            child.stdout.on('data', (data) => { 
                let mkdirp = cp.exec('mkdir -p "packages/'+pkg_name+'"')
                mkdirp.on('close', (code) => {
                    fs.createReadStream(data.toString().trim()).pipe(
                        tar.x({
                            strip: 1,
                            C: 'packages/'+pkg_name // alias for cwd:'some-dir', also ok 
                        })).on( 'close', _ => { 
                            packages_downloaded += 1;
                            if ( packages_downloaded >= this.count ) {
                                this.callback();
                            }
                        })
                });
            });
        }
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
