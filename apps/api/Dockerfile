FROM node:24.15.0-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "run", "start:prod"]
