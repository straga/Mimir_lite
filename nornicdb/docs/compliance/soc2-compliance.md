# SOC2 Compliance

**Service Organization Control 2 compliance for service providers.**

## Overview

NornicDB provides features to help organizations achieve SOC2 compliance for the Security, Availability, and Confidentiality trust service criteria.

## Trust Service Criteria

### Security (CC6)

| Criteria | Requirement | NornicDB Feature |
|----------|-------------|------------------|
| CC6.1 | Logical access controls | RBAC, JWT authentication |
| CC6.2 | Access provisioning | User management API |
| CC6.3 | Access removal | User disable/delete |
| CC6.6 | Encryption | AES-256-GCM, TLS 1.3 |
| CC6.7 | Transmission security | TLS encryption |

### Availability (A1)

| Criteria | Requirement | NornicDB Feature |
|----------|-------------|------------------|
| A1.1 | Capacity management | Metrics, monitoring |
| A1.2 | Backup procedures | Backup API |
| A1.3 | Recovery procedures | Restore API |

### Confidentiality (C1)

| Criteria | Requirement | NornicDB Feature |
|----------|-------------|------------------|
| C1.1 | Confidential data identification | Field-level encryption |
| C1.2 | Confidential data disposal | Secure deletion |

### Processing Integrity (PI1)

| Criteria | Requirement | NornicDB Feature |
|----------|-------------|------------------|
| PI1.1 | Processing accuracy | ACID transactions |
| PI1.4 | Error detection | Validation, checksums |

## Logical Access Controls (CC6.1)

### Authentication

```yaml
auth:
  enabled: true
  jwt:
    algorithm: HS256
    expiry: 24h
  password:
    min_length: 12
    require_complexity: true
  mfa:
    enabled: true  # When available
```

### Authorization

```yaml
rbac:
  enabled: true
  roles:
    - name: admin
      permissions: [read, write, admin]
    - name: operator
      permissions: [read, write]
    - name: viewer
      permissions: [read]
```

### Access Reviews

```bash
# Generate access review report
nornicdb soc2 access-review \
  --period monthly \
  --output access-review-december.pdf
```

## System Monitoring (CC7.2)

### Audit Logging

```yaml
audit:
  enabled: true
  retention_days: 2555  # 7 years
  
  events:
    - authentication
    - authorization
    - data_access
    - configuration
    - system_events
```

### Metrics & Alerting

```yaml
monitoring:
  prometheus:
    enabled: true
    port: 9090
  
  alerts:
    failed_logins:
      threshold: 5
      window: 15m
    error_rate:
      threshold: 1%
      window: 5m
```

### Health Checks

```bash
# Health endpoint (minimal info, no sensitive data)
curl http://localhost:7474/health
# {"status": "healthy"}

# Detailed status (requires auth)
curl http://localhost:7474/status \
  -H "Authorization: Bearer $TOKEN"
```

## Change Management (CC8.1)

### Configuration Control

```yaml
# Version-controlled configuration
config:
  version: "1.2.3"
  last_modified: "2024-12-01T10:00:00Z"
  modified_by: "admin"
```

### Change Logging

```json
{
  "timestamp": "2024-12-01T10:00:00Z",
  "type": "CONFIG_CHANGE",
  "user_id": "admin",
  "setting": "auth.session_timeout",
  "old_value": "30m",
  "new_value": "15m",
  "approved_by": "security-team"
}
```

## Risk Management (CC3.1)

### Security Defaults

NornicDB ships with secure defaults:

```yaml
# Secure defaults (as of v0.1.4)
defaults:
  address: "127.0.0.1"      # Localhost only
  cors_enabled: false       # CORS disabled
  rate_limiting: true       # Rate limiting enabled
  encryption: false         # Enable for production
  audit_logging: true       # Logging enabled
```

### Rate Limiting

```yaml
rate_limiting:
  enabled: true
  per_minute: 100
  per_hour: 3000
  burst: 10
```

## Backup & Recovery (A1.2, A1.3)

### Backup Procedures

```bash
# Create backup
nornicdb backup --output backup-$(date +%Y%m%d).tar.gz

# Verify backup
nornicdb backup verify --input backup-20241201.tar.gz
```

### Recovery Procedures

```bash
# Restore from backup
nornicdb restore --input backup-20241201.tar.gz

# Point-in-time recovery
nornicdb restore --input backup-20241201.tar.gz --to "2024-12-01T10:00:00Z"
```

### Recovery Testing

```bash
# Test recovery (dry run)
nornicdb restore --input backup-20241201.tar.gz --dry-run

# Verify data integrity
nornicdb verify --check-all
```

## Encryption (CC6.6, CC6.7)

### At Rest

```yaml
encryption:
  enabled: true
  algorithm: AES-256-GCM
  key_rotation_days: 90
```

### In Transit

```yaml
tls:
  enabled: true
  min_version: TLS1.2
  cert_file: /etc/nornicdb/server.crt
  key_file: /etc/nornicdb/server.key
```

## Compliance Reporting

### Generate SOC2 Report

```bash
# Generate SOC2 evidence report
nornicdb soc2 report \
  --period "2024-01-01:2024-12-31" \
  --output soc2-evidence-2024.pdf

# Include specific controls
nornicdb soc2 report \
  --controls CC6.1,CC6.6,CC7.2 \
  --output access-controls-report.pdf
```

### Report Contents

- User access reviews
- Authentication logs
- Configuration changes
- Security incidents
- Backup verification
- System uptime metrics

## Control Evidence

### CC6.1 - Access Control Evidence

```sql
-- Active users and roles
MATCH (u:User) RETURN u.username, u.roles, u.last_login

-- Failed login attempts
MATCH (e:AuditEvent {type: 'LOGIN_FAILED'})
RETURN e.username, e.ip_address, e.timestamp
```

### CC7.2 - Monitoring Evidence

```bash
# System metrics
curl http://localhost:7474/metrics -H "Authorization: Bearer $TOKEN"

# Audit log summary
nornicdb audit summary --period monthly
```

### CC8.1 - Change Evidence

```bash
# Configuration history
nornicdb config history --period yearly

# Change log
nornicdb audit search --type CONFIG_CHANGE
```

## Compliance Checklist

### Security Controls

- [ ] Enable authentication
- [ ] Configure RBAC
- [ ] Enable TLS encryption
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up security alerting

### Operational Controls

- [ ] Configure monitoring
- [ ] Set up backup procedures
- [ ] Test recovery procedures
- [ ] Document change management
- [ ] Conduct access reviews

### Documentation

- [ ] Security policies
- [ ] Access control matrix
- [ ] Incident response plan
- [ ] Business continuity plan
- [ ] Change management procedures

## See Also

- **[Encryption](encryption.md)** - Data protection
- **[RBAC](rbac.md)** - Access control
- **[Audit Logging](audit-logging.md)** - Monitoring
- **[HIPAA Compliance](hipaa-compliance.md)** - Healthcare
- **[GDPR Compliance](gdpr-compliance.md)** - EU requirements

