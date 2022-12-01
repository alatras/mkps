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

# Set NODE_ENV
ENV NODE_ENV production

# Clean production package install with `npm ci` which removes the existing node_modules directory.
RUN npm ci --only=production && npm cache clean --force

USER node

### PRODUCTION

FROM build As production

WORKDIR /usr/src/app

USER node

# Start the server
CMD [ "node", "/usr/src/app/build/src/main.js" ]
