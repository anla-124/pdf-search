# Docker Deployment Guide

This guide covers deploying the PDF Search application using Docker for your company server.

## Overview

The Docker setup includes:
- **PDF Search App**: Next.js application with built-in cron job processing
- **Qdrant**: Self-hosted vector database (included)
- **PostgreSQL**: Optional self-hosted database (commented out by default)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- Google Cloud credentials for Document AI and Vertex AI

## Quick Start

### 1. Clone and Prepare

```bash
git clone https://github.com/anla-124/pdf-search.git
cd pdf-search
```

### 2. Configure Environment

Create `.env.local` from template:

```bash
cp .env.free.template .env.local
```

Edit `.env.local` and configure:

```bash
# Required: Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_CLOUD_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_OCR_PROCESSOR_ID=your-ocr-processor-id
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json

# Required: Database (Supabase or self-hosted PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required: Qdrant (using Docker service)
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=  # Leave empty for local development
QDRANT_COLLECTION_NAME=pdf_embeddings

# Required: Job Processing
CRON_SECRET=your-secure-random-string-here

# Required: Database Connection Pool
DB_POOL_MIN_CONNECTIONS=5
DB_POOL_MAX_CONNECTIONS=80
DB_POOL_IDLE_TIMEOUT=300000
DB_POOL_CONNECTION_TIMEOUT=30000
```

### 3. Add Google Cloud Credentials

Place your Google Cloud service account JSON file:

```bash
mkdir -p credentials
cp /path/to/your/google-service-account.json credentials/
```

### 4. Build and Start

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f pdf-ai-assistant
```

### 5. Verify Deployment

```bash
# Check app health
curl http://localhost:3000/api/health

# Check Qdrant
curl http://localhost:6333/
```

## Configuration Options

### Option 1: External Services (Default)

Uses hosted Supabase + self-hosted Qdrant:

```yaml
services:
  pdf-ai-assistant:
    # ... uses external Supabase
  qdrant:
    # ... self-hosted
```

**Pros**: Simple, managed database
**Cons**: Requires Supabase subscription

### Option 2: Fully Self-Hosted

Uncomment PostgreSQL in `docker-compose.yml`:

```yaml
services:
  pdf-ai-assistant:
    depends_on:
      postgres:
        condition: service_healthy
  
  postgres:
    # Uncomment this entire section
```

Update `.env.local`:

```bash
# Change Supabase URLs to local PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=http://postgres:5432
# ... update other database configs
```

**Pros**: Full control, no external dependencies
**Cons**: More management overhead

## Production Deployment

### 1. Update Environment Variables

```bash
# Generate secure secrets
CRON_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Update .env.local
nano .env.local
```

### 2. Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 3000/tcp  # App
sudo ufw allow 6333/tcp  # Qdrant (if exposing externally)
```

### 3. Set Up Reverse Proxy (Optional)

Use Nginx or Traefik for HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name pdf-search.company.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Enable Auto-Restart

```bash
# Services restart automatically with docker-compose
# Verify restart policy in docker-compose.yml:
restart: unless-stopped
```

### 5. Set Up Backups

```bash
# Backup Qdrant data
docker run --rm \
  -v pdf-search_qdrant-storage:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/qdrant-$(date +%Y%m%d).tar.gz /data

# Backup PostgreSQL (if self-hosted)
docker-compose exec postgres pg_dump -U postgres pdf_search > backup.sql
```

## Monitoring

### Check Service Health

```bash
# All services
docker-compose ps

# App health
curl http://localhost:3000/api/health

# Job queue status
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs
```

### View Logs

```bash
# App logs
docker-compose logs -f pdf-ai-assistant

# Cron job logs
docker-compose logs -f pdf-ai-assistant | grep "cron"

# Qdrant logs
docker-compose logs -f qdrant

# All logs
docker-compose logs -f
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Volume sizes
docker volume ls
du -sh /var/lib/docker/volumes/pdf-search_*
```

## Troubleshooting

### App Won't Start

```bash
# Check logs
docker-compose logs pdf-ai-assistant

# Common issues:
# 1. Missing credentials
ls -la credentials/google-service-account.json

# 2. Database connection
docker-compose exec pdf-ai-assistant curl http://localhost:3000/api/health

# 3. Build errors
docker-compose build --no-cache
```

### Jobs Not Processing

```bash
# Check cron is running
docker-compose exec pdf-ai-assistant ps aux | grep crond

# Test manual trigger
docker-compose exec pdf-ai-assistant curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs

# Check cron logs
docker-compose exec pdf-ai-assistant cat /var/log/cron.log
```

### Qdrant Connection Failed

```bash
# Check Qdrant is running
curl http://localhost:6333/

# Check network connectivity
docker-compose exec pdf-ai-assistant ping qdrant

# Recreate Qdrant
docker-compose stop qdrant
docker-compose rm qdrant
docker volume rm pdf-search_qdrant-storage
docker-compose up -d qdrant
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check health
curl http://localhost:3000/api/health
```

### Clean Up

```bash
# Remove stopped containers
docker-compose down

# Remove volumes (⚠️ deletes data!)
docker-compose down -v

# Clean Docker system
docker system prune -a
```

### Database Migration

```bash
# Backup first!
docker-compose exec postgres pg_dump -U postgres pdf_search > backup.sql

# Run migrations
docker-compose exec pdf-ai-assistant npm run migrate
```

## Performance Tuning

### Increase Concurrent Processing

Edit `.env.local`:

```bash
# Increase from 10 to 20 concurrent documents
MAX_CONCURRENT_DOCUMENTS=20

# Increase upload limits
UPLOAD_GLOBAL_LIMIT=24
UPLOAD_PER_USER_LIMIT=10
```

Restart:

```bash
docker-compose restart pdf-ai-assistant
```

### Resource Limits

Edit `docker-compose.yml`:

```yaml
services:
  pdf-ai-assistant:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Security

### 1. Secure Secrets

```bash
# Use Docker secrets (Swarm mode)
echo "my-secret" | docker secret create cron_secret -

# Or use environment variable encryption
# Store in encrypted vault (e.g., HashiCorp Vault)
```

### 2. Network Isolation

```yaml
services:
  pdf-ai-assistant:
    networks:
      - frontend
      - backend
  
  postgres:
    networks:
      - backend  # Not exposed to frontend
```

### 3. Read-Only Filesystem

```yaml
services:
  pdf-ai-assistant:
    read_only: true
    tmpfs:
      - /tmp
      - /var/log
```

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify configuration: Review `.env.local`
3. Test health: `curl http://localhost:3000/api/health`
4. Review monitoring: See `deployment/MONITORING.md`
5. Check documentation: `deployment/README.md`

## Next Steps

- Set up monitoring (deployment/MONITORING.md)
- Run concurrent upload tests (deployment/TESTING.md)
- Configure backups (see "Set Up Backups" above)
- Enable HTTPS (see "Set Up Reverse Proxy" above)
