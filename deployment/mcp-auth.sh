#!/bin/bash
set -e

# 1. Generate PKCE values
CODE_VERIFIER=$(openssl rand -hex 32)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

# 2. Register the client
REGISTRATION=$(curl -m 5 -s -X POST https://notes.samdriver.xyz/mcp/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["https://claude.com/api/mcp/auth_callback"], "client_name": "Claude"}')

echo "Registration response: $REGISTRATION"

CLIENT_ID=$(echo "$REGISTRATION" | jq -r '.client_id')
CLIENT_SECRET=$(echo "$REGISTRATION" | jq -r '.client_secret')
echo "client_id: $CLIENT_ID"
echo "client_secret: $CLIENT_SECRET"

# 3. Submit the authorization form with password, capture the redirect URL
LOCATION=$(curl -m 5 -s -o /dev/null -D - -X POST https://notes.samdriver.xyz/mcp/authorize \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "redirect_uri=https://claude.com/api/mcp/auth_callback" \
  --data-urlencode "code_challenge=$CODE_CHALLENGE" \
  --data-urlencode "code_challenge_method=S256" \
  --data-urlencode "state=manual" \
  --data-urlencode "password=b1gelephants" \
  | grep -i '^location:' | awk '{print $2}' | tr -d '\r')

# 4. Extract the code from the redirect URL
CODE=$(echo "$LOCATION" | grep -oP 'code=\K[^&]+')
echo "code: $CODE"

# 5. Exchange code for access token
curl -m 5 -s -X POST https://notes.samdriver.xyz/mcp/token \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=$CODE" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "code_verifier=$CODE_VERIFIER"
