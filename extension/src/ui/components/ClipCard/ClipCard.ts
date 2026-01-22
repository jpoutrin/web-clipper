/**
 * ClipCard Component
 *
 * Displays a single clip summary in the clips list.
 * Shows title, URL, mode, tags, and optional notes preview.
 */

import { getCombinedStyles } from '../../utils/shadow-dom';
import { formatRelativeTime, truncate, escapeHtml, getDomain, getModeIcon, getModeColorClass } from '../../utils/clips';
import { ClipSummary } from '../../../types';
import clipCardStyles from './ClipCard.css';

/**
 * Props for ClipCard component
 */
export interface ClipCardProps {
  clip: ClipSummary;
  onClick?: (id: string) => void;
}

/**
 * ClipCard class
 *
 * Creates a clip card component with Shadow DOM isolation.
 */
export class ClipCard {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private props: ClipCardProps;

  constructor(props: ClipCardProps) {
    this.props = props;

    // Create host element with closed Shadow DOM
    this.container = document.createElement('div');
    this.container.setAttribute('data-wc-component', 'clip-card');
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getCombinedStyles(clipCardStyles);
    this.shadowRoot.appendChild(styleEl);

    // Create and render clip card
    this.render();
    this.attachEventListeners();
  }

  /**
   * Renders the clip card
   */
  private render(): void {
    const { clip } = this.props;
    const domain = getDomain(clip.url);
    const relativeTime = formatRelativeTime(clip.created_at);
    const modeIcon = getModeIcon(clip.mode);
    const modeColorClass = getModeColorClass(clip.mode);
    const accentColor = this.getModeAccentColor(clip.mode);

    const cardHTML = `
      <div class="wc-clip-card" tabindex="0" role="article" aria-label="Clip: ${escapeHtml(clip.title)}" style="--wc-accent-color: ${accentColor}">
        <div class="wc-clip-card__actions">
          <button class="wc-clip-card__action-btn" data-action="menu" aria-label="More actions" aria-haspopup="menu" title="More actions">
            ⋮
          </button>
        </div>
        <div class="wc-clip-card__header">
          <span class="wc-clip-card__mode-icon" aria-hidden="true">${modeIcon}</span>
          <span class="wc-clip-card__mode-badge ${modeColorClass}">${escapeHtml(clip.mode)}</span>
          <h3 class="wc-clip-card__title">${escapeHtml(clip.title)}</h3>
        </div>
        <div class="wc-clip-card__meta">
          <span class="wc-clip-card__domain">${escapeHtml(domain)}</span>
          <span class="wc-clip-card__separator">•</span>
          <time datetime="${clip.created_at}">${relativeTime}</time>
        </div>
        ${this.renderTags()}
        ${clip.notes ? `<p class="wc-clip-card__preview">${escapeHtml(truncate(clip.notes, 80))}</p>` : ''}
      </div>
    `;

    this.shadowRoot.innerHTML = `
      <style>${getCombinedStyles(clipCardStyles)}</style>
      ${cardHTML}
    `;
  }

  /**
   * Get accent color for mode
   */
  private getModeAccentColor(mode: string): string {
    const colors: Record<string, string> = {
      article: '#3b82f6',
      bookmark: '#f59e0b',
      screenshot: '#10b981',
      selection: '#8b5cf6',
      fullpage: '#6b7280',
    };
    return colors[mode] || '#3b82f6';
  }

  /**
   * Renders the tags section
   */
  private renderTags(): string {
    // Handle null or empty tags
    if (!this.props.clip.tags || this.props.clip.tags.length === 0) return '';

    const tagsHTML = this.props.clip.tags
      .map(tag => `<span class="wc-clip-card__tag">${escapeHtml(tag)}</span>`)
      .join('');

    return `<div class="wc-clip-card__tags">${tagsHTML}</div>`;
  }

  /**
   * Attaches event listeners
   */
  private attachEventListeners(): void {
    const card = this.shadowRoot.querySelector('.wc-clip-card');
    if (!card) return;

    // Click handler - view clip
    card.addEventListener('click', (e: Event) => {
      // Ignore clicks on action buttons
      const target = e.target as HTMLElement;
      if (target.closest('.wc-clip-card__actions')) {
        return;
      }

      if (this.props.onClick) {
        this.props.onClick(this.props.clip.id);
      }
      // Emit custom event
      this.container.dispatchEvent(
        new CustomEvent('wc-clip-click', {
          bubbles: true,
          composed: true,
          detail: { id: this.props.clip.id, action: 'view' },
        })
      );
    });

    // Menu button handler
    const menuBtn = this.shadowRoot.querySelector('[data-action="menu"]');
    if (menuBtn) {
      menuBtn.addEventListener('click', (e: Event) => {
        e.stopPropagation();

        // Get button's position for menu positioning
        const buttonRect = (menuBtn as HTMLElement).getBoundingClientRect();

        console.log('[ClipCard] Menu button clicked, buttonRect:', {
          top: buttonRect.top,
          right: buttonRect.right,
          bottom: buttonRect.bottom,
          left: buttonRect.left,
          width: buttonRect.width,
          height: buttonRect.height
        });

        this.container.dispatchEvent(
          new CustomEvent('wc-clip-action', {
            bubbles: true,
            composed: true,
            detail: {
              id: this.props.clip.id,
              action: 'menu',
              anchorElement: menuBtn,
              buttonRect: {
                top: buttonRect.top,
                right: buttonRect.right,
                bottom: buttonRect.bottom,
                left: buttonRect.left,
                width: buttonRect.width,
                height: buttonRect.height
              }
            },
          })
        );
      });
    }

    // Keyboard handler
    card.addEventListener('keydown', (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
        keyboardEvent.preventDefault();
        (keyboardEvent.target as HTMLElement).click();
      }
    });
  }

  /**
   * Returns the clip card DOM element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destroys the clip card
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Factory function to create a ClipCard component
 *
 * @param props - ClipCard configuration
 * @returns HTMLElement containing the clip card
 */
export function createClipCard(props: ClipCardProps): HTMLElement {
  const card = new ClipCard(props);
  return card.getElement();
}
