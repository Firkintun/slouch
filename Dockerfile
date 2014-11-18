# DOCKER-VERSION 1.0.1
FROM node:0.10.33

MAINTAINER Michael Schoonmaker michael.r.schoonmaker@gmail.com

COPY . /src
COPY ./data/manifest.json /etc/slouch/manifest.json
WORKDIR /src

RUN npm install
CMD node bin/slouch /etc/slouch/manifest.json
