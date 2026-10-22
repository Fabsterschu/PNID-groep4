FROM node:20-alpine

WORKDIR /urs/src/tropometrics_app

COPY package.json ./

RUN npm i --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]