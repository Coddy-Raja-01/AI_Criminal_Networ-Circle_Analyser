# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/40-api-key.sh /docker-entrypoint.d/40-api-key.sh
RUN chmod +x /docker-entrypoint.d/40-api-key.sh

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]
