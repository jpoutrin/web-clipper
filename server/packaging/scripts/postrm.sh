#!/bin/bash
# Web Clipper post-removal script
set -e

# Reload systemd to remove service definition
systemctl daemon-reload || true

case "$1" in
    purge)
        echo "Purging web-clipper data..."

        # Remove data directories
        rm -rf /var/lib/web-clipper
        rm -rf /var/log/web-clipper

        # Remove config directory (will have been removed by dpkg for non-conffiles)
        rm -rf /etc/web-clipper

        # Remove user and group
        if getent passwd web-clipper >/dev/null; then
            userdel web-clipper || true
        fi

        if getent group web-clipper >/dev/null; then
            groupdel web-clipper || true
        fi

        echo "Web Clipper data and user removed."
        ;;

    remove|upgrade|failed-upgrade|abort-install|abort-upgrade|disappear)
        # Normal removal - keep data and user
        ;;

    *)
        echo "postrm called with unknown argument: $1" >&2
        ;;
esac

exit 0
