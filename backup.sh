#!/bin/bash

# Sales Productivity Tracker - Auto Backup Script
# Creates timestamped backup before making changes

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup with descriptive name
cp web-version.html "backups/web-version-${TIMESTAMP}-pre-edit.html"

# Show confirmation
echo "✅ Backup created: backups/web-version-${TIMESTAMP}-pre-edit.html"

# Optional: Clean up old backups (keep last 10)
cd backups
ls -t web-version-*.html | tail -n +11 | xargs -r rm
echo "🧹 Cleaned up old backups (keeping 10 most recent)"

# List current backups
echo ""
echo "📁 Current backups:"
ls -la web-version-*.html | head -10