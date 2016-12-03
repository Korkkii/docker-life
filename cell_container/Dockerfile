FROM node:latest

COPY package.json /package.json
RUN npm install

COPY cell_index.js /index.js

EXPOSE 8000

CMD ["npm", "start"]
