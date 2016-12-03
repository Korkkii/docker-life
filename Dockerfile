FROM node:latest

COPY package.json /package.json
RUN npm install

COPY game_index.js /index.js

EXPOSE 8000

CMD ["npm", "start"]
