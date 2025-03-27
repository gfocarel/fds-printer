#!/bin/bash
# Build the Docker image
docker build -t web-voice-app .

# Stop any existing container
docker-compose down

# Start the new container
docker-compose up -d
