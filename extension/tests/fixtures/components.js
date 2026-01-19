/**
 * Component Test Harness - Initializes all Web Clipper UI components
 * This file loads and renders component variants for Playwright testing
 */

// Import paths relative to the extension source
import { Button } from '../../src/ui/components/Button/Button.js';
import { ProgressBar } from '../../src/ui/components/ProgressBar/ProgressBar.js';
import { Spinner } from '../../src/ui/components/Spinner/Spinner.js';
import { Dialog, showDialog } from '../../src/ui/components/Dialog/Dialog.js';
import { Toast } from '../../src/ui/components/Toast/Toast.js';
import { ToastManager } from '../../src/ui/components/Toast/ToastManager.js';

// SVG Icons
const checkIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const plusIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const trashIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M6 4V2H10V4M3 4L4 14H12L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Initialize Toast Manager
const toastManager = new ToastManager();

// ==========================================
// BUTTON COMPONENT
// ==========================================

function initializeButtons() {
  const variantsContainer = document.getElementById('button-variants');
  const sizesContainer = document.getElementById('button-sizes');
  const statesContainer = document.getElementById('button-states');
  const iconsContainer = document.getElementById('button-icons');
  const fullWidthContainer = document.getElementById('button-full-width');

  // Variants
  ['primary', 'secondary', 'ghost', 'danger'].forEach(variant => {
    const button = new Button(
      { variant, size: 'md' },
      `${variant.charAt(0).toUpperCase() + variant.slice(1)} Button`
    );
    button.addEventListener('wc-click', () => {
      console.log(`${variant} button clicked`);
    });
    button.getElement().setAttribute('data-testid', `button-${variant}`);
    variantsContainer.appendChild(button.getElement());
  });

  // Sizes
  ['sm', 'md', 'lg'].forEach(size => {
    const button = new Button(
      { variant: 'primary', size },
      `${size.toUpperCase()} Button`
    );
    button.getElement().setAttribute('data-testid', `button-size-${size}`);
    sizesContainer.appendChild(button.getElement());
  });

  // States
  const disabledButton = new Button(
    { variant: 'primary', size: 'md', disabled: true },
    'Disabled Button'
  );
  disabledButton.getElement().setAttribute('data-testid', 'button-disabled');
  statesContainer.appendChild(disabledButton.getElement());

  const loadingButton = new Button(
    { variant: 'primary', size: 'md', loading: true },
    'Loading Button'
  );
  loadingButton.getElement().setAttribute('data-testid', 'button-loading');
  statesContainer.appendChild(loadingButton.getElement());

  // Icon buttons
  const iconLeftButton = new Button(
    { variant: 'primary', size: 'md', icon: checkIcon, iconPosition: 'left' },
    'Icon Left'
  );
  iconLeftButton.getElement().setAttribute('data-testid', 'button-icon-left');
  iconsContainer.appendChild(iconLeftButton.getElement());

  const iconRightButton = new Button(
    { variant: 'primary', size: 'md', icon: plusIcon, iconPosition: 'right' },
    'Icon Right'
  );
  iconRightButton.getElement().setAttribute('data-testid', 'button-icon-right');
  iconsContainer.appendChild(iconRightButton.getElement());

  const iconOnlyButton = new Button(
    { variant: 'primary', size: 'md', iconOnly: true, icon: trashIcon, ariaLabel: 'Delete item' }
  );
  iconOnlyButton.getElement().setAttribute('data-testid', 'button-icon-only');
  iconsContainer.appendChild(iconOnlyButton.getElement());

  // Full width
  const fullWidthButton = new Button(
    { variant: 'primary', size: 'md', fullWidth: true },
    'Full Width Button'
  );
  fullWidthButton.getElement().setAttribute('data-testid', 'button-full-width');
  fullWidthButton.getElement().style.width = '100%';
  fullWidthContainer.appendChild(fullWidthButton.getElement());
}

// ==========================================
// PROGRESS BAR COMPONENT
// ==========================================

function initializeProgressBars() {
  // Linear variants - different sizes
  const linearSm = new ProgressBar({
    value: 45,
    variant: 'linear',
    size: 'sm',
    showPercentage: true,
    ariaLabel: 'Small progress'
  });
  linearSm.getElement().setAttribute('data-testid', 'progress-linear-sm');
  document.getElementById('progress-linear-sm').appendChild(linearSm.getElement());

  const linearMd = new ProgressBar({
    value: 65,
    variant: 'linear',
    size: 'md',
    showPercentage: true,
    animated: true,
    ariaLabel: 'Medium progress'
  });
  linearMd.getElement().setAttribute('data-testid', 'progress-linear-md');
  document.getElementById('progress-linear-md').appendChild(linearMd.getElement());

  const linearLg = new ProgressBar({
    value: 85,
    variant: 'linear',
    size: 'lg',
    showPercentage: true,
    ariaLabel: 'Large progress'
  });
  linearLg.getElement().setAttribute('data-testid', 'progress-linear-lg');
  document.getElementById('progress-linear-lg').appendChild(linearLg.getElement());

  // Phased variant
  const phased = new ProgressBar({
    value: 66,
    variant: 'phased',
    phases: [
      { id: 'capture', label: 'Capturing', status: 'completed' },
      { id: 'process', label: 'Processing', status: 'active' },
      { id: 'upload', label: 'Uploading', status: 'pending' }
    ],
    size: 'md',
    ariaLabel: 'Multi-phase progress'
  });
  phased.getElement().setAttribute('data-testid', 'progress-phased');
  document.getElementById('progress-phased').appendChild(phased.getElement());
  window.phasedProgress = phased; // Store for testing

  // Interactive progress bar
  const interactive = new ProgressBar({
    value: 50,
    variant: 'linear',
    size: 'md',
    showPercentage: true,
    ariaLabel: 'Interactive progress'
  });
  interactive.getElement().setAttribute('data-testid', 'progress-interactive');
  document.getElementById('progress-interactive').appendChild(interactive.getElement());

  // Store instance for controls
  window.interactiveProgress = interactive;

  // Control buttons
  document.getElementById('progress-decrease').addEventListener('click', () => {
    const currentValue = interactive['props'].value;
    interactive.setValue(Math.max(0, currentValue - 10));
  });

  document.getElementById('progress-increase').addEventListener('click', () => {
    const currentValue = interactive['props'].value;
    interactive.setValue(Math.min(100, currentValue + 10));
  });

  let currentPhase = 0;
  const phases = ['capture', 'process', 'upload'];
  const phaseStatuses = ['completed', 'active', 'pending'];

  document.getElementById('progress-phase-next').addEventListener('click', () => {
    currentPhase = (currentPhase + 1) % 3;
    phased.setPhaseStatus(phases[currentPhase], 'completed');
    if (currentPhase < 2) {
      phased.setPhaseStatus(phases[currentPhase + 1], 'active');
    }
  });
}

// ==========================================
// SPINNER COMPONENT
// ==========================================

function initializeSpinners() {
  const sizesContainer = document.getElementById('spinner-sizes');
  const colorsContainer = document.getElementById('spinner-colors');

  // Sizes
  ['sm', 'md', 'lg'].forEach(size => {
    const spinner = new Spinner({ size, label: `${size} spinner loading` });
    spinner.getElement().setAttribute('data-testid', `spinner-${size}`);
    sizesContainer.appendChild(spinner.getElement());
  });

  // Colors
  const colors = [
    { color: '#3b82f6', label: 'Blue' },
    { color: '#22c55e', label: 'Green' },
    { color: '#ef4444', label: 'Red' },
  ];

  colors.forEach(({ color, label }) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '0.5rem';

    const spinner = new Spinner({ size: 'md', color, label: `${label} spinner` });
    spinner.getElement().setAttribute('data-testid', `spinner-color-${label.toLowerCase()}`);

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.fontSize = '0.75rem';
    labelEl.style.color = '#6b7280';

    wrapper.appendChild(spinner.getElement());
    wrapper.appendChild(labelEl);
    colorsContainer.appendChild(wrapper);
  });
}

// ==========================================
// DIALOG COMPONENT
// ==========================================

function initializeDialogs() {
  const resultDiv = document.getElementById('dialog-result');

  // Default dialog
  document.getElementById('dialog-default-trigger').addEventListener('click', async () => {
    const result = await showDialog({
      variant: 'default',
      title: 'Default Dialog',
      description: 'This is a default dialog with primary and secondary actions.',
      primaryAction: {
        label: 'Confirm',
        variant: 'primary',
        onClick: async () => {
          console.log('Primary action clicked');
        }
      },
      secondaryAction: {
        label: 'Cancel',
        variant: 'secondary',
        onClick: async () => {
          console.log('Secondary action clicked');
        }
      },
      dismissible: false
    });

    resultDiv.textContent = `Dialog closed. Primary action: ${result}`;
    resultDiv.style.display = 'block';
    resultDiv.setAttribute('data-testid', 'dialog-result');
  });

  // Warning dialog
  document.getElementById('dialog-warning-trigger').addEventListener('click', async () => {
    await showDialog({
      variant: 'warning',
      title: 'Warning Dialog',
      description: 'This action may have consequences. Are you sure you want to continue?',
      primaryAction: {
        label: 'Continue',
        variant: 'primary',
        onClick: async () => {
          console.log('Warning accepted');
        }
      },
      dismissible: true
    });
  });

  // Error dialog
  document.getElementById('dialog-error-trigger').addEventListener('click', async () => {
    await showDialog({
      variant: 'error',
      title: 'Error Dialog',
      description: 'An error occurred while processing your request.',
      primaryAction: {
        label: 'Try Again',
        variant: 'danger',
        onClick: async () => {
          console.log('Retry clicked');
        }
      },
      dismissible: true
    });
  });

  // Success dialog
  document.getElementById('dialog-success-trigger').addEventListener('click', async () => {
    await showDialog({
      variant: 'success',
      title: 'Success!',
      description: 'Your operation completed successfully.',
      primaryAction: {
        label: 'Done',
        variant: 'primary',
        onClick: async () => {
          console.log('Done clicked');
        }
      },
      dismissible: true
    });
  });

  // Dismissible dialog
  document.getElementById('dialog-dismissible-trigger').addEventListener('click', async () => {
    await showDialog({
      variant: 'default',
      title: 'Dismissible Dialog',
      description: 'You can close this dialog by clicking outside or pressing ESC.',
      dismissible: true
    });
  });
}

// ==========================================
// TOAST COMPONENT
// ==========================================

function initializeToasts() {
  // Success toast
  document.getElementById('toast-success-trigger').addEventListener('click', () => {
    toastManager.show({
      variant: 'success',
      title: 'Success!',
      description: 'Your action completed successfully.',
      duration: 3000
    });
  });

  // Error toast
  document.getElementById('toast-error-trigger').addEventListener('click', () => {
    toastManager.show({
      variant: 'error',
      title: 'Error',
      description: 'Something went wrong. Please try again.',
      duration: 5000
    });
  });

  // Warning toast
  document.getElementById('toast-warning-trigger').addEventListener('click', () => {
    toastManager.show({
      variant: 'warning',
      title: 'Warning',
      description: 'Please review your input before continuing.',
      duration: 4000
    });
  });

  // Info toast
  document.getElementById('toast-info-trigger').addEventListener('click', () => {
    toastManager.show({
      variant: 'info',
      title: 'Information',
      description: 'Here is some helpful information.',
      duration: 3000
    });
  });

  // Toast with action
  document.getElementById('toast-action-trigger').addEventListener('click', () => {
    toastManager.show({
      variant: 'info',
      title: 'Item deleted',
      description: 'The item has been removed.',
      action: {
        label: 'Undo',
        onClick: () => {
          console.log('Undo clicked');
          toastManager.show({
            variant: 'success',
            title: 'Restored',
            description: 'Item has been restored.',
            duration: 2000
          });
        }
      },
      duration: 5000
    });
  });

  // Persistent toast
  document.getElementById('toast-persistent-trigger').addEventListener('click', () => {
    toastManager.show({
      variant: 'warning',
      title: 'Persistent Toast',
      description: 'This toast will not auto-dismiss. Click the X to close.',
      duration: 0,
      dismissible: true
    });
  });
}

// ==========================================
// INITIALIZE ALL COMPONENTS
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeButtons();
    initializeProgressBars();
    initializeSpinners();
    initializeDialogs();
    initializeToasts();

    console.log('All components initialized successfully');
  } catch (error) {
    console.error('Error initializing components:', error);
  }
});
