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
            // iterate over each package parsed, populate array of package names
            for ( let i in packages ) {
                if ( package_names.length  + this.offset >= this.count ) {
                    break
                }
                let pkg = packages[i];

                // error handling
                if ( typeof pkg.getElementsByClassName !== 'function' ) {
                    continue;
                }
                let names = pkg.getElementsByClassName('name');
                if ( names.length !== 1 ) {
                    console.log( "Error:", names );
                    continue;
                }

                // ensure extracted string is valid node module
                // name.  This also sanitizes data/prevents console injection
                let name = names[0].href.replace('/package/', '');
                var invalid_name_reg = new RegExp("[^a-z0-9-.@/]","i");
                if ( invalid_name_reg.test(name) ) {
                    console.log( "Error:", name, " is invalid node module name " );
                    continue;
                }
                    
                package_names.push(name);
            }
    
            let new_offset = this.offset + package_names.length;
            // if count > total amount of packages scraped, grab next page
            if ( new_offset < this.count ) {
                let url = 'https://www.npmjs.com/browse/depended?offset='+new_offset;
                request(url, this.requestCallback.bind(this));
            }
    
            this.downloadAndUntarPackages( package_names, this.offset );
            this.offset = new_offset;
        }.bind(this));
    }

    // Packages can be downloaded and untarred either through cmdline utilities
    // or node based packages. The node packages make more use of streams, which
    // I was recommended by interviewer.
    downloadAndUntarPackages( package_names, packages_downloaded ) {
        if ( this.CMDLINE_MODE ) {
            this.downloadAndUntarPackagesCmdline( package_names, packages_downloaded );
        } else {
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
            // npm pack <package> gives us the tarball of the package
            // I suppose if I wanted to I could call npm view <package>,
            // get the tarball url and then call request with the url,
            // but this seems unnecessary and also requires an additional
            // network call
            let child = cp.spawn(NPM, [ 'pack', pkg_name ] );
            child.stdout.on('data', (data) => { 
                let mkdirp = cp.exec('mkdir -p "packages/'+pkg_name+'"')
                mkdirp.on('close', (code) => {
                    fs.createReadStream(data.toString().trim()).pipe(
                        tar.x({
                            strip: 1,
                            C: 'packages/'+pkg_name
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
