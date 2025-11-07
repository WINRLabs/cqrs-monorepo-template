#!/bin/bash

# Generate RSA key pair and save to JSON format

set -e

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Generate a unique key ID (UUID v4)
KID=$(uuidgen | tr '[:upper:]' '[:lower:]')

# Get current timestamp in ISO 8601 format
CREATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

# Create temporary directory for keys
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

PRIVATE_KEY="$TEMP_DIR/private.pem"
PUBLIC_KEY="$TEMP_DIR/public.pem"

echo "[INFO] Generating RSA key pair with kid=$KID"

# Generate 2048-bit RSA private key
openssl genrsa -out "$PRIVATE_KEY" 2048 2>/dev/null

# Extract public key from private key
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null

# Convert private key to base64 (without headers/footers)
PRIVATE_KEY_B64=$(grep -v "BEGIN\|END" "$PRIVATE_KEY" | tr -d '\n')

# Convert public key to base64 (without headers/footers)
PUBLIC_KEY_B64=$(grep -v "BEGIN\|END" "$PUBLIC_KEY" | tr -d '\n')

# Create JSON output
cat > keys.json <<EOF
{
  "publicKey": "-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY_B64}\n-----END PUBLIC KEY-----",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n${PRIVATE_KEY_B64}\n-----END PRIVATE KEY-----",
  "kid": "$KID",
  "createdAt": "$CREATED_AT"
}
EOF

echo -e "${GREEN}✓${NC} Keys generated successfully and saved to keys.json"
echo -e "${GREEN}✓${NC} Key ID: $KID"
echo -e "${GREEN}✓${NC} Created at: $CREATED_AT"

