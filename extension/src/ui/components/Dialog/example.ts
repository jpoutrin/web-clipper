/**
 * Dialog Component Usage Examples
 *
 * Demonstrates various use cases for the Dialog component.
 * This file is for reference and testing purposes.
 */

import { Dialog, showDialog } from './Dialog';

/**
 * Example 1: Simple informational dialog
 */
export function showInfoDialog() {
  const dialog = new Dialog({
    variant: 'default',
    title: 'Welcome to Web Clipper',
    description: 'Save and organize web content with ease.',
    dismissible: true,
    primaryAction: {
      label: 'Get Started',
      variant: 'primary',
      onClick: () => {
        console.log('User clicked Get Started');
      },
    },
  });

  dialog.open();
}

/**
 * Example 2: Success confirmation with icon
 */
export function showSuccessDialog() {
  const checkIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  `;

  const dialog = new Dialog({
    variant: 'success',
    title: 'Clip Saved!',
    description: 'Your content has been successfully saved to your collection.',
    icon: checkIcon,
    dismissible: true,
    primaryAction: {
      label: 'View Clip',
      variant: 'primary',
      onClick: () => {
        console.log('Navigate to clip');
      },
    },
    secondaryAction: {
      label: 'Close',
      variant: 'secondary',
      onClick: () => {
        console.log('Just close');
      },
    },
  });

  dialog.open();
}

/**
 * Example 3: Warning dialog for confirmation
 */
export async function showDeleteWarning(): Promise<boolean> {
  const warningIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  `;

  const confirmed = await showDialog({
    variant: 'warning',
    title: 'Delete Clip?',
    description: 'This action cannot be undone. The clip will be permanently removed from your collection.',
    icon: warningIcon,
    dismissible: true,
    primaryAction: {
      label: 'Delete',
      variant: 'danger',
      onClick: async () => {
        // Simulate async delete operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Clip deleted');
      },
    },
    secondaryAction: {
      label: 'Cancel',
      variant: 'secondary',
      onClick: () => {
        console.log('Delete cancelled');
      },
    },
  });

  return confirmed;
}

/**
 * Example 4: Error dialog
 */
export function showErrorDialog(errorMessage: string) {
  const errorIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 18L18 6M6 6l12 12"/>
    </svg>
  `;

  const dialog = new Dialog({
    variant: 'error',
    title: 'Failed to Save',
    description: errorMessage || 'An unexpected error occurred. Please try again.',
    icon: errorIcon,
    dismissible: true,
    primaryAction: {
      label: 'Retry',
      variant: 'primary',
      onClick: async () => {
        console.log('Retrying operation');
        // Retry logic here
      },
    },
    secondaryAction: {
      label: 'Cancel',
      variant: 'secondary',
      onClick: () => {
        console.log('User cancelled retry');
      },
    },
  });

  dialog.open();
}

/**
 * Example 5: Non-dismissible critical dialog
 */
export function showCriticalDialog() {
  const dialog = new Dialog({
    variant: 'error',
    title: 'Authentication Required',
    description: 'Your session has expired. Please sign in again to continue.',
    dismissible: false, // User must take action
    primaryAction: {
      label: 'Sign In',
      variant: 'primary',
      onClick: async () => {
        console.log('Redirecting to sign in');
        // Redirect to auth flow
      },
    },
  });

  dialog.open();
}

/**
 * Example 6: Dialog with custom close callback
 */
export function showDialogWithCallback() {
  const dialog = new Dialog({
    title: 'Configure Settings',
    description: 'Adjust your preferences and settings.',
    dismissible: true,
    onClose: () => {
      console.log('Dialog was closed');
      // Perform cleanup or state updates
      // Save any unsaved changes
    },
    primaryAction: {
      label: 'Save',
      variant: 'primary',
      onClick: async () => {
        console.log('Saving settings');
        await new Promise(resolve => setTimeout(resolve, 500));
      },
    },
  });

  dialog.open();
}

/**
 * Example 7: Async action with promise
 */
export async function showAsyncDialog() {
  const confirmed = await showDialog({
    title: 'Sync Now?',
    description: 'This will sync all your clips with the cloud. It may take a few moments.',
    dismissible: true,
    primaryAction: {
      label: 'Sync',
      variant: 'primary',
      onClick: async () => {
        // Simulate long-running async operation
        console.log('Starting sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Sync complete');
      },
    },
    secondaryAction: {
      label: 'Later',
      variant: 'secondary',
      onClick: () => {
        console.log('Sync postponed');
      },
    },
  });

  if (confirmed) {
    console.log('User initiated sync');
  } else {
    console.log('User postponed sync');
  }
}

/**
 * Example 8: Simple alert dialog
 */
export function showAlertDialog(message: string) {
  const dialog = new Dialog({
    title: 'Alert',
    description: message,
    dismissible: true,
    primaryAction: {
      label: 'OK',
      variant: 'primary',
      onClick: () => {
        // Just close
      },
    },
  });

  dialog.open();
}
