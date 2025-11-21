ARG NODE_VERSION=22.19.0

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install -g @angular/cli

RUN npm install

EXPOSE 4242

CMD ng serve --host 0.0.0.0 --port 4242
