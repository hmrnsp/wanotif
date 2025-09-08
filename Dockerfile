FROM node:20-alpine

# Install Chromium and dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create and set permissions for .wwebjs_auth directory
# RUN mkdir -p .sessions && chmod -R 777 .sessions

# Create volume directory untuk sessions
VOLUME ["/usr/src/app/.sessions"]

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/main.js"]