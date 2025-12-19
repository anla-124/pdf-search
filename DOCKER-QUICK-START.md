# Docker Quick Start - For IT Team

## TL;DR - Deploy in 5 Minutes

```bash
# 1. Clone
git clone https://github.com/anla-124/pdf-search.git && cd pdf-search

# 2. Configure
cp .env.free.template .env.local
# Edit .env.local with your values

# 3. Add Google credentials
mkdir -p credentials
cp /path/to/google-service-account.json credentials/

# 4. Start
docker-compose up -d --build

# 5. Verify
curl http://localhost:3000/api/health
```

Done! App running on http://localhost:3000

## What's Included

| Service | Purpose | Port | Status |
|---------|---------|------|--------|
| pdf-search | Main app + cron | 3000 | Required |
| qdrant | Vector database | 6333 | Required |
| postgres | SQL database | 5432 | Optional (using Supabase by default) |

## Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │ :3000
         ↓
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  PDF Search App │────→│   Qdrant     │     │  Supabase    │
│  + Cron (60s)   │     │  (vectors)   │     │  (database)  │
└─────────────────┘     └──────────────┘     └──────────────┘
         │
         ↓
┌─────────────────┐
│  Google Cloud   │
│  Document AI    │
│  Vertex AI      │
└─────────────────┘
```

## Key Environment Variables

**Required:**
- `GOOGLE_CLOUD_PROJECT_ID` - Your GCP project
- `GOOGLE_CLOUD_PROCESSOR_ID` - Document AI processor
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account JSON
- `NEXT_PUBLIC_SUPABASE_URL` - Database URL
- `SUPABASE_SERVICE_ROLE_KEY` - Database key
- `QDRANT_URL` - `http://qdrant:6333` (Docker network)
- `CRON_SECRET` - Random secure string
- `DB_POOL_CONNECTION_TIMEOUT` - `30000` (important!)

## Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f pdf-search

# Restart after config change
docker-compose restart pdf-search

# Full rebuild
docker-compose down && docker-compose up -d --build

# Check status
docker-compose ps
curl http://localhost:3000/api/health
```

## Monitoring Job Queue

```bash
# Check queue status
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs

# View cron logs
docker-compose exec pdf-search cat /var/log/cron.log

# Watch processing in real-time
docker-compose logs -f pdf-search | grep "Processing"
```

## Troubleshooting

### App won't start
```bash
docker-compose logs pdf-search
# Check: credentials file exists, env vars set
```

### Jobs not processing
```bash
# Check cron is running
docker-compose exec pdf-search ps aux | grep crond

# Manual trigger
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs
```

### Out of memory
```bash
# Check usage
docker stats

# Add limits in docker-compose.yml
# See deployment/DOCKER-DEPLOYMENT.md
```

## Production Checklist

- [ ] Set strong `CRON_SECRET`
- [ ] Configure firewall (allow port 3000)
- [ ] Set up HTTPS/reverse proxy
- [ ] Enable automated backups
- [ ] Configure monitoring/alerts
- [ ] Test concurrent uploads (see deployment/TESTING.md)
- [ ] Document access credentials

## Support

Full docs: `deployment/DOCKER-DEPLOYMENT.md`
Monitoring: `deployment/MONITORING.md`
Testing: `deployment/TESTING.md`
