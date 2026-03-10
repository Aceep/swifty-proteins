#!/bin/sh

# Clean the dockers
docker compose down --volumes --remove-orphans -v
# build and start the Docker container with no cache to ensure all dependencies are fresh
docker compose up --build --force-recreate --no-deps -d
# wait for the container to be fully up and running
sleep 10
# ensure JS dependencies are installed inside the container (node_modules is a Docker volume)
docker exec -it swifty-proteins npm install
# sync ligand list (ligands.txt -> src/data/ligands.js)
docker exec -it swifty-proteins npm run sync:ligands
# backend is started by the container, now start Expo in tunnel mode to make it accessible on the local network
docker exec -it swifty-proteins npm run start:tunnel