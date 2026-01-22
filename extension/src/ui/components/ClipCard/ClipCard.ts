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

    const cardHTML = `
      <div class="wc-clip-card" tabindex="0" role="article" aria-label="Clip: ${escapeHtml(clip.title)}">
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

    // Click handler
    card.addEventListener('click', () => {
      if (this.props.onClick) {
        this.props.onClick(this.props.clip.id);
      }
      // Emit custom event
      this.container.dispatchEvent(
        new CustomEvent('wc-clip-click', {
          bubbles: true,
          composed: true,
          detail: { id: this.props.clip.id },
        })
      );
    });

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
