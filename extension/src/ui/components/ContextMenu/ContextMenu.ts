/**
 * ContextMenu Component
 *
 * A reusable context menu (dropdown menu) component.
 * Supports keyboard navigation and positioning relative to anchor element.
 */

import contextMenuStyles from './ContextMenu.css';

/**
 * Context menu item configuration
 */
export interface ContextMenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Context menu options
 */
export interface ContextMenuOptions {
  items: ContextMenuItem[];
  anchorElement: Element;
  buttonRect?: DOMRect | { top: number; right: number; bottom: number; left: number; width: number; height: number };
  onClose?: () => void;
}

/**
 * ContextMenu class
 *
 * Creates a context menu with Shadow DOM isolation.
 */
export class ContextMenu {
  private container: HTMLElement;
  private shadowRoot: ShadowRoot;
  private options: ContextMenuOptions;

  constructor(options: ContextMenuOptions) {
    this.options = options;

    // Create host element with closed Shadow DOM
    this.container = document.createElement('div');
    this.container.setAttribute('data-wc-component', 'context-menu');
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = contextMenuStyles;
    this.shadowRoot.appendChild(styleEl);

    // Create and render menu
    this.render();
    this.attachEventListeners();

    // Add to document first so getBoundingClientRect() works
    document.body.appendChild(this.container);

    // Position after adding to document
    this.position();

    // Focus first item
    setTimeout(() => this.focusFirstItem(), 0);
  }

  /**
   * Renders the context menu
   */
  private render(): void {
    const menuHTML = `
      <div class="wc-context-menu" role="menu" aria-orientation="vertical">
        ${this.options.items.map((item, index) => `
          <button
            class="wc-context-menu__item ${item.danger ? 'wc-context-menu__item--danger' : ''}"
            role="menuitem"
            tabindex="${index === 0 ? '0' : '-1'}"
            ${item.disabled ? 'disabled' : ''}
            data-index="${index}"
          >
            ${item.icon ? `<span class="wc-context-menu__icon">${item.icon}</span>` : ''}
            <span class="wc-context-menu__label">${item.label}</span>
          </button>
        `).join('')}
      </div>
    `;

    const menuContainer = document.createElement('div');
    menuContainer.innerHTML = menuHTML;
    this.shadowRoot.appendChild(menuContainer.firstElementChild!);
  }

  /**
   * Position menu relative to anchor element
   */
  private position(): void {
    const menu = this.shadowRoot.querySelector('.wc-context-menu') as HTMLElement;
    if (!menu) return;

    // Use provided buttonRect if available (for Shadow DOM elements), otherwise get from anchorElement
    const anchorRect = this.options.buttonRect || this.options.anchorElement.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    console.log('[ContextMenu] Positioning debug:', {
      usingButtonRect: !!this.options.buttonRect,
      anchorRect: {
        top: anchorRect.top,
        right: anchorRect.right,
        bottom: anchorRect.bottom,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height
      },
      menuRect: {
        width: menuRect.width,
        height: menuRect.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    // Position below anchor
    let top = anchorRect.bottom + 4;

    // Position menu with right edge slightly left of button's right edge
    // This provides visual spacing and ensures full visibility
    let left = anchorRect.right - menuRect.width - 4;

    console.log('[ContextMenu] Initial calculation:', { top, left });

    // Ensure menu doesn't overflow viewport on the right
    const maxLeft = window.innerWidth - menuRect.width - 8;
    if (left > maxLeft) {
      console.log('[ContextMenu] Adjusting for right overflow:', { left, maxLeft });
      left = maxLeft;
    }

    // Ensure menu doesn't overflow viewport on the left
    if (left < 8) {
      console.log('[ContextMenu] Adjusting for left overflow:', { left });
      left = 8;
    }

    // Adjust if menu would go off-screen vertically
    if (top + menuRect.height > window.innerHeight - 8) {
      console.log('[ContextMenu] Adjusting for vertical overflow');
      top = anchorRect.top - menuRect.height - 4;
    }

    console.log('[ContextMenu] Final position:', { top, left });

    this.container.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      z-index: 10000;
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const menu = this.shadowRoot.querySelector('.wc-context-menu');
    if (!menu) return;

    // Click handlers for menu items
    const items = menu.querySelectorAll('.wc-context-menu__item');
    items.forEach((item, index) => {
      item.addEventListener('click', () => {
        const menuItem = this.options.items[index];
        if (menuItem && !menuItem.disabled) {
          menuItem.onClick();
          this.close();
        }
      });
    });

    // Keyboard navigation
    menu.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      this.handleKeyDown(keyEvent);
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);

    // Close on Escape
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const items = Array.from(
      this.shadowRoot.querySelectorAll('.wc-context-menu__item:not([disabled])')
    ) as HTMLElement[];

    const currentIndex = items.findIndex(item => item === this.shadowRoot.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  /**
   * Handle outside click
   */
  private handleOutsideClick = (e: Event): void => {
    const target = e.target as Node;
    if (!this.container.contains(target) && !this.options.anchorElement.contains(target)) {
      this.close();
    }
  };

  /**
   * Handle Escape key
   */
  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.close();
    }
  };

  /**
   * Focus first menu item
   */
  private focusFirstItem(): void {
    const firstItem = this.shadowRoot.querySelector(
      '.wc-context-menu__item:not([disabled])'
    ) as HTMLElement;
    firstItem?.focus();
  }

  /**
   * Close the menu
   */
  close(): void {
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscapeKey);

    if (this.options.onClose) {
      this.options.onClose();
    }

    this.container.remove();
  }

  /**
   * Get the container element
   */
  getElement(): HTMLElement {
    return this.container;
  }
}

/**
 * Factory function to create a ContextMenu
 */
export function createContextMenu(options: ContextMenuOptions): ContextMenu {
  return new ContextMenu(options);
}
