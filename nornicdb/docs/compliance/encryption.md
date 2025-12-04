# Encryption

**Protect data at rest and in transit with AES-256-GCM encryption.**

## Overview

NornicDB provides enterprise-grade encryption to protect sensitive data:

- **At Rest**: AES-256-GCM encryption for stored data
- **In Transit**: TLS 1.3 for network communication
- **Field-Level**: Selective encryption of sensitive fields
- **Key Rotation**: Automatic key rotation support

## Encryption at Rest

### Configuration

```yaml
# nornicdb.yaml
encryption:
  enabled: true
  algorithm: AES-256-GCM
  key_derivation: PBKDF2
  pbkdf2_iterations: 100000
  
  # Key management
  key_rotation_days: 90
  master_key_source: env  # env, file, vault
```

### Environment Variables

```bash
# Set master encryption password
export NORNICDB_ENCRYPTION_PASSWORD="your-secure-32-char-password"

# Or use a key file
export NORNICDB_ENCRYPTION_KEY_FILE="/etc/nornicdb/master.key"
```

### Code Example

```go
// Enable encryption in database config
config := nornicdb.DefaultConfig()
config.EncryptionEnabled = true
config.EncryptionPassword = os.Getenv("NORNICDB_ENCRYPTION_PASSWORD")

// Optional: Specify which fields to encrypt
// Default: content, title, and other PHI/PII fields
config.EncryptionFields = []string{
    "content",
    "title", 
    "ssn",
    "medical_record",
}

db, err := nornicdb.Open("/data", config)
```

## Field-Level Encryption

Encrypt only sensitive fields while keeping others searchable:

### Default Encrypted Fields

By default, NornicDB encrypts these field patterns:
- `content` - Main content/body text
- `title` - Titles that may contain PHI
- Fields containing: `ssn`, `password`, `secret`, `medical`, `health`

### Custom Field Configuration

```go
// Encrypt specific fields
config.EncryptionFields = []string{
    "patient_name",
    "diagnosis",
    "prescription",
    "insurance_id",
}
```

## Encryption in Transit (TLS)

### Server Configuration

```yaml
# Enable TLS
tls:
  enabled: true
  cert_file: /etc/nornicdb/server.crt
  key_file: /etc/nornicdb/server.key
  min_version: TLS1.3
  
  # Client certificate authentication (optional)
  client_ca_file: /etc/nornicdb/ca.crt
  client_auth: require  # none, request, require
```

### Generate Certificates

```bash
# Generate self-signed certificate (development)
openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout server.key -out server.crt \
  -subj "/CN=nornicdb.local"

# For production, use Let's Encrypt or your CA
```

## Key Rotation

### Automatic Rotation

```yaml
encryption:
  key_rotation_days: 90
  key_rotation_grace_period: 7  # Keep old key for 7 days
```

### Manual Rotation

```bash
# Rotate encryption keys
nornicdb admin rotate-keys --confirm

# Re-encrypt all data with new key
nornicdb admin re-encrypt --parallel=4
```

## Compliance Mapping

| Requirement | NornicDB Feature |
|-------------|------------------|
| GDPR Art.32 | AES-256-GCM encryption, TLS 1.3 |
| HIPAA §164.312(a)(2)(iv) | Field-level PHI encryption |
| HIPAA §164.312(e)(1) | TLS for transmission security |
| SOC2 CC6.1 | Encryption key management |
| PCI-DSS 3.4 | Cardholder data encryption |

## Security Best Practices

### Password Requirements

```yaml
encryption:
  # Strong key derivation
  pbkdf2_iterations: 600000  # OWASP 2023 recommendation
  
  # Password policy
  min_password_length: 32
  require_special_chars: true
```

### Key Storage

**DO:**
- Store encryption password in environment variables
- Use secret management (HashiCorp Vault, AWS Secrets Manager)
- Rotate keys regularly

**DON'T:**
- Hardcode passwords in configuration files
- Store keys in version control
- Use weak passwords

## Performance Considerations

Encryption adds minimal overhead:

| Operation | Without Encryption | With Encryption | Overhead |
|-----------|-------------------|-----------------|----------|
| Write | 45,000 ops/s | 42,000 ops/s | 7% |
| Read | 120,000 ops/s | 115,000 ops/s | 4% |

## Troubleshooting

### Common Issues

**Error: "decryption failed: cipher: message authentication failed"**
- Cause: Wrong encryption password or corrupted data
- Fix: Verify `NORNICDB_ENCRYPTION_PASSWORD` is correct

**Error: "key derivation failed"**
- Cause: Password too short
- Fix: Use at least 32 characters for the encryption password

## See Also

- **[RBAC](rbac.md)** - Access control
- **[Audit Logging](audit-logging.md)** - Compliance trails
- **[HIPAA Compliance](hipaa-compliance.md)** - Healthcare requirements

