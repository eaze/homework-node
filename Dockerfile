FROM node:argon

WORKDIR /app
COPY package.json ./
RUN npm install --quiet

COPY . ./

CMD ["npm", "test"]
