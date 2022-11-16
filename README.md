# MarketPlace

Backend application made with [Nest](https://github.com/nestjs/nest).

## Installation

```bash
$ npm install
```

## Configuring Microservices

This is a mono-repo that contains all our microservices. You can run all of them at once (for local development), or run
specific ones only, all by modifying the ACTIVE_SERVICES env variable e.g to run only the Nft microservice:

```bash
# for a single microservice
ACTIVE_SERVICES=NFT_SERVICE  
```

```bash
# for multiple microservices
ACTIVE_SERVICES=NFT_SERVICE,AVN_SERVICE,LISTING_SERVICE
```

To see which microservices are available, please check the enum `Microservices` in file `src/utils/microservices.ts`.

## Running the app

This runs the app directly without provisioning of Mongo, Mongo replicas and Redis.

```bash
# development
$ npm run start

# watch mode
$ npm run dev

# production mode
$ npm run start:prod
```

## Running the app with Docker for development

This runs it in a dedicated Docker Network. It will automatically do all the provisioning. This is for development only.

```bash
# start
$ make up

# stop
$ make down

# restart
$ make restart
```

## Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Building for production

This builds the app into Docker image in two phases and makes it ready for deploying in production.

```bash
# build for production
$ docker build --target	build .
$ docker build --target	production .
```
