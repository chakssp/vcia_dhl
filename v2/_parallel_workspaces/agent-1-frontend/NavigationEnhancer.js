/**
 * NavigationEnhancer.js
 * Advanced routing enhancements for NavigationController
 * Agent-1 Implementation - Started: 2025-08-02T00:01:00Z
 */

import { EventBus, Events } from '../../core/EventBus.js';
import { AppState } from '../../core/AppState.js';

export class NavigationEnhancer {
    constructor(navigationController) {
        this.nav = navigationController;
        this.routeHistory = [];
        this.bookmarks = new Map();
        this.shortcuts = new Map();
        
        this.initializeEnhancements();
    }

    initializeEnhancements() {
        // Advanced routing with history
        this.setupRouteHistory();
        
        // Bookmark management
        this.setupBookmarks();
        
        // Dynamic route generation
        this.setupDynamicRoutes();
        
        // Route guards and middleware
        this.setupRouteGuards();
    }

    setupRouteHistory() {
        // Track navigation history
        EventBus.on(Events.ROUTE_CHANGED, (data) => {
            this.routeHistory.push({
                route: data.route,
                timestamp: Date.now(),
                params: data.params
            });
            
            // Limit history size
            if (this.routeHistory.length > 50) {
                this.routeHistory.shift();
            }
        });
    }

    setupBookmarks() {
        // Load bookmarks from AppState
        const saved = AppState.get('navigationBookmarks') || {};
        Object.entries(saved).forEach(([name, route]) => {
            this.bookmarks.set(name, route);
        });
    }

    setupDynamicRoutes() {
        // Generate routes based on discovered content
        EventBus.on(Events.FILES_DISCOVERED, (data) => {
            data.files.forEach(file => {
                const route = `/file/${file.id}`;
                this.nav.registerRoute(route, () => {
                    EventBus.emit(Events.OPEN_FILE, { file });
                });
            });
        });
    }

    setupRouteGuards() {
        // Add authentication/validation guards
        this.nav.beforeRoute((route) => {
            // Check if route requires authentication
            if (route.startsWith('/admin') && !AppState.get('isAuthenticated')) {
                EventBus.emit(Events.SHOW_LOGIN);
                return false;
            }
            return true;
        });
    }

    // Navigate back in history
    goBack() {
        if (this.routeHistory.length > 1) {
            this.routeHistory.pop(); // Remove current
            const previous = this.routeHistory[this.routeHistory.length - 1];
            this.nav.navigate(previous.route, previous.params);
        }
    }

    // Bookmark management
    addBookmark(name, route = null) {
        const targetRoute = route || this.nav.currentRoute;
        this.bookmarks.set(name, targetRoute);
        this.saveBookmarks();
    }

    removeBookmark(name) {
        this.bookmarks.delete(name);
        this.saveBookmarks();
    }

    navigateToBookmark(name) {
        const route = this.bookmarks.get(name);
        if (route) {
            this.nav.navigate(route);
        }
    }

    saveBookmarks() {
        const bookmarksObj = Object.fromEntries(this.bookmarks);
        AppState.set('navigationBookmarks', bookmarksObj);
    }

    // Get navigation analytics
    getNavigationStats() {
        const routeCounts = {};
        this.routeHistory.forEach(entry => {
            routeCounts[entry.route] = (routeCounts[entry.route] || 0) + 1;
        });
        
        return {
            totalNavigations: this.routeHistory.length,
            uniqueRoutes: Object.keys(routeCounts).length,
            mostVisited: Object.entries(routeCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5),
            bookmarksCount: this.bookmarks.size
        };
    }
}

// Export for integration
export default NavigationEnhancer;