#!/usr/bin/env python3
"""
Web Clipper Sync Script

Syncs clips from the Web Clipper API to a local folder structure.
Uses only Python standard library - no external dependencies required.

Usage:
    export WEB_CLIPPER_TOKEN="wc_your_token_here"
    python3 sync_clips.py [--output ./clips] [--url http://localhost:3000]

Features:
    - Downloads all clips with content and images
    - Organizes by mode (article, bookmark, screenshot, etc.)
    - Preserves metadata in JSON sidecar files
    - Incremental sync (skips existing clips)
"""

import os
import sys
import json
import base64
import argparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urljoin, quote
from pathlib import Path
from datetime import datetime


class WebClipperSync:
    """Syncs clips from Web Clipper API to local filesystem."""

    def __init__(self, api_url, token, output_dir):
        self.api_url = api_url.rstrip('/')
        self.token = token
        self.output_dir = Path(output_dir)
        self.stats = {'downloaded': 0, 'skipped': 0, 'errors': 0}

    def _make_request(self, endpoint):
        """Make authenticated API request."""
        url = urljoin(self.api_url, endpoint)
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

        try:
            request = Request(url, headers=headers)
            with urlopen(request) as response:
                return json.loads(response.read().decode('utf-8'))
        except HTTPError as e:
            if e.code == 401:
                print(f"❌ Authentication failed. Check your token.", file=sys.stderr)
                sys.exit(1)
            else:
                print(f"❌ HTTP Error {e.code}: {e.reason}", file=sys.stderr)
                raise
        except URLError as e:
            print(f"❌ Failed to connect to {url}: {e.reason}", file=sys.stderr)
            sys.exit(1)

    def list_clips(self, page=1, per_page=100):
        """List all clips with pagination."""
        endpoint = f'/api/v1/clips?page={page}&per_page={per_page}'
        return self._make_request(endpoint)

    def get_clip_detail(self, clip_id):
        """Get full clip details including content."""
        endpoint = f'/api/v1/clips/{clip_id}'
        return self._make_request(endpoint)

    def download_image(self, clip_id, filename, output_path):
        """Download image file from clip media endpoint."""
        url = f"{self.api_url}/api/v1/clips/{clip_id}/media/{quote(filename)}"
        headers = {
            'Authorization': f'Bearer {self.token}',
        }

        try:
            request = Request(url, headers=headers)
            with urlopen(request) as response:
                output_path.write_bytes(response.read())
                return True
        except HTTPError as e:
            if e.code == 404:
                print(f"⚠️  Image not found: {filename}", file=sys.stderr)
            else:
                print(f"❌ Failed to download {filename}: HTTP {e.code}", file=sys.stderr)
            return False
        except Exception as e:
            print(f"❌ Failed to download {filename}: {e}", file=sys.stderr)
            return False

    def sanitize_filename(self, filename):
        """Sanitize filename for filesystem."""
        # Replace unsafe characters
        unsafe_chars = '<>:"/\\|?*'
        for char in unsafe_chars:
            filename = filename.replace(char, '_')
        # Limit length
        return filename[:200]

    def save_clip(self, clip_detail):
        """Save clip to local filesystem."""
        clip_id = clip_detail['id']
        mode = clip_detail.get('mode', 'article')
        title = clip_detail.get('title', 'untitled')

        # Create mode subdirectory
        mode_dir = self.output_dir / mode
        mode_dir.mkdir(parents=True, exist_ok=True)

        # Create clip directory with sanitized title
        safe_title = self.sanitize_filename(title)
        clip_dir_name = f"{clip_id[:8]}_{safe_title}"
        clip_dir = mode_dir / clip_dir_name

        # Skip if already exists
        if clip_dir.exists():
            print(f"⏭️  Skipping {title} (already synced)")
            self.stats['skipped'] += 1
            return

        clip_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Save main content
            content = clip_detail.get('content', '')
            content_file = clip_dir / 'content.md'
            content_file.write_text(content, encoding='utf-8')

            # Save metadata
            metadata = {
                'id': clip_detail['id'],
                'title': clip_detail['title'],
                'url': clip_detail['url'],
                'mode': clip_detail['mode'],
                'tags': clip_detail.get('tags', []),
                'notes': clip_detail.get('notes', ''),
                'created_at': clip_detail['created_at'],
                'synced_at': datetime.utcnow().isoformat() + 'Z'
            }
            metadata_file = clip_dir / 'metadata.json'
            metadata_file.write_text(json.dumps(metadata, indent=2), encoding='utf-8')

            # Download images if present
            images = clip_detail.get('images', [])
            if images:
                images_dir = clip_dir / 'images'
                images_dir.mkdir(exist_ok=True)

                for img in images:
                    img_filename = img.get('filename', 'image.png')
                    img_file = images_dir / img_filename

                    # Download actual image file from the media endpoint
                    if self.download_image(clip_id, img_filename, img_file):
                        print(f"   📷 Downloaded image: {img_filename}")
                    else:
                        print(f"   ⚠️  Failed to download image: {img_filename}")

            print(f"✅ Synced: {title}")
            self.stats['downloaded'] += 1

        except Exception as e:
            print(f"❌ Error saving {title}: {e}", file=sys.stderr)
            self.stats['errors'] += 1
            # Clean up partial directory
            if clip_dir.exists():
                import shutil
                shutil.rmtree(clip_dir)

    def sync_all(self):
        """Sync all clips from the API."""
        print(f"🔄 Starting sync from {self.api_url}")
        print(f"📁 Output directory: {self.output_dir.absolute()}")
        print()

        # Ensure output directory exists
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Fetch all clips with pagination
        page = 1
        total_clips = 0

        while True:
            print(f"📥 Fetching page {page}...")
            response = self.list_clips(page=page, per_page=100)

            clips = response.get('clips', [])
            if not clips:
                break

            total_clips += len(clips)

            # Fetch details and save each clip
            for clip_summary in clips:
                clip_id = clip_summary['id']
                clip_detail = self.get_clip_detail(clip_id)
                self.save_clip(clip_detail)

            # Check if there are more pages
            total_pages = response.get('total_pages', 1)
            if page >= total_pages:
                break

            page += 1

        # Print summary
        print()
        print("=" * 50)
        print("📊 Sync Summary")
        print("=" * 50)
        print(f"Total clips found:    {total_clips}")
        print(f"Downloaded:           {self.stats['downloaded']}")
        print(f"Skipped (existing):   {self.stats['skipped']}")
        print(f"Errors:               {self.stats['errors']}")
        print("=" * 50)

        if self.stats['errors'] > 0:
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Sync clips from Web Clipper API to local folder',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Sync with token from environment
  export WEB_CLIPPER_TOKEN="wc_..."
  python3 sync_clips.py

  # Sync to custom output folder
  python3 sync_clips.py --output ~/Documents/clips-backup

  # Sync from custom server
  python3 sync_clips.py --url http://clipper.example.com:3000

  # Specify token via argument
  python3 sync_clips.py --token wc_your_token_here
        """
    )

    parser.add_argument(
        '--url',
        default=os.environ.get('WEB_CLIPPER_URL', 'http://localhost:3000'),
        help='Web Clipper API URL (default: http://localhost:3000)'
    )

    parser.add_argument(
        '--token',
        default=os.environ.get('WEB_CLIPPER_TOKEN'),
        help='Service token (or set WEB_CLIPPER_TOKEN env var)'
    )

    parser.add_argument(
        '--output',
        default='./clips',
        help='Output directory for synced clips (default: ./clips)'
    )

    args = parser.parse_args()

    # Validate token
    if not args.token:
        print("❌ Error: Service token required!", file=sys.stderr)
        print("", file=sys.stderr)
        print("Set token via environment variable:", file=sys.stderr)
        print("  export WEB_CLIPPER_TOKEN='wc_your_token_here'", file=sys.stderr)
        print("", file=sys.stderr)
        print("Or pass via argument:", file=sys.stderr)
        print("  python3 sync_clips.py --token wc_your_token_here", file=sys.stderr)
        print("", file=sys.stderr)
        print("Create a token with:", file=sys.stderr)
        print("  cd server && make tokens-create EMAIL=your@email.com NAME='Sync Script'", file=sys.stderr)
        sys.exit(1)

    if not args.token.startswith('wc_'):
        print("⚠️  Warning: Token should start with 'wc_'", file=sys.stderr)

    # Run sync
    syncer = WebClipperSync(args.url, args.token, args.output)
    syncer.sync_all()


if __name__ == '__main__':
    main()
