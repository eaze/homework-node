# Eaze Node.js Homework

> Our Node.js code challenge for engineering applicants

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

We've also included Docker configuration. We'll use this to test your solution in a stable/isolated environment:

```sh
docker-compose run app
```

## Bonus

How high can you go? Set the `COUNT` environment variable when running your tests to download more than the top 10.
