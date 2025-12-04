# GDPR Compliance

**EU General Data Protection Regulation compliance features.**

## Overview

NornicDB provides built-in features to help organizations comply with GDPR requirements for processing personal data of EU residents.

## Supported GDPR Articles

| Article | Requirement | NornicDB Feature |
|---------|-------------|------------------|
| Art.15 | Right of Access | Data export API |
| Art.16 | Right to Rectification | Update APIs |
| Art.17 | Right to Erasure | GDPR delete endpoint |
| Art.20 | Data Portability | JSON/CSV export |
| Art.25 | Privacy by Design | Encryption, minimization |
| Art.30 | Records of Processing | Audit logging |
| Art.32 | Security | Encryption, access control |

## Right of Access (Art.15)

### Export User Data

```bash
# Export all data for a user
curl -X POST http://localhost:7474/nornicdb/gdpr/export \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"user_id": "user-123", "format": "json"}'
```

### API Response

```json
{
  "user_id": "user-123",
  "export_date": "2024-12-01T10:00:00Z",
  "data": {
    "nodes": [...],
    "edges": [...],
    "properties": {...}
  },
  "format": "json"
}
```

### Code Example

```go
// Export user data
exportData, err := db.ExportUserData(ctx, "user-123")
if err != nil {
    return err
}

// Generate portable format
json.Marshal(exportData)
```

## Right to Erasure (Art.17)

### Delete User Data

```bash
# Request erasure of all user data
curl -X DELETE http://localhost:7474/nornicdb/gdpr/user/user-123 \
  -H "Authorization: Bearer $TOKEN"
```

### Response

```json
{
  "status": "completed",
  "user_id": "user-123",
  "deleted_nodes": 42,
  "deleted_edges": 156,
  "timestamp": "2024-12-01T10:00:00Z"
}
```

### Code Example

```go
// Delete all user data (GDPR erasure)
err := db.DeleteUserData(ctx, "user-123")
if err != nil {
    return err
}

// Audit log is automatically created
// Logs: "gdpr_delete", user_id, timestamp, count
```

### Anonymization Alternative

For data that cannot be deleted (legal requirements):

```bash
# Anonymize instead of delete
curl -X POST http://localhost:7474/nornicdb/gdpr/anonymize/user-123 \
  -H "Authorization: Bearer $TOKEN"
```

```go
// Anonymize user data
err := db.AnonymizeUserData(ctx, "user-123")
// Replaces personal data with anonymized values
// Maintains data structure for analytics
```

## Data Portability (Art.20)

### Export Formats

```bash
# JSON format (default)
curl -X POST http://localhost:7474/nornicdb/gdpr/export \
  -d '{"user_id": "user-123", "format": "json"}'

# CSV format
curl -X POST http://localhost:7474/nornicdb/gdpr/export \
  -d '{"user_id": "user-123", "format": "csv"}'
```

### Import to Another System

```go
// Export data
exportData := db.ExportUserData(ctx, userID)

// Data is in standard format
// Can be imported to any compliant system
```

## Privacy by Design (Art.25)

### Data Minimization

```yaml
# Configure data retention
data_retention:
  default_ttl: 365d
  sensitive_data_ttl: 90d
  auto_delete: true
```

### Encryption

```yaml
# Enable encryption for PHI/PII
encryption:
  enabled: true
  fields:
    - content
    - personal_data
    - health_records
```

See **[Encryption](encryption.md)** for details.

## Records of Processing (Art.30)

### Audit Trail

All data processing activities are logged:

```json
{
  "timestamp": "2024-12-01T10:00:00Z",
  "type": "DATA_READ",
  "user_id": "processor-123",
  "resource": "patient-456",
  "action": "READ",
  "legal_basis": "consent",
  "purpose": "healthcare"
}
```

See **[Audit Logging](audit-logging.md)** for details.

### Processing Register

```bash
# Generate processing activities report
nornicdb gdpr report --type processing-register
```

## Security Measures (Art.32)

### Technical Measures

- ✅ AES-256-GCM encryption at rest
- ✅ TLS 1.3 encryption in transit
- ✅ RBAC access control
- ✅ JWT authentication
- ✅ Audit logging

### Organizational Measures

- ✅ Role-based permissions
- ✅ Account lockout
- ✅ Password policies
- ✅ Session management

## Consent Management

### Record Consent

```go
// Record user consent
err := db.RecordConsent(ctx, &nornicdb.Consent{
    UserID:  "user-123",
    Purpose: "marketing",
    Given:   true,
    Source:  "web_form",
})
if err != nil {
    return err
}
```

### Check Consent

```go
// Verify consent before processing
hasConsent, err := db.HasConsent(ctx, "user-123", "marketing")
if err != nil {
    return err
}
if !hasConsent {
    return ErrNoConsent
}
```

### Revoke Consent

```go
// Revoke consent
err := db.RevokeConsent(ctx, "user-123", "marketing")
if err != nil {
    return err
}
```

### Get All User Consents

```go
// Get all consent records for a user (useful for GDPR access requests)
consents, err := db.GetUserConsents(ctx, "user-123")
if err != nil {
    return err
}
for _, c := range consents {
    fmt.Printf("Purpose: %s, Given: %v, Source: %s\n", c.Purpose, c.Given, c.Source)
}
```

## Data Subject Requests

### Handle Requests

```go
// Process data subject request
request := &GDPRRequest{
    Type:      "erasure",  // access, erasure, rectification, portability
    UserID:    "user-123",
    Requestor: "user-123",
    Timestamp: time.Now(),
}

result, err := db.ProcessGDPRRequest(ctx, request)
// Audit log created automatically
```

### Request Types

| Request | API | Response Time |
|---------|-----|---------------|
| Access | `GET /gdpr/export` | 30 days max |
| Erasure | `DELETE /gdpr/user` | 30 days max |
| Rectification | `PUT /nodes/:id` | 30 days max |
| Portability | `GET /gdpr/export` | 30 days max |

## Compliance Checklist

- [ ] Enable encryption for personal data
- [ ] Configure audit logging
- [ ] Set up RBAC
- [ ] Implement consent management
- [ ] Configure data retention policies
- [ ] Test erasure procedures
- [ ] Document processing activities
- [ ] Assign Data Protection Officer

## See Also

- **[Encryption](encryption.md)** - Data protection
- **[RBAC](rbac.md)** - Access control
- **[Audit Logging](audit-logging.md)** - Processing records
- **[HIPAA Compliance](hipaa-compliance.md)** - Healthcare data

