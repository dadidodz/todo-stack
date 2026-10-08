FROM nginx:1.30-alpine-slim

# pcre2 10.48 has a fixable HIGH CVE (CVE-2026-103111) not yet fixed in nginx:1.30-alpine-slim.
# Targeted upgrade: a full `apk upgrade` re-adds every upgraded package in a new layer (+11 MB).
# Remove once the base ships pcre2 >= 10.49: docker run --rm nginx:1.30-alpine-slim apk list -I pcre2
RUN apk upgrade --no-cache pcre2

# Default backend address = its service name in docker compose. Override with -e BACKEND_URL=...
ENV BACKEND_URL=http://back-js:3000

# At startup the image runs envsubst on templates/*.template -> conf.d/default.conf
COPY default.conf.template /etc/nginx/templates/
COPY public/ /usr/share/nginx/html/
