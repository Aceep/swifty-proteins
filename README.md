# Swifty Proteins

This repository contains an Expo + React Native mobile app located in `proteins/`.
It lets users browse ligands from the provided list, view them in 3D, authenticate (password + biometrics), favorite ligands per user, and share from the viewer (with an image preview when available).

## Repository layout

- `proteins/`: the Expo app (source, assets, `package.json`)
- `docker-compose.yml`, `Dockerfile`: Dockerized dev environment for running Expo
- `start.sh`: helper script to build/run the container and start Expo

## Run with Docker (recommended)

From the repo root:

```bash
./start.sh
```

## More documentation

See `proteins/README.md` for app-specific details (requirements mapping, screens, and implementation notes).
