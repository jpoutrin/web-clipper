/**
 * Progress Bar Component - Usage Examples
 *
 * This file demonstrates various use cases for the Progress Bar component.
 * These examples can be used for testing and as reference documentation.
 */

import { ProgressBar, createProgressBar, type ProgressPhase } from './ProgressBar';

/**
 * Example 1: Simple Linear Progress Bar
 *
 * Basic progress bar for simple operations like file uploads.
 */
export function exampleLinearProgress(): void {
  const progress = createProgressBar({
    value: 0,
    variant: 'linear',
    size: 'md',
    showPercentage: true,
    animated: true,
    ariaLabel: 'File upload progress',
  });

  document.body.appendChild(progress);

  // Simulate progress
  let currentProgress = 0;
  const interval = setInterval(() => {
    currentProgress += 10;

    // Access the ProgressBar instance to update value
    // Note: createProgressBar returns HTMLElement, so we'd need to modify
    // the example to use the class directly for updates

    if (currentProgress >= 100) {
      clearInterval(interval);
    }
  }, 500);
}

/**
 * Example 2: Linear Progress with Class Instance
 *
 * Using the ProgressBar class for dynamic updates.
 */
export function exampleLinearWithUpdates(): void {
  const progressBar = new ProgressBar({
    value: 0,
    variant: 'linear',
    size: 'lg',
    showPercentage: true,
    animated: true,
    ariaLabel: 'Download progress',
  });

  document.body.appendChild(progressBar.getElement());

  // Simulate download progress
  let downloaded = 0;
  const interval = setInterval(() => {
    downloaded += 15;
    progressBar.setValue(Math.min(downloaded, 100));

    if (downloaded >= 100) {
      clearInterval(interval);
      // Clean up after completion
      setTimeout(() => progressBar.destroy(), 2000);
    }
  }, 300);
}

/**
 * Example 3: Phased Progress Bar
 *
 * Multi-step process with phase indicators.
 */
export function examplePhasedProgress(): void {
  const phases: ProgressPhase[] = [
    { id: 'capture', label: 'Capturing', status: 'pending' },
    { id: 'process', label: 'Processing', status: 'pending' },
    { id: 'upload', label: 'Uploading', status: 'pending' },
  ];

  const progressBar = new ProgressBar({
    value: 0,
    variant: 'phased',
    phases,
    size: 'md',
    ariaLabel: 'Clip creation progress',
  });

  document.body.appendChild(progressBar.getElement());

  // Simulate multi-step process
  async function runPhases() {
    // Phase 1: Capture
    progressBar.setPhaseStatus('capture', 'active');
    progressBar.setValue(10);

    await delay(2000);

    progressBar.setPhaseStatus('capture', 'completed');
    progressBar.setValue(33);

    // Phase 2: Process
    progressBar.setPhaseStatus('process', 'active');
    progressBar.setValue(40);

    await delay(2500);

    progressBar.setPhaseStatus('process', 'completed');
    progressBar.setValue(66);

    // Phase 3: Upload
    progressBar.setPhaseStatus('upload', 'active');
    progressBar.setValue(70);

    await delay(2000);

    progressBar.setPhaseStatus('upload', 'completed');
    progressBar.setValue(100);

    // Clean up
    await delay(2000);
    progressBar.destroy();
  }

  runPhases();
}

/**
 * Example 4: Phased Progress with Error Handling
 *
 * Demonstrates error state in phased progress.
 */
export function examplePhasedWithError(): void {
  const phases: ProgressPhase[] = [
    { id: 'validate', label: 'Validate', status: 'pending' },
    { id: 'process', label: 'Process', status: 'pending' },
    { id: 'save', label: 'Save', status: 'pending' },
  ];

  const progressBar = new ProgressBar({
    value: 0,
    variant: 'phased',
    phases,
    size: 'md',
    showPercentage: true,
    ariaLabel: 'Data processing',
  });

  document.body.appendChild(progressBar.getElement());

  // Simulate process with error
  async function runWithError() {
    // Validation phase
    progressBar.setPhaseStatus('validate', 'active');
    progressBar.setValue(10);

    await delay(1500);

    progressBar.setPhaseStatus('validate', 'completed');
    progressBar.setValue(33);

    // Processing phase - simulate error
    progressBar.setPhaseStatus('process', 'active');
    progressBar.setValue(40);

    await delay(1500);

    // Error occurs
    progressBar.setPhaseStatus('process', 'error');
    progressBar.setValue(50);

    console.error('Processing failed!');
  }

  runWithError();
}

/**
 * Example 5: Small Progress Indicators
 *
 * Compact progress bars for tight layouts.
 */
export function exampleSmallProgress(): void {
  const container = document.createElement('div');
  container.style.cssText = 'padding: 20px; max-width: 300px;';

  // Small linear progress
  const progress1 = new ProgressBar({
    value: 45,
    variant: 'linear',
    size: 'sm',
    animated: true,
    ariaLabel: 'Task 1 progress',
  });

  container.appendChild(progress1.getElement());

  // Add some spacing
  const spacer = document.createElement('div');
  spacer.style.height = '16px';
  container.appendChild(spacer);

  // Another small progress
  const progress2 = new ProgressBar({
    value: 75,
    variant: 'linear',
    size: 'sm',
    showPercentage: true,
    ariaLabel: 'Task 2 progress',
  });

  container.appendChild(progress2.getElement());

  document.body.appendChild(container);
}

/**
 * Example 6: Complex Multi-Step Workflow
 *
 * Real-world example: Web page clipping workflow.
 */
export function exampleClippingWorkflow(): void {
  const phases: ProgressPhase[] = [
    { id: 'screenshot', label: 'Screenshot', status: 'pending' },
    { id: 'extract', label: 'Extract Content', status: 'pending' },
    { id: 'optimize', label: 'Optimize', status: 'pending' },
    { id: 'upload', label: 'Upload', status: 'pending' },
  ];

  const progressBar = new ProgressBar({
    value: 0,
    variant: 'phased',
    phases,
    size: 'lg',
    animated: true,
    ariaLabel: 'Web page clipping progress',
  });

  const container = document.createElement('div');
  container.style.cssText = 'padding: 30px; max-width: 600px;';

  const title = document.createElement('h3');
  title.textContent = 'Clipping Page...';
  title.style.cssText = 'margin-bottom: 16px; font-size: 18px;';

  container.appendChild(title);
  container.appendChild(progressBar.getElement());
  document.body.appendChild(container);

  // Simulate clipping workflow
  async function clipPage() {
    try {
      // Screenshot
      progressBar.setPhaseStatus('screenshot', 'active');
      progressBar.setValue(5);
      await delay(1500);
      progressBar.setPhaseStatus('screenshot', 'completed');
      progressBar.setValue(25);

      // Extract content
      progressBar.setPhaseStatus('extract', 'active');
      progressBar.setValue(30);
      await delay(2000);
      progressBar.setPhaseStatus('extract', 'completed');
      progressBar.setValue(50);

      // Optimize
      progressBar.setPhaseStatus('optimize', 'active');
      progressBar.setValue(55);
      await delay(1800);
      progressBar.setPhaseStatus('optimize', 'completed');
      progressBar.setValue(75);

      // Upload
      progressBar.setPhaseStatus('upload', 'active');
      progressBar.setValue(80);

      // Simulate incremental upload progress
      for (let i = 80; i <= 100; i += 5) {
        progressBar.setValue(i);
        await delay(200);
      }

      progressBar.setPhaseStatus('upload', 'completed');
      progressBar.setValue(100);

      // Update title
      title.textContent = 'Clip Saved Successfully!';
      title.style.color = '#22c55e';

      // Clean up
      await delay(3000);
      container.remove();

    } catch (error) {
      console.error('Clipping failed:', error);
    }
  }

  clipPage();
}

/**
 * Helper function to simulate delays
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run all examples
 */
export function runAllExamples(): void {
  console.log('Running Progress Bar Examples...');

  // Run examples with delays to avoid overlap
  setTimeout(() => exampleLinearWithUpdates(), 0);
  setTimeout(() => examplePhasedProgress(), 5000);
  setTimeout(() => examplePhasedWithError(), 15000);
  setTimeout(() => exampleSmallProgress(), 22000);
  setTimeout(() => exampleClippingWorkflow(), 28000);
}

// Uncomment to run examples when this file is loaded
// runAllExamples();
