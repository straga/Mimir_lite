# Audit Logging

**Comprehensive audit trails for compliance and security monitoring.**

## Overview

NornicDB provides immutable audit logging required by major regulatory frameworks:

- **GDPR Art.30** - Records of processing activities
- **HIPAA §164.312(b)** - Audit controls
- **SOC2 CC7.2** - System monitoring
- **FISMA AU-2** - Audit events

## Features

- ✅ Immutable append-only logs
- ✅ Structured JSON format
- ✅ Real-time security alerting
- ✅ Compliance reporting
- ✅ Configurable retention (7+ years)
- ✅ User activity tracking
- ✅ Data access logging

## Configuration

### Enable Audit Logging

```yaml
# nornicdb.yaml
audit:
  enabled: true
  log_path: /var/log/nornicdb/audit.log
  
  # Retention (SOC2 requires 7 years)
  retention_days: 2555  # ~7 years
  
  # What to log
  log_queries: true
  log_auth: true
  log_data_access: true
  log_config_changes: true
  
  # Alerting
  alert_on_failures: true
  alert_threshold: 5  # Alert after 5 failed logins
```

### Code Example

```go
// Initialize audit logger
config := audit.DefaultConfig()
config.LogPath = "/var/log/nornicdb/audit.log"
config.RetentionDays = 2555

logger, err := audit.NewLogger(config)
if err != nil {
    log.Fatal(err)
}
defer logger.Close()

// Set up security alerting
logger.SetAlertCallback(func(event audit.Event) {
    if event.Type == audit.EventSecurityAlert {
        sendSecurityAlert(event)
    }
})

// Attach to server
server.SetAuditLogger(logger)
```

## Event Types

### Authentication Events

| Event Type | Description |
|------------|-------------|
| `LOGIN` | Successful login |
| `LOGIN_FAILED` | Failed login attempt |
| `LOGOUT` | User logout |
| `PASSWORD_CHANGE` | Password changed |
| `ACCESS_DENIED` | Authorization failure |

### Data Events (GDPR Art.15)

| Event Type | Description |
|------------|-------------|
| `DATA_READ` | Data accessed |
| `DATA_CREATE` | Data created |
| `DATA_UPDATE` | Data modified |
| `DATA_DELETE` | Data deleted |
| `DATA_EXPORT` | Data exported |

### GDPR Rights Events

| Event Type | Description |
|------------|-------------|
| `ERASURE_REQUEST` | Right to be forgotten request |
| `ERASURE_COMPLETE` | Erasure completed |
| `EXPORT_REQUEST` | Data portability request |
| `CONSENT_GIVEN` | Consent recorded |
| `CONSENT_REVOKED` | Consent withdrawn |

### System Events

| Event Type | Description |
|------------|-------------|
| `CONFIG_CHANGE` | Configuration modified |
| `BACKUP` | Backup created |
| `RESTORE` | Backup restored |
| `SECURITY_ALERT` | Security event detected |

## Log Format

### JSON Structure

```json
{
  "id": "evt_abc123xyz",
  "timestamp": "2024-12-01T10:30:00.123Z",
  "type": "DATA_READ",
  "user_id": "usr_123",
  "username": "alice",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "resource": "node",
  "resource_id": "patient-456",
  "action": "READ",
  "success": true,
  "details": "PHI access",
  "session_id": "sess_789"
}
```

### Fields

| Field | Description | Required |
|-------|-------------|----------|
| `id` | Unique event ID | Yes |
| `timestamp` | ISO 8601 timestamp | Yes |
| `type` | Event type | Yes |
| `user_id` | User identifier | Yes |
| `username` | Human-readable name | No |
| `ip_address` | Client IP | Yes |
| `resource` | Object type accessed | For data events |
| `resource_id` | Object identifier | For data events |
| `action` | Operation performed | For data events |
| `success` | Operation result | Yes |
| `details` | Additional context | No |

## Compliance Reporting

### Generate Reports

```go
// Create audit reader
reader := audit.NewReader(config.LogPath)

// Generate compliance report
report, err := reader.GenerateComplianceReport(
    time.Now().AddDate(0, -1, 0), // Start: 1 month ago
    time.Now(),                    // End: now
    "Monthly Compliance Report",
)

fmt.Printf("Total events: %d\n", report.TotalEvents)
fmt.Printf("Failed logins: %d\n", report.FailedLogins)
fmt.Printf("Data accesses: %d\n", report.DataAccesses)
fmt.Printf("GDPR requests: %d\n", report.GDPRRequests)
```

### CLI Reports

```bash
# Generate compliance report
nornicdb audit report --from "2024-11-01" --to "2024-12-01"

# Export for external analysis
nornicdb audit export --format csv --output audit-november.csv

# Search for specific events
nornicdb audit search --user alice --type LOGIN_FAILED
```

## Security Alerting

### Configure Alerts

```go
logger.SetAlertCallback(func(event audit.Event) {
    switch event.Type {
    case audit.EventLoginFailed:
        if getFailedLoginCount(event.IPAddress) >= 5 {
            sendSlackAlert("Multiple failed logins from " + event.IPAddress)
        }
    case audit.EventSecurityAlert:
        sendPagerDutyAlert(event)
    case audit.EventErasureRequest:
        notifyDPO(event) // Notify Data Protection Officer
    }
})
```

### Alert Conditions

| Condition | Default Threshold | Action |
|-----------|-------------------|--------|
| Failed logins | 5 in 15 minutes | Alert + lockout |
| Unusual data access | N/A | Alert |
| Config changes | Any | Alert |
| GDPR requests | Any | Notify DPO |

## Log Rotation

### Automatic Rotation

```yaml
audit:
  rotation:
    max_size: 100MB
    max_age: 7d
    max_backups: 90
    compress: true
```

### Manual Rotation

```bash
# Rotate logs
nornicdb audit rotate

# Archive old logs
nornicdb audit archive --before "2024-01-01" --output archive-2023.tar.gz
```

## Retention Management

### GDPR Requirements
- Keep logs as long as necessary for purpose
- Delete when no longer needed

### HIPAA Requirements
- Minimum 6 years retention
- Recommend 7+ years

### SOC2 Requirements
- 7 years recommended

```yaml
# Configure retention
audit:
  retention_days: 2555  # 7 years
  auto_purge: true      # Delete expired logs
```

## Integration

### Syslog

```yaml
audit:
  syslog:
    enabled: true
    address: "syslog.example.com:514"
    facility: local0
```

### Elasticsearch

```yaml
audit:
  elasticsearch:
    enabled: true
    urls: ["https://es.example.com:9200"]
    index: "nornicdb-audit"
```

### Splunk

```yaml
audit:
  splunk:
    enabled: true
    hec_url: "https://splunk.example.com:8088"
    token: "${SPLUNK_HEC_TOKEN}"
```

## Best Practices

### DO:
- Enable audit logging in production
- Set up alerting for security events
- Regularly review audit logs
- Keep logs for compliance period
- Encrypt log files at rest

### DON'T:
- Disable audit logging
- Delete logs before retention period
- Log sensitive data in details field
- Ignore security alerts

## See Also

- **[RBAC](rbac.md)** - Access control
- **[Encryption](encryption.md)** - Data protection
- **[HIPAA Compliance](hipaa-compliance.md)** - Healthcare requirements
- **[GDPR Compliance](gdpr-compliance.md)** - EU data protection

