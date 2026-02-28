#!/bin/bash
set -e

REMOTE_USER="root"
REMOTE_HOST="188.166.154.230"
REMOTE_DIR="/var/www/journal"

SERVICE_NODE=$(grep ExecStart deployment/journal-backend.service | sed 's/ExecStart=//' | awk '{print $1}')
LOCAL_NODE=$(node --version)
echo "Local node version: $LOCAL_NODE"
echo "Remote node path: $SERVICE_NODE"
REMOTE_NODE=$(ssh $REMOTE_USER@$REMOTE_HOST "$SERVICE_NODE --version")
echo "Remote node version: $REMOTE_NODE"
if [ "$LOCAL_NODE" != "$REMOTE_NODE" ]; then
    echo "Error: Node version mismatch (local: $LOCAL_NODE, remote: $REMOTE_NODE). Native addons built locally may not work on the server."
    exit 1
fi
echo "Node version check passed ($LOCAL_NODE)"

echo "Building Frontend..."
npm run build --prefix frontend

echo "Building Backend..."
npm run build --prefix backend

echo "Deploying to $REMOTE_HOST..."

# Create directories if they don't exist
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_DIR/public $REMOTE_DIR/backend $REMOTE_DIR/data/entries/.trash"

# Sync Frontend
echo "Syncing Frontend..."
rsync -avz --delete frontend/dist/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/public/

# Install backend production dependencies locally
echo "Installing backend production dependencies..."
npm ci --omit=dev --prefix backend

# Sync Backend
echo "Syncing Backend..."
rsync -avz --delete backend/dist/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/backend/dist/
rsync -avz --delete backend/node_modules/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/backend/node_modules/
rsync -avz backend/package.json $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/backend/

# Deploy and reload service
echo "Deploying service file..."
rsync -avz deployment/journal-backend.service $REMOTE_USER@$REMOTE_HOST:/etc/systemd/system/journal-backend.service

echo "Restarting service..."
ssh $REMOTE_USER@$REMOTE_HOST "systemctl daemon-reload && systemctl restart journal-backend"

echo "Deployment Complete!"
