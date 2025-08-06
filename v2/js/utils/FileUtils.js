/**
 * FileUtils.js - File utility functions for V2
 * 
 * Provides common file operations and utilities
 */

export const fileUtils = {
    /**
     * Get file extension
     */
    getFileExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    /**
     * Get file type category
     */
    getFileType(filename) {
        const ext = this.getFileExtension(filename);
        const typeMap = {
            // Documents
            'md': 'markdown',
            'txt': 'text',
            'doc': 'word',
            'docx': 'word',
            'pdf': 'pdf',
            'gdoc': 'gdoc',
            
            // Code
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'h': 'header',
            'css': 'css',
            'html': 'html',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            
            // Images
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image',
            'svg': 'image',
            'bmp': 'image',
            
            // Archives
            'zip': 'archive',
            'rar': 'archive',
            'tar': 'archive',
            'gz': 'archive',
            '7z': 'archive'
        };
        
        return typeMap[ext] || 'other';
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get file size category
     */
    getFileSizeCategory(bytes) {
        if (!bytes) return 'unknown';
        
        const KB = 1024;
        const MB = KB * 1024;
        
        if (bytes < 50 * KB) return 'small';
        if (bytes < 500 * KB) return 'medium';
        return 'large';
    },

    /**
     * Validate file name
     */
    isValidFileName(name) {
        if (!name || typeof name !== 'string') return false;
        
        // Check for invalid characters
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(name)) return false;
        
        // Check for reserved names
        const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                         'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                         'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        
        const nameWithoutExt = name.split('.')[0].toUpperCase();
        if (reserved.includes(nameWithoutExt)) return false;
        
        return true;
    },

    /**
     * Sanitize file name
     */
    sanitizeFileName(name) {
        if (!name) return 'untitled';
        
        // Replace invalid characters
        let sanitized = name.replace(/[<>:"|?*]/g, '_');
        
        // Remove leading/trailing spaces and dots
        sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');
        
        // If empty after sanitization, return default
        return sanitized || 'untitled';
    },

    /**
     * Generate unique file ID
     */
    generateFileId(file) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const name = file.name || 'unknown';
        return `file_${timestamp}_${random}_${name.replace(/[^a-zA-Z0-9]/g, '')}`;
    },

    /**
     * Check if file is text-based
     */
    isTextFile(filename) {
        const textExtensions = [
            'txt', 'md', 'markdown', 'json', 'js', 'ts', 'jsx', 'tsx',
            'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'yaml', 
            'yml', 'ini', 'cfg', 'conf', 'log', 'csv', 'tsv', 'sql',
            'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'py',
            'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
            'php', 'lua', 'r', 'swift', 'kt', 'scala', 'clj', 'ex', 'exs'
        ];
        
        const ext = this.getFileExtension(filename);
        return textExtensions.includes(ext);
    },

    /**
     * Get file icon
     */
    getFileIcon(filename) {
        const type = this.getFileType(filename);
        const iconMap = {
            'markdown': '📝',
            'text': '📄',
            'word': '📘',
            'pdf': '📕',
            'gdoc': '📗',
            'javascript': '🟨',
            'typescript': '🟦',
            'python': '🐍',
            'java': '☕',
            'html': '🌐',
            'css': '🎨',
            'json': '📊',
            'image': '🖼️',
            'archive': '📦',
            'other': '📄'
        };
        
        return iconMap[type] || '📄';
    },

    /**
     * Sort files by property
     */
    sortFiles(files, sortBy = 'name', order = 'asc') {
        const sorted = [...files].sort((a, b) => {
            let aVal, bVal;
            
            switch (sortBy) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                case 'size':
                    aVal = a.size || 0;
                    bVal = b.size || 0;
                    break;
                case 'date':
                    aVal = new Date(a.lastModified || 0).getTime();
                    bVal = new Date(b.lastModified || 0).getTime();
                    break;
                case 'relevance':
                    aVal = a.relevanceScore || 0;
                    bVal = b.relevanceScore || 0;
                    break;
                default:
                    return 0;
            }
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }
};

export default fileUtils;