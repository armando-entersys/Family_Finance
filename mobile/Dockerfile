# Stage 1: Build the Expo Web app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Set environment variables for build
ARG EXPO_PUBLIC_API_URL=https://Family-Finance.scram2k.com
ARG EXPO_PUBLIC_GEMINI_API_KEY
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_GEMINI_API_KEY=$EXPO_PUBLIC_GEMINI_API_KEY

# Build for web
RUN npx expo export --platform web

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
