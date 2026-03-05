# Docker Setup Guide

This guide helps you set up and run the vCard App using Docker for local development and collaboration.

## Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) installed and running
- [Docker Compose](https://docs.docker.com/compose/install/) (included with Docker Desktop)

## Quick Start

### 1. Clone and navigate to the project

```bash
git clone <repository-url>
cd vCardApp
```

### 2. Set up environment variables

```bash
# Copy the example environment file
cp app/.env.server.example app/.env.server
```

Edit `app/.env.server` with your actual values (see [Environment Variables](#environment-variables) below).

### 3. Build and start all services

```bash
# Build and start everything (first time)
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

First build takes ~5-10 minutes. Subsequent builds are faster due to caching.

### 4. Access the application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React app served via nginx |
| Backend API | http://localhost:3001 | Wasp server (Node.js) |
| Tile Service | http://localhost:8000 | Python tile generation API |

## Services Overview

| Service | Port | Container Name | Description |
|---------|------|----------------|-------------|
| client | 3000 | vcard-client | React frontend served by nginx |
| server | 3001 | vcard-server | Wasp backend (Node.js + Express) |
| tile-service | 8000 | tile-service | Python FastAPI tile generation |
| postgres | 5432 | vcard-postgres | PostgreSQL 15 database |

## Common Commands

### Starting and Stopping

```bash
# Start all services (detached/background)
docker-compose up -d

# Start with rebuild (after code changes)
docker-compose up --build -d

# Stop all services (keeps data)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs (follow mode)
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f client
docker-compose logs -f server
docker-compose logs -f postgres
docker-compose logs -f tile-service
```

### Rebuilding Individual Services

```bash
# Rebuild only the client after frontend changes
docker-compose build client
docker-compose up -d client

# Rebuild only the server after backend changes
docker-compose build server
docker-compose up -d server
```

### Database Operations

```bash
# Access PostgreSQL CLI
docker exec -it vcard-postgres psql -U postgres -d vcard_db

# Reset database completely
docker-compose down -v
docker-compose up --build -d
```

### Container Status

```bash
# Check running containers
docker-compose ps

# Check resource usage
docker stats
```

## Environment Variables

The server requires environment variables in `app/.env.server`. Copy from the example file and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Auto | Configured by docker-compose |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `STRIPE_API_KEY` | Yes | Stripe secret key (starts with `sk_`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `SENDGRID_API_KEY` | Yes | SendGrid API key (starts with `SG.`) |
| `AWS_S3_IAM_ACCESS_KEY` | For uploads | AWS access key |
| `AWS_S3_IAM_SECRET_KEY` | For uploads | AWS secret key |
| `AWS_S3_FILES_BUCKET` | For uploads | S3 bucket name |
| `AWS_S3_REGION` | For uploads | S3 region |

See `app/.env.server.example` for the complete list with descriptions.

## Development Workflow

### After Making Code Changes

**Frontend changes (React/TypeScript):**
```bash
docker-compose build client && docker-compose up -d client
```

**Backend changes (Wasp/Node.js):**
```bash
docker-compose build server && docker-compose up -d server
```

**Database schema changes:**
```bash
# Rebuild server to run migrations
docker-compose build server && docker-compose up -d server
```

### Full Rebuild

```bash
docker-compose down
docker-compose up --build -d
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Browser       │────▶│  client (:3000) │
│                 │     │  (nginx)        │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │  /api/*  │  │ /auth/*  │  │  /ops/*  │
            └────┬─────┘  └────┬─────┘  └────┬─────┘
                 │             │             │
                 └─────────────┼─────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │ server (:3001)  │
                    │ (Wasp/Node.js)  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ postgres (:5432)│           │ tile-service    │
    │ (PostgreSQL)    │           │ (:8000)         │
    └─────────────────┘           └─────────────────┘
```

## Troubleshooting

### Server keeps restarting
Check logs: `docker-compose logs server`

Common causes:
- Missing required environment variables in `app/.env.server`
- Database not ready yet (postgres health check should handle this)
- Invalid environment variable values

### SendGrid API key error
The warning "API key does not start with SG." means you need a valid SendGrid API key in `app/.env.server`.

### Build takes too long
- First build downloads all dependencies (~5-10 min)
- Use `docker-compose up -d` (without `--build`) for subsequent starts
- Only rebuild changed services: `docker-compose build <service>`

### Frontend can't reach backend
The nginx configuration automatically proxies `/api`, `/auth`, and `/operations` to the server container. Check:
- Server is running: `docker-compose ps`
- Server logs for errors: `docker-compose logs server`

### Port already in use
```bash
# Check what's using the port
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000

# Stop conflicting services or change ports in docker-compose.yml
```

### Database connection issues
```bash
# Check postgres is healthy
docker-compose ps

# Check postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

## Notes

- Database migrations run automatically on server startup
- PostgreSQL data persists in a Docker volume (`postgres_data`)
- The email provider is configured as SendGrid for Docker builds
- Tiles are stored in the `./tiles` directory (mounted volume)
