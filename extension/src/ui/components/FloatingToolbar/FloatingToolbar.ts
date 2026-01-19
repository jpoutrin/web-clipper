/**
 * Floating Toolbar Component
 *
 * A floating toolbar that positions itself relative to an anchor element
 * with automatic viewport-aware positioning and keyboard navigation.
 */

import { positionToolbar, Position } from '../../utils/position.js';

/**
 * Action button in the toolbar
 */
export interface ToolbarAction {
  /** Unique identifier for the action */
  id: string;
  /** SVG string for the icon */
  icon: string;
  /** Label for tooltip and aria-label */
  label: string;
  /** Visual variant of the button */
  variant?: 'default' | 'primary' | 'danger';
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Click handler for the action */
  onClick: () => void;
}

/**
 * Special separator item for the toolbar
 */
export interface ToolbarSeparator {
  /** Type identifier for separator */
  type: 'separator';
}

/**
 * Union type for toolbar items
 */
export type ToolbarItem = ToolbarAction | ToolbarSeparator;

/**
 * Props for FloatingToolbar
 */
export interface FloatingToolbarProps {
  /** Preferred position relative to anchor */
  position?: 'top' | 'bottom' | 'auto';
  /** Element to position relative to */
  anchor: DOMRect;
  /** Minimum distance from viewport edge (default: 8) */
  viewportPadding?: number;
  /** Actions to display in the toolbar */
  actions: ToolbarItem[];
  /** Optional aria-label for the toolbar */
  ariaLabel?: string;
}

/**
 * Custom event dispatched when an action is clicked
 */
export interface ToolbarActionEvent extends CustomEvent {
  detail: {
    actionId: string;
  };
}

/**
 * FloatingToolbar class
 *
 * Creates a floating toolbar with auto-positioning and keyboard navigation.
 */
export class FloatingToolbar {
  private container: HTMLElement;
  private toolbar: HTMLElement;
  private arrow: HTMLElement;
  private props: FloatingToolbarProps;
  private currentPosition: Position | null = null;
  private focusedIndex = -1;
  private actionButtons: HTMLButtonElement[] = [];

  constructor(props: FloatingToolbarProps) {
    this.props = {
      position: 'auto',
      viewportPadding: 8,
      ariaLabel: 'Floating toolbar',
      ...props,
    };

    // Create DOM structure
    this.container = this.createContainer();
    this.arrow = this.createArrow();
    this.toolbar = this.createToolbar();

    this.container.appendChild(this.arrow);
    this.container.appendChild(this.toolbar);

    // Render actions
    this.renderActions();

    // Position the toolbar
    this.updatePosition();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();
  }

  /**
   * Creates the container element
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'wc-floating-toolbar-container';
    container.setAttribute('data-wc-component', 'floating-toolbar');
    return container;
  }

  /**
   * Creates the positioning arrow element
   */
  private createArrow(): HTMLElement {
    const arrow = document.createElement('div');
    arrow.className = 'wc-floating-toolbar-arrow';
    return arrow;
  }

  /**
   * Creates the toolbar element
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'wc-floating-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', this.props.ariaLabel || 'Floating toolbar');
    toolbar.setAttribute('aria-orientation', 'horizontal');
    return toolbar;
  }

  /**
   * Renders toolbar actions
   */
  private renderActions(): void {
    this.toolbar.innerHTML = '';
    this.actionButtons = [];

    this.props.actions.forEach((item, index) => {
      if ('type' in item && item.type === 'separator') {
        const separator = this.createSeparator();
        this.toolbar.appendChild(separator);
      } else {
        const action = item as ToolbarAction;
        const button = this.createActionButton(action, index);
        this.toolbar.appendChild(button);
        this.actionButtons.push(button);
      }
    });
  }

  /**
   * Creates a separator element
   */
  private createSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'wc-toolbar-separator';
    separator.setAttribute('role', 'separator');
    separator.setAttribute('aria-orientation', 'vertical');
    return separator;
  }

  /**
   * Creates an action button
   */
  private createActionButton(action: ToolbarAction, index: number): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'wc-toolbar-action';
    button.type = 'button';
    button.setAttribute('aria-label', action.label);
    button.setAttribute('data-action-id', action.id);
    button.setAttribute('tabindex', index === 0 ? '0' : '-1');

    // Add variant class
    const variant = action.variant || 'default';
    button.classList.add(`wc-toolbar-action--${variant}`);

    // Set disabled state
    if (action.disabled) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    }

    // Set icon
    button.innerHTML = action.icon;

    // Create tooltip
    const tooltip = this.createTooltip(action.label);
    button.appendChild(tooltip);

    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!action.disabled) {
        action.onClick();
        this.dispatchActionEvent(action.id);
      }
    });

    // Show/hide tooltip on hover/focus
    button.addEventListener('mouseenter', () => this.showTooltip(tooltip));
    button.addEventListener('mouseleave', () => this.hideTooltip(tooltip));
    button.addEventListener('focus', () => this.showTooltip(tooltip));
    button.addEventListener('blur', () => this.hideTooltip(tooltip));

    return button;
  }

  /**
   * Creates a tooltip element
   */
  private createTooltip(text: string): HTMLElement {
    const tooltip = document.createElement('span');
    tooltip.className = 'wc-toolbar-tooltip';
    tooltip.textContent = text;
    tooltip.setAttribute('role', 'tooltip');
    return tooltip;
  }

  /**
   * Shows a tooltip
   */
  private showTooltip(tooltip: HTMLElement): void {
    tooltip.classList.add('wc-toolbar-tooltip--visible');
  }

  /**
   * Hides a tooltip
   */
  private hideTooltip(tooltip: HTMLElement): void {
    tooltip.classList.remove('wc-toolbar-tooltip--visible');
  }

  /**
   * Dispatches a custom action event
   */
  private dispatchActionEvent(actionId: string): void {
    const event = new CustomEvent('wc-action', {
      detail: { actionId },
      bubbles: true,
      composed: true,
    }) as ToolbarActionEvent;
    this.container.dispatchEvent(event);
  }

  /**
   * Sets up keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    this.toolbar.addEventListener('keydown', (e) => {
      const enabledButtons = this.actionButtons.filter((btn) => !btn.disabled);
      if (enabledButtons.length === 0) return;

      const currentIndex = enabledButtons.findIndex(
        (btn) => btn === document.activeElement
      );

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledButtons.length - 1;
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = currentIndex < enabledButtons.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = enabledButtons.length - 1;
          break;
        case 'Escape':
          e.preventDefault();
          this.hide();
          return;
        default:
          return;
      }

      // Update tabindex and focus
      enabledButtons.forEach((btn, idx) => {
        btn.setAttribute('tabindex', idx === nextIndex ? '0' : '-1');
      });
      enabledButtons[nextIndex]?.focus();
    });
  }

  /**
   * Updates the toolbar position based on anchor
   */
  private updatePosition(): void {
    // Make toolbar visible but transparent to measure it
    this.container.style.visibility = 'hidden';
    this.container.style.opacity = '0';
    this.container.style.position = 'fixed';
    document.body.appendChild(this.container);

    // Calculate position
    const position = positionToolbar(
      this.toolbar,
      this.props.anchor,
      this.props.viewportPadding
    );

    this.currentPosition = position;

    // Apply position
    this.container.style.top = `${position.top}px`;
    this.container.style.left = `${position.left}px`;

    // Update position class for arrow direction
    this.container.classList.remove('wc-floating-toolbar--top', 'wc-floating-toolbar--bottom');
    this.container.classList.add(`wc-floating-toolbar--${position.position}`);

    // Position arrow horizontally centered on anchor
    const anchorCenter = this.props.anchor.left + this.props.anchor.width / 2;
    const containerLeft = position.left;
    const arrowLeft = anchorCenter - containerLeft;
    this.arrow.style.left = `${arrowLeft}px`;

    // Make visible
    this.container.style.visibility = '';
    this.container.style.opacity = '';
  }

  /**
   * Updates the anchor element
   */
  updateAnchor(rect: DOMRect): void {
    this.props.anchor = rect;
    this.updatePosition();
  }

  /**
   * Updates the toolbar actions
   */
  setActions(actions: ToolbarItem[]): void {
    this.props.actions = actions;
    this.renderActions();
  }

  /**
   * Shows the toolbar
   */
  show(): void {
    this.container.classList.add('wc-floating-toolbar--visible');
    // Focus first enabled button
    const firstEnabled = this.actionButtons.find((btn) => !btn.disabled);
    firstEnabled?.focus();
  }

  /**
   * Hides the toolbar
   */
  hide(): void {
    this.container.classList.remove('wc-floating-toolbar--visible');
  }

  /**
   * Returns the toolbar DOM element
   */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destroys the toolbar and removes it from DOM
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Factory function to create a floating toolbar
 */
export function createFloatingToolbar(props: FloatingToolbarProps): HTMLElement {
  const toolbar = new FloatingToolbar(props);
  return toolbar.getElement();
}
