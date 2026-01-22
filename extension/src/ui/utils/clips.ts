/**
 * Utility functions for clips list view
 */

import { ClipMode } from '../../types';

/**
 * Format timestamp as relative time
 * @param isoDate ISO 8601 timestamp
 * @returns Relative time string (e.g., "2h ago", "Yesterday")
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;

  // Format as "Jan 15"
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Extract domain from URL
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Get emoji icon for clip mode
 */
export function getModeIcon(mode: ClipMode): string {
  const icons: Record<ClipMode, string> = {
    article: '📰',
    bookmark: '🔖',
    screenshot: '📸',
    selection: '✂️',
    fullpage: '📄',
  };
  return icons[mode] || '📋';
}

/**
 * Get color class for mode badge
 */
export function getModeColorClass(mode: ClipMode): string {
  return `wc-mode-badge--${mode}`;
}
