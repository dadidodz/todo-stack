FROM nginx:1.30-alpine-slim

ENV BACKEND_URL=http://back-js:3000
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY default.conf.template /etc/nginx/templates/
COPY public/ /usr/share/nginx/html/
