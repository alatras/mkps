### BUILD FOR PRODUCTION

FROM node:18-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

# Clean package install with dev dependencies to access Nest Cli
RUN --chown=node:node  npm ci

# Contents
COPY --chown=node:node . .

# Build to create the production bundle with Nest Cli
RUN --chown=node:node npm run build

# Set NODE_ENV
ENV NODE_ENV production

# Clean production package install with `npm ci` which removes the existing node_modules directory.
RUN npm ci --only=production && npm cache clean --force

USER node

### PRODUCTION

FROM node:18-alpine As production

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/build ./build

# Start the server
CMD [ "node", "build/src/main.js" ]
