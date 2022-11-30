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

USER node

### PRODUCTION

FROM node:18-alpine As production

# Copy the bundled code from the build stage to the production image
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/build ./build

# Start the server
CMD [ "node", "build/src/main.js" ]
