ARG ACTIVE_SERVICES=NFT_SERVICE,AVN_SERVICE,LISTING_SERVICE

### BUILD FOR PRODUCTION
FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY package*.json ./

# Clean package install with dev dependencies to access Nest Cli
RUN npm ci

# Contents
COPY . . 

# Build to create the production bundle with Nest Cli
RUN npm run build
RUN chown -R node:node "/usr/src/app/node_modules"
RUN chown -R node:node "/usr/src/app/build"

### PRODUCTION

FROM node:18-alpine As production

ENV ACTIVE_SERVICES=${ACTIVE_SERVICES}

RUN ["mkdir", "-p", "/usr/src/app/logs/"]
RUN chown -R node:node "/usr/src/app"

WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/build ./build
COPY --from=build /usr/src/app/rds-combined-ca-bundle.pem ./rds-combined-ca-bundle.pem

USER node

# Start the server
CMD [ "node", "build/src/main.js" ]
