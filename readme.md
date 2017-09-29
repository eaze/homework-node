# Eaze Node.js Homework

> Joshua Grossberg's response Node.js code challenge for engineering applicants

### Notes

1. I am using node v4.8.4
2. The environment var LOG_LEVEL can be set to any of the winston supported log levels.  
3. I coded the scraper with two approaches:  one that makes heavy use of linux cmdline via child_process, and one that more heavily relies on streams.  The stream mode is the default, but you can switch modes by setting CMDLINE_MODE=1
4.  The verifyCount test does not account for scoped modules.  scoped modules live under a common directory, and so simply counting the dirs under packages as is done in verifyCount will not work.  Specifically, in the top 100 most depended upon repos there are several modules scoped under @angular.  I have supplied a fix in this repo.
5.  The verifyLodash test does work on my system, but attempting to require the downloaded package does not work for all packages, since I am not actually installing the packages, simply downloading tarballs of their source.  I kept the verifyLodash function as is, but did not use this method in my added test
6. I added a test that checks against the npm rank gist, which is updated daily.  The lists are not 100% in agreement, so I relax my requirements.  I simply test that the top COUNT/2 packages on the Gist are present in the packages directory.  This test could lead to false positives but could also uncover issues with the way the npm registry is scraped.
7.  Please let me know if there is an aspect of the assignment that I have misunderstood.

## Project

1. Get the 10 [most depended on packages](https://www.npmjs.com/browse/depended) from npm.
2. For each package, download the latest tarball from the npm registry.
3. Extract the tarball into `./packages/${pkg.name}`, e.g. `./packages/lodash`.

## Setup

Start by cloning this repo. Everything you'll need to get started is already configured for you. You'll need to commit your code at least once, but probably more often. Please use whatever commit and code style you like best, but please make sure all syntax is supported by Node v4.

We've already created an `index.js` file as your entry point. Create as many additional files as you'd like.

## Testing

We've created a failing `npm test` command for you. You can add additional tests if you'd like and even bring in a tool other than [`tape`](https://github.com/substack/tape) as long as these initial tests remain and `npm test` sets correct exit codes.

Passing tests don't guarantee that your solution is perfect but a failing test definitely indicates a problem.

## Bonus

How high can you go? Set the `COUNT` environment variable when running your tests to download more than the top 10.
