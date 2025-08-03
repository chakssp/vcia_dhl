/**
 * End-to-End Tests for Full KC V2 Workflow
 * Tests complete user journeys and system integration
 */

import { Browser, Page } from '../test-utils/E2EFramework.js';
import { TestDataGenerator } from '../test-utils/TestDataGenerator.js';
import { PerformanceMonitor } from '../test-utils/PerformanceMonitor.js';

describe('KC V2 Full Workflow E2E Tests', () => {
  let browser;
  let page;
  let testData;
  let perfMonitor;

  beforeAll(async () => {
    browser = await Browser.launch({
      headless: process.env.CI === 'true',
      slowMo: 50
    });
    
    testData = new TestDataGenerator();
    perfMonitor = new PerformanceMonitor();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#app', { timeout: 5000 });
    
    // Start performance monitoring
    perfMonitor.start();
  });

  afterEach(async () => {
    // Capture performance metrics
    const metrics = perfMonitor.stop();
    console.log('Page metrics:', metrics);
    
    // Take screenshot on failure
    if (page && !page.isClosed()) {
      await page.screenshot({ 
        path: `screenshots/test-${Date.now()}.png`,
        fullPage: true 
      });
    }
    
    await page.close();
  });

  describe('File Discovery and Analysis Workflow', () => {
    test('should complete full discovery to analysis workflow', async () => {
      // Step 1: Start discovery
      await page.click('[data-test="start-discovery"]');
      await page.waitForSelector('.discovery-panel', { visible: true });
      
      // Configure discovery settings
      await page.type('#discovery-path', '/test/documents');
      await page.selectOption('#file-types', ['md', 'txt']);
      await page.click('#include-subdirs');
      
      // Start discovery
      await page.click('[data-test="run-discovery"]');
      
      // Wait for discovery to complete
      await page.waitForSelector('.discovery-complete', { 
        timeout: 30000 
      });
      
      // Verify discovered files
      const fileCount = await page.evaluate(() => {
        return document.querySelectorAll('.file-item').length;
      });
      expect(fileCount).toBeGreaterThan(0);
      
      // Step 2: Filter and select files
      await page.click('[data-test="filter-toggle"]');
      await page.type('#relevance-threshold', '70');
      await page.click('[data-test="apply-filters"]');
      
      // Select files for analysis
      await page.click('[data-test="select-all-filtered"]');
      const selectedCount = await page.evaluate(() => {
        return document.querySelectorAll('.file-item.selected').length;
      });
      expect(selectedCount).toBeGreaterThan(0);
      
      // Step 3: Configure analysis
      await page.click('[data-test="configure-analysis"]');
      await page.selectOption('#analysis-provider', 'ollama');
      await page.selectOption('#analysis-model', 'llama2');
      await page.type('#analysis-prompt', 'Extract key insights and decisions');
      
      // Step 4: Run analysis
      await page.click('[data-test="start-analysis"]');
      
      // Monitor progress
      await page.waitForFunction(
        () => {
          const progress = document.querySelector('.analysis-progress');
          return progress && progress.textContent.includes('100%');
        },
        { timeout: 60000 }
      );
      
      // Verify analysis results
      const analysisResults = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.analysis-result')).map(el => ({
          fileId: el.dataset.fileId,
          type: el.querySelector('.analysis-type').textContent,
          confidence: parseFloat(el.querySelector('.confidence-score').textContent)
        }));
      });
      
      expect(analysisResults.length).toBe(selectedCount);
      expect(analysisResults.every(r => r.confidence > 0)).toBe(true);
      
      // Step 5: Categorize results
      await page.click('[data-test="categorize-results"]');
      
      // Create new category
      await page.click('[data-test="add-category"]');
      await page.type('#category-name', 'Technical Insights');
      await page.type('#category-color', '#4CAF50');
      await page.click('[data-test="save-category"]');
      
      // Assign files to category
      await page.click('[data-test="select-high-confidence"]');
      await page.click('[data-test="assign-category"]');
      await page.selectOption('#category-select', 'Technical Insights');
      await page.click('[data-test="confirm-assignment"]');
      
      // Step 6: Export results
      await page.click('[data-test="export-results"]');
      await page.selectOption('#export-format', 'json');
      await page.click('#include-analysis');
      await page.click('#include-categories');
      
      // Download export
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-test="download-export"]')
      ]);
      
      expect(download).toBeDefined();
      const fileName = download.suggestedFilename();
      expect(fileName).toMatch(/kc-export-.*\.json/);
    });
  });

  describe('Command Palette Workflow', () => {
    test('should navigate using command palette', async () => {
      // Open command palette
      await page.keyboard.press('Control+K');
      await page.waitForSelector('.command-palette', { visible: true });
      
      // Search for discovery command
      await page.type('#command-input', 'discover');
      await page.waitForSelector('.command-result');
      
      // Verify fuzzy search works
      const results = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.command-result'))
          .map(el => el.textContent);
      });
      expect(results).toContain('Start File Discovery');
      
      // Execute command
      await page.keyboard.press('Enter');
      await page.waitForSelector('.discovery-panel', { visible: true });
      
      // Test quick actions
      await page.keyboard.press('Control+K');
      await page.type('#command-input', '>');
      
      const quickActions = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.command-result'))
          .map(el => el.textContent);
      });
      expect(quickActions.length).toBeGreaterThan(5);
      
      // Test recent commands
      await page.keyboard.press('Escape');
      await page.keyboard.press('Control+K');
      
      const recentCommand = await page.evaluate(() => {
        const recent = document.querySelector('.recent-commands .command-result');
        return recent ? recent.textContent : null;
      });
      expect(recentCommand).toBe('Start File Discovery');
    });
  });

  describe('Real-time Collaboration', () => {
    test('should sync changes across multiple sessions', async () => {
      // Open second browser session
      const page2 = await browser.newPage();
      await page2.goto('http://localhost:3000');
      await page2.waitForSelector('#app');
      
      // Create file in first session
      await page.click('[data-test="create-file"]');
      await page.type('#file-name', 'collaboration-test.md');
      await page.type('#file-content', '# Collaboration Test\nInitial content');
      await page.click('[data-test="save-file"]');
      
      // Wait for sync in second session
      await page2.waitForSelector(
        '[data-file-name="collaboration-test.md"]',
        { timeout: 5000 }
      );
      
      // Edit in second session
      await page2.click('[data-file-name="collaboration-test.md"]');
      await page2.click('[data-test="edit-file"]');
      await page2.keyboard.press('Control+A');
      await page2.type('# Updated by Session 2\nNew content');
      await page2.click('[data-test="save-file"]');
      
      // Verify update in first session
      await page.waitForFunction(
        () => {
          const content = document.querySelector('.file-content');
          return content && content.textContent.includes('Updated by Session 2');
        },
        { timeout: 5000 }
      );
      
      // Test conflict resolution
      await page.click('[data-test="edit-file"]');
      await page2.click('[data-test="edit-file"]');
      
      // Make conflicting edits
      await page.type('\nEdit from session 1');
      await page2.type('\nEdit from session 2');
      
      // Save both
      await Promise.all([
        page.click('[data-test="save-file"]'),
        page2.click('[data-test="save-file"]')
      ]);
      
      // Check for conflict dialog
      const hasConflict = await page.waitForSelector(
        '.conflict-dialog',
        { timeout: 5000 }
      ).then(() => true).catch(() => false);
      
      if (hasConflict) {
        // Resolve conflict
        await page.click('[data-test="merge-changes"]');
        
        // Verify merged content
        const mergedContent = await page.evaluate(() => {
          return document.querySelector('.file-content').textContent;
        });
        expect(mergedContent).toContain('Edit from session 1');
        expect(mergedContent).toContain('Edit from session 2');
      }
      
      await page2.close();
    });
  });

  describe('Performance Under Load', () => {
    test('should handle large file sets efficiently', async () => {
      // Generate large dataset
      const files = testData.generateFiles(1000, {
        sizeRange: [1000, 50000],
        types: ['md', 'txt', 'doc']
      });
      
      // Mock file system with test data
      await page.evaluate((files) => {
        window.__testFiles = files;
        window.__mockFileSystem = true;
      }, files);
      
      // Start discovery
      const startTime = Date.now();
      await page.click('[data-test="start-discovery"]');
      await page.click('[data-test="use-mock-files"]');
      await page.click('[data-test="run-discovery"]');
      
      // Wait for completion
      await page.waitForSelector('.discovery-complete', {
        timeout: 60000
      });
      
      const discoveryTime = Date.now() - startTime;
      console.log(`Discovery of 1000 files took ${discoveryTime}ms`);
      expect(discoveryTime).toBeLessThan(10000); // Should complete in under 10s
      
      // Test filtering performance
      const filterStartTime = Date.now();
      await page.type('#search-files', 'important');
      await page.waitForFunction(
        () => {
          const results = document.querySelector('.search-results');
          return results && !results.classList.contains('loading');
        },
        { timeout: 5000 }
      );
      
      const filterTime = Date.now() - filterStartTime;
      console.log(`Filtering took ${filterTime}ms`);
      expect(filterTime).toBeLessThan(500); // Should be near instant
      
      // Test batch operations
      await page.click('[data-test="select-all"]');
      await page.click('[data-test="batch-categorize"]');
      await page.selectOption('#batch-category', 'Archive');
      
      const batchStartTime = Date.now();
      await page.click('[data-test="apply-batch"]');
      
      await page.waitForSelector('.batch-complete', {
        timeout: 30000
      });
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`Batch categorization took ${batchTime}ms`);
      expect(batchTime).toBeLessThan(5000); // Should be fast
    });
  });

  describe('Keyboard Navigation', () => {
    test('should be fully navigable with keyboard', async () => {
      // Tab through main navigation
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => {
        return document.activeElement.getAttribute('data-test');
      });
      expect(focusedElement).toBe('nav-discovery');
      
      // Navigate to different sections
      await page.keyboard.press('Enter');
      await page.waitForSelector('.discovery-panel');
      
      // Tab through form fields
      const formFields = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const field = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el.tagName,
            type: el.type,
            label: el.getAttribute('aria-label') || el.id
          };
        });
        if (field.tag === 'INPUT' || field.tag === 'SELECT') {
          formFields.push(field);
        }
      }
      
      expect(formFields.length).toBeGreaterThan(3);
      
      // Test keyboard shortcuts
      await page.keyboard.press('Control+Shift+F');
      await page.waitForSelector('.search-panel', { visible: true });
      
      await page.keyboard.press('Escape');
      await page.waitForSelector('.search-panel', { visible: false });
      
      // Test arrow key navigation in lists
      await page.click('[data-test="file-list"]');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space'); // Select
      
      const selectedFiles = await page.evaluate(() => {
        return document.querySelectorAll('.file-item.selected').length;
      });
      expect(selectedFiles).toBe(1);
    });
  });

  describe('Theme and Accessibility', () => {
    test('should support theme switching and accessibility features', async () => {
      // Check initial theme
      const initialTheme = await page.evaluate(() => {
        return document.body.className;
      });
      expect(initialTheme).toContain('theme-dark');
      
      // Switch theme
      await page.keyboard.press('Control+Shift+T');
      await page.waitForTimeout(500); // Wait for transition
      
      const newTheme = await page.evaluate(() => {
        return document.body.className;
      });
      expect(newTheme).toContain('theme-light');
      
      // Test high contrast mode
      await page.emulateMediaFeatures([
        { name: 'prefers-contrast', value: 'high' }
      ]);
      
      const hasHighContrast = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.body);
        return styles.getPropertyValue('--high-contrast') === 'true';
      });
      expect(hasHighContrast).toBe(true);
      
      // Test screen reader announcements
      const announcements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="status"], [aria-live]'))
          .map(el => el.textContent);
      });
      expect(announcements.length).toBeGreaterThan(0);
      
      // Test reduced motion
      await page.emulateMediaFeatures([
        { name: 'prefers-reduced-motion', value: 'reduce' }
      ]);
      
      const hasReducedMotion = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.body);
        return styles.getPropertyValue('--reduced-motion') === 'true';
      });
      expect(hasReducedMotion).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async () => {
      // Simulate offline
      await page.setOfflineMode(true);
      
      // Try to perform action
      await page.click('[data-test="sync-data"]');
      
      // Should show offline indicator
      await page.waitForSelector('.offline-banner', { visible: true });
      
      const offlineText = await page.evaluate(() => {
        return document.querySelector('.offline-banner').textContent;
      });
      expect(offlineText).toContain('offline');
      
      // Actions should be queued
      await page.click('[data-test="create-file"]');
      await page.type('#file-name', 'offline-test.md');
      await page.click('[data-test="save-file"]');
      
      const queuedCount = await page.evaluate(() => {
        const badge = document.querySelector('.queued-actions-badge');
        return badge ? parseInt(badge.textContent) : 0;
      });
      expect(queuedCount).toBe(1);
      
      // Go back online
      await page.setOfflineMode(false);
      
      // Should sync automatically
      await page.waitForSelector('.sync-complete', { 
        timeout: 10000 
      });
      
      // Verify file was created
      await page.waitForSelector('[data-file-name="offline-test.md"]');
    });
    
    test('should recover from crashes', async () => {
      // Create some work
      await page.click('[data-test="create-file"]');
      await page.type('#file-name', 'recovery-test.md');
      await page.type('#file-content', 'Important work in progress');
      
      // Simulate crash by reloading without saving
      await page.reload();
      await page.waitForSelector('#app');
      
      // Should show recovery dialog
      await page.waitForSelector('.recovery-dialog', {
        timeout: 5000
      });
      
      const recoveryText = await page.evaluate(() => {
        return document.querySelector('.recovery-dialog').textContent;
      });
      expect(recoveryText).toContain('Unsaved changes detected');
      
      // Recover work
      await page.click('[data-test="recover-work"]');
      
      // Verify content was restored
      const restoredContent = await page.evaluate(() => {
        return document.querySelector('#file-content').value;
      });
      expect(restoredContent).toBe('Important work in progress');
    });
  });

  describe('Integration with External Services', () => {
    test('should integrate with Qdrant vector database', async () => {
      // Navigate to integration settings
      await page.click('[data-test="settings"]');
      await page.click('[data-test="integrations"]');
      
      // Configure Qdrant
      await page.type('#qdrant-url', 'http://localhost:6333');
      await page.type('#qdrant-api-key', 'test-key');
      await page.click('[data-test="test-qdrant-connection"]');
      
      // Wait for connection test
      await page.waitForSelector('.connection-status', {
        timeout: 5000
      });
      
      const connectionStatus = await page.evaluate(() => {
        return document.querySelector('.connection-status').textContent;
      });
      expect(connectionStatus).toContain('Connected');
      
      // Create vector collection
      await page.click('[data-test="create-collection"]');
      await page.type('#collection-name', 'kc-test-vectors');
      await page.selectOption('#vector-size', '384');
      await page.click('[data-test="confirm-create"]');
      
      // Upload vectors
      await page.click('[data-test="select-analyzed-files"]');
      await page.click('[data-test="generate-embeddings"]');
      
      // Monitor progress
      await page.waitForFunction(
        () => {
          const progress = document.querySelector('.embedding-progress');
          return progress && progress.textContent.includes('100%');
        },
        { timeout: 30000 }
      );
      
      // Test vector search
      await page.click('[data-test="vector-search"]');
      await page.type('#search-query', 'technical architecture decisions');
      await page.click('[data-test="search-vectors"]');
      
      // Verify results
      await page.waitForSelector('.vector-results');
      const resultCount = await page.evaluate(() => {
        return document.querySelectorAll('.vector-result').length;
      });
      expect(resultCount).toBeGreaterThan(0);
    });
  });
});