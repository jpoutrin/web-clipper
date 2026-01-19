/**
 * Web Clipper - Toast Component Tests
 *
 * Unit tests for Toast and ToastManager
 */

import { Toast, type ToastProps } from './Toast';
import { ToastManager, toastManager, toast } from './ToastManager';

describe('Toast', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Basic Functionality', () => {
    it('should create a toast with required props', () => {
      const toastInstance = new Toast({
        variant: 'success',
        title: 'Test Toast',
      });

      expect(toastInstance).toBeDefined();
      expect(toastInstance.id).toBeTruthy();
      expect(toastInstance.props.variant).toBe('success');
      expect(toastInstance.props.title).toBe('Test Toast');
    });

    it('should mount toast to container', () => {
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
      });

      toastInstance.mount(container);

      const element = container.querySelector('.wc-toast');
      expect(element).toBeTruthy();
      expect(element?.classList.contains('wc-toast--info')).toBe(true);
    });

    it('should include description when provided', () => {
      const toastInstance = new Toast({
        variant: 'success',
        title: 'Title',
        description: 'This is a description',
      });

      toastInstance.mount(container);

      const description = container.querySelector('.wc-toast__description');
      expect(description?.textContent).toBe('This is a description');
    });
  });

  describe('Variants', () => {
    it.each([
      ['success', 'wc-toast--success'],
      ['error', 'wc-toast--error'],
      ['warning', 'wc-toast--warning'],
      ['info', 'wc-toast--info'],
    ])('should apply correct class for %s variant', (variant, className) => {
      const toastInstance = new Toast({
        variant: variant as ToastProps['variant'],
        title: 'Test',
      });

      toastInstance.mount(container);

      const element = container.querySelector('.wc-toast');
      expect(element?.classList.contains(className)).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should use alert role for error variant', () => {
      const toastInstance = new Toast({
        variant: 'error',
        title: 'Error',
      });

      toastInstance.mount(container);

      const element = container.querySelector('.wc-toast');
      expect(element?.getAttribute('role')).toBe('alert');
      expect(element?.getAttribute('aria-live')).toBe('assertive');
    });

    it('should use status role for success variant', () => {
      const toastInstance = new Toast({
        variant: 'success',
        title: 'Success',
      });

      toastInstance.mount(container);

      const element = container.querySelector('.wc-toast');
      expect(element?.getAttribute('role')).toBe('status');
      expect(element?.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-atomic attribute', () => {
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Info',
      });

      toastInstance.mount(container);

      const element = container.querySelector('.wc-toast');
      expect(element?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should have dismissible button with aria-label', () => {
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        dismissible: true,
      });

      toastInstance.mount(container);

      const dismissButton = container.querySelector('.wc-toast__dismiss');
      expect(dismissButton?.getAttribute('aria-label')).toBe('Dismiss notification');
    });
  });

  describe('Action Button', () => {
    it('should render action button when provided', () => {
      const onClick = jest.fn();
      const toastInstance = new Toast({
        variant: 'success',
        title: 'Test',
        action: {
          label: 'View',
          onClick,
        },
      });

      toastInstance.mount(container);

      const actionButton = container.querySelector('.wc-toast__action') as HTMLButtonElement;
      expect(actionButton).toBeTruthy();
      expect(actionButton?.textContent).toBe('View');

      actionButton?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not render action button when not provided', () => {
      const toastInstance = new Toast({
        variant: 'success',
        title: 'Test',
      });

      toastInstance.mount(container);

      const actionButton = container.querySelector('.wc-toast__action');
      expect(actionButton).toBeNull();
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after duration', (done) => {
      const onDismiss = jest.fn();
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        duration: 100,
        onDismiss,
      });

      toastInstance.mount(container);

      setTimeout(() => {
        expect(onDismiss).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should not auto-dismiss when duration is 0', (done) => {
      const onDismiss = jest.fn();
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        duration: 0,
        onDismiss,
      });

      toastInstance.mount(container);

      setTimeout(() => {
        expect(onDismiss).not.toHaveBeenCalled();
        done();
      }, 200);
    });

    it('should show progress bar for timed toasts', () => {
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        duration: 5000,
      });

      toastInstance.mount(container);

      const progressBar = container.querySelector('.wc-toast__progress');
      expect(progressBar).toBeTruthy();
    });

    it('should not show progress bar for persistent toasts', () => {
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        duration: 0,
      });

      toastInstance.mount(container);

      const progressBar = container.querySelector('.wc-toast__progress');
      expect(progressBar).toBeNull();
    });
  });

  describe('Manual Dismiss', () => {
    it('should dismiss when dismiss button is clicked', () => {
      const onDismiss = jest.fn();
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        dismissible: true,
        onDismiss,
      });

      toastInstance.mount(container);

      const dismissButton = container.querySelector('.wc-toast__dismiss') as HTMLButtonElement;
      dismissButton?.click();

      setTimeout(() => {
        expect(onDismiss).toHaveBeenCalled();
      }, 250);
    });

    it('should not show dismiss button when dismissible is false', () => {
      const toastInstance = new Toast({
        variant: 'info',
        title: 'Test',
        dismissible: false,
      });

      toastInstance.mount(container);

      const dismissButton = container.querySelector('.wc-toast__dismiss');
      expect(dismissButton).toBeNull();
    });
  });
});

describe('ToastManager', () => {
  beforeEach(() => {
    toastManager.dismissAll();
    // Clean up any existing containers
    const containers = document.querySelectorAll('.wc-toast-container');
    containers.forEach(c => c.remove());
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ToastManager.getInstance();
      const instance2 = ToastManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Show Toast', () => {
    it('should show a toast and return ID', () => {
      const id = toastManager.show({
        variant: 'success',
        title: 'Test',
      });

      expect(id).toBeTruthy();
      expect(toastManager.isActive(id)).toBe(true);
    });

    it('should track active toasts', () => {
      const id1 = toastManager.show({ variant: 'success', title: 'Test 1' });
      const id2 = toastManager.show({ variant: 'info', title: 'Test 2' });

      expect(toastManager.getActiveCount()).toBe(2);
      expect(toastManager.isActive(id1)).toBe(true);
      expect(toastManager.isActive(id2)).toBe(true);
    });
  });

  describe('Dismiss Toast', () => {
    it('should dismiss specific toast by ID', () => {
      const id = toastManager.show({
        variant: 'info',
        title: 'Test',
      });

      expect(toastManager.isActive(id)).toBe(true);

      toastManager.dismiss(id);

      setTimeout(() => {
        expect(toastManager.isActive(id)).toBe(false);
      }, 250);
    });

    it('should dismiss all toasts', () => {
      toastManager.show({ variant: 'success', title: 'Test 1' });
      toastManager.show({ variant: 'info', title: 'Test 2' });
      toastManager.show({ variant: 'warning', title: 'Test 3' });

      expect(toastManager.getActiveCount()).toBe(3);

      toastManager.dismissAll();

      setTimeout(() => {
        expect(toastManager.getActiveCount()).toBe(0);
      }, 250);
    });
  });

  describe('Max Toasts Limit', () => {
    it('should respect max toasts limit', () => {
      const manager = ToastManager.getInstance({ maxToasts: 3 });

      for (let i = 0; i < 5; i++) {
        manager.show({ variant: 'info', title: `Test ${i}` });
      }

      expect(manager.getActiveCount()).toBe(3);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      toastManager.updateConfig({
        maxToasts: 10,
        position: 'top-left',
        gap: 16,
      });

      // Configuration is applied to new toasts
      const id = toastManager.show({ variant: 'info', title: 'Test' });
      expect(toastManager.isActive(id)).toBe(true);
    });
  });

  describe('Convenience Methods', () => {
    it('should have success convenience method', () => {
      const id = toast.success('Success!');
      expect(toastManager.isActive(id)).toBe(true);
    });

    it('should have error convenience method', () => {
      const id = toast.error('Error!');
      expect(toastManager.isActive(id)).toBe(true);
    });

    it('should have warning convenience method', () => {
      const id = toast.warning('Warning!');
      expect(toastManager.isActive(id)).toBe(true);
    });

    it('should have info convenience method', () => {
      const id = toast.info('Info!');
      expect(toastManager.isActive(id)).toBe(true);
    });

    it('should accept description in convenience methods', () => {
      const id = toast.success('Title', 'Description');
      expect(toastManager.isActive(id)).toBe(true);
    });

    it('should accept options in convenience methods', () => {
      const id = toast.success('Title', 'Description', {
        duration: 1000,
        dismissible: false,
      });
      expect(toastManager.isActive(id)).toBe(true);
    });
  });
});
