# MarketPlace

Backend application made with [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Running the app with Docker for development

```bash
# start
$ make up

# stop
$ make down

# restart
$ make restart
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Build for production

```bash
# build for production
$ docker build --target	build .
$ docker build --target	production .
```
