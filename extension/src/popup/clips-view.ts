/**
 * ClipsView Controller
 *
 * Manages state, API calls, and rendering for the clips list view.
 */

import { ClipSummary, ListClipsResponse, ClipFilters } from '../types';
import { createClipCard } from '../ui/components/ClipCard';
import { createEmptyState } from '../ui/components/EmptyState';
import { createSpinner } from '../ui/components/Spinner';

/**
 * ClipsView state interface
 */
interface ClipsViewState {
  clips: ClipSummary[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  filters: {
    mode?: string;
    tag?: string;
  };
}

/**
 * ClipsView class
 *
 * Manages the clips list view with loading, error, and empty states.
 */
export class ClipsView {
  private state: ClipsViewState;
  private container: HTMLElement;
  private clipCards: Map<string, HTMLElement> = new Map();

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;

    this.state = {
      clips: [],
      loading: false,
      error: null,
      page: 1,
      totalPages: 1,
      filters: {},
    };
  }

  /**
   * Initialize the clips view
   */
  async init(): Promise<void> {
    await this.loadClips();
  }

  /**
   * Load clips from the server
   */
  async loadClips(): Promise<void> {
    this.setState({ loading: true, error: null });

    try {
      const filters: ClipFilters = {
        page: this.state.page,
        per_page: 20,
        mode: this.state.filters.mode as any,
        tag: this.state.filters.tag,
      };

      const response = await chrome.runtime.sendMessage({
        type: 'LIST_CLIPS',
        payload: filters,
      });

      // Check for error response
      if (!response || 'error' in response) {
        this.setState({
          error: response?.error || 'Failed to load clips',
          loading: false,
        });
        return;
      }

      // Validate response structure
      const data = response as ListClipsResponse;
      if (!data.clips || !Array.isArray(data.clips)) {
        console.error('Invalid response structure:', data);
        this.setState({
          error: 'Invalid response from server',
          loading: false,
        });
        return;
      }

      // Normalize clips data (convert null tags to empty array)
      const normalizedClips = data.clips.map(clip => ({
        ...clip,
        tags: clip.tags || [],
      }));

      this.setState({
        clips: normalizedClips,
        totalPages: data.total_pages || 1,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load clips:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load clips',
        loading: false,
      });
    }
  }

  /**
   * Update state and trigger re-render
   */
  private setState(updates: Partial<ClipsViewState>): void {
    this.state = { ...this.state, ...updates };
    this.render();
  }

  /**
   * Render the clips view based on current state
   */
  private render(): void {
    if (this.state.loading) {
      this.renderLoading();
    } else if (this.state.error) {
      this.renderError();
    } else if (!this.state.clips || this.state.clips.length === 0) {
      this.renderEmpty();
    } else {
      this.renderClips();
    }
  }

  /**
   * Render loading state
   */
  private renderLoading(): void {
    this.container.innerHTML = '';
    const loadingContainer = document.createElement('div');
    loadingContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 16px; gap: 12px;';

    const spinner = createSpinner({ size: 'lg', label: 'Loading clips...' });
    loadingContainer.appendChild(spinner);

    const text = document.createElement('p');
    text.textContent = 'Loading your clips...';
    text.style.cssText = 'font-size: 14px; color: #6b7280; margin: 0;';
    loadingContainer.appendChild(text);

    this.container.appendChild(loadingContainer);
  }

  /**
   * Render empty state
   */
  private renderEmpty(): void {
    this.container.innerHTML = '';
    const hasFilters = this.state.filters.mode || this.state.filters.tag;

    const emptyState = createEmptyState({
      icon: '📋',
      title: hasFilters ? 'No clips found' : 'No clips yet',
      description: hasFilters
        ? 'Try adjusting your filters'
        : 'Start clipping content from the web',
      actionText: hasFilters ? undefined : 'Start Clipping →',
      onAction: () => {
        window.location.hash = '';
      },
    });

    this.container.appendChild(emptyState);
  }

  /**
   * Render error state
   */
  private renderError(): void {
    this.container.innerHTML = '';
    const errorState = createEmptyState({
      icon: '⚠️',
      title: 'Failed to load clips',
      description: this.state.error || 'Please check your connection',
      actionText: 'Retry',
      onAction: () => this.loadClips(),
    });

    this.container.appendChild(errorState);
  }

  /**
   * Render clips list
   */
  private renderClips(): void {
    this.container.innerHTML = '';

    // Defensive check
    if (!this.state.clips || !Array.isArray(this.state.clips)) {
      this.renderError();
      return;
    }

    // Create clips list container
    const clipsList = document.createElement('div');
    clipsList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    this.state.clips.forEach(clip => {
      const card = createClipCard({
        clip,
        onClick: (id) => this.handleClipClick(id),
      });
      clipsList.appendChild(card);
      this.clipCards.set(clip.id, card);
    });

    this.container.appendChild(clipsList);

    // Add pagination info if multiple pages
    if (this.state.totalPages > 1) {
      const paginationInfo = document.createElement('div');
      paginationInfo.style.cssText = 'text-align: center; padding: 16px; font-size: 13px; color: #6b7280;';
      paginationInfo.textContent = `Page ${this.state.page} of ${this.state.totalPages}`;
      this.container.appendChild(paginationInfo);
    }
  }

  /**
   * Handle clip card click
   */
  private handleClipClick(id: string): void {
    // Future: Navigate to clip detail view
    console.log('Clip clicked:', id);
    // For now, just log - we'll implement detail view later
  }

  /**
   * Destroy the clips view
   */
  destroy(): void {
    this.clipCards.clear();
    this.container.innerHTML = '';
  }
}
