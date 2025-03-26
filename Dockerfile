FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
COPY build ./build

RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]