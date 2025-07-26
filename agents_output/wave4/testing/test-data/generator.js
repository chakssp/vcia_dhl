/**
 * Test Data Generator for ML Confidence System
 * 
 * Generates realistic test data for various testing scenarios including
 * edge cases, performance testing, and confidence validation.
 */

export default class TestDataGenerator {
    constructor(config = {}) {
        this.config = {
            seed: Date.now(),
            locale: 'en',
            ...config
        };
        
        this.random = this.createSeededRandom(this.config.seed);
        this.contentTemplates = this.loadContentTemplates();
        this.categoryHierarchy = this.buildCategoryHierarchy();
    }
    
    /**
     * Generate a single analysis file with specified characteristics
     */
    generateAnalysisFile(options = {}) {
        const defaults = {
            quality: 'medium',
            length: 'medium',
            type: 'markdown',
            age: 'recent',
            iterations: 0,
            hasEmbeddings: true,
            hasCategories: true,
            hasMetadata: true
        };
        
        const settings = { ...defaults, ...options };
        
        const fileId = this.generateFileId();
        const content = this.generateContent(settings);
        const structure = this.analyzeStructure(content);
        
        return {
            fileId,
            content,
            embeddings: settings.hasEmbeddings ? this.generateEmbeddings(settings.quality) : null,
            categories: settings.hasCategories ? this.generateCategories(settings.quality) : [],
            categoryConfidence: this.calculateCategoryConfidence(settings.quality),
            fileType: settings.type,
            fileSize: content.length,
            path: this.generatePath(settings.type),
            createdAt: this.generateDate(settings.age, 'created'),
            modifiedAt: this.generateDate(settings.age, 'modified'),
            iterationCount: settings.iterations,
            previousConfidence: settings.iterations > 0 ? this.random() * 0.7 : 0,
            improvementRate: settings.iterations > 0 ? this.random() * 0.3 : 0,
            metadata: settings.hasMetadata ? this.generateMetadata(settings) : {},
            ...structure
        };
    }
    
    /**
     * Generate content based on quality and length settings
     */
    generateContent(settings) {
        const lengthMap = {
            short: { min: 100, max: 500 },
            medium: { min: 500, max: 2000 },
            long: { min: 2000, max: 5000 },
            very_long: { min: 5000, max: 10000 }
        };
        
        const qualityFeatures = {
            low: {
                hasTitle: 0.3,
                hasSections: 0.2,
                hasLists: 0.1,
                hasCode: 0.1,
                hasLinks: 0.1,
                grammarQuality: 0.6,
                coherence: 0.5
            },
            medium: {
                hasTitle: 0.7,
                hasSections: 0.6,
                hasLists: 0.5,
                hasCode: 0.3,
                hasLinks: 0.4,
                grammarQuality: 0.8,
                coherence: 0.75
            },
            high: {
                hasTitle: 0.95,
                hasSections: 0.9,
                hasLists: 0.7,
                hasCode: 0.5,
                hasLinks: 0.6,
                grammarQuality: 0.95,
                coherence: 0.9
            }
        };
        
        const length = lengthMap[settings.length] || lengthMap.medium;
        const features = qualityFeatures[settings.quality] || qualityFeatures.medium;
        const targetLength = this.randomInt(length.min, length.max);
        
        let content = '';
        
        // Title
        if (this.random() < features.hasTitle) {
            content += `# ${this.generateTitle(settings)}\n\n`;
        }
        
        // Introduction
        content += this.generateParagraph(150, features.grammarQuality) + '\n\n';
        
        // Main content sections
        const sectionCount = features.hasSections > this.random() ? 
            this.randomInt(2, 5) : 1;
            
        for (let i = 0; i < sectionCount; i++) {
            if (features.hasSections > this.random()) {
                content += `## ${this.generateSectionTitle(i)}\n\n`;
            }
            
            // Section content
            const paragraphs = this.randomInt(2, 4);
            for (let p = 0; p < paragraphs; p++) {
                content += this.generateParagraph(200, features.grammarQuality) + '\n\n';
                
                // Add optional elements
                if (features.hasLists > this.random() && p === 1) {
                    content += this.generateList(features.grammarQuality) + '\n\n';
                }
                
                if (features.hasCode > this.random() && p === 2) {
                    content += this.generateCodeBlock(settings.type) + '\n\n';
                }
            }
            
            if (features.hasLinks > this.random()) {
                content = this.insertLinks(content, this.randomInt(1, 3));
            }
        }
        
        // Ensure coherence
        if (features.coherence > 0.7) {
            content = this.improveCoherence(content);
        }
        
        // Trim to target length
        if (content.length > targetLength) {
            content = content.substring(0, targetLength);
            // Ensure we don't cut mid-sentence
            const lastPeriod = content.lastIndexOf('.');
            if (lastPeriod > targetLength * 0.8) {
                content = content.substring(0, lastPeriod + 1);
            }
        }
        
        return content;
    }
    
    /**
     * Generate embeddings based on quality
     */
    generateEmbeddings(quality, dimensions = 768) {
        const qualityParams = {
            low: { clusters: 1, variance: 0.3, magnitude: 0.6 },
            medium: { clusters: 2, variance: 0.2, magnitude: 0.8 },
            high: { clusters: 3, variance: 0.1, magnitude: 0.95 }
        };
        
        const params = qualityParams[quality] || qualityParams.medium;
        const embeddings = new Array(dimensions);
        
        // Generate cluster centers
        const clusterCenters = [];
        for (let i = 0; i < params.clusters; i++) {
            const center = new Array(dimensions);
            for (let d = 0; d < dimensions; d++) {
                center[d] = (this.random() - 0.5) * 2;
            }
            clusterCenters.push(center);
        }
        
        // Select primary cluster
        const primaryCluster = clusterCenters[Math.floor(this.random() * params.clusters)];
        
        // Generate embeddings around cluster
        for (let i = 0; i < dimensions; i++) {
            const noise = (this.random() - 0.5) * params.variance;
            embeddings[i] = primaryCluster[i] + noise;
        }
        
        // Normalize to unit vector
        const magnitude = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
        for (let i = 0; i < dimensions; i++) {
            embeddings[i] = (embeddings[i] / magnitude) * params.magnitude;
        }
        
        return embeddings;
    }
    
    /**
     * Generate categories based on quality and content
     */
    generateCategories(quality) {
        const qualityToCount = {
            low: { min: 0, max: 2 },
            medium: { min: 1, max: 3 },
            high: { min: 2, max: 4 }
        };
        
        const range = qualityToCount[quality] || qualityToCount.medium;
        const count = this.randomInt(range.min, range.max);
        
        const categories = new Set();
        
        // Add primary category
        if (count > 0) {
            const primary = this.selectFromHierarchy('primary');
            categories.add(primary);
        }
        
        // Add related categories
        while (categories.size < count) {
            const existing = Array.from(categories);
            const base = existing[Math.floor(this.random() * existing.length)];
            const related = this.getRelatedCategory(base);
            if (related) categories.add(related);
        }
        
        return Array.from(categories);
    }
    
    /**
     * Generate realistic metadata
     */
    generateMetadata(settings) {
        const metadata = {
            author: this.generateAuthor(),
            tags: this.generateTags(settings.quality),
            importance: this.selectImportance(settings.quality),
            language: this.config.locale,
            version: `${this.randomInt(1, 3)}.${this.randomInt(0, 9)}.${this.randomInt(0, 20)}`,
            status: this.selectStatus(settings.quality)
        };
        
        // Add quality-specific metadata
        if (settings.quality === 'high') {
            metadata.reviewed = true;
            metadata.reviewDate = this.generateDate('recent', 'review');
            metadata.approvedBy = this.generateAuthor();
        }
        
        if (settings.quality === 'low') {
            metadata.draft = true;
            metadata.needsReview = true;
        }
        
        // Add type-specific metadata
        if (settings.type === 'code') {
            metadata.language = this.selectProgrammingLanguage();
            metadata.framework = this.selectFramework(metadata.language);
        }
        
        return metadata;
    }
    
    /**
     * Generate batch of files with specific distribution
     */
    generateBatch(size, distribution = null) {
        const defaultDistribution = {
            quality: { low: 0.2, medium: 0.5, high: 0.3 },
            length: { short: 0.2, medium: 0.6, long: 0.2 },
            age: { old: 0.3, recent: 0.5, new: 0.2 }
        };
        
        const dist = distribution || defaultDistribution;
        const batch = [];
        
        for (let i = 0; i < size; i++) {
            const settings = {
                quality: this.selectByDistribution(dist.quality),
                length: this.selectByDistribution(dist.length),
                age: this.selectByDistribution(dist.age),
                type: this.random() > 0.8 ? 'code' : 'markdown'
            };
            
            batch.push(this.generateAnalysisFile(settings));
        }
        
        return batch;
    }
    
    /**
     * Generate edge case scenarios
     */
    generateEdgeCases() {
        return [
            // Empty content
            this.generateAnalysisFile({
                content: '',
                quality: 'low',
                hasEmbeddings: false
            }),
            
            // Very long content
            this.generateAnalysisFile({
                length: 'very_long',
                quality: 'high'
            }),
            
            // No categories
            this.generateAnalysisFile({
                hasCategories: false,
                quality: 'medium'
            }),
            
            // Many iterations
            this.generateAnalysisFile({
                iterations: 20,
                quality: 'high'
            }),
            
            // Old file
            this.generateAnalysisFile({
                age: 'ancient',
                quality: 'low'
            }),
            
            // Unicode content
            {
                ...this.generateAnalysisFile(),
                content: this.generateUnicodeContent()
            },
            
            // Malformed structure
            {
                ...this.generateAnalysisFile(),
                content: this.generateMalformedContent()
            },
            
            // Circular references
            this.generateCircularReference(),
            
            // Extreme embeddings
            {
                ...this.generateAnalysisFile(),
                embeddings: this.generateExtremeEmbeddings()
            },
            
            // Missing required fields
            {
                fileId: 'edge-missing-fields',
                content: 'Test'
                // Missing most fields
            }
        ];
    }
    
    /**
     * Generate convergence test scenarios
     */
    generateConvergenceScenarios() {
        return {
            // Fast convergence
            fastConvergence: this.generateConvergenceHistory('fast', 5),
            
            // Slow convergence
            slowConvergence: this.generateConvergenceHistory('slow', 15),
            
            // Plateau scenario
            plateau: this.generateConvergenceHistory('plateau', 10),
            
            // Oscillating
            oscillating: this.generateConvergenceHistory('oscillating', 12),
            
            // Perfect linear
            linear: this.generateConvergenceHistory('linear', 8),
            
            // Exponential
            exponential: this.generateConvergenceHistory('exponential', 6)
        };
    }
    
    /**
     * Helper methods
     */
    
    createSeededRandom(seed) {
        let currentSeed = seed;
        return () => {
            currentSeed = (currentSeed * 9301 + 49297) % 233280;
            return currentSeed / 233280;
        };
    }
    
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    
    generateFileId() {
        const timestamp = Date.now();
        const random = Math.floor(this.random() * 10000);
        return `file_${timestamp}_${random}`;
    }
    
    generatePath(type) {
        const folders = ['documents', 'projects', 'archive', 'workspace'];
        const depths = this.randomInt(1, 4);
        let path = '/';
        
        for (let i = 0; i < depths; i++) {
            path += folders[Math.floor(this.random() * folders.length)] + '/';
        }
        
        const extensions = {
            markdown: '.md',
            code: ['.js', '.py', '.java', '.cpp'][Math.floor(this.random() * 4)],
            text: '.txt',
            document: '.doc'
        };
        
        path += `document_${this.randomInt(1000, 9999)}${extensions[type] || '.txt'}`;
        return path;
    }
    
    generateDate(age, type) {
        const now = Date.now();
        const ageRanges = {
            ancient: { min: 730, max: 1825 }, // 2-5 years
            old: { min: 180, max: 730 }, // 6 months - 2 years
            recent: { min: 7, max: 180 }, // 1 week - 6 months
            new: { min: 0, max: 7 } // 0-7 days
        };
        
        const range = ageRanges[age] || ageRanges.recent;
        const daysAgo = this.randomInt(range.min, range.max);
        
        let date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        
        // Modified date should be more recent than created
        if (type === 'modified') {
            const recentDays = Math.max(0, daysAgo - this.randomInt(0, daysAgo * 0.8));
            date = new Date(now - recentDays * 24 * 60 * 60 * 1000);
        }
        
        return date;
    }
    
    analyzeStructure(content) {
        return {
            hasTitle: /^#\s+.+/m.test(content),
            hasSections: /^##\s+.+/m.test(content),
            hasLists: /^[\*\-]\s+.+/m.test(content),
            hasCode: /```[\s\S]*?```/.test(content),
            hasLinks: /\[.+\]\(.+\)/.test(content),
            hasImages: /!\[.+\]\(.+\)/.test(content),
            wordCount: content.split(/\s+/).length,
            lineCount: content.split('\n').length,
            avgSentenceLength: this.calculateAvgSentenceLength(content),
            formatQuality: this.assessFormatQuality(content)
        };
    }
    
    calculateAvgSentenceLength(content) {
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length === 0) return 0;
        
        const totalWords = sentences.reduce((sum, sentence) => {
            return sum + sentence.trim().split(/\s+/).length;
        }, 0);
        
        return totalWords / sentences.length;
    }
    
    assessFormatQuality(content) {
        let quality = 0.5;
        
        // Check for proper structure
        if (/^#\s+.+/m.test(content)) quality += 0.1;
        if (/^##\s+.+/m.test(content)) quality += 0.1;
        if (/```[\s\S]*?```/.test(content)) quality += 0.1;
        if (/^[\*\-]\s+.+/m.test(content)) quality += 0.05;
        
        // Check for consistency
        const lines = content.split('\n');
        const emptyLines = lines.filter(l => l.trim() === '').length;
        const ratio = emptyLines / lines.length;
        
        if (ratio > 0.1 && ratio < 0.3) quality += 0.1;
        
        // Check paragraph structure
        const paragraphs = content.split(/\n\n+/);
        if (paragraphs.length > 3) quality += 0.05;
        
        return Math.min(1, quality);
    }
    
    calculateCategoryConfidence(quality) {
        const base = { low: 0.3, medium: 0.6, high: 0.85 };
        const variance = 0.1;
        
        return Math.max(0, Math.min(1, 
            base[quality] + (this.random() - 0.5) * variance
        ));
    }
    
    loadContentTemplates() {
        return {
            technical: [
                'implementation', 'architecture', 'algorithm', 'optimization',
                'performance', 'scalability', 'security', 'infrastructure'
            ],
            business: [
                'strategy', 'planning', 'analysis', 'metrics',
                'objectives', 'stakeholders', 'outcomes', 'initiatives'
            ],
            documentation: [
                'overview', 'guide', 'reference', 'tutorial',
                'examples', 'configuration', 'installation', 'usage'
            ]
        };
    }
    
    buildCategoryHierarchy() {
        return {
            primary: ['technical', 'business', 'personal', 'research'],
            technical: ['programming', 'architecture', 'devops', 'security'],
            business: ['strategy', 'planning', 'analysis', 'management'],
            personal: ['notes', 'ideas', 'journal', 'learning'],
            research: ['papers', 'experiments', 'findings', 'literature']
        };
    }
    
    selectFromHierarchy(level) {
        const options = this.categoryHierarchy[level] || this.categoryHierarchy.primary;
        return options[Math.floor(this.random() * options.length)];
    }
    
    getRelatedCategory(base) {
        const related = this.categoryHierarchy[base];
        if (related && related.length > 0) {
            return related[Math.floor(this.random() * related.length)];
        }
        return null;
    }
    
    generateTitle(settings) {
        const templates = {
            low: ['Draft', 'Notes', 'Untitled', 'Working Document'],
            medium: ['Guide to', 'Overview of', 'Understanding', 'Working with'],
            high: ['Complete Guide to', 'Advanced', 'Professional', 'Comprehensive']
        };
        
        const prefix = templates[settings.quality][
            Math.floor(this.random() * templates[settings.quality].length)
        ];
        
        const topics = this.contentTemplates.technical.concat(
            this.contentTemplates.business,
            this.contentTemplates.documentation
        );
        
        const topic = topics[Math.floor(this.random() * topics.length)];
        
        return `${prefix} ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
    }
    
    generateSectionTitle(index) {
        const titles = [
            'Introduction', 'Background', 'Methodology', 'Implementation',
            'Results', 'Discussion', 'Best Practices', 'Considerations',
            'Architecture', 'Configuration', 'Deployment', 'Monitoring'
        ];
        
        return titles[index % titles.length];
    }
    
    generateParagraph(targetWords, quality) {
        const vocabulary = this.getVocabulary(quality);
        const words = [];
        
        while (words.length < targetWords) {
            const sentenceLength = this.randomInt(10, 25);
            const sentence = [];
            
            for (let i = 0; i < sentenceLength; i++) {
                sentence.push(vocabulary[Math.floor(this.random() * vocabulary.length)]);
            }
            
            // Capitalize first word
            sentence[0] = sentence[0].charAt(0).toUpperCase() + sentence[0].slice(1);
            
            words.push(...sentence);
            words.push(this.random() > 0.3 ? '.' : this.random() > 0.5 ? '!' : '?');
        }
        
        return words.slice(0, targetWords).join(' ');
    }
    
    getVocabulary(quality) {
        const common = [
            'the', 'and', 'to', 'of', 'a', 'in', 'that', 'is',
            'for', 'with', 'on', 'by', 'this', 'from', 'at', 'which'
        ];
        
        const technical = [
            'system', 'process', 'data', 'application', 'service',
            'implementation', 'architecture', 'component', 'module',
            'interface', 'configuration', 'deployment', 'integration'
        ];
        
        const advanced = [
            'scalability', 'optimization', 'methodology', 'infrastructure',
            'orchestration', 'abstraction', 'encapsulation', 'polymorphism',
            'concurrency', 'asynchronous', 'distributed', 'microservices'
        ];
        
        if (quality < 0.7) return [...common, ...technical.slice(0, 5)];
        if (quality < 0.9) return [...common, ...technical];
        return [...common, ...technical, ...advanced];
    }
    
    generateList(quality) {
        const items = this.randomInt(3, 7);
        const list = [];
        
        for (let i = 0; i < items; i++) {
            const words = this.randomInt(5, 15);
            const item = this.generateParagraph(words, quality).replace(/[.!?]$/, '');
            list.push(`- ${item}`);
        }
        
        return list.join('\n');
    }
    
    generateCodeBlock(type) {
        const languages = {
            markdown: 'javascript',
            code: ['javascript', 'python', 'java', 'cpp'][Math.floor(this.random() * 4)]
        };
        
        const lang = languages[type] || 'javascript';
        
        const codeExamples = {
            javascript: `function processData(items) {
    return items
        .filter(item => item.active)
        .map(item => ({
            ...item,
            processed: true,
            timestamp: Date.now()
        }))
        .sort((a, b) => b.priority - a.priority);
}`,
            python: `def process_data(items):
    processed = []
    for item in items:
        if item.get('active'):
            processed.append({
                **item,
                'processed': True,
                'timestamp': time.time()
            })
    return sorted(processed, key=lambda x: x['priority'])`,
            java: `public List<Item> processData(List<Item> items) {
    return items.stream()
        .filter(Item::isActive)
        .map(item -> item.toBuilder()
            .processed(true)
            .timestamp(System.currentTimeMillis())
            .build())
        .sorted(Comparator.comparing(Item::getPriority))
        .collect(Collectors.toList());
}`,
            cpp: `std::vector<Item> processData(const std::vector<Item>& items) {
    std::vector<Item> result;
    for (const auto& item : items) {
        if (item.active) {
            Item processed = item;
            processed.processed = true;
            processed.timestamp = std::time(nullptr);
            result.push_back(processed);
        }
    }
    std::sort(result.begin(), result.end(),
        [](const Item& a, const Item& b) { return a.priority > b.priority; });
    return result;
}`
        };
        
        return '```' + lang + '\n' + (codeExamples[lang] || codeExamples.javascript) + '\n```';
    }
    
    insertLinks(content, count) {
        const links = [
            '[documentation](https://docs.example.com)',
            '[API reference](https://api.example.com)',
            '[tutorial](https://learn.example.com)',
            '[examples](https://github.com/example)'
        ];
        
        for (let i = 0; i < count; i++) {
            const link = links[Math.floor(this.random() * links.length)];
            const position = Math.floor(this.random() * content.length);
            
            // Find next space to insert link
            const spaceIndex = content.indexOf(' ', position);
            if (spaceIndex !== -1) {
                content = content.slice(0, spaceIndex) + ' ' + link + content.slice(spaceIndex);
            }
        }
        
        return content;
    }
    
    improveCoherence(content) {
        // Add transition words between paragraphs
        const transitions = [
            'Furthermore', 'Additionally', 'Moreover', 'However',
            'In contrast', 'Similarly', 'Consequently', 'Therefore'
        ];
        
        const paragraphs = content.split('\n\n');
        
        for (let i = 1; i < paragraphs.length; i++) {
            if (this.random() > 0.5 && paragraphs[i].length > 0) {
                const transition = transitions[Math.floor(this.random() * transitions.length)];
                paragraphs[i] = transition + ', ' + 
                    paragraphs[i].charAt(0).toLowerCase() + paragraphs[i].slice(1);
            }
        }
        
        return paragraphs.join('\n\n');
    }
    
    generateAuthor() {
        const firstNames = ['John', 'Jane', 'Alex', 'Sarah', 'Mike', 'Emma'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
        
        return `${firstNames[Math.floor(this.random() * firstNames.length)]} ${
            lastNames[Math.floor(this.random() * lastNames.length)]
        }`;
    }
    
    generateTags(quality) {
        const tagPool = {
            low: ['draft', 'todo', 'incomplete', 'review-needed'],
            medium: ['documentation', 'guide', 'reference', 'tutorial'],
            high: ['complete', 'verified', 'production', 'approved']
        };
        
        const baseTags = tagPool[quality] || tagPool.medium;
        const count = this.randomInt(1, 4);
        const tags = new Set();
        
        while (tags.size < count) {
            tags.add(baseTags[Math.floor(this.random() * baseTags.length)]);
        }
        
        return Array.from(tags);
    }
    
    selectImportance(quality) {
        const weights = {
            low: { low: 0.6, medium: 0.3, high: 0.1, critical: 0 },
            medium: { low: 0.2, medium: 0.5, high: 0.2, critical: 0.1 },
            high: { low: 0.1, medium: 0.3, high: 0.4, critical: 0.2 }
        };
        
        return this.selectByDistribution(weights[quality] || weights.medium);
    }
    
    selectStatus(quality) {
        const weights = {
            low: { draft: 0.7, review: 0.2, approved: 0.1 },
            medium: { draft: 0.3, review: 0.4, approved: 0.3 },
            high: { draft: 0.1, review: 0.2, approved: 0.7 }
        };
        
        return this.selectByDistribution(weights[quality] || weights.medium);
    }
    
    selectByDistribution(distribution) {
        const rand = this.random();
        let cumulative = 0;
        
        for (const [key, weight] of Object.entries(distribution)) {
            cumulative += weight;
            if (rand <= cumulative) return key;
        }
        
        return Object.keys(distribution)[0];
    }
    
    selectProgrammingLanguage() {
        const languages = ['javascript', 'python', 'java', 'csharp', 'go', 'rust'];
        return languages[Math.floor(this.random() * languages.length)];
    }
    
    selectFramework(language) {
        const frameworks = {
            javascript: ['react', 'vue', 'angular', 'express', 'nextjs'],
            python: ['django', 'flask', 'fastapi', 'pytorch', 'tensorflow'],
            java: ['spring', 'springboot', 'hibernate', 'junit'],
            csharp: ['dotnet', 'aspnet', 'entityframework'],
            go: ['gin', 'echo', 'fiber'],
            rust: ['actix', 'rocket', 'tokio']
        };
        
        const options = frameworks[language] || ['generic'];
        return options[Math.floor(this.random() * options.length)];
    }
    
    generateUnicodeContent() {
        const samples = [
            '这是一个测试文档。', // Chinese
            'これはテストドキュメントです。', // Japanese
            'Это тестовый документ.', // Russian
            'هذا مستند اختبار.', // Arabic
            '🚀 Emoji content test 📝✨',
            'Ñoño test with accents: café, naïve, résumé'
        ];
        
        return samples.join('\n\n') + '\n\n' + this.generateParagraph(100, 0.8);
    }
    
    generateMalformedContent() {
        return `# Title without proper spacing
##No space after hash
        
Paragraph with     excessive     spaces.

- List item without proper
continuation
-No space after dash

\`\`\`
Code block without language
and no closing backticks

> Quote without proper> formatting

[Broken link](
[Another broken](link without closing)

Multiple


Empty


Lines`;
    }
    
    generateCircularReference() {
        const obj = {
            fileId: 'circular-ref-test',
            content: 'Test content',
            metadata: {
                parent: null
            }
        };
        
        // Create circular reference
        obj.metadata.parent = obj;
        obj.self = obj;
        
        return obj;
    }
    
    generateExtremeEmbeddings() {
        const embeddings = new Array(768);
        
        // Mix of extreme values
        for (let i = 0; i < embeddings.length; i++) {
            if (i % 4 === 0) embeddings[i] = 1; // Maximum
            else if (i % 4 === 1) embeddings[i] = -1; // Minimum
            else if (i % 4 === 2) embeddings[i] = 0; // Zero
            else embeddings[i] = Math.random() > 0.5 ? 1e-10 : -1e-10; // Near zero
        }
        
        return embeddings;
    }
    
    generateConvergenceHistory(pattern, iterations) {
        const history = [];
        let current = 0.4 + this.random() * 0.2; // Start between 0.4-0.6
        
        for (let i = 0; i < iterations; i++) {
            let next;
            
            switch (pattern) {
                case 'fast':
                    next = current + (0.85 - current) * 0.4;
                    break;
                    
                case 'slow':
                    next = current + (0.85 - current) * 0.1;
                    break;
                    
                case 'plateau':
                    if (i < iterations / 2) {
                        next = current + (0.75 - current) * 0.3;
                    } else {
                        next = current + (this.random() - 0.5) * 0.01;
                    }
                    break;
                    
                case 'oscillating':
                    next = current + (this.random() - 0.5) * 0.2;
                    next = Math.max(0.3, Math.min(0.9, next));
                    break;
                    
                case 'linear':
                    next = current + (0.85 - 0.4) / iterations;
                    break;
                    
                case 'exponential':
                    next = 0.85 - (0.85 - 0.4) * Math.exp(-i * 0.5);
                    break;
                    
                default:
                    next = current + this.random() * 0.1;
            }
            
            current = Math.max(0, Math.min(1, next));
            
            history.push({
                iteration: i + 1,
                overall: current,
                dimensions: {
                    semantic: current + (this.random() - 0.5) * 0.1,
                    categorical: current + (this.random() - 0.5) * 0.1,
                    structural: current + (this.random() - 0.5) * 0.1,
                    temporal: current + (this.random() - 0.5) * 0.1
                },
                timestamp: new Date(Date.now() - (iterations - i) * 60000)
            });
        }
        
        return history;
    }
}

// Export for test usage
export { TestDataGenerator };