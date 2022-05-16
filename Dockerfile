FROM 696165561482.dkr.ecr.us-east-2.amazonaws.com/base:node_16.11.1-alpine3.14 as build

ARG PACKAGE=veremusic
ENV PACKAGE=${PACKAGE}

ARG ENVIRONMENT=dev
ENV ENVIRONMENT=${ENVIRONMENT}

RUN ["adduser", "-s", "/bin/nologin", "-u", "9992", "-D", "nft-be"]
RUN ["mkdir", "-p",  "/home/nft-be", "&&", "mkdir", "-p", "/usr/src/app/logs/"]

WORKDIR /usr/src/app

# Install app dependencies
COPY ./docker-entrypoint.sh /usr/src/app/docker-entrypoint.sh
COPY ./src /usr/src/app/src/
#COPY ./locales /usr/src/app/locales/
#COPY ./content /usr/src/app/content/
COPY ./package.json /usr/src/app/package.json
COPY ./package-lock.json /usr/src/app/package-lock.json
COPY ./tsconfig.json /usr/src/app/tsconfig.json
#COPY ./tsconfig.build.json /usr/src/app/tsconfig.json
COPY ./tsconfig.build.json /usr/src/app/tsconfig.build.json
COPY ./config /usr/src/app/config
COPY ./rds-combined-ca-bundle.pem /usr/src/app/rds-combined-ca-bundle.pem
COPY ./config/nftProperties/$PACKAGE/nftProperties.json /usr/src/app/src/utils/nftProperties/nftProperties.json

RUN npm install

# Bundle app source
RUN npm run build
RUN chmod +x /usr/src/app/docker-entrypoint.sh
RUN chown -R 9992:9992 "/home/nft-be"
RUN chown -R 9992:9992 "/usr/src/app"
RUN chown -R 9992:9992 "/tmp"

FROM 696165561482.dkr.ecr.us-east-2.amazonaws.com/base:node_distroless_16_3c462f1cfa02_27_10_21

COPY --from=build /usr/src/app /usr/src/app
COPY --from=build /etc/passwd /etc/passwd
COPY --from=build /home/nft-be /home/nft-be
COPY --from=build /usr/src/app/node_modules /usr/local/lib/node_modules

WORKDIR /usr/src/app

USER nft-be

CMD [ "build/src/server.js" ]
