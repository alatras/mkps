# MarketPlace

Backend application made with [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ npm install
```

## Configuring Microservices

This is a mono-repo that contains all our microservices. You can run all of them at once (for local development), or run
specific ones only, all by modifying the ACTIVE_SERVICES env variable e.g to run only the Nft microservice:
```
ACTIVE_SERVICES=NFT_SERVICE  
```
To run multiple:
```
ACTIVE_SERVICES=NFT_SERVICE,AVN_SERVICE,...
```
To see which microservices are available, please check the Microservices enum in "src/utils/microservices.ts" 

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run dev

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
