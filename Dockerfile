FROM node:20-alpine

# su-exec lets the entrypoint fix ownership on the mounted volume as root and
# then drop to an unprivileged user before exec'ing the server.
RUN apk add --no-cache su-exec

WORKDIR /app
ENV NODE_ENV=production

# Copy manifests first so `npm ci` is cached across code-only deploys.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/index.js"]
