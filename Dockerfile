# Base Node image
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Optional: install watchman, git, curl
RUN apt-get update && apt-get install -y \
    watchman \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g expo-cli

# Copy package files and install dependencies
COPY proteins/package*.json ./
RUN npm install

# Copy the rest of the application code
COPY proteins/ .

# Expose the default Expo ports
EXPOSE 19000 19001 19002 8081

# Start the Expo development server
CMD ["/bin/sh"]
