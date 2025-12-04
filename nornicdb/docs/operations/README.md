# Operations Guide

**Deploy, monitor, and maintain NornicDB in production.**

## 📚 Documentation

- **[Deployment](deployment.md)** - Production deployment guide
- **[Docker](docker.md)** - Docker and Kubernetes
- **[Monitoring](monitoring.md)** - Metrics and alerting
- **[Backup & Restore](backup-restore.md)** - Data protection
- **[Scaling](scaling.md)** - Horizontal and vertical scaling
- **[Cluster Security](cluster-security.md)** - Authentication for clusters
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions

## 🚀 Quick Start

### Docker Deployment

```bash
docker run -d \
  --name nornicdb \
  -p 7474:7474 \
  -p 7687:7687 \
  -v nornicdb-data:/data \
  timothyswt/nornicdb-arm64-metal:latest
```

[Complete Docker guide →](docker.md)

### Monitoring

```bash
# Prometheus metrics
curl http://localhost:9090/metrics

# Health check
curl http://localhost:7474/health
```

[Complete monitoring guide →](monitoring.md)

### Backup

```bash
# Backup database
nornicdb backup --output=backup-$(date +%Y%m%d).tar.gz

# Restore database
nornicdb restore --input=backup-20251201.tar.gz
```

[Complete backup guide →](backup-restore.md)

## 📖 Operations Topics

### Deployment
- Docker deployment
- Kubernetes deployment
- Bare metal installation
- Cloud providers (AWS, GCP, Azure)

[Deployment guide →](deployment.md)

### Monitoring
- Prometheus metrics
- Grafana dashboards
- Health checks
- Log aggregation

[Monitoring guide →](monitoring.md)

### Scaling
- Read replicas
- Sharding
- Load balancing
- Resource optimization

[Scaling guide →](scaling.md)

## 🆘 Troubleshooting

Common issues and solutions:
- Connection problems
- Performance issues
- Memory errors
- GPU problems

[Troubleshooting guide →](troubleshooting.md)

---

**Deploy to production** → **[Deployment Guide](deployment.md)**
