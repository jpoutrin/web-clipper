/**
 * Progress Bar Component
 *
 * Accessible progress indicator supporting linear (single bar) and phased (segmented) variants.
 * Supports size variants, animations, and both light/dark modes.
 *
 * Features:
 * - Linear and phased variants
 * - Three size variants (sm, md, lg)
 * - Optional shimmer animation
 * - Phase status management (pending, active, completed, error)
 * - Full ARIA accessibility
 * - Shadow DOM isolation
 * - Dark mode support
 *
 * @example Linear progress
 * ```typescript
 * const progress = createProgressBar({
 *   value: 45,
 *   variant: 'linear',
 *   size: 'md',
 *   showPercentage: true,
 *   ariaLabel: 'Upload progress'
 * });
 * document.body.appendChild(progress);
 * ```
 *
 * @example Phased progress
 * ```typescript
 * const progress = createProgressBar({
 *   value: 66,
 *   variant: 'phased',
 *   phases: [
 *     { id: 'capture', label: 'Capturing', status: 'completed' },
 *     { id: 'process', label: 'Processing', status: 'active' },
 *     { id: 'upload', label: 'Uploading', status: 'pending' }
 *   ],
 *   size: 'md',
 *   ariaLabel: 'Clip creation progress'
 * });
 * ```
 */

import { shouldAnimate } from '../../utils';

/**
 * Phase configuration for phased progress bars
 */
export interface ProgressPhase {
  /** Unique identifier for the phase */
  id: string;
  /** Display label for the phase */
  label: string;
  /** Current status of the phase */
  status: 'pending' | 'active' | 'completed' | 'error';
}

/**
 * Progress Bar component properties
 */
export interface ProgressBarProps {
  /** Current progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Visual variant */
  variant: 'linear' | 'phased';
  /** Phase configurations (required for phased variant) */
  phases?: ProgressPhase[];
  /** Show text label below progress bar */
  showLabel?: boolean;
  /** Show percentage in label */
  showPercentage?: boolean;
  /** Size variant */
  size: 'sm' | 'md' | 'lg';
  /** Enable shimmer animation */
  animated?: boolean;
  /** Accessible label describing the operation */
  ariaLabel: string;
}

/**
 * Progress Bar class for managing component state and behavior
 */
export class ProgressBar {
  private host: HTMLElement;
  private shadowRoot: ShadowRoot;
  private props: ProgressBarProps;
  private fillElement: HTMLElement | null = null;
  private percentageElement: HTMLElement | null = null;
  private phaseElements: Map<string, HTMLElement> = new Map();
  private liveRegion: HTMLElement | null = null;

  constructor(props: ProgressBarProps) {
    this.props = this.validateProps(props);
    this.host = document.createElement('div');
    this.shadowRoot = this.host.attachShadow({ mode: 'closed' });

    this.render();
  }

  /**
   * Validates and normalizes component props
   */
  private validateProps(props: ProgressBarProps): ProgressBarProps {
    const normalized = { ...props };

    // Ensure value is clamped to valid range
    normalized.max = props.max ?? 100;
    normalized.value = Math.max(0, Math.min(props.value, normalized.max));

    // Validate phased variant requirements
    if (props.variant === 'phased' && (!props.phases || props.phases.length === 0)) {
      throw new Error('Phased variant requires at least one phase configuration');
    }

    // Validate phase IDs are unique
    if (props.phases) {
      const ids = props.phases.map(p => p.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        throw new Error('Phase IDs must be unique');
      }
    }

    return normalized;
  }

  /**
   * Renders the component
   */
  private render(): void {
    const { variant, size, animated, ariaLabel, value, max = 100 } = this.props;
    const percentage = Math.round((value / max) * 100);
    const useAnimation = animated && shouldAnimate();

    const template = `
      <div class="wc-progress-container">
        <div
          class="wc-progress ${variant} ${size} ${useAnimation ? 'animated' : ''}"
          role="progressbar"
          aria-valuenow="${value}"
          aria-valuemin="0"
          aria-valuemax="${max}"
          aria-label="${ariaLabel}"
        >
          ${variant === 'linear' ? this.renderLinear() : this.renderPhased()}
        </div>
        ${this.renderLabel()}
        <div class="wc-sr-only" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;

    // Inject styles and template
    const styleEl = document.createElement('style');
    styleEl.textContent = this.getCombinedStyles();
    this.shadowRoot.appendChild(styleEl);

    const container = document.createElement('div');
    container.innerHTML = template;
    this.shadowRoot.appendChild(container);

    // Cache references to dynamic elements
    this.cacheElementReferences();

    // Set initial progress
    this.updateProgress();
  }

  /**
   * Renders linear progress bar variant
   */
  private renderLinear(): string {
    return `
      <div class="wc-progress-track">
        <div class="wc-progress-fill" data-fill></div>
      </div>
    `;
  }

  /**
   * Renders phased progress bar variant
   */
  private renderPhased(): string {
    const { phases = [] } = this.props;
    const phaseWidth = 100 / phases.length;

    const phasesHTML = phases.map(phase => `
      <div
        class="wc-progress-phase"
        data-phase="${phase.id}"
        data-status="${phase.status}"
        style="width: ${phaseWidth}%"
      >
        <div class="wc-progress-phase-fill"></div>
        <div class="wc-progress-phase-label">${phase.label}</div>
      </div>
    `).join('');

    return `
      <div class="wc-progress-phases">
        ${phasesHTML}
      </div>
    `;
  }

  /**
   * Renders label section
   */
  private renderLabel(): string {
    const { showLabel, showPercentage } = this.props;

    if (!showLabel && !showPercentage) {
      return '';
    }

    return `
      <div class="wc-progress-label">
        ${showPercentage ? '<span class="wc-progress-percentage" data-percentage></span>' : ''}
      </div>
    `;
  }

  /**
   * Caches references to frequently updated elements
   */
  private cacheElementReferences(): void {
    this.fillElement = this.shadowRoot.querySelector('[data-fill]');
    this.percentageElement = this.shadowRoot.querySelector('[data-percentage]');
    this.liveRegion = this.shadowRoot.querySelector('[aria-live]');

    // Cache phase elements for phased variant
    if (this.props.variant === 'phased' && this.props.phases) {
      this.props.phases.forEach(phase => {
        const element = this.shadowRoot.querySelector(`[data-phase="${phase.id}"]`) as HTMLElement;
        if (element) {
          this.phaseElements.set(phase.id, element);
        }
      });
    }
  }

  /**
   * Updates the progress bar visual state
   */
  private updateProgress(): void {
    const { value, max = 100, variant } = this.props;
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));

    // Update ARIA attributes
    const progressEl = this.shadowRoot.querySelector('[role="progressbar"]');
    if (progressEl) {
      progressEl.setAttribute('aria-valuenow', String(value));
    }

    if (variant === 'linear') {
      // Update linear fill
      if (this.fillElement) {
        this.fillElement.style.width = `${percentage}%`;
      }
    }

    // Update percentage display
    if (this.percentageElement) {
      this.percentageElement.textContent = `${Math.round(percentage)}%`;
    }

    // Announce to screen readers
    this.announceProgress(percentage);
  }

  /**
   * Announces progress changes to screen readers
   */
  private announceProgress(percentage: number): void {
    if (this.liveRegion) {
      const { ariaLabel } = this.props;
      this.liveRegion.textContent = `${ariaLabel}: ${Math.round(percentage)}% complete`;
    }
  }

  /**
   * Sets the current progress value
   *
   * @param value - New progress value (0 to max)
   *
   * @example
   * ```typescript
   * progressBar.setValue(75);
   * ```
   */
  setValue(value: number): void {
    const { max = 100 } = this.props;
    this.props.value = Math.max(0, Math.min(value, max));
    this.updateProgress();
  }

  /**
   * Sets the status of a specific phase
   *
   * @param id - Phase identifier
   * @param status - New phase status
   *
   * @example
   * ```typescript
   * progressBar.setPhaseStatus('upload', 'completed');
   * progressBar.setPhaseStatus('process', 'active');
   * ```
   */
  setPhaseStatus(id: string, status: ProgressPhase['status']): void {
    if (this.props.variant !== 'phased') {
      console.warn('setPhaseStatus can only be used with phased variant');
      return;
    }

    // Update props
    const phase = this.props.phases?.find(p => p.id === id);
    if (!phase) {
      console.warn(`Phase with id "${id}" not found`);
      return;
    }

    phase.status = status;

    // Update DOM
    const element = this.phaseElements.get(id);
    if (element) {
      element.setAttribute('data-status', status);
    }

    // Announce status change to screen readers
    if (this.liveRegion) {
      const statusText = status === 'completed' ? 'completed' :
                        status === 'active' ? 'in progress' :
                        status === 'error' ? 'failed' : 'pending';
      this.liveRegion.textContent = `${phase.label} ${statusText}`;
    }
  }

  /**
   * Returns the host element
   */
  getElement(): HTMLElement {
    return this.host;
  }

  /**
   * Gets combined styles with design tokens
   */
  private getCombinedStyles(): string {
    // Base CSS reset for Shadow DOM
    const resetCSS = `
      *, *::before, *::after {
        box-sizing: border-box;
      }
      * {
        margin: 0;
        padding: 0;
      }
      .wc-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;

    // Design tokens
    const tokensCSS = `
      :host {
        /* Colors */
        --wc-primary-500: #3b82f6;
        --wc-primary-600: #2563eb;
        --wc-success-500: #22c55e;
        --wc-success-600: #16a34a;
        --wc-error-500: #ef4444;
        --wc-error-600: #dc2626;
        --wc-gray-200: #e5e7eb;
        --wc-gray-300: #d1d5db;
        --wc-gray-700: #374151;
        --wc-gray-800: #1f2937;
        --wc-text-primary: #111827;
        --wc-text-secondary: #6b7280;

        /* Spacing */
        --wc-space-1: 4px;
        --wc-space-2: 8px;

        /* Transitions */
        --wc-duration-normal: 200ms;
        --wc-ease-out: cubic-bezier(0, 0, 0.2, 1);
      }

      @media (prefers-color-scheme: dark) {
        :host {
          --wc-gray-200: #1f2937;
          --wc-gray-300: #374151;
          --wc-gray-700: #d1d5db;
          --wc-gray-800: #e5e7eb;
          --wc-text-primary: #f9fafb;
          --wc-text-secondary: #9ca3af;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          --wc-duration-normal: 0ms;
        }
      }
    `;

    // Component styles (inlined from ProgressBar.css)
    const componentCSS = `
      /* Container */
      .wc-progress-container {
        width: 100%;
      }

      /* Base Progress Bar */
      .wc-progress {
        width: 100%;
        overflow: hidden;
        position: relative;
      }

      /* ================================
         LINEAR VARIANT
         ================================ */

      .wc-progress.linear {
        border-radius: 9999px;
      }

      .wc-progress-track {
        width: 100%;
        background-color: var(--wc-gray-200);
        border-radius: inherit;
        overflow: hidden;
        position: relative;
      }

      .wc-progress-fill {
        height: 100%;
        background-color: var(--wc-primary-600);
        border-radius: inherit;
        transition: width var(--wc-duration-normal) var(--wc-ease-out);
        position: relative;
        overflow: hidden;
      }

      /* Shimmer animation for linear progress */
      .wc-progress.linear.animated .wc-progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        );
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      /* ================================
         PHASED VARIANT
         ================================ */

      .wc-progress.phased {
        border-radius: 6px;
      }

      .wc-progress-phases {
        display: flex;
        gap: var(--wc-space-1);
        width: 100%;
      }

      .wc-progress-phase {
        position: relative;
        background-color: var(--wc-gray-200);
        border-radius: 4px;
        overflow: hidden;
        transition: background-color var(--wc-duration-normal) var(--wc-ease-out);
      }

      .wc-progress-phase-fill {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transform-origin: left;
        transition: transform var(--wc-duration-normal) var(--wc-ease-out);
        border-radius: inherit;
      }

      /* Phase status colors */
      .wc-progress-phase[data-status="pending"] {
        background-color: var(--wc-gray-200);
      }

      .wc-progress-phase[data-status="pending"] .wc-progress-phase-fill {
        transform: scaleX(0);
        background-color: var(--wc-gray-300);
      }

      .wc-progress-phase[data-status="active"] {
        background-color: var(--wc-gray-200);
      }

      .wc-progress-phase[data-status="active"] .wc-progress-phase-fill {
        transform: scaleX(0.5);
        background-color: var(--wc-primary-600);
      }

      .wc-progress-phase[data-status="completed"] {
        background-color: var(--wc-success-600);
      }

      .wc-progress-phase[data-status="completed"] .wc-progress-phase-fill {
        transform: scaleX(1);
        background-color: var(--wc-success-600);
      }

      .wc-progress-phase[data-status="error"] {
        background-color: var(--wc-error-600);
      }

      .wc-progress-phase[data-status="error"] .wc-progress-phase-fill {
        transform: scaleX(1);
        background-color: var(--wc-error-600);
      }

      /* Shimmer animation for active phase */
      .wc-progress.phased.animated .wc-progress-phase[data-status="active"]::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        );
        animation: shimmer 2s infinite;
      }

      /* Phase labels */
      .wc-progress-phase-label {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: var(--wc-space-1);
        font-size: 11px;
        font-weight: 500;
        color: var(--wc-text-secondary);
        white-space: nowrap;
        text-align: center;
        pointer-events: none;
      }

      .wc-progress-phase[data-status="active"] .wc-progress-phase-label {
        color: var(--wc-text-primary);
        font-weight: 600;
      }

      .wc-progress-phase[data-status="completed"] .wc-progress-phase-label {
        color: var(--wc-success-600);
      }

      .wc-progress-phase[data-status="error"] .wc-progress-phase-label {
        color: var(--wc-error-600);
      }

      /* ================================
         SIZE VARIANTS
         ================================ */

      /* Small - 4px height */
      .wc-progress.linear.sm .wc-progress-track,
      .wc-progress.linear.sm .wc-progress-fill {
        height: 4px;
      }

      .wc-progress.phased.sm .wc-progress-phase {
        height: 4px;
      }

      /* Medium - 8px height */
      .wc-progress.linear.md .wc-progress-track,
      .wc-progress.linear.md .wc-progress-fill {
        height: 8px;
      }

      .wc-progress.phased.md .wc-progress-phase {
        height: 8px;
      }

      /* Large - 12px height */
      .wc-progress.linear.lg .wc-progress-track,
      .wc-progress.linear.lg .wc-progress-fill {
        height: 12px;
      }

      .wc-progress.phased.lg .wc-progress-phase {
        height: 12px;
      }

      /* ================================
         LABEL & PERCENTAGE
         ================================ */

      .wc-progress-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: var(--wc-space-2);
        font-size: 14px;
        color: var(--wc-text-secondary);
      }

      .wc-progress-percentage {
        font-weight: 500;
        color: var(--wc-text-primary);
        font-variant-numeric: tabular-nums;
      }

      /* ================================
         DARK MODE ADJUSTMENTS
         ================================ */

      @media (prefers-color-scheme: dark) {
        .wc-progress-fill {
          background-color: var(--wc-primary-500);
        }

        .wc-progress-phase[data-status="active"] .wc-progress-phase-fill {
          background-color: var(--wc-primary-500);
        }

        .wc-progress-phase[data-status="completed"] {
          background-color: var(--wc-success-500);
        }

        .wc-progress-phase[data-status="completed"] .wc-progress-phase-fill {
          background-color: var(--wc-success-500);
        }

        .wc-progress-phase[data-status="error"] {
          background-color: var(--wc-error-500);
        }

        .wc-progress-phase[data-status="error"] .wc-progress-phase-fill {
          background-color: var(--wc-error-500);
        }

        .wc-progress-phase[data-status="completed"] .wc-progress-phase-label {
          color: var(--wc-success-500);
        }

        .wc-progress-phase[data-status="error"] .wc-progress-phase-label {
          color: var(--wc-error-500);
        }
      }

      /* ================================
         REDUCED MOTION
         ================================ */

      @media (prefers-reduced-motion: reduce) {
        .wc-progress-fill,
        .wc-progress-phase,
        .wc-progress-phase-fill {
          transition: none;
        }

        .wc-progress.linear.animated .wc-progress-fill::after,
        .wc-progress.phased.animated .wc-progress-phase[data-status="active"]::after {
          animation: none;
        }
      }

      /* ================================
         FOCUS STYLES
         ================================ */

      .wc-progress:focus {
        outline: 2px solid var(--wc-primary-500);
        outline-offset: 2px;
      }

      .wc-progress:focus:not(:focus-visible) {
        outline: none;
      }
    `;

    return `${resetCSS}\n${tokensCSS}\n${componentCSS}`;
  }

  /**
   * Destroys the component and cleans up resources
   */
  destroy(): void {
    this.host.remove();
    this.fillElement = null;
    this.percentageElement = null;
    this.liveRegion = null;
    this.phaseElements.clear();
  }
}

/**
 * Creates a new Progress Bar component
 *
 * @param props - Component configuration
 * @returns HTMLElement containing the progress bar
 *
 * @example
 * ```typescript
 * const progressBar = createProgressBar({
 *   value: 50,
 *   variant: 'linear',
 *   size: 'md',
 *   showPercentage: true,
 *   animated: true,
 *   ariaLabel: 'File upload progress'
 * });
 *
 * document.body.appendChild(progressBar);
 * ```
 */
export function createProgressBar(props: ProgressBarProps): HTMLElement {
  const progressBar = new ProgressBar(props);
  return progressBar.getElement();
}
