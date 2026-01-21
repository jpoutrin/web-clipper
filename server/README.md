# Welcome to Buffalo

Thank you for choosing Buffalo for your web development needs.

## Database Setup

It looks like you chose to set up your application using a database! Fantastic!

The server uses a `database.yml` configuration file that includes important SQLite optimizations like connection pooling, WAL mode, foreign key enforcement, and busy timeout settings.

**Configuration file locations:**
- Development: `./database.yml` (in the project directory)
- Production: `/etc/web-clipper/database.yml` (installed by the package)

The server automatically searches both locations, so no environment variables are needed.

Open the `database.yml` file and edit it to use the correct settings for your environment if needed. For SQLite (the default), the production configuration already includes recommended optimizations.

### Create Your Databases

Ok, so you've edited the "database.yml" file and started your database, now Buffalo can create the databases in that file for you:

```console
buffalo pop create -a
```

## Starting the Application

Buffalo ships with a command that will watch your application and automatically rebuild the Go binary and any assets for you. To do that run the "buffalo dev" command:

```console
buffalo dev
```

If you point your browser to [http://127.0.0.1:3000](http://127.0.0.1:3000) you should see a "Welcome to Buffalo!" page.

**Congratulations!** You now have your Buffalo application up and running.

## Production Installation (Debian/Ubuntu)

### Installing the Package

1. Download the `.deb` package from the releases page:
```bash
wget https://github.com/your-org/web-clipper/releases/download/v1.0.0/web-clipper_1.0.0_amd64.deb
```

2. Install the package:
```bash
sudo dpkg -i web-clipper_1.0.0_amd64.deb
```

The package automatically:
- Creates a `web-clipper` system user and group
- Creates required directories:
  - `/etc/web-clipper/` - Configuration files
  - `/var/lib/web-clipper/data/` - SQLite database
  - `/var/lib/web-clipper/clips/` - Clip storage
  - `/var/log/web-clipper/` - Application logs
- Initializes the database using `schema.sql` (on fresh installs only)
- Enables the systemd service

### Post-Installation Configuration

1. Edit the configuration file:
```bash
sudo nano /etc/web-clipper/web-clipper.env
```

Required environment variables:
```bash
# JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-here

# OAuth configuration
OAUTH_CLIENT_ID=your-google-client-id
OAUTH_CLIENT_SECRET=your-google-client-secret

# Server URL (must match OAuth redirect URI)
SERVER_BASE_URL=https://clipper.example.com
```

2. Start the service:
```bash
sudo systemctl start web-clipper
```

3. Check the status:
```bash
sudo systemctl status web-clipper
sudo journalctl -u web-clipper -f
```

### Database Migrations

The package automatically initializes the database on **fresh installs** using `schema.sql`. For **upgrades** with new migrations, you have two options:

#### Option 1: Manual Migration (One-time)

After installing a new version with schema changes, run:

```bash
sudo -u web-clipper MIGRATION_DIR=/usr/share/web-clipper/migrations \
  /usr/bin/web-clipper --migrate
```

Check migration status:
```bash
sudo -u web-clipper MIGRATION_DIR=/usr/share/web-clipper/migrations \
  /usr/bin/web-clipper --migrate-status
```

#### Option 2: Automated with Ansible (Recommended)

Add to your Ansible playbook:

```yaml
- name: Install web-clipper package
  apt:
    deb: "/path/to/web-clipper_{{ version }}_amd64.deb"
    state: present

- name: Run database migrations
  command: >
    /usr/bin/web-clipper --migrate
  environment:
    MIGRATION_DIR: /usr/share/web-clipper/migrations
  become: yes
  become_user: web-clipper
  register: migration_result
  changed_when: "'Migrations completed successfully' in migration_result.stdout"

- name: Check migration status
  command: >
    /usr/bin/web-clipper --migrate-status
  environment:
    MIGRATION_DIR: /usr/share/web-clipper/migrations
  become: yes
  become_user: web-clipper
  register: migration_status

- name: Display migration status
  debug:
    var: migration_status.stdout_lines
```

### File Locations

| Path | Purpose |
|------|---------|
| `/usr/bin/web-clipper` | Application binary |
| `/etc/web-clipper/web-clipper.env` | Environment variables |
| `/etc/web-clipper/database.yml` | Database configuration |
| `/etc/web-clipper/clipper.yaml` | Application settings |
| `/var/lib/web-clipper/data/clipper.sqlite3` | SQLite database |
| `/var/lib/web-clipper/clips/` | Clip files and media |
| `/usr/share/web-clipper/migrations/` | Migration files |
| `/etc/systemd/system/web-clipper.service` | systemd service |

### Troubleshooting

**Check logs:**
```bash
sudo journalctl -u web-clipper -n 100 --no-pager
```

**Verify database permissions:**
```bash
ls -la /var/lib/web-clipper/data/
# Should be owned by web-clipper:web-clipper
```

**Test database connectivity:**
```bash
sudo sqlite3 /var/lib/web-clipper/data/clipper.sqlite3 ".tables"
# Expected: api_tokens  clips  schema_migration  users
```

**Manually run migrations (if needed):**
```bash
sudo -u web-clipper MIGRATION_DIR=/usr/share/web-clipper/migrations \
  /usr/bin/web-clipper --migrate
```

## What Next?

We recommend you heading over to [http://gobuffalo.io](http://gobuffalo.io) and reviewing all of the great documentation there.

Good luck!

[Powered by Buffalo](http://gobuffalo.io)
