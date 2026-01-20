# Sample Scripts

This folder contains example scripts demonstrating how to interact with the Web Clipper API for automation, integration, and custom workflows.

## Purpose

These scripts serve as:

- **Reference implementations** showing how to authenticate and use the API
- **Starting points** for building custom integrations with the Web Clipper
- **Examples** of common automation tasks (syncing, backup, migration, etc.)

## Prerequisites

### 1. Create a Service Token

Before using any script, you need to create a service token:

```bash
cd server
make tokens-create EMAIL=your@email.com NAME="Automation Script"
```

Save the token that's displayed - it won't be shown again!

### 2. Set Environment Variable

Export your service token:

```bash
export WEB_CLIPPER_TOKEN="wc_your_token_here"
```

Or create a `.env` file in the `sample-scripts` directory:

```bash
WEB_CLIPPER_TOKEN=wc_your_token_here
WEB_CLIPPER_URL=http://localhost:3000
```

## Available Scripts

### `sync_clips.py`

Syncs all your clips from the Web Clipper server to a local folder structure.

**Features:**
- Downloads all clips with their content and images
- Organizes clips by mode (article, bookmark, screenshot, etc.)
- Preserves metadata in JSON sidecar files
- Incremental sync (skips already downloaded clips)
- No external dependencies (uses Python standard library only)

**Usage:**

Run from the **project root directory**:

```bash
# Sync to default folder (./clips)
python3 sample-scripts/sync_clips.py

# Sync to custom folder
python3 sample-scripts/sync_clips.py --output /path/to/backup

# Sync from custom server URL
python3 sample-scripts/sync_clips.py --url http://your-server:3000
```

Or from the `sample-scripts/` directory:

```bash
cd sample-scripts
python3 sync_clips.py
```

## Authentication

All scripts use **service tokens** for authentication. These are long-lived API keys that don't require OAuth login.

Service tokens are passed via:
1. Environment variable: `WEB_CLIPPER_TOKEN`
2. Command-line argument: `--token wc_...`

## Security Notes

- **Never commit tokens** to version control
- Add `.env` to your `.gitignore`
- Use separate tokens for different environments
- Revoke unused tokens: `make tokens-revoke ID=<uuid>`

## Contributing

Feel free to add your own sample scripts! Guidelines:

- Use clear, documented code
- Minimize external dependencies where possible
- Include usage examples in comments
- Handle errors gracefully

## Support

For API documentation and endpoint details, see:
- Tech specs: `../tech-specs/`
- Server code: `../server/actions/clips.go`
- Token management: `make help` (in server directory)
