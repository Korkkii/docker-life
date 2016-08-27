FROM node:latest

COPY package.json /package.json
RUN npm install

COPY index.js /index.js

EXPOSE 8000

ENV X 0
ENV Y 0

CMD ["npm", "start"]
