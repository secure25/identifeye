FROM node:20-alpine

WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Install dependencies using NPM_TOKEN for private registry
ARG NPM_TOKEN
ENV NPM_TOKEN=$NPM_TOKEN
RUN npm install

# Copy source files
COPY . .

# Build the app
RUN npm run build

# Run migrations then start the server
CMD ["sh", "-c", "npm run db:migrate && node --import @specific-dev/framework/telemetry dist/index.js"]
