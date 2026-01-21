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
    - Folder naming: {date}_{title-slug}_{site-slug} (e.g., 20260121_my-article_github-com)
    - Content saved as {folder-name}.md (not content.md)
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

    def slugify(self, text):
        """Convert text to URL-friendly slug."""
        import re
        # Convert to lowercase
        slug = text.lower()
        # Replace spaces and underscores with hyphens
        slug = slug.replace(' ', '-').replace('_', '-')
        # Remove non-alphanumeric characters except hyphens
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        # Replace multiple consecutive hyphens with single hyphen
        slug = re.sub(r'-+', '-', slug)
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        # Limit length
        return slug[:200]

    def extract_site_slug(self, url):
        """Extract and slugify site name from URL."""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path.split('/')[0]
            # Remove www. prefix
            domain = domain.replace('www.', '')
            # Slugify the domain
            return self.slugify(domain)
        except:
            return 'unknown-site'

    def format_date(self, timestamp_str):
        """Format ISO timestamp to YYYYMMDD."""
        try:
            # Parse ISO format: 2026-01-21T12:34:56Z
            dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            return dt.strftime('%Y%m%d')
        except:
            # Fallback to today's date
            return datetime.utcnow().strftime('%Y%m%d')

    def save_clip(self, clip_detail):
        """Save clip to local filesystem."""
        clip_id = clip_detail['id']
        mode = clip_detail.get('mode', 'article')
        title = clip_detail.get('title', 'untitled')
        url = clip_detail.get('url', '')
        created_at = clip_detail.get('created_at', '')

        # Create mode subdirectory
        mode_dir = self.output_dir / mode
        mode_dir.mkdir(parents=True, exist_ok=True)

        # Create clip directory with format: {date}_{title}_{site}
        date_part = self.format_date(created_at)
        title_part = self.slugify(title)
        site_part = self.extract_site_slug(url)
        clip_dir_name = f"{date_part}_{title_part}_{site_part}"
        clip_dir = mode_dir / clip_dir_name

        # Skip if already exists
        if clip_dir.exists():
            print(f"⏭️  Skipping {title} (already synced)")
            self.stats['skipped'] += 1
            return

        clip_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Save main content to {folder_name}.md instead of content.md
            content = clip_detail.get('content', '')
            content_file = clip_dir / f'{clip_dir_name}.md'
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
                media_dir = clip_dir / 'media'
                media_dir.mkdir(exist_ok=True)

                for img in images:
                    img_filename = img.get('filename', 'image.png')
                    img_file = media_dir / img_filename

                    # Download actual image file from the media endpoint
                    if self.download_image(clip_id, img_filename, img_file):
                        print(f"   📷 Downloaded media: {img_filename}")
                    else:
                        print(f"   ⚠️  Failed to download media: {img_filename}")

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
