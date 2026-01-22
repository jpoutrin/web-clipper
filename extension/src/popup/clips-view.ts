/**
 * ClipsView Controller
 *
 * Manages state, API calls, and rendering for the clips list view.
 */

import { ClipSummary, ListClipsResponse, ClipFilters } from '../types';
import { createClipCard } from '../ui/components/ClipCard';
import { createEmptyState } from '../ui/components/EmptyState';
import { createSpinner } from '../ui/components/Spinner';
import { createContextMenu } from '../ui/components/ContextMenu';
import { showUndoToast } from '../ui/components/UndoToast';
import { createConfirmationOverlay } from '../ui/components/ConfirmationOverlay';

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

      // Append to existing clips if loading more, otherwise replace
      const updatedClips = this.state.page > 1
        ? [...this.state.clips, ...normalizedClips]
        : normalizedClips;

      this.setState({
        clips: updatedClips,
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
    clipsList.style.cssText = 'display: flex; flex-direction: column; gap: 16px; padding-bottom: 16px;';

    this.state.clips.forEach(clip => {
      const card = createClipCard({
        clip,
        onClick: (id) => this.handleClipClick(id),
      });

      // Listen for action events (view, menu)
      card.addEventListener('wc-clip-action', ((e: CustomEvent) => {
        const { id, action, anchorElement, buttonRect } = e.detail;
        if (action === 'view') {
          this.handleClipClick(id);
        } else if (action === 'menu') {
          this.showContextMenu(id, anchorElement, buttonRect);
        }
      }) as EventListener);

      // Wrap card in a positioned container for overlay support
      const cardWrapper = document.createElement('div');
      cardWrapper.style.position = 'relative';
      cardWrapper.setAttribute('data-clip-id', clip.id);
      cardWrapper.appendChild(card);

      clipsList.appendChild(cardWrapper);
      this.clipCards.set(clip.id, cardWrapper);
    });

    this.container.appendChild(clipsList);

    // Add pagination controls
    if (this.state.totalPages > 1) {
      this.renderPagination();
    }
  }

  /**
   * Render pagination controls
   */
  private renderPagination(): void {
    const hasMorePages = this.state.page < this.state.totalPages;
    const totalClips = this.state.totalPages * 20; // Assuming 20 per page
    const loadedClips = this.state.clips.length;

    if (hasMorePages) {
      // Load More button
      const loadMoreContainer = document.createElement('div');
      loadMoreContainer.style.cssText = 'padding: 16px 0;';

      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'btn wc-btn--ghost wc-btn--load-more';
      loadMoreBtn.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: all 0.15s;
      `;

      if (this.state.loading) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = `
          <span style="display: flex; align-items: center; gap: 8px;">
            <span class="loading-spinner" style="
              width: 14px;
              height: 14px;
              border: 2px solid rgba(0, 0, 0, 0.1);
              border-top-color: #6b7280;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            "></span>
            Loading...
          </span>
        `;
      } else {
        loadMoreBtn.innerHTML = `
          <span style="font-weight: 500; color: #374151;">Load 20 more clips ↓</span>
          <span style="font-size: 12px; color: #9ca3af;">(${loadedClips} of ${totalClips})</span>
        `;
        loadMoreBtn.addEventListener('click', () => this.loadMoreClips());
        loadMoreBtn.addEventListener('mouseenter', () => {
          loadMoreBtn.style.background = '#f9fafb';
          loadMoreBtn.style.borderColor = '#d1d5db';
        });
        loadMoreBtn.addEventListener('mouseleave', () => {
          loadMoreBtn.style.background = 'transparent';
          loadMoreBtn.style.borderColor = '#e5e7eb';
        });
      }

      loadMoreContainer.appendChild(loadMoreBtn);
      this.container.appendChild(loadMoreContainer);
    } else {
      // All clips loaded
      const endMessage = document.createElement('div');
      endMessage.style.cssText = `
        text-align: center;
        padding: 24px 16px;
        color: #9ca3af;
        font-size: 13px;
        border-top: 1px solid #e5e7eb;
        margin-top: 8px;
      `;
      endMessage.textContent = '───── All clips loaded ─────';
      this.container.appendChild(endMessage);
    }
  }

  /**
   * Load more clips (next page)
   */
  async loadMoreClips(): Promise<void> {
    if (this.state.page >= this.state.totalPages || this.state.loading) {
      return;
    }

    // Increment page
    this.setState({ page: this.state.page + 1 });

    // Load clips (will append to existing list)
    await this.loadClips();
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
   * Show context menu for clip
   */
  private showContextMenu(clipId: string, anchorElement: Element, buttonRect?: DOMRect): void {
    const clip = this.state.clips.find(c => c.id === clipId);
    if (!clip) return;

    createContextMenu({
      anchorElement,
      buttonRect,
      items: [
        {
          label: 'View details',
          icon: '→',
          onClick: () => this.handleClipClick(clipId),
        },
        {
          label: 'Open original',
          icon: '↗',
          onClick: () => this.openOriginalUrl(clip.url),
        },
        {
          label: 'Delete',
          icon: '🗑️',
          danger: true,
          onClick: () => this.showDeleteConfirmation(clipId),
        },
      ],
    });
  }

  /**
   * Show delete confirmation overlay on the card
   */
  private showDeleteConfirmation(clipId: string): void {
    const cardWrapper = this.clipCards.get(clipId);
    if (!cardWrapper) return;

    // Create confirmation overlay
    const overlay = createConfirmationOverlay({
      message: 'Delete this clip?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
      onConfirm: () => {
        // Remove overlay
        overlay.remove();
        this.deleteClip(clipId);
      },
      onCancel: () => {
        // Remove overlay
        overlay.remove();
      },
    });

    // Position overlay absolutely over the card
    const overlayElement = overlay.getElement();
    overlayElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      margin: 0;
    `;

    // Append overlay to wrapper (positioned over the card)
    cardWrapper.appendChild(overlayElement);
  }

  /**
   * Open original URL in new tab
   */
  private openOriginalUrl(url: string): void {
    chrome.tabs.create({ url });
  }

  /**
   * Delete clip with undo (delegates to background)
   */
  private async deleteClip(clipId: string): Promise<void> {
    const clipIndex = this.state.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;

    const clip = this.state.clips[clipIndex];

    // Remove from UI immediately (optimistic)
    this.setState({
      clips: this.state.clips.filter(c => c.id !== clipId),
    });

    // Schedule delete in background with clip data for undo (5 seconds)
    await chrome.runtime.sendMessage({
      type: 'SCHEDULE_DELETE',
      payload: {
        clipId,
        clip,
        index: clipIndex,
        delayMs: 5000,
      },
    });

    // Show undo toast with global undo handler
    showUndoToast({
      message: 'Clip deleted',
      duration: 5000,
      onUndo: () => {
        // Call global undo function (defined in popup.ts)
        // This works even if ClipsView is destroyed
        (window as any).undoClipDelete(clipId);
      },
      onDismiss: () => {
        // No cleanup needed - background handles state
      },
    });
  }

  /**
   * Restore a deleted clip (called by global undo handler)
   */
  public restoreClip(clip: ClipSummary, index: number): void {
    const clips = [...this.state.clips];
    clips.splice(index, 0, clip);
    this.setState({ clips });
  }

  /**
   * Destroy the clips view (cleanup only - deletes handled by background)
   */
  destroy(): void {
    // Just clean up UI - background script handles pending deletes
    this.clipCards.clear();
    this.container.innerHTML = '';
  }
}
