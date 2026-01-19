#!/bin/bash
# Web Clipper pre-removal script
set -e

# Stop the service before removal
if systemctl is-active --quiet web-clipper.service; then
    echo "Stopping web-clipper service..."
    systemctl stop web-clipper.service
fi

# Disable the service
if systemctl is-enabled --quiet web-clipper.service 2>/dev/null; then
    echo "Disabling web-clipper service..."
    systemctl disable web-clipper.service || true
fi

exit 0
