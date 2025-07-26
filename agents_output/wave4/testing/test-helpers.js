/**
 * Test Helpers for ML Confidence Test Framework
 * 
 * Utility functions and helpers for test execution, data generation,
 * assertions, and test environment management.
 */

export default class TestHelpers {
    constructor() {
        this.testDataCache = new Map();
        this.timers = new Map();
        this.mockFiles = [];
    }
    
    /**
     * Generate mock analysis data
     */
    generateMockAnalysisData(overrides = {}) {
        const baseData = {
            fileId: `file_${Math.random().toString(36).substr(2, 9)}`,
            content: this.generateContent(Math.floor(Math.random() * 2000) + 500),
            embeddings: this.generateEmbeddings(),
            categories: this.generateCategories(),
            categoryConfidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
            createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            modifiedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            fileType: this.randomChoice(['md', 'txt', 'doc', 'pdf']),
            fileSize: Math.floor(Math.random() * 1000000) + 10000,
            path: this.generatePath(),
            iterationCount: Math.floor(Math.random() * 5),
            previousConfidence: Math.random() * 0.7,
            improvementRate: Math.random() * 0.3,
            metadata: {
                author: this.randomChoice(['user', 'system', 'ai']),
                tags: this.generateTags(),
                importance: this.randomChoice(['low', 'medium', 'high', 'critical'])
            }
        };
        
        return { ...baseData, ...overrides };
    }
    
    /**
     * Generate test content with various structures
     */
    generateContent(length = 1000, options = {}) {
        const {
            includeTitle = Math.random() > 0.3,
            includeSections = Math.random() > 0.4,
            includeLists = Math.random() > 0.5,
            includeCode = Math.random() > 0.6,
            includeLinks = Math.random() > 0.7
        } = options;
        
        let content = '';
        
        // Add title
        if (includeTitle) {
            content += `# ${this.generateTitle()}\n\n`;
        }
        
        // Add introduction
        content += this.generateParagraph(100) + '\n\n';
        
        // Add sections
        if (includeSections) {
            const sectionCount = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < sectionCount; i++) {
                content += `## ${this.generateSectionTitle()}\n\n`;
                content += this.generateParagraph(200) + '\n\n';
                
                if (includeLists && Math.random() > 0.5) {
                    content += this.generateList() + '\n\n';
                }
                
                if (includeCode && Math.random() > 0.6) {
                    content += this.generateCodeBlock() + '\n\n';
                }
            }
        }
        
        // Add conclusion
        content += '## Conclusion\n\n';
        content += this.generateParagraph(150);
        
        // Add links if requested
        if (includeLinks) {
            content = this.insertLinks(content);
        }
        
        return content.substring(0, length);
    }
    
    /**
     * Generate embeddings vector
     */
    generateEmbeddings(dimensions = 768) {
        const embeddings = [];
        
        // Generate clustered embeddings for more realistic distribution
        const clusters = Math.floor(Math.random() * 3) + 1;
        const clusterCenters = [];
        
        for (let i = 0; i < clusters; i++) {
            clusterCenters.push(Array(dimensions).fill(0).map(() => 
                (Math.random() - 0.5) * 2
            ));
        }
        
        // Select a cluster
        const selectedCluster = clusterCenters[Math.floor(Math.random() * clusters)];
        
        // Generate embeddings around the cluster center
        for (let i = 0; i < dimensions; i++) {
            const noise = (Math.random() - 0.5) * 0.3;
            embeddings.push(selectedCluster[i] + noise);
        }
        
        // Normalize
        const magnitude = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
        return embeddings.map(val => val / magnitude);
    }
    
    /**
     * Generate categories
     */
    generateCategories() {
        const allCategories = [
            'technical', 'business', 'personal', 'research',
            'documentation', 'planning', 'analysis', 'review',
            'tutorial', 'reference', 'guide', 'notes'
        ];
        
        const count = Math.floor(Math.random() * 3) + 1;
        const categories = new Set();
        
        while (categories.size < count) {
            categories.add(this.randomChoice(allCategories));
        }
        
        return Array.from(categories);
    }
    
    /**
     * Generate file path
     */
    generatePath() {
        const folders = [
            'documents', 'projects', 'notes', 'research',
            'archive', 'drafts', 'published', 'personal'
        ];
        
        const depth = Math.floor(Math.random() * 3) + 1;
        let path = '/';
        
        for (let i = 0; i < depth; i++) {
            path += this.randomChoice(folders) + '/';
        }
        
        path += `file_${Date.now()}.md`;
        return path;
    }
    
    /**
     * Generate tags
     */
    generateTags() {
        const allTags = [
            'important', 'todo', 'review', 'draft',
            'final', 'archived', 'public', 'private',
            'work', 'personal', 'research', 'reference'
        ];
        
        const count = Math.floor(Math.random() * 4);
        const tags = new Set();
        
        while (tags.size < count) {
            tags.add(this.randomChoice(allTags));
        }
        
        return Array.from(tags);
    }
    
    /**
     * Generate batch of test data
     */
    generateBatch(size, options = {}) {
        const batch = [];
        
        for (let i = 0; i < size; i++) {
            batch.push(this.generateMockAnalysisData({
                ...options,
                fileId: `batch_${i}_${Date.now()}`
            }));
        }
        
        return batch;
    }
    
    /**
     * Warm up test data cache
     */
    async warmupTestData() {
        // Pre-generate common test data sizes
        const sizes = [1, 10, 50, 100, 1000];
        
        for (const size of sizes) {
            const key = `batch_${size}`;
            if (!this.testDataCache.has(key)) {
                this.testDataCache.set(key, this.generateBatch(size));
            }
        }
    }
    
    /**
     * Get cached test data
     */
    getCachedBatch(size) {
        const key = `batch_${size}`;
        
        if (!this.testDataCache.has(key)) {
            this.testDataCache.set(key, this.generateBatch(size));
        }
        
        // Return a copy to prevent mutation
        return JSON.parse(JSON.stringify(this.testDataCache.get(key)));
    }
    
    /**
     * Clear test data cache
     */
    clearTestData() {
        this.testDataCache.clear();
        this.mockFiles = [];
    }
    
    /**
     * Timer utilities
     */
    startTimer(name) {
        this.timers.set(name, Date.now());
    }
    
    endTimer(name) {
        const start = this.timers.get(name);
        if (!start) {
            throw new Error(`Timer ${name} not started`);
        }
        
        const duration = Date.now() - start;
        this.timers.delete(name);
        return duration;
    }
    
    /**
     * Async delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Run with timeout
     */
    async withTimeout(promise, timeout, message) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeout);
        });
        
        return Promise.race([promise, timeoutPromise]);
    }
    
    /**
     * Retry mechanism
     */
    async retry(fn, options = {}) {
        const {
            attempts = 3,
            delay = 1000,
            backoff = 2,
            onRetry = () => {}
        } = options;
        
        let lastError;
        
        for (let i = 0; i < attempts; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i < attempts - 1) {
                    onRetry(i + 1, error);
                    await this.delay(delay * Math.pow(backoff, i));
                }
            }
        }
        
        throw lastError;
    }
    
    /**
     * Mock file system operations
     */
    createMockFile(path, content, metadata = {}) {
        const file = {
            path,
            content,
            metadata: {
                size: content.length,
                created: new Date(),
                modified: new Date(),
                ...metadata
            }
        };
        
        this.mockFiles.push(file);
        return file;
    }
    
    getMockFile(path) {
        return this.mockFiles.find(f => f.path === path);
    }
    
    /**
     * Environment info
     */
    getEnvironmentInfo() {
        return {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
            platform: typeof navigator !== 'undefined' ? navigator.platform : process.platform,
            hardwareConcurrency: typeof navigator !== 'undefined' ? 
                navigator.hardwareConcurrency : require('os').cpus().length,
            memory: this.getMemoryInfo(),
            timestamp: new Date().toISOString()
        };
    }
    
    getMemoryInfo() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                usedJSHeapSize: performance.memory.usedJSHeapSize
            };
        }
        
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                rss: usage.rss,
                heapTotal: usage.heapTotal,
                heapUsed: usage.heapUsed,
                external: usage.external
            };
        }
        
        return null;
    }
    
    /**
     * Assertion helpers
     */
    assertDeepEqual(actual, expected, message) {
        const actualStr = JSON.stringify(actual, null, 2);
        const expectedStr = JSON.stringify(expected, null, 2);
        
        if (actualStr !== expectedStr) {
            throw new Error(
                message || `Deep equality assertion failed:\nExpected:\n${expectedStr}\nActual:\n${actualStr}`
            );
        }
    }
    
    assertInRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(
                message || `Value ${value} not in range [${min}, ${max}]`
            );
        }
    }
    
    assertType(value, type, message) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== type) {
            throw new Error(
                message || `Expected type ${type}, but got ${actualType}`
            );
        }
    }
    
    /**
     * Performance measurement
     */
    measurePerformance(fn, iterations = 100) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const duration = performance.now() - start;
            times.push(duration);
        }
        
        times.sort((a, b) => a - b);
        
        return {
            min: times[0],
            max: times[times.length - 1],
            mean: times.reduce((a, b) => a + b, 0) / times.length,
            median: times[Math.floor(times.length / 2)],
            p95: times[Math.floor(times.length * 0.95)],
            p99: times[Math.floor(times.length * 0.99)]
        };
    }
    
    /**
     * Memory leak detection helper
     */
    async detectMemoryLeak(fn, options = {}) {
        const {
            iterations = 100,
            threshold = 10 * 1024 * 1024, // 10MB
            gcInterval = 10
        } = options;
        
        if (!performance.memory) {
            console.warn('Memory API not available');
            return null;
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const initialMemory = performance.memory.usedJSHeapSize;
        
        for (let i = 0; i < iterations; i++) {
            await fn();
            
            // Periodic GC
            if (i % gcInterval === 0 && global.gc) {
                global.gc();
                await this.delay(10);
            }
        }
        
        // Final GC
        if (global.gc) {
            global.gc();
            await this.delay(100);
        }
        
        const finalMemory = performance.memory.usedJSHeapSize;
        const leaked = finalMemory - initialMemory;
        
        return {
            leaked,
            leakDetected: leaked > threshold,
            initial: initialMemory,
            final: finalMemory,
            threshold
        };
    }
    
    /**
     * Utility functions
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    generateTitle() {
        const adjectives = ['Advanced', 'Essential', 'Complete', 'Modern', 'Practical'];
        const nouns = ['Guide', 'Manual', 'Reference', 'Tutorial', 'Documentation'];
        const topics = ['ML Systems', 'Data Analysis', 'Architecture', 'Implementation'];
        
        return `${this.randomChoice(adjectives)} ${this.randomChoice(topics)} ${this.randomChoice(nouns)}`;
    }
    
    generateSectionTitle() {
        const titles = [
            'Introduction', 'Overview', 'Implementation Details',
            'Architecture', 'Best Practices', 'Performance Considerations',
            'Security Guidelines', 'Testing Strategies', 'Deployment Steps'
        ];
        
        return this.randomChoice(titles);
    }
    
    generateParagraph(wordCount) {
        const words = [
            'system', 'implementation', 'architecture', 'design', 'pattern',
            'algorithm', 'optimization', 'performance', 'scalability', 'reliability',
            'component', 'module', 'interface', 'integration', 'deployment',
            'configuration', 'monitoring', 'analysis', 'processing', 'validation'
        ];
        
        let paragraph = '';
        
        for (let i = 0; i < wordCount; i++) {
            paragraph += this.randomChoice(words) + ' ';
            
            // Add punctuation
            if (i % 10 === 9) {
                paragraph = paragraph.trim() + '. ';
            }
        }
        
        return paragraph.trim() + '.';
    }
    
    generateList() {
        const items = Math.floor(Math.random() * 5) + 3;
        let list = '';
        
        for (let i = 0; i < items; i++) {
            list += `- ${this.generateParagraph(10)}\n`;
        }
        
        return list;
    }
    
    generateCodeBlock() {
        const languages = ['javascript', 'python', 'typescript', 'json'];
        const language = this.randomChoice(languages);
        
        const codeExamples = {
            javascript: `function calculate(data) {\n    return data.reduce((sum, val) => sum + val, 0);\n}`,
            python: `def calculate(data):\n    return sum(data)`,
            typescript: `interface Data {\n    value: number;\n    label: string;\n}`,
            json: `{\n    "type": "configuration",\n    "version": "1.0.0"\n}`
        };
        
        return `\`\`\`${language}\n${codeExamples[language]}\n\`\`\``;
    }
    
    insertLinks(content) {
        const links = [
            '[documentation](https://docs.example.com)',
            '[reference guide](https://ref.example.com)',
            '[API docs](https://api.example.com)'
        ];
        
        // Insert a few random links
        const linkCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < linkCount; i++) {
            const position = Math.floor(Math.random() * content.length);
            const link = this.randomChoice(links);
            content = content.slice(0, position) + ' ' + link + ' ' + content.slice(position);
        }
        
        return content;
    }
}

// Export for use in tests
export { TestHelpers };