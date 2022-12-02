ARG ACTIVE_SERVICES=NFT_SERVICE,AVN_SERVICE,LISTING_SERVICE

### BUILD FOR PRODUCTION
FROM node:18-alpine As build

RUN ["adduser", "-s", "/bin/nologin", "-u", "9992", "-D", "nft-be"]

WORKDIR /usr/src/app

COPY package*.json ./

# Clean package install with dev dependencies to access Nest Cli
RUN npm ci

# Contents
COPY . . 

# Build to create the production bundle with Nest Cli
RUN npm run build

### PRODUCTION

FROM node:18-alpine As production

ARG ACTIVE_SERVICES
ENV ACTIVE_SERVICES=${ACTIVE_SERVICES}

RUN ["mkdir", "-p", "/usr/src/app/logs"]
RUN chown -R 9992:9992 "/usr/src/app/logs"

WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=9992:9992 --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=9992:9992 --from=build /usr/src/app/build ./build
COPY --chown=9992:9992 --from=build /usr/src/app/rds-combined-ca-bundle.pem ./rds-combined-ca-bundle.pem

USER nft-be

# Start the server
CMD [ "node", "build/src/main.js" ]
