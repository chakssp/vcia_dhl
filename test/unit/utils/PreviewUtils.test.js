/**
 * PreviewUtils.test.js
 * Unit tests for PreviewUtils - Smart Preview Extraction System
 * 
 * Tests cover:
 * - 5-segment preview extraction
 * - Content structure analysis
 * - Relevance scoring algorithms
 * - Edge cases and malformed content
 * - Performance with large content
 */

describe('PreviewUtils', () => {
    let PreviewUtils;

    beforeEach(() => {
        // Setup global KC mock
        global.window = {
            KnowledgeConsolidator: {}
        };
        
        // Import after mock setup
        require('../../../js/utils/PreviewUtils.js');
        PreviewUtils = window.KnowledgeConsolidator.PreviewUtils;
    });

    describe('Smart Preview Extraction', () => {
        test('should extract all 5 segments from well-structured content', () => {
            const content = `
This is the first paragraph with initial content that should be captured in the first segment of the preview.

This is the second paragraph that contains important information and should be captured completely as segment 2.

This is some middle content before the colon marker.

Important section: This is the key insight that follows a colon and should be captured.

This is content after the colon that provides additional context and details about the important section mentioned above.

This is the final paragraph with conclusion.
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(content);

            expect(preview.segment1).toContain('This is the first paragraph');
            expect(preview.segment1.split(' ')).toHaveLength(30); // Exactly 30 words

            expect(preview.segment2).toBe('This is the second paragraph that contains important information and should be captured completely as segment 2.');

            expect(preview.segment3).toContain('This is some middle content');
            expect(preview.segment4).toContain('Important section:');
            expect(preview.segment5).toContain('This is the key insight');

            expect(preview.structure).toBeDefined();
        });

        test('should handle content with no clear paragraph structure', () => {
            const content = 'This is a single line of text without any paragraph breaks or structure markers.';

            const preview = PreviewUtils.extractSmartPreview(content);

            expect(preview.segment1).toBe(content); // Less than 30 words
            expect(preview.segment2).toBe(''); // No second paragraph
            expect(preview.segment3).toBe(''); // No content before colon
            expect(preview.segment4).toBe(''); // No colon
            expect(preview.segment5).toBe(''); // No content after colon
        });

        test('should handle content with multiple colons', () => {
            const content = `
First paragraph with initial content.

Second paragraph: This is the first colon section.

Third paragraph: This is another colon section.

Fourth paragraph: Final colon section with more details.
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(content);

            expect(preview.segment4).toContain('Second paragraph:'); // First colon found
            expect(preview.segment5).toContain('This is the first colon section');
        });

        test('should handle empty or null content gracefully', () => {
            const testCases = ['', null, undefined, '   '];

            testCases.forEach(content => {
                const preview = PreviewUtils.extractSmartPreview(content);

                expect(preview.segment1).toBe('');
                expect(preview.segment2).toBe('');
                expect(preview.segment3).toBe('');
                expect(preview.segment4).toBe('');
                expect(preview.segment5).toBe('');
                expect(preview.structure).toBeDefined();
            });
        });
    });

    describe('Segment 1 - First 30 Words', () => {
        test('should extract exactly 30 words', () => {
            const words = Array.from({ length: 50 }, (_, i) => `word${i + 1}`);
            const content = words.join(' ');

            const segment1 = PreviewUtils.getFirst30Words(content);
            const extractedWords = segment1.split(' ');

            expect(extractedWords).toHaveLength(30);
            expect(extractedWords[0]).toBe('word1');
            expect(extractedWords[29]).toBe('word30');
        });

        test('should handle content with fewer than 30 words', () => {
            const content = 'This is a short content with only ten words here.';

            const segment1 = PreviewUtils.getFirst30Words(content);

            expect(segment1).toBe(content);
            expect(segment1.split(' ')).toHaveLength(10);
        });

        test('should handle content with extra whitespace', () => {
            const content = '  This   has    extra     whitespace    between    words  ';

            const segment1 = PreviewUtils.getFirst30Words(content);
            const words = segment1.split(' ');

            expect(words[0]).toBe('This');
            expect(words[1]).toBe('has');
            expect(words[2]).toBe('extra');
        });
    });

    describe('Segment 2 - Second Paragraph', () => {
        test('should extract complete second paragraph', () => {
            const content = `
First paragraph with some content.

This is the complete second paragraph that should be extracted in its entirety.

Third paragraph follows here.
            `.trim();

            const segment2 = PreviewUtils.getSecondParagraph(content);

            expect(segment2).toBe('This is the complete second paragraph that should be extracted in its entirety.');
        });

        test('should return empty string when no second paragraph exists', () => {
            const content = 'Only one paragraph exists in this content.';

            const segment2 = PreviewUtils.getSecondParagraph(content);

            expect(segment2).toBe('');
        });

        test('should handle different paragraph separators', () => {
            const testCases = [
                'First paragraph.\n\nSecond paragraph with double newline.',
                'First paragraph.\r\n\r\nSecond paragraph with CRLF.',
                'First paragraph.\n\n\nSecond paragraph with triple newline.'
            ];

            testCases.forEach(content => {
                const segment2 = PreviewUtils.getSecondParagraph(content);
                expect(segment2).toContain('Second paragraph');
            });
        });
    });

    describe('Segment 3 - Last Before Colon', () => {
        test('should extract paragraph immediately before colon', () => {
            const content = `
First paragraph.

Second paragraph here.

This is the paragraph right before the colon marker.

Important section: This follows the colon.
            `.trim();

            const segment3 = PreviewUtils.getLastBeforeColon(content);

            expect(segment3).toBe('This is the paragraph right before the colon marker.');
        });

        test('should return empty string when no colon exists', () => {
            const content = `
First paragraph.

Second paragraph without any colon markers.
            `.trim();

            const segment3 = PreviewUtils.getLastBeforeColon(content);

            expect(segment3).toBe('');
        });

        test('should handle multiple colons correctly', () => {
            const content = `
First section: Some content here.

Second section: More content.

Final paragraph before main colon.

Main section: This is the main content.
            `.trim();

            const segment3 = PreviewUtils.getLastBeforeColon(content);

            // Should find the paragraph before the FIRST colon
            expect(segment3).toContain('First section');
        });
    });

    describe('Segment 4 - Colon Phrase', () => {
        test('should extract phrase containing colon', () => {
            const content = `
Some introductory content here.

Key insight: This is the important information that follows the colon marker.

Additional content continues here.
            `.trim();

            const segment4 = PreviewUtils.getColonPhrase(content);

            expect(segment4).toContain('Key insight:');
            expect(segment4).toContain('This is the important information');
        });

        test('should extract sentence with colon in middle', () => {
            const content = 'This sentence has a colon: and continues with more content after it.';

            const segment4 = PreviewUtils.getColonPhrase(content);

            expect(segment4).toBe(content);
        });

        test('should return empty string when no colon exists', () => {
            const content = 'Content without any colon markers present.';

            const segment4 = PreviewUtils.getColonPhrase(content);

            expect(segment4).toBe('');
        });
    });

    describe('Segment 5 - First After Colon', () => {
        test('should extract 30 words after colon', () => {
            const afterColonWords = Array.from({ length: 50 }, (_, i) => `afterword${i + 1}`);
            const content = `Introduction text here.

Main section: ${afterColonWords.join(' ')}`;

            const segment5 = PreviewUtils.getFirstAfterColon(content);
            const extractedWords = segment5.split(' ');

            expect(extractedWords).toHaveLength(30);
            expect(extractedWords[0]).toBe('afterword1');
            expect(extractedWords[29]).toBe('afterword30');
        });

        test('should handle fewer than 30 words after colon', () => {
            const content = 'Section: Only five words after colon.';

            const segment5 = PreviewUtils.getFirstAfterColon(content);

            expect(segment5).toBe('Only five words after colon.');
            expect(segment5.split(' ')).toHaveLength(5);
        });

        test('should return empty string when no colon exists', () => {
            const content = 'Content without colon markers.';

            const segment5 = PreviewUtils.getFirstAfterColon(content);

            expect(segment5).toBe('');
        });
    });

    describe('Structure Analysis', () => {
        test('should analyze markdown structure correctly', () => {
            const content = `
# Main Title

## Section Header

Some paragraph content here.

### Subsection

- List item 1
- List item 2

**Bold text** and *italic text*.
            `.trim();

            const structure = PreviewUtils.analyzeStructure(content);

            expect(structure.type).toBe('markdown');
            expect(structure.hasHeaders).toBe(true);
            expect(structure.hasList).toBe(true);
            expect(structure.hasFormatting).toBe(true);
            expect(structure.paragraphCount).toBeGreaterThan(0);
        });

        test('should detect code structure', () => {
            const content = `
function example() {
    const variable = "value";
    return variable;
}

class MyClass {
    constructor() {
        this.property = null;
    }
}
            `.trim();

            const structure = PreviewUtils.analyzeStructure(content);

            expect(structure.type).toBe('code');
            expect(structure.hasCodeBlocks).toBe(true);
            expect(structure.language).toBe('javascript');
        });

        test('should detect plain text structure', () => {
            const content = `
This is plain text content without any special formatting or structure markers.

It contains multiple paragraphs but no markdown, code, or other special formatting.
            `.trim();

            const structure = PreviewUtils.analyzeStructure(content);

            expect(structure.type).toBe('text');
            expect(structure.hasHeaders).toBe(false);
            expect(structure.hasList).toBe(false);
            expect(structure.hasCodeBlocks).toBe(false);
        });

        test('should calculate content metrics', () => {
            const content = `
First paragraph here.

Second paragraph with more content.

Third paragraph concludes.
            `.trim();

            const structure = PreviewUtils.analyzeStructure(content);

            expect(structure.wordCount).toBeGreaterThan(0);
            expect(structure.charCount).toBeGreaterThan(0);
            expect(structure.lineCount).toBeGreaterThan(0);
            expect(structure.paragraphCount).toBe(3);
        });
    });

    describe('Relevance Scoring', () => {
        test('should calculate basic relevance score', () => {
            const content = 'This content discusses artificial intelligence and machine learning concepts.';
            const keywords = ['artificial intelligence', 'machine learning', 'AI', 'ML'];

            const score = PreviewUtils.calculateRelevance(content, keywords);

            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        test('should give higher scores for more keyword matches', () => {
            const content = 'AI and machine learning are artificial intelligence technologies that use ML algorithms.';
            const keywords = ['AI', 'machine learning', 'artificial intelligence', 'ML'];

            const score = PreviewUtils.calculateRelevance(content, keywords);

            expect(score).toBeGreaterThan(50); // Should be high due to multiple matches
        });

        test('should handle case insensitive matching', () => {
            const content = 'Machine Learning and AI are important technologies.';
            const keywords = ['machine learning', 'ai'];

            const score = PreviewUtils.calculateRelevance(content, keywords);

            expect(score).toBeGreaterThan(0);
        });

        test('should return zero for no keyword matches', () => {
            const content = 'This content is about cooking recipes and food preparation.';
            const keywords = ['technology', 'programming', 'software'];

            const score = PreviewUtils.calculateRelevance(content, keywords);

            expect(score).toBe(0);
        });

        test('should apply different weighting algorithms', () => {
            const content = 'AI machine learning artificial intelligence ML algorithms.';
            const keywords = ['AI', 'machine learning'];

            const linearScore = PreviewUtils.calculateRelevance(content, keywords, 'linear');
            const exponentialScore = PreviewUtils.calculateRelevance(content, keywords, 'exponential');
            const logarithmicScore = PreviewUtils.calculateRelevance(content, keywords, 'logarithmic');

            expect(linearScore).toBeGreaterThan(0);
            expect(exponentialScore).toBeGreaterThan(0);
            expect(logarithmicScore).toBeGreaterThan(0);

            // Exponential should be higher than linear for multiple matches
            expect(exponentialScore).toBeGreaterThan(linearScore);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle very large content efficiently', () => {
            const largeContent = 'word '.repeat(10000) + 'important: key information here';

            const startTime = Date.now();
            const preview = PreviewUtils.extractSmartPreview(largeContent);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
            expect(preview.segment1).toBeDefined();
            expect(preview.segment4).toContain('important:');
        });

        test('should handle special characters and unicode', () => {
            const content = `
Título com acentos: Çonteúdo em português.

Section with émojis: 🚀 This is important content 📊.

Unicode characters: 你好世界 καλησπέρα мир.
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(content);

            expect(preview.segment4).toContain('Título com acentos:');
            expect(preview.segment5).toContain('Çonteúdo em português');
        });

        test('should handle malformed content gracefully', () => {
            const malformedCases = [
                '\n\n\n\n\n', // Only newlines
                '   \t   \t   ', // Only whitespace
                ':::::::', // Only colons
                'a'.repeat(100000), // Very long single word
            ];

            malformedCases.forEach(content => {
                expect(() => {
                    const preview = PreviewUtils.extractSmartPreview(content);
                    expect(preview).toBeDefined();
                }).not.toThrow();
            });
        });

        test('should handle content with mixed line endings', () => {
            const content = 'Line 1\nLine 2\r\nLine 3\rLine 4';

            const preview = PreviewUtils.extractSmartPreview(content);

            expect(preview.structure.lineCount).toBeGreaterThan(1);
        });

        test('should sanitize potentially harmful content', () => {
            const content = `
<script>alert("xss")</script>

Normal content: This should be extracted safely.

More content with <iframe src="evil.com"></iframe> tags.
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(content);

            // Should extract content but not execute any scripts
            expect(preview.segment4).toContain('Normal content:');
            expect(preview.segment5).toContain('This should be extracted safely');
        });
    });

    describe('Performance and Caching', () => {
        test('should cache structure analysis results', () => {
            const content = 'Test content for caching validation.';

            // First call
            const startTime1 = Date.now();
            const structure1 = PreviewUtils.analyzeStructure(content);
            const endTime1 = Date.now();

            // Second call (should use cache)
            const startTime2 = Date.now();
            const structure2 = PreviewUtils.analyzeStructure(content);
            const endTime2 = Date.now();

            expect(structure1).toEqual(structure2);
            expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1); // Should be faster
        });

        test('should handle memory pressure gracefully', () => {
            // Generate many different content pieces to test cache limits
            for (let i = 0; i < 1000; i++) {
                const content = `Test content ${i} with unique identifier ${Math.random()}`;
                expect(() => {
                    PreviewUtils.extractSmartPreview(content);
                }).not.toThrow();
            }
        });
    });

    describe('Integration with File Types', () => {
        test('should handle markdown files correctly', () => {
            const markdownContent = `
# Project Documentation

## Overview

This project implements an AI-powered knowledge consolidation system.

### Key Features:
- Automated file discovery
- Smart content preview
- AI analysis integration

#### Implementation Details:

The system uses: machine learning algorithms for content analysis.

## Conclusion

The implementation is complete and ready for production use.
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(markdownContent);

            expect(preview.structure.type).toBe('markdown');
            expect(preview.structure.hasHeaders).toBe(true);
            expect(preview.segment4).toContain('The system uses:');
            expect(preview.segment5).toContain('machine learning algorithms');
        });

        test('should handle code files correctly', () => {
            const codeContent = `
/**
 * Main application controller
 */
class ApplicationController {
    constructor() {
        this.initialized = false;
    }

    async initialize() {
        // Implementation details: setup application state and configure services
        this.setupEventHandlers();
        this.loadConfiguration();
        this.initialized = true;
    }
}
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(codeContent);

            expect(preview.structure.type).toBe('code');
            expect(preview.segment4).toContain('Implementation details:');
        });

        test('should handle mixed content types', () => {
            const mixedContent = `
# Mixed Content Document

This document contains both markdown and code examples.

## Code Example:

Here's a JavaScript function:
\`\`\`javascript
function example() {
    return "Hello World";
}
\`\`\`

Analysis result: The code demonstrates basic function syntax.
            `.trim();

            const preview = PreviewUtils.extractSmartPreview(mixedContent);

            expect(preview.structure.type).toBe('markdown');
            expect(preview.structure.hasCodeBlocks).toBe(true);
            expect(preview.segment4).toContain('Analysis result:');
        });
    });
});