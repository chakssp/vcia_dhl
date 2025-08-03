/**
 * CommandPaletteIntegration.js
 * Integrates CommandPalette with navigation system
 * Agent-1 Implementation - Started: 2025-08-02T00:01:15Z
 */

import { CommandPalette } from '../../components/CommandPalette.js';
import { EventBus, Events } from '../../core/EventBus.js';

export class CommandPaletteIntegration {
    constructor(navigationController) {
        this.nav = navigationController;
        this.commandPalette = new CommandPalette();
        this.setupNavigationCommands();
    }

    setupNavigationCommands() {
        // Register navigation commands
        this.registerCommand('Go to Discovery', 'nav:discovery', () => {
            this.nav.navigate('/discovery');
        });

        this.registerCommand('Go to Analysis', 'nav:analysis', () => {
            this.nav.navigate('/analysis');
        });

        this.registerCommand('Go to Organization', 'nav:organization', () => {
            this.nav.navigate('/organization');
        });

        this.registerCommand('Go to Settings', 'nav:settings', () => {
            this.nav.navigate('/settings');
        });

        // Quick navigation commands
        this.registerCommand('Back', 'nav:back', () => {
            EventBus.emit(Events.NAVIGATE_BACK);
        });

        this.registerCommand('Forward', 'nav:forward', () => {
            EventBus.emit(Events.NAVIGATE_FORWARD);
        });

        // File navigation
        this.registerCommand('Open File...', 'file:open', async () => {
            const files = await this.getRecentFiles();
            const selected = await this.commandPalette.showQuickPick(files, {
                placeholder: 'Select a file to open'
            });
            if (selected) {
                this.nav.navigate(`/file/${selected.id}`);
            }
        });

        // Bookmark commands
        this.registerCommand('Add Bookmark', 'bookmark:add', async () => {
            const name = await this.commandPalette.showInputBox({
                placeholder: 'Enter bookmark name',
                value: document.title
            });
            if (name) {
                EventBus.emit(Events.ADD_BOOKMARK, { name });
            }
        });

        this.registerCommand('Go to Bookmark...', 'bookmark:goto', async () => {
            const bookmarks = await this.getBookmarks();
            const selected = await this.commandPalette.showQuickPick(bookmarks, {
                placeholder: 'Select bookmark'
            });
            if (selected) {
                EventBus.emit(Events.NAVIGATE_TO_BOOKMARK, { name: selected.label });
            }
        });

        // Search commands
        this.registerCommand('Search Files', 'search:files', () => {
            this.commandPalette.show({
                mode: 'search',
                placeholder: 'Search files by name or content...'
            });
        });

        // View commands
        this.registerCommand('Toggle Sidebar', 'view:toggle-sidebar', () => {
            EventBus.emit(Events.TOGGLE_SIDEBAR);
        });

        this.registerCommand('Toggle Terminal', 'view:toggle-terminal', () => {
            EventBus.emit(Events.TOGGLE_TERMINAL);
        });

        this.registerCommand('Focus Terminal', 'terminal:focus', () => {
            EventBus.emit(Events.FOCUS_TERMINAL);
        });
    }

    registerCommand(title, id, handler) {
        this.commandPalette.registerCommand({
            id,
            title,
            handler,
            category: this.getCategoryFromId(id)
        });
    }

    getCategoryFromId(id) {
        const [category] = id.split(':');
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    async getRecentFiles() {
        const files = AppState.get('files') || [];
        return files
            .filter(f => f.analyzed)
            .sort((a, b) => b.lastModified - a.lastModified)
            .slice(0, 10)
            .map(f => ({
                id: f.id,
                label: f.name,
                description: f.path,
                icon: '📄'
            }));
    }

    async getBookmarks() {
        const bookmarks = AppState.get('navigationBookmarks') || {};
        return Object.entries(bookmarks).map(([name, route]) => ({
            label: name,
            description: route,
            icon: '🔖'
        }));
    }

    // Show command palette with navigation context
    show() {
        this.commandPalette.show({
            placeholder: 'Type a command or search...',
            value: '>'
        });
    }
}

export default CommandPaletteIntegration;