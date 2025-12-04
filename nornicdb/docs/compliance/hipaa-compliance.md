# HIPAA Compliance

**Healthcare data protection for US organizations.**

## Overview

NornicDB provides features to help covered entities and business associates comply with HIPAA requirements for Protected Health Information (PHI).

## HIPAA Security Rule Mapping

### Administrative Safeguards (§164.308)

| Requirement | Section | NornicDB Feature |
|-------------|---------|------------------|
| Security Management | (a)(1) | Audit logging, risk analysis |
| Workforce Security | (a)(3) | RBAC, user management |
| Information Access | (a)(4) | Role-based permissions |
| Security Training | (a)(5) | Audit trails for review |
| Security Incidents | (a)(6) | Security alerting |
| Contingency Plan | (a)(7) | Backup, restore |

### Technical Safeguards (§164.312)

| Requirement | Section | NornicDB Feature |
|-------------|---------|------------------|
| Access Control | (a)(1) | JWT auth, RBAC |
| Audit Controls | (b) | Comprehensive audit logging |
| Integrity | (c)(1) | Checksums, encryption |
| Person Authentication | (d) | Multi-factor ready |
| Transmission Security | (e)(1) | TLS 1.3 |

### Physical Safeguards (§164.310)

| Requirement | Section | Deployment Responsibility |
|-------------|---------|---------------------------|
| Facility Access | (a)(1) | Customer infrastructure |
| Workstation Security | (b) | Customer responsibility |
| Device Controls | (d)(1) | Customer responsibility |

## PHI Protection

### Automatic PHI Detection

NornicDB can automatically detect and protect PHI fields:

```yaml
# Auto-detect PHI patterns
phi_detection:
  enabled: true
  patterns:
    - ssn
    - medical_record
    - diagnosis
    - prescription
    - insurance_id
```

### Field-Level Encryption

```yaml
encryption:
  enabled: true
  fields:
    - patient_name
    - diagnosis
    - treatment
    - medical_record_number
    - insurance_info
```

### Access Logging

All PHI access is logged:

```json
{
  "timestamp": "2024-12-01T10:00:00Z",
  "type": "DATA_READ",
  "user_id": "provider-123",
  "resource": "patient-record",
  "resource_id": "patient-456",
  "action": "READ",
  "phi_accessed": true,
  "legal_basis": "treatment",
  "details": "Routine care access"
}
```

## Access Control (§164.312(a))

### Unique User Identification

```go
// Each user has unique ID
user := &User{
    ID:       "usr_" + uuid.New().String(),
    Username: "dr.smith",
    Roles:    []Role{RoleProvider},
}
```

### Role-Based Access

```yaml
rbac:
  roles:
    - name: provider
      permissions: [read_phi, write_phi]
    - name: admin
      permissions: [read_phi, write_phi, manage_users]
    - name: billing
      permissions: [read_phi_limited]
    - name: research
      permissions: [read_deidentified]
```

### Minimum Necessary

```go
// Return only necessary fields
result, _ := db.Query(ctx, `
    MATCH (p:Patient {id: $id})
    RETURN p.name, p.dob  // Only needed fields
`, params)
```

## Audit Controls (§164.312(b))

### Required Audit Events

| Event | Logged Data |
|-------|-------------|
| Login | User, IP, time, success/fail |
| PHI Access | User, patient, fields, purpose |
| PHI Modification | User, patient, changes, time |
| Export | User, format, records |
| System Changes | User, setting, old/new value |

### Audit Log Format

```json
{
  "event_id": "evt_abc123",
  "timestamp": "2024-12-01T10:30:00Z",
  "event_type": "PHI_ACCESS",
  "user_id": "provider-123",
  "user_name": "Dr. Smith",
  "patient_id": "patient-456",
  "action": "READ",
  "fields_accessed": ["diagnosis", "medications"],
  "purpose": "treatment",
  "ip_address": "192.168.1.100",
  "workstation": "clinic-ws-01"
}
```

### Retention

```yaml
audit:
  retention_days: 2555  # 7 years (HIPAA: 6 years minimum)
  phi_retention: 2555
```

## Transmission Security (§164.312(e))

### TLS Configuration

```yaml
tls:
  enabled: true
  min_version: TLS1.2  # HIPAA minimum
  preferred_version: TLS1.3
  cipher_suites:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
```

### Certificate Management

```bash
# Generate HIPAA-compliant certificates
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout server.key -out server.crt
```

## Integrity Controls (§164.312(c))

### Data Integrity

```go
// Checksums for PHI
node := &Node{
    ID:         "patient-123",
    Properties: map[string]any{"diagnosis": "..."},
    Checksum:   sha256.Sum256(data),
}
```

### Audit Trail Integrity

```yaml
audit:
  integrity:
    enabled: true
    algorithm: SHA-256
    chain: true  # Hash chain for tamper detection
```

## Breach Notification (§164.408)

### Breach Detection

```go
// Set up breach alerting
logger.SetAlertCallback(func(event audit.Event) {
    if event.Type == audit.EventSecurityAlert {
        notifySecurityTeam(event)
        if isBreach(event) {
            initiateBreachResponse(event)
        }
    }
})
```

### Breach Response

```bash
# Generate breach impact report
nornicdb hipaa breach-report \
  --incident-id "INC-2024-001" \
  --start "2024-11-01" \
  --end "2024-11-15"
```

## Business Associate Agreements

When deploying NornicDB:

1. **Self-Hosted**: You are the covered entity
2. **Cloud-Hosted**: Ensure BAA with cloud provider
3. **Managed Service**: Require BAA from service provider

## Compliance Checklist

### Technical Safeguards

- [ ] Enable TLS 1.2+ for all connections
- [ ] Enable encryption at rest (AES-256)
- [ ] Configure RBAC with minimum necessary
- [ ] Enable comprehensive audit logging
- [ ] Set up security alerting
- [ ] Configure session timeouts

### Administrative Safeguards

- [ ] Document security policies
- [ ] Train workforce on PHI handling
- [ ] Establish incident response procedures
- [ ] Conduct risk assessments
- [ ] Maintain business associate agreements

### Audit Requirements

- [ ] Retain audit logs for 6+ years
- [ ] Review audit logs regularly
- [ ] Document access reviews
- [ ] Maintain activity reports

## Configuration Example

```yaml
# HIPAA-compliant configuration
encryption:
  enabled: true
  algorithm: AES-256-GCM
  
tls:
  enabled: true
  min_version: TLS1.2

auth:
  enabled: true
  session_timeout: 15m
  max_failed_attempts: 3
  lockout_duration: 30m

audit:
  enabled: true
  log_phi_access: true
  retention_days: 2555
  alert_on_failures: true

rbac:
  enabled: true
  default_role: none  # No access by default
```

## See Also

- **[Encryption](encryption.md)** - PHI encryption
- **[RBAC](rbac.md)** - Access control
- **[Audit Logging](audit-logging.md)** - Audit controls
- **[GDPR Compliance](gdpr-compliance.md)** - EU requirements
- **[SOC2 Compliance](soc2-compliance.md)** - Service controls

