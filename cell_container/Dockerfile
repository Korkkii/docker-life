FROM node:latest

COPY cell_container/package.json /package.json
RUN npm install

COPY cell_container/cell_index.js /index.js
COPY lib /lib

EXPOSE 8000

CMD ["npm", "start"]
