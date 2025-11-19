ARG NODE_VERSION=22.19.0

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 3000

CMD npm start
