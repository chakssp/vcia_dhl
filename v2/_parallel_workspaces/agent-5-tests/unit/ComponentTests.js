/**
 * Unit Tests for All V2 Components
 * Comprehensive testing of individual component functionality
 */

import { expect } from '../test-utils/TestFramework.js';
import { CommandPalette } from '../../agent-1-frontend/CommandPalette.js';
import { KeyboardShortcuts } from '../../agent-1-frontend/KeyboardShortcuts.js';
import { Logger } from '../../agent-1-frontend/Logger.js';
import { ExportView } from '../../agent-1-frontend/ExportView.js';
import { LogsView } from '../../agent-1-frontend/LogsView.js';
import { StatsView } from '../../agent-1-frontend/StatsView.js';
import { APIService } from '../../agent-4-backend/APIService.js';
import { WebSocketService } from '../../agent-4-backend/WebSocketService.js';
import { BatchOperations } from '../../agent-4-backend/BatchOperations.js';

describe('CommandPalette Unit Tests', () => {
  let commandPalette;
  let mockContainer;

  beforeEach(() => {
    // Create mock DOM elements
    mockContainer = document.createElement('div');
    mockContainer.id = 'command-palette';
    
    const mockInput = document.createElement('input');
    mockInput.id = 'command-input';
    
    const mockResults = document.createElement('div');
    mockResults.id = 'command-results';
    
    mockContainer.appendChild(mockInput);
    mockContainer.appendChild(mockResults);
    document.body.appendChild(mockContainer);
    
    commandPalette = new CommandPalette();
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
  });

  test('should initialize with default state', () => {
    expect(commandPalette.isOpen).toBe(false);
    expect(commandPalette.commands).toEqual([]);
    expect(commandPalette.selectedIndex).toBe(0);
  });

  test('should register commands correctly', () => {
    const testCommand = {
      id: 'test-command',
      name: 'Test Command',
      shortcut: 'Ctrl+T',
      handler: jest.fn()
    };
    
    commandPalette.registerCommand(testCommand);
    
    expect(commandPalette.commands).toHaveLength(1);
    expect(commandPalette.commands[0]).toEqual(testCommand);
  });

  test('should filter commands with fuzzy search', () => {
    const commands = [
      { id: '1', name: 'Open File', keywords: ['file', 'open'] },
      { id: '2', name: 'Save Document', keywords: ['save', 'document'] },
      { id: '3', name: 'Export Data', keywords: ['export', 'data'] }
    ];
    
    commands.forEach(cmd => commandPalette.registerCommand(cmd));
    
    const results = commandPalette.fuzzySearch('opfl');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Open File');
  });

  test('should execute commands', async () => {
    const handler = jest.fn().mockResolvedValue('success');
    const command = {
      id: 'exec-test',
      name: 'Execute Test',
      handler
    };
    
    commandPalette.registerCommand(command);
    const result = await commandPalette.executeCommand('exec-test');
    
    expect(handler).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  test('should handle keyboard navigation', () => {
    const commands = Array(5).fill(null).map((_, i) => ({
      id: `cmd-${i}`,
      name: `Command ${i}`
    }));
    
    commands.forEach(cmd => commandPalette.registerCommand(cmd));
    commandPalette.open();
    
    // Test down arrow
    commandPalette.handleKeyboard({ key: 'ArrowDown', preventDefault: jest.fn() });
    expect(commandPalette.selectedIndex).toBe(1);
    
    // Test up arrow
    commandPalette.handleKeyboard({ key: 'ArrowUp', preventDefault: jest.fn() });
    expect(commandPalette.selectedIndex).toBe(0);
    
    // Test wrap around
    commandPalette.handleKeyboard({ key: 'ArrowUp', preventDefault: jest.fn() });
    expect(commandPalette.selectedIndex).toBe(4);
  });
});

describe('KeyboardShortcuts Unit Tests', () => {
  let shortcuts;

  beforeEach(() => {
    shortcuts = new KeyboardShortcuts();
  });

  test('should register shortcuts correctly', () => {
    const handler = jest.fn();
    shortcuts.register('Ctrl+S', handler, { description: 'Save' });
    
    expect(shortcuts.shortcuts.has('ctrl+s')).toBe(true);
    expect(shortcuts.shortcuts.get('ctrl+s').handler).toBe(handler);
  });

  test('should parse key combinations', () => {
    const parsed = shortcuts.parseShortcut('Ctrl+Shift+Alt+S');
    
    expect(parsed.ctrl).toBe(true);
    expect(parsed.shift).toBe(true);
    expect(parsed.alt).toBe(true);
    expect(parsed.key).toBe('s');
  });

  test('should handle key events', () => {
    const handler = jest.fn();
    shortcuts.register('Ctrl+K', handler);
    
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    });
    
    shortcuts.handleKeyDown(event);
    
    expect(handler).toHaveBeenCalledWith(event);
  });

  test('should support key chords', () => {
    const handler = jest.fn();
    shortcuts.register('Ctrl+K Ctrl+S', handler, { chord: true });
    
    // First part of chord
    shortcuts.handleKeyDown(new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    }));
    
    expect(shortcuts.chordBuffer).toBe('ctrl+k');
    
    // Second part of chord
    shortcuts.handleKeyDown(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true
    }));
    
    expect(handler).toHaveBeenCalled();
    expect(shortcuts.chordBuffer).toBe('');
  });

  test('should respect context restrictions', () => {
    const handler = jest.fn();
    shortcuts.register('Ctrl+S', handler, { 
      context: 'editor',
      when: () => document.activeElement.classList.contains('editor')
    });
    
    // Without context
    shortcuts.handleKeyDown(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true
    }));
    
    expect(handler).not.toHaveBeenCalled();
    
    // With context
    const editor = document.createElement('div');
    editor.className = 'editor';
    document.body.appendChild(editor);
    editor.focus();
    
    shortcuts.handleKeyDown(new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true
    }));
    
    expect(handler).toHaveBeenCalled();
    
    document.body.removeChild(editor);
  });
});

describe('Logger Unit Tests', () => {
  let logger;

  beforeEach(() => {
    localStorage.clear();
    logger = new Logger('TestContext');
  });

  test('should log messages with correct levels', () => {
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warning message');
    logger.error('Error message');
    
    expect(logger.logs).toHaveLength(4);
    expect(logger.logs[0].level).toBe('debug');
    expect(logger.logs[1].level).toBe('info');
    expect(logger.logs[2].level).toBe('warn');
    expect(logger.logs[3].level).toBe('error');
  });

  test('should respect log levels', () => {
    logger.setLogLevel('warn');
    
    logger.debug('Should not appear');
    logger.info('Should not appear');
    logger.warn('Should appear');
    logger.error('Should appear');
    
    const visibleLogs = logger.getFilteredLogs();
    expect(visibleLogs).toHaveLength(2);
  });

  test('should persist logs to localStorage', () => {
    logger.info('Persistent message');
    
    const newLogger = new Logger('TestContext');
    expect(newLogger.logs).toHaveLength(1);
    expect(newLogger.logs[0].message).toBe('Persistent message');
  });

  test('should enforce max log limit', () => {
    logger.maxLogs = 10;
    
    for (let i = 0; i < 15; i++) {
      logger.info(`Message ${i}`);
    }
    
    expect(logger.logs).toHaveLength(10);
    expect(logger.logs[0].message).toBe('Message 5');
  });

  test('should support log filtering', () => {
    logger.info('User logged in');
    logger.error('Authentication failed');
    logger.info('User profile updated');
    
    const filtered = logger.search('user');
    expect(filtered).toHaveLength(2);
  });

  test('should format logs correctly', () => {
    const formatted = logger.format({
      timestamp: new Date('2024-01-01T12:00:00Z'),
      level: 'info',
      context: 'Test',
      message: 'Test message',
      data: { userId: 123 }
    });
    
    expect(formatted).toContain('2024-01-01');
    expect(formatted).toContain('[INFO]');
    expect(formatted).toContain('[Test]');
    expect(formatted).toContain('Test message');
    expect(formatted).toContain('userId');
  });
});

describe('ExportView Unit Tests', () => {
  let exportView;
  let mockContainer;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockContainer.id = 'export-view';
    document.body.appendChild(mockContainer);
    
    exportView = new ExportView();
  });

  afterEach(() => {
    document.body.removeChild(mockContainer);
  });

  test('should support multiple export formats', () => {
    const formats = exportView.getAvailableFormats();
    
    expect(formats).toContain('json');
    expect(formats).toContain('csv');
    expect(formats).toContain('markdown');
    expect(formats).toContain('pdf');
  });

  test('should export to JSON correctly', async () => {
    const data = {
      files: [
        { id: 1, name: 'test.md', content: 'Test content' }
      ],
      metadata: { exportDate: new Date() }
    };
    
    const result = await exportView.exportJSON(data);
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
    expect(JSON.parse(result.content)).toEqual(data);
  });

  test('should export to CSV with proper formatting', async () => {
    const data = [
      { id: 1, name: 'File 1', size: 1024 },
      { id: 2, name: 'File 2', size: 2048 }
    ];
    
    const result = await exportView.exportCSV(data);
    
    expect(result.success).toBe(true);
    expect(result.content).toContain('id,name,size');
    expect(result.content).toContain('1,"File 1",1024');
  });

  test('should handle export errors gracefully', async () => {
    const result = await exportView.export('invalid-format', {});
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported format');
  });

  test('should apply export options', async () => {
    const data = { sensitive: 'secret', public: 'visible' };
    const options = {
      excludeFields: ['sensitive'],
      pretty: true
    };
    
    const result = await exportView.exportJSON(data, options);
    const exported = JSON.parse(result.content);
    
    expect(exported.sensitive).toBeUndefined();
    expect(exported.public).toBe('visible');
    expect(result.content).toContain('\n'); // Pretty printed
  });
});

describe('APIService Unit Tests', () => {
  let api;
  let fetchMock;

  beforeEach(() => {
    api = new APIService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('should make GET requests correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' })
    });
    
    const result = await api.get('/test');
    
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual({ data: 'test' });
  });

  test('should handle request errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Resource not found' })
    });
    
    await expect(api.get('/missing')).rejects.toThrow('Resource not found');
  });

  test('should implement caching for GET requests', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'cached' })
    });
    
    // First call
    await api.get('/cached-endpoint');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    // Second call should use cache
    const result = await api.get('/cached-endpoint');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'cached' });
  });

  test('should handle rate limiting', async () => {
    // Set up rate limit
    api.rateLimits.set('/limited', {
      requests: 2,
      window: 1000,
      current: 0,
      resetTime: Date.now() + 1000
    });
    
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    
    // Should allow first two requests
    await api.get('/limited');
    await api.get('/limited');
    
    // Third request should fail
    await expect(api.get('/limited')).rejects.toThrow('Rate limit exceeded');
  });

  test('should add authentication headers', async () => {
    api.setApiKey('test-key-123');
    
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true })
    });
    
    await api.get('/auth-test');
    
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key-123'
        })
      })
    );
  });
});

describe('BatchOperations Unit Tests', () => {
  let batch;
  let mockAPI;

  beforeEach(() => {
    mockAPI = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn()
    };
    
    batch = new BatchOperations(mockAPI);
  });

  test('should create batch operations', () => {
    const batchId = batch.createBatch();
    
    expect(batchId).toBeDefined();
    expect(batch.operations.has(batchId)).toBe(true);
    expect(batch.operations.get(batchId).status).toBe('pending');
  });

  test('should add operations to batch', () => {
    const batchId = batch.createBatch();
    
    const opId = batch.addOperation(batchId, {
      type: 'api',
      method: 'GET',
      endpoint: '/test'
    });
    
    expect(opId).toBeDefined();
    expect(batch.operations.get(batchId).totalOperations).toBe(1);
  });

  test('should execute batch with concurrency control', async () => {
    mockAPI.get.mockResolvedValue({ success: true });
    
    const batchId = batch.createBatch();
    batch.concurrency = 2;
    
    // Add 5 operations
    for (let i = 0; i < 5; i++) {
      batch.addOperation(batchId, {
        type: 'api',
        method: 'GET',
        endpoint: `/test-${i}`
      });
    }
    
    const result = await batch.executeBatch(batchId);
    
    expect(result.totalOperations).toBe(5);
    expect(result.completedOperations).toBe(5);
    expect(result.status).toBe('completed');
  });

  test('should handle operation failures with retry', async () => {
    let attempts = 0;
    mockAPI.post.mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve({ success: true });
    });
    
    const batchId = batch.createBatch();
    batch.addOperation(batchId, {
      type: 'api',
      method: 'POST',
      endpoint: '/retry-test'
    });
    
    const result = await batch.executeBatch(batchId);
    
    expect(attempts).toBe(3);
    expect(result.completedOperations).toBe(1);
  });

  test('should track batch progress', async () => {
    const progressUpdates = [];
    
    window.addEventListener('batch:progress', (e) => {
      progressUpdates.push(e.detail.progress);
    });
    
    mockAPI.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 10))
    );
    
    const batchId = batch.createBatch();
    for (let i = 0; i < 4; i++) {
      batch.addOperation(batchId, {
        type: 'api',
        method: 'GET',
        endpoint: `/progress-${i}`
      });
    }
    
    await batch.executeBatch(batchId);
    
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
  });

  test('should support batch abort', async () => {
    mockAPI.get.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    const batchId = batch.createBatch();
    for (let i = 0; i < 10; i++) {
      batch.addOperation(batchId, {
        type: 'api',
        method: 'GET',
        endpoint: `/abort-${i}`
      });
    }
    
    const executePromise = batch.executeBatch(batchId);
    
    // Abort after 50ms
    setTimeout(() => batch.abortBatch(batchId), 50);
    
    await executePromise;
    
    const result = batch.getBatchResult(batchId);
    expect(result.status).toBe('aborted');
    expect(result.completedOperations).toBeLessThan(10);
  });
});