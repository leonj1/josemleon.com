FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/metrics.conf.template /etc/nginx/site-templates/metrics.conf.template
COPY nginx/default.conf.template /etc/nginx/site-templates/default.conf.template
COPY nginx/start-site.sh /usr/local/bin/start-site.sh
RUN chmod +x /usr/local/bin/start-site.sh
EXPOSE 80
CMD ["/usr/local/bin/start-site.sh"]
