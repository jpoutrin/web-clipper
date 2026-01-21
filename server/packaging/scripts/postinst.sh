#!/bin/bash
# Web Clipper post-installation script
set -e

# Create web-clipper user and group if they don't exist
if ! getent group web-clipper >/dev/null; then
    groupadd --system web-clipper
fi

if ! getent passwd web-clipper >/dev/null; then
    useradd --system --gid web-clipper --home-dir /var/lib/web-clipper \
        --shell /usr/sbin/nologin --comment "Web Clipper Server" web-clipper
fi

# Create data directories
mkdir -p /var/lib/web-clipper/clips
mkdir -p /var/lib/web-clipper/data
mkdir -p /var/log/web-clipper

# Set ownership
chown -R web-clipper:web-clipper /var/lib/web-clipper
chown -R web-clipper:web-clipper /var/log/web-clipper

# Initialize database if it doesn't exist or is empty
DB_PATH="/var/lib/web-clipper/data/clipper.sqlite3"
SCHEMA_SQL="/usr/share/web-clipper/migrations/schema.sql"

if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
    echo "Initializing database..."
    if [ -f "$SCHEMA_SQL" ]; then
        sqlite3 "$DB_PATH" < "$SCHEMA_SQL"
        chown web-clipper:web-clipper "$DB_PATH"
        chmod 644 "$DB_PATH"
        echo "Database initialized successfully"
    else
        echo "WARNING: schema.sql not found at $SCHEMA_SQL"
        echo "Database will need to be initialized manually"
    fi
else
    echo "Database already exists, skipping initialization"
fi

# Set permissions on config files
chown root:web-clipper /etc/web-clipper/web-clipper.env
chmod 640 /etc/web-clipper/web-clipper.env

chown root:web-clipper /etc/web-clipper/clipper.yaml
chmod 644 /etc/web-clipper/clipper.yaml

# Set permissions on database.yml (contains pool size, WAL mode, etc.)
if [ -f /etc/web-clipper/database.yml ]; then
    chown root:web-clipper /etc/web-clipper/database.yml
    chmod 644 /etc/web-clipper/database.yml
fi

# Reload systemd
systemctl daemon-reload

# Enable but don't start the service (user needs to configure first)
systemctl enable web-clipper.service || true

echo ""
echo "============================================"
echo "  Web Clipper installed successfully!"
echo "============================================"
echo ""
echo "Database: Initialized at /var/lib/web-clipper/data/clipper.sqlite3"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure the server:"
echo "   sudo nano /etc/web-clipper/web-clipper.env"
echo ""
echo "   At minimum, set:"
echo "   - JWT_SECRET (generate with: openssl rand -base64 32)"
echo "   - OAUTH_CLIENT_ID"
echo "   - OAUTH_CLIENT_SECRET"
echo "   - SERVER_BASE_URL (your external URL)"
echo ""
echo "2. Start the service:"
echo "   sudo systemctl start web-clipper"
echo ""
echo "3. Check status:"
echo "   sudo systemctl status web-clipper"
echo "   sudo journalctl -u web-clipper -f"
echo ""
echo "Manual migration (if needed):"
echo "   sudo -u web-clipper MIGRATION_DIR=/usr/share/web-clipper/migrations /usr/bin/web-clipper migrate"
echo "   sudo -u web-clipper MIGRATION_DIR=/usr/share/web-clipper/migrations /usr/bin/web-clipper migrate status"
echo ""
echo "Admin Commands:"
echo "   sudo -u web-clipper /usr/bin/web-clipper users list"
echo "   sudo -u web-clipper /usr/bin/web-clipper users show --email=admin@example.com"
echo "   sudo -u web-clipper /usr/bin/web-clipper tokens create --email=admin@example.com --name='API Token'"
echo "   sudo -u web-clipper /usr/bin/web-clipper help"
echo ""
echo "BREAKING CHANGE: Migration commands changed:"
echo "   OLD: web-clipper --migrate"
echo "   NEW: web-clipper migrate"
echo ""
echo "Data locations:"
echo "   Config:   /etc/web-clipper/"
echo "   Database: /var/lib/web-clipper/data/"
echo "   Clips:    /var/lib/web-clipper/clips/"
echo "   Logs:     journalctl -u web-clipper"
echo ""

exit 0
