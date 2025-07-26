/**
 * test-curation-ui.js - UI Component Tests
 * 
 * Tests for CurationPanel UI components including rendering,
 * interactions, and integration with Wave 1 components.
 */

(function() {
    'use strict';

    const TestRunner = {
        tests: [],
        results: [],
        currentTest: null,
        
        /**
         * Register a test
         */
        test(name, fn) {
            this.tests.push({ name, fn });
        },
        
        /**
         * Run all tests
         */
        async runAll() {
            console.log('🧪 Starting CurationPanel UI Tests...');
            console.log('=====================================\n');
            
            this.results = [];
            const startTime = Date.now();
            
            for (const test of this.tests) {
                this.currentTest = test;
                const result = await this.runTest(test);
                this.results.push(result);
            }
            
            const duration = Date.now() - startTime;
            this.printSummary(duration);
            
            return this.results;
        },
        
        /**
         * Run a single test
         */
        async runTest(test) {
            const startTime = Date.now();
            let passed = false;
            let error = null;
            
            try {
                // Create test context
                const context = this.createTestContext();
                
                // Run test
                await test.fn(context);
                passed = true;
                
            } catch (err) {
                error = err;
                passed = false;
            }
            
            const duration = Date.now() - startTime;
            
            // Print result
            if (passed) {
                console.log(`✅ ${test.name} (${duration}ms)`);
            } else {
                console.log(`❌ ${test.name} (${duration}ms)`);
                console.error(`   Error: ${error.message}`);
                if (error.stack) {
                    console.error(`   Stack: ${error.stack}`);
                }
            }
            
            return {
                name: test.name,
                passed,
                error,
                duration
            };
        },
        
        /**
         * Create test context with utilities
         */
        createTestContext() {
            return {
                assert: this.assert.bind(this),
                assertEquals: this.assertEquals.bind(this),
                assertExists: this.assertExists.bind(this),
                assertContains: this.assertContains.bind(this),
                createMockFile: this.createMockFile.bind(this),
                createMockEventBus: this.createMockEventBus.bind(this),
                createMockAppState: this.createMockAppState.bind(this),
                createTestContainer: this.createTestContainer.bind(this),
                cleanup: this.cleanup.bind(this),
                wait: this.wait.bind(this),
                simulateClick: this.simulateClick.bind(this),
                simulateInput: this.simulateInput.bind(this)
            };
        },
        
        /**
         * Assertion utilities
         */
        assert(condition, message) {
            if (!condition) {
                throw new Error(message || 'Assertion failed');
            }
        },
        
        assertEquals(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(message || `Expected ${expected}, got ${actual}`);
            }
        },
        
        assertExists(element, message) {
            if (!element) {
                throw new Error(message || 'Element does not exist');
            }
        },
        
        assertContains(text, substring, message) {
            if (!text.includes(substring)) {
                throw new Error(message || `"${text}" does not contain "${substring}"`);
            }
        },
        
        /**
         * Mock utilities
         */
        createMockFile(overrides = {}) {
            return {
                id: `file_${Date.now()}`,
                name: 'test-file.md',
                path: '/test/test-file.md',
                type: 'md',
                size: 1024,
                createdAt: new Date(),
                modifiedAt: new Date(),
                lastAnalyzed: new Date(),
                analysisCount: 1,
                categories: ['technical'],
                confidence: {
                    overall: 0.75,
                    dimensions: {
                        semantic: 0.8,
                        categorical: 0.7,
                        structural: 0.75,
                        temporal: 0.7
                    },
                    convergencePrediction: {
                        willConverge: true,
                        isConverged: false,
                        estimatedIterations: 3,
                        confidence: 0.85
                    }
                },
                content: 'Test content',
                ...overrides
            };
        },
        
        createMockEventBus() {
            const handlers = new Map();
            return {
                on(event, handler) {
                    if (!handlers.has(event)) {
                        handlers.set(event, []);
                    }
                    handlers.get(event).push(handler);
                },
                emit(event, data) {
                    const eventHandlers = handlers.get(event);
                    if (eventHandlers) {
                        eventHandlers.forEach(h => h(data));
                    }
                },
                off(event, handler) {
                    const eventHandlers = handlers.get(event);
                    if (eventHandlers) {
                        const idx = eventHandlers.indexOf(handler);
                        if (idx > -1) eventHandlers.splice(idx, 1);
                    }
                },
                _handlers: handlers
            };
        },
        
        createMockAppState() {
            const state = new Map();
            return {
                get(key) {
                    return state.get(key);
                },
                set(key, value) {
                    state.set(key, value);
                },
                _state: state
            };
        },
        
        createTestContainer() {
            const container = document.createElement('div');
            container.id = `test-container-${Date.now()}`;
            document.body.appendChild(container);
            return container;
        },
        
        cleanup() {
            // Remove all test containers
            const containers = document.querySelectorAll('[id^="test-container-"]');
            containers.forEach(c => c.remove());
        },
        
        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        simulateClick(element) {
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            element.dispatchEvent(event);
        },
        
        simulateInput(element, value) {
            element.value = value;
            const event = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(event);
        },
        
        /**
         * Print test summary
         */
        printSummary(duration) {
            const passed = this.results.filter(r => r.passed).length;
            const failed = this.results.filter(r => !r.passed).length;
            const total = this.results.length;
            
            console.log('\n=====================================');
            console.log(`Tests completed in ${duration}ms`);
            console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
            
            if (failed > 0) {
                console.log('\n❌ TESTS FAILED');
            } else {
                console.log('\n✅ ALL TESTS PASSED');
            }
        }
    };

    // ========================================
    // Test Definitions
    // ========================================

    // Test CurationPanel initialization
    TestRunner.test('CurationPanel - Should initialize correctly', async (ctx) => {
        // Setup
        window.KC = {
            EventBus: ctx.createMockEventBus(),
            AppState: ctx.createMockAppState()
        };
        
        const container = ctx.createTestContainer();
        
        // Test
        const panel = new CurationPanel(`#${container.id}`);
        await ctx.wait(100);
        
        // Assertions
        ctx.assertExists(container.querySelector('.curation-panel'));
        ctx.assertExists(container.querySelector('.curation-header'));
        ctx.assertExists(container.querySelector('.control-bar'));
        ctx.assertExists(container.querySelector('.main-content'));
        
        // Cleanup
        ctx.cleanup();
    });

    // Test FileCard rendering
    TestRunner.test('FileCard - Should render with correct data', async (ctx) => {
        const container = ctx.createTestContainer();
        const file = ctx.createMockFile();
        
        // Test
        const card = new FileCard(file);
        container.appendChild(card.element);
        
        // Assertions
        ctx.assertExists(card.element.querySelector('.file-name'));
        ctx.assertContains(card.element.querySelector('.file-name').textContent, file.name);
        ctx.assertExists(card.element.querySelector('.confidence-value'));
        ctx.assertEquals(card.element.querySelector('.confidence-value').textContent, '75');
        
        // Cleanup
        card.destroy();
        ctx.cleanup();
    });

    // Test FileCard interactions
    TestRunner.test('FileCard - Should handle click events', async (ctx) => {
        const container = ctx.createTestContainer();
        const file = ctx.createMockFile();
        let clicked = false;
        
        // Test
        const card = new FileCard(file);
        card.on('click', () => { clicked = true; });
        container.appendChild(card.element);
        
        ctx.simulateClick(card.element);
        await ctx.wait(50);
        
        // Assertions
        ctx.assert(clicked, 'Click event should have been triggered');
        
        // Cleanup
        card.destroy();
        ctx.cleanup();
    });

    // Test FileCard loading state
    TestRunner.test('FileCard - Should show loading state', async (ctx) => {
        const container = ctx.createTestContainer();
        const file = ctx.createMockFile();
        
        // Test
        const card = new FileCard(file);
        container.appendChild(card.element);
        
        card.showLoading();
        
        // Assertions
        ctx.assert(card.element.classList.contains('loading'));
        ctx.assertExists(card.element.querySelector('.card-loading-overlay'));
        ctx.assertEquals(card.element.querySelector('.card-loading-overlay').style.display, 'flex');
        
        card.hideLoading();
        
        ctx.assert(!card.element.classList.contains('loading'));
        ctx.assertEquals(card.element.querySelector('.card-loading-overlay').style.display, 'none');
        
        // Cleanup
        card.destroy();
        ctx.cleanup();
    });

    // Test ConfidenceMeter
    TestRunner.test('ConfidenceMeter - Should render and update value', async (ctx) => {
        const container = ctx.createTestContainer();
        const visualizer = new ConfidenceVisualizer();
        
        // Test
        const meter = visualizer.createConfidenceMeter(container, {
            size: 200,
            showPercentage: true
        });
        
        meter.setValue(0.75);
        await ctx.wait(100);
        
        // Assertions
        ctx.assertExists(container.querySelector('.confidence-meter'));
        ctx.assertExists(container.querySelector('.meter-number'));
        ctx.assertEquals(container.querySelector('.meter-number').textContent, '75');
        
        // Update value
        meter.setValue(0.90);
        await ctx.wait(900); // Wait for animation
        
        ctx.assertEquals(container.querySelector('.meter-number').textContent, '90');
        
        // Cleanup
        meter.destroy();
        ctx.cleanup();
    });

    // Test ConfidenceDashboard
    TestRunner.test('ConfidenceDashboard - Should render all sections', async (ctx) => {
        const container = ctx.createTestContainer();
        const visualizer = new ConfidenceVisualizer();
        
        // Test
        const dashboard = visualizer.createDashboard(container);
        
        const metrics = {
            overall: 0.82,
            dimensions: {
                semantic: 0.85,
                categorical: 0.78,
                structural: 0.80,
                temporal: 0.75
            },
            convergencePrediction: {
                willConverge: true,
                isConverged: false,
                estimatedIterations: 2
            }
        };
        
        dashboard.updateMetrics(metrics);
        await ctx.wait(100);
        
        // Assertions
        ctx.assertExists(container.querySelector('.confidence-dashboard'));
        ctx.assertExists(container.querySelector('.overall-section'));
        ctx.assertExists(container.querySelector('.dimensions-section'));
        ctx.assertExists(container.querySelector('.trend-section'));
        
        // Check dimension values
        const semanticItem = container.querySelector('[data-dimension="semantic"]');
        ctx.assertExists(semanticItem);
        ctx.assertContains(semanticItem.querySelector('.dimension-value').textContent, '85%');
        
        // Cleanup
        dashboard.destroy();
        ctx.cleanup();
    });

    // Test VersionTimeline
    TestRunner.test('VersionTimeline - Should render version nodes', async (ctx) => {
        const container = ctx.createTestContainer();
        const timeline = new VersionTimeline(container);
        
        // Create mock VersionedAppState
        const versionedState = {
            getAllVersions() {
                return [
                    {
                        versionId: 'v1',
                        timestamp: Date.now() - 3600000,
                        metadata: { confidence: 0.7, reason: 'Initial analysis' },
                        isCurrent: false
                    },
                    {
                        versionId: 'v2',
                        timestamp: Date.now(),
                        metadata: { confidence: 0.85, reason: 'Updated analysis' },
                        isCurrent: true
                    }
                ];
            }
        };
        
        // Test
        timeline.setVersionedAppState(versionedState);
        await ctx.wait(100);
        
        // Assertions
        ctx.assertExists(container.querySelector('.version-timeline'));
        const nodes = container.querySelectorAll('.version-node');
        ctx.assertEquals(nodes.length, 2);
        ctx.assert(nodes[1].classList.contains('current'));
        
        // Cleanup
        timeline.destroy();
        ctx.cleanup();
    });

    // Test MLConfigPanel
    TestRunner.test('MLConfigPanel - Should render configuration sections', async (ctx) => {
        const container = ctx.createTestContainer();
        const panel = new MLConfigPanel(container);
        
        await ctx.wait(100);
        
        // Assertions
        ctx.assertExists(container.querySelector('.ml-config-panel'));
        ctx.assertExists(container.querySelector('.algorithm-section'));
        ctx.assertExists(container.querySelector('.weights-section'));
        ctx.assertExists(container.querySelector('.convergence-section'));
        
        // Check algorithm cards
        const algorithmCards = container.querySelectorAll('.algorithm-card');
        ctx.assert(algorithmCards.length > 0, 'Should have algorithm cards');
        
        // Check weight sliders
        const weightSliders = container.querySelectorAll('.weight-slider');
        ctx.assertEquals(weightSliders.length, 4); // 4 dimensions
        
        // Cleanup
        panel.destroy();
        ctx.cleanup();
    });

    // Test MLConfigPanel weight adjustment
    TestRunner.test('MLConfigPanel - Should update weights correctly', async (ctx) => {
        const container = ctx.createTestContainer();
        const panel = new MLConfigPanel(container);
        
        await ctx.wait(100);
        
        // Test
        const semanticSlider = container.querySelector('.weight-slider[data-dimension="semantic"]');
        ctx.simulateInput(semanticSlider, 60);
        await ctx.wait(50);
        
        // Assertions
        const config = panel.getConfig();
        ctx.assertEquals(config.weights.semantic, 0.6);
        
        // Test normalize
        const normalizeBtn = container.querySelector('#normalize-weights');
        ctx.simulateClick(normalizeBtn);
        await ctx.wait(50);
        
        const newConfig = panel.getConfig();
        const totalWeight = Object.values(newConfig.weights).reduce((a, b) => a + b, 0);
        ctx.assert(Math.abs(totalWeight - 1) < 0.01, 'Weights should sum to 1');
        
        // Cleanup
        panel.destroy();
        ctx.cleanup();
    });

    // Test CurationPanel file analysis
    TestRunner.test('CurationPanel - Should handle file analysis', async (ctx) => {
        // Setup
        const eventBus = ctx.createMockEventBus();
        const appState = ctx.createMockAppState();
        
        window.KC = { EventBus: eventBus, AppState: appState };
        window.ConfidenceCalculator = class {
            calculate() {
                return {
                    overall: 0.85,
                    dimensions: {
                        semantic: 0.9,
                        categorical: 0.8,
                        structural: 0.85,
                        temporal: 0.8
                    },
                    convergencePrediction: {
                        willConverge: true,
                        isConverged: false,
                        estimatedIterations: 1
                    }
                };
            }
        };
        
        const container = ctx.createTestContainer();
        const file = ctx.createMockFile();
        appState.set('files', [file]);
        
        // Test
        const panel = new CurationPanel(`#${container.id}`);
        await ctx.wait(200);
        
        let analyzedEventFired = false;
        eventBus.on('file:analyzed', (data) => {
            analyzedEventFired = true;
            ctx.assertEquals(data.fileId, file.id);
            ctx.assertEquals(data.metrics.overall, 0.85);
        });
        
        await panel.analyzeFile(file.id);
        await ctx.wait(1600); // Wait for simulated delay
        
        // Assertions
        ctx.assert(analyzedEventFired, 'file:analyzed event should have been fired');
        
        // Cleanup
        ctx.cleanup();
    });

    // Test CurationPanel filtering
    TestRunner.test('CurationPanel - Should filter files by confidence', async (ctx) => {
        // Setup
        const eventBus = ctx.createMockEventBus();
        const appState = ctx.createMockAppState();
        
        window.KC = { EventBus: eventBus, AppState: appState };
        
        const container = ctx.createTestContainer();
        const files = [
            ctx.createMockFile({ id: 'file1', confidence: { overall: 0.3 } }),
            ctx.createMockFile({ id: 'file2', confidence: { overall: 0.6 } }),
            ctx.createMockFile({ id: 'file3', confidence: { overall: 0.9 } })
        ];
        appState.set('files', files);
        
        // Test
        const panel = new CurationPanel(`#${container.id}`);
        await ctx.wait(200);
        
        // Check initial state (threshold 0.5)
        let fileCards = container.querySelectorAll('.file-card');
        ctx.assertEquals(fileCards.length, 2); // file2 and file3
        
        // Change threshold
        const slider = container.querySelector('#confidence-filter');
        ctx.simulateInput(slider, 80);
        await ctx.wait(100);
        
        fileCards = container.querySelectorAll('.file-card');
        ctx.assertEquals(fileCards.length, 1); // only file3
        
        // Cleanup
        ctx.cleanup();
    });

    // Test responsive behavior
    TestRunner.test('CurationPanel - Should handle responsive layout', async (ctx) => {
        // Setup
        window.KC = {
            EventBus: ctx.createMockEventBus(),
            AppState: ctx.createMockAppState()
        };
        
        const container = ctx.createTestContainer();
        const panel = new CurationPanel(`#${container.id}`);
        await ctx.wait(100);
        
        // Test view mode switching
        const gridBtn = container.querySelector('[data-mode="grid"]');
        const listBtn = container.querySelector('[data-mode="list"]');
        
        ctx.simulateClick(listBtn);
        await ctx.wait(50);
        
        const fileContainer = container.querySelector('#file-container');
        ctx.assert(fileContainer.classList.contains('list-view'));
        
        ctx.simulateClick(gridBtn);
        await ctx.wait(50);
        
        ctx.assert(fileContainer.classList.contains('grid-view'));
        
        // Cleanup
        ctx.cleanup();
    });

    // ========================================
    // Run Tests
    // ========================================

    // Export test runner for external use
    window.CurationUITests = TestRunner;

    // Auto-run tests if in test environment
    if (typeof window.runTests !== 'undefined' && window.runTests) {
        document.addEventListener('DOMContentLoaded', () => {
            TestRunner.runAll();
        });
    }

})();