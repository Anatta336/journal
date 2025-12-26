#!/bin/bash
set -e

REMOTE_USER="root"
REMOTE_HOST="188.166.154.230"
REMOTE_DIR="/var/www/journal"

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

# Sync Backend
echo "Syncing Backend..."
# We need dist/, package.json, and package-lock.json
rsync -avz --delete backend/dist/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/backend/dist/
rsync -avz backend/package.json backend/package-lock.json $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/backend/

# Install dependencies and restart service
echo "Installing dependencies and restarting service..."
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_DIR/backend && npm install --production && systemctl restart journal-backend"

echo "Deployment Complete!"
