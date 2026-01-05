# Deployment Summary for IT Team

## ⚠️ SECURITY WARNING

**CRITICAL:** The `.env` file currently contains production credentials and is tracked in git. This is a security risk and should be addressed:

1. **Immediate action needed:** Remove real credentials from `.env` before pushing to public repositories
2. **Recommended approach:**
   - Use `.env.example` with placeholder values in git
   - Keep actual `.env` with real credentials out of version control
   - Use environment-specific files (`.env.production`, `.env.staging`) locally
   - Consider using a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

## Overview
This document provides a quick reference for deploying the PDF Search application to your company server using Docker.

## Latest Changes (Jan 5, 2026)
- Fixed Docker build failures in fresh environments
- Added package-lock.json to repository (required for npm ci)
- Simplified environment variable handling
- Removed .env from .dockerignore for proper build-time loading
- Streamlined Dockerfile (removed 28 lines of redundant ARG/ENV)

**Latest commit:** `8726c36` - "fix: resolve Docker build failures for deployment"

## Quick Deployment (2 Minutes)

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- Google Cloud credentials (Document AI + Vertex AI)

### Deployment Steps

```bash
# 1. Clone repository
git clone https://github.com/anla-124/pdf-search.git
cd pdf-search

# 2. Add Google credentials
mkdir -p credentials
# Option A: Get the file from your team and place it in credentials/
# Option B: Download from Google Cloud Console (see below)
# The file should be at: credentials/google-service-account.json

# 3. Start services
docker compose up -d

# 4. Verify deployment
curl http://localhost:3000/api/health
```

**Note:** The `.env` file contains production credentials. For new deployments, copy from `.env.free.template` or `.env.paid.template` based on your tier.

### Getting Google Cloud Credentials

**Option A - Get from team (recommended):**
Ask your team for the `google-service-account.json` file and place it in `credentials/`

**Option B - Download from Google Cloud Console:**
1. Go to https://console.cloud.google.com/
2. Select project: `fine-craft-471904-i4`
3. Go to **IAM & Admin** → **Service Accounts**
4. Find the service account → **Keys** → **Add Key** → **Create new key** → **JSON**
5. Save as `credentials/google-service-account.json`

## Configuration

### Environment Variables

The `.env` file contains all required configuration. If you need to modify any values, edit the `.env` file with:

```bash
# Google Cloud (Required)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_CLOUD_PROCESSOR_ID=your-processor-id
GOOGLE_CLOUD_OCR_PROCESSOR_ID=your-ocr-processor-id
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-service-account.json

# Database (Supabase - Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vector Database (Qdrant Cloud)
QDRANT_URL=https://your-cluster.aws.cloud.qdrant.io
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION_NAME=subscription-documents

# Job Processing (Required)
CRON_SECRET=generate-secure-random-string-here

# Database Connection Pool (Important!)
DB_POOL_MIN_CONNECTIONS=5
DB_POOL_MAX_CONNECTIONS=80
DB_POOL_IDLE_TIMEOUT=300000
DB_POOL_CONNECTION_TIMEOUT=30000
```

**Generate secure CRON_SECRET:**
```bash
openssl rand -base64 32
```

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ :3000
         ↓
┌─────────────────┐
│  PDF Search App │──────┐
│  + Cron (60s)   │      │
└─────────┬───────┘      │
          │              │
          ├──────────────┼─────→ Qdrant Cloud (AWS us-east-1)
          │              │       Vector embeddings storage
          │              │
          ├──────────────┼─────→ Supabase Cloud
          │              │       PostgreSQL database
          │              │
          └──────────────┴─────→ Google Cloud Document AI
                                 PDF processing & OCR
```

## Services

| Service | Purpose | Port | Required |
|---------|---------|------|----------|
| pdf-search | Main app + cron | 3000 | Yes |

**External Services:**
- Qdrant Cloud (vector database)
- Supabase Cloud (PostgreSQL database)
- Google Cloud Document AI (PDF processing)

## Common Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f pdf-search

# Check service status
docker compose ps

# Restart after config change
docker compose restart pdf-search

# Stop all services
docker compose down

# Full rebuild
docker compose down && docker compose up -d --build
```

## Monitoring

### Health Checks
```bash
# App health
curl http://localhost:3000/api/health

# Database pool status
curl http://localhost:3000/api/health/pool
```

### Job Queue
```bash
# Check queue status
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs

# View cron logs
docker compose exec pdf-search cat /var/log/cron.log
```

## Production Checklist

- [ ] Set strong `CRON_SECRET` (use `openssl rand -base64 32`)
- [ ] Configure firewall (allow port 3000)
- [ ] Set up HTTPS/reverse proxy (see deployment/DOCKER-DEPLOYMENT.md)
- [ ] Verify cloud service backups (Qdrant Cloud, Supabase)
- [ ] Configure monitoring/alerts
- [ ] Test concurrent uploads (see deployment/TESTING.md)
- [ ] **SECURITY:** Remove credentials from `.env` and use environment-specific files
- [ ] Document access credentials securely (use secrets manager)

## Firewall Configuration

```bash
# Allow app port
sudo ufw allow 3000/tcp

# Optional: Allow Qdrant externally (if needed)
sudo ufw allow 6333/tcp
```

## HTTPS Setup (Optional but Recommended)

Using Nginx as reverse proxy:

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup Strategy

### Qdrant Data
Qdrant Cloud provides automated backups and snapshots. See Qdrant Cloud dashboard for backup configuration.

### Database
Supabase Cloud provides automated backups and point-in-time recovery. Access backup settings in your Supabase dashboard.

## Troubleshooting

### App won't start
```bash
# Check logs
docker compose logs pdf-search

# Common issues:
# 1. Missing credentials file
ls -la credentials/google-service-account.json

# 2. Port already in use
lsof -i:3000

# 3. Environment variables not loaded
docker compose exec pdf-search env | grep NEXT_PUBLIC
```

### Jobs not processing
```bash
# Check cron is running
docker compose exec pdf-search ps aux | grep crond

# Manual trigger
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs
```

### External service connection issues
Check your `.env` file for correct credentials:
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- QDRANT_URL and QDRANT_API_KEY
- GOOGLE_CLOUD_PROJECT_ID

## Resource Requirements

### Minimum (Testing)
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB

### Recommended (Production)
- CPU: 4 cores
- RAM: 8GB
- Disk: 100GB (depends on document volume)

## Performance Tuning

To handle more concurrent uploads, edit `.env`:

```bash
# Increase from 10 to 20 concurrent documents
MAX_CONCURRENT_DOCUMENTS=20

# Increase upload limits
UPLOAD_GLOBAL_LIMIT=24
UPLOAD_PER_USER_LIMIT=10
```

Then restart:
```bash
docker compose restart pdf-search
```

## Documentation

- **Quick Start:** `DOCKER-QUICK-START.md` (5-minute setup)
- **Full Guide:** `deployment/DOCKER-DEPLOYMENT.md` (detailed instructions)
- **Monitoring:** `deployment/MONITORING.md` (health checks, logs, metrics)
- **Testing:** `deployment/TESTING.md` (concurrent upload tests, validation)
- **macOS Service:** `deployment/launchd/INSTALL-MACOS.md` (optional)

## Support Contacts

- **Repository:** https://github.com/anla-124/pdf-search
- **Issues:** https://github.com/anla-124/pdf-search/issues

## Next Steps After Deployment

1. Verify health endpoints are responding
2. Upload a test document
3. Run similarity search test
4. Monitor logs for any errors
5. Set up automated backups
6. Configure monitoring/alerting
7. Test concurrent uploads (see deployment/TESTING.md)

---

**Deployment Date:** December 18, 2025
**Version:** Latest (commit: 2e6b714)
**Prepared by:** Claude Code
