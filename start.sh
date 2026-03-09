#!/bin/sh

# build and start the Docker container
docker compose up --build -d
# wait for the container to be fully up and running
sleep 10
# ensure JS dependencies are installed inside the container (node_modules is a Docker volume)
docker exec -it swifty-proteins npm install
# open the Expo development server in the container
docker exec -it swifty-proteins npx expo start --tunnel -c