FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# Copy built frontend from previous stage
# Note: The backend expects it at ../frontend/dist
RUN mkdir -p /app/frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
