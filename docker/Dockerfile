FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
RUN npm ci --omit=dev && npm install tsx
COPY docker/start.sh ./start.sh
RUN chmod +x ./start.sh
EXPOSE 3000
ENV NODE_ENV=production
CMD ["./start.sh"]
