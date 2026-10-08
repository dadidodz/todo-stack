FROM nginx:1.30-alpine-slim

# Default backend address = its service name in docker compose. Override with -e BACKEND_URL=...
ENV BACKEND_URL=http://back-js:3000

# At startup the image runs envsubst on templates/*.template -> conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/
COPY public/ /usr/share/nginx/html/
