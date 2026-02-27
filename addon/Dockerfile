ARG BUILD_FROM=node:20-alpine
FROM $BUILD_FROM

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js .
COPY dist ./dist

EXPOSE 8099

CMD ["node", "server.js"]
