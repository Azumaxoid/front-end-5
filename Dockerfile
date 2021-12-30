FROM node:14-alpine
ENV NODE_ENV "production"
ENV PORT 8079
EXPOSE 8079
RUN apk add python3 make g++
RUN npm update
#RUN addgroup mygroup && adduser -D -G mygroup myuser && mkdir -p /usr/src/app && chown -R myuser /usr/src/app

# Prepare app directory
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
COPY yarn.lock /usr/src/app/
#RUN chown myuser /usr/src/app/yarn.lock
RUN mkdir /var/log/front
#RUN chown myuser /var/log/front

#USER myuser
RUN yarn install
RUN npm install
RUN cp /usr/src/app/node_modules/newrelic/newrelic.js /usr/src/app
#RUN touch /home/myuser/.config

COPY . /usr/src/app
RUN mkdir public; cp -r public_src/* public
RUN node newrelic_setup.js

ARG COMMIT_SHA="sha"
ARG RELEASE_TAG="dev"
ENV NEW_RELIC_METADATA_COMMIT=$COMMIT_SHA
ENV NEW_RELIC_METADATA_RELEASE_TAG=$RELEASE_TAG

# Start the app
CMD ["/usr/local/bin/node", "server.js"]
