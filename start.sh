#!/bin/bash
# Startup script for vCard App (Unix/Mac/WSL)

echo "Starting Docker Compose services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "Failed to start Docker Compose services"
    exit 1
fi

echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    if docker exec vcard-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Waiting for database... ($attempt/$max_attempts)"
    sleep 1
done

if [ $attempt -eq $max_attempts ]; then
    echo "PostgreSQL failed to start in time"
    exit 1
fi

echo ""
echo "Starting Wasp application..."
cd app
wasp start
