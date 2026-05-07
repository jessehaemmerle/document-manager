FROM node:20-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["npm", "start"]
