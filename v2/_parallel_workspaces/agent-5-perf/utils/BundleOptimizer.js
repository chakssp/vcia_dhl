/**
 * BundleOptimizer.js
 * 
 * Webpack/Vite optimization strategies for Knowledge Consolidator V2
 * Implements code splitting, tree shaking, and bundle analysis
 * 
 * Performance targets:
 * - Initial bundle < 50KB
 * - Lazy chunks < 30KB each
 * - Total bundle < 200KB
 */

export class BundleOptimizer {
  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'production',
      targetBundleSize: config.targetBundleSize || 50000, // 50KB
      chunkSizeLimit: config.chunkSizeLimit || 30000, // 30KB
      enableTreeShaking: config.enableTreeShaking !== false,
      enableMinification: config.enableMinification !== false,
      enableSourceMaps: config.enableSourceMaps || false,
      publicPath: config.publicPath || '/v2/dist/',
      ...config
    };

    this.bundleStats = {
      totalSize: 0,
      chunks: new Map(),
      modules: new Map(),
      warnings: []
    };
  }

  /**
   * Generate Webpack configuration optimized for V2
   */
  generateWebpackConfig() {
    return {
      mode: this.config.mode,
      entry: {
        main: './v2/js/power-app.js',
        // Separate vendor bundle
        vendor: ['./v2/js/keyboard-manager.js', './v2/js/command-palette.js']
      },
      output: {
        path: '/dist',
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
        publicPath: this.config.publicPath,
        clean: true
      },
      optimization: this.getOptimizationConfig(),
      module: {
        rules: this.getModuleRules()
      },
      plugins: this.getPlugins(),
      resolve: {
        alias: {
          '@': './v2/js',
          '@utils': './v2/js/utils',
          '@components': './v2/js/components',
          '@services': './v2/js/services'
        }
      },
      performance: {
        hints: 'warning',
        maxEntrypointSize: this.config.targetBundleSize,
        maxAssetSize: this.config.chunkSizeLimit
      }
    };
  }

  /**
   * Generate Vite configuration optimized for V2
   */
  generateViteConfig() {
    return {
      root: './v2',
      base: this.config.publicPath,
      build: {
        target: 'es2020',
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: this.config.enableSourceMaps,
        minify: this.config.enableMinification ? 'terser' : false,
        terserOptions: {
          compress: {
            drop_console: this.config.mode === 'production',
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info']
          }
        },
        rollupOptions: {
          input: {
            main: './v2/index.html'
          },
          output: {
            manualChunks: this.getManualChunks(),
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          }
        },
        chunkSizeWarningLimit: this.config.chunkSizeLimit / 1000 // KB
      },
      optimizeDeps: {
        include: [],
        exclude: ['@services/PostgreSQLService']
      }
    };
  }

  /**
   * Webpack optimization configuration
   */
  getOptimizationConfig() {
    return {
      usedExports: this.config.enableTreeShaking,
      minimize: this.config.enableMinification,
      sideEffects: false,
      splitChunks: {
        chunks: 'all',
        minSize: 10000,
        maxSize: this.config.chunkSizeLimit,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10,
            reuseExistingChunk: true
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          },
          // Separate large components
          heavyComponents: {
            test: /[\\/](GraphVisualization|AnalysisEngine|FileProcessor)\.js$/,
            name: 'heavy',
            priority: 20,
            enforce: true
          }
        }
      },
      runtimeChunk: 'single',
      moduleIds: 'deterministic'
    };
  }

  /**
   * Define manual chunks for Vite
   */
  getManualChunks() {
    return (id) => {
      // Vendor chunks
      if (id.includes('node_modules')) {
        return 'vendor';
      }
      
      // Service chunks
      if (id.includes('/services/')) {
        return 'services';
      }
      
      // Component chunks
      if (id.includes('/components/')) {
        return 'components';
      }
      
      // Utils chunks
      if (id.includes('/utils/')) {
        return 'utils';
      }
    };
  }

  /**
   * Module rules for webpack
   */
  getModuleRules() {
    return [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false,
                targets: '> 0.25%, not dead',
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties',
              ['@babel/plugin-transform-runtime', { regenerator: true }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              importLoaders: 1
            }
          },
          'postcss-loader'
        ]
      }
    ];
  }

  /**
   * Webpack plugins
   */
  getPlugins() {
    const plugins = [];

    // Bundle analyzer in development
    if (this.config.mode === 'development') {
      plugins.push({
        apply: (compiler) => {
          compiler.hooks.done.tap('BundleAnalyzer', (stats) => {
            this.analyzeBundleStats(stats);
          });
        }
      });
    }

    // Production optimizations
    if (this.config.mode === 'production') {
      plugins.push(
        // Preload critical chunks
        {
          apply: (compiler) => {
            compiler.hooks.compilation.tap('PreloadPlugin', (compilation) => {
              compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync(
                'PreloadPlugin',
                (data, cb) => {
                  data.head.push({
                    tagName: 'link',
                    attributes: {
                      rel: 'preload',
                      href: data.assets.js[0],
                      as: 'script'
                    }
                  });
                  cb(null, data);
                }
              );
            });
          }
        }
      );
    }

    return plugins;
  }

  /**
   * Analyze bundle statistics
   */
  analyzeBundleStats(stats) {
    const statsJson = stats.toJson({
      all: false,
      chunks: true,
      modules: true,
      assets: true,
      warnings: true
    });

    // Reset stats
    this.bundleStats.totalSize = 0;
    this.bundleStats.chunks.clear();
    this.bundleStats.modules.clear();
    this.bundleStats.warnings = statsJson.warnings || [];

    // Analyze chunks
    statsJson.chunks.forEach(chunk => {
      const chunkSize = chunk.size;
      this.bundleStats.chunks.set(chunk.names[0], {
        size: chunkSize,
        modules: chunk.modules ? chunk.modules.length : 0,
        initial: chunk.initial
      });
      this.bundleStats.totalSize += chunkSize;
    });

    // Analyze modules
    if (statsJson.modules) {
      statsJson.modules.forEach(module => {
        this.bundleStats.modules.set(module.name, {
          size: module.size,
          chunks: module.chunks
        });
      });
    }

    // Check for oversized bundles
    this.checkBundleSizes();
  }

  /**
   * Check bundle sizes and emit warnings
   */
  checkBundleSizes() {
    const oversizedChunks = [];
    
    this.bundleStats.chunks.forEach((chunk, name) => {
      if (chunk.initial && chunk.size > this.config.targetBundleSize) {
        oversizedChunks.push({
          name,
          size: chunk.size,
          overBy: chunk.size - this.config.targetBundleSize
        });
      }
    });

    if (oversizedChunks.length > 0) {
      console.warn('⚠️ Oversized chunks detected:', oversizedChunks);
      this.suggestOptimizations(oversizedChunks);
    }
  }

  /**
   * Suggest optimizations for oversized bundles
   */
  suggestOptimizations(oversizedChunks) {
    const suggestions = [];

    oversizedChunks.forEach(chunk => {
      if (chunk.name === 'main') {
        suggestions.push('Consider lazy loading non-critical components');
        suggestions.push('Move large dependencies to separate chunks');
      }
      
      if (chunk.name === 'vendor') {
        suggestions.push('Analyze vendor dependencies for tree-shaking opportunities');
        suggestions.push('Consider using CDN for large libraries');
      }
    });

    // Find large modules
    const largeModules = [];
    this.bundleStats.modules.forEach((module, name) => {
      if (module.size > 10000) { // 10KB
        largeModules.push({ name, size: module.size });
      }
    });

    if (largeModules.length > 0) {
      suggestions.push(`Large modules found: ${largeModules.map(m => m.name).join(', ')}`);
    }

    console.log('📦 Optimization suggestions:', suggestions);
    return suggestions;
  }

  /**
   * Generate dynamic imports for code splitting
   */
  generateDynamicImports(routes) {
    const imports = {};
    
    routes.forEach(route => {
      imports[route.name] = `() => import(/* webpackChunkName: "${route.name}" */ '${route.path}')`;
    });

    return imports;
  }

  /**
   * Get bundle report
   */
  getBundleReport() {
    const report = {
      totalSize: this.bundleStats.totalSize,
      totalSizeFormatted: this.formatBytes(this.bundleStats.totalSize),
      chunks: [],
      largestModules: [],
      warnings: this.bundleStats.warnings,
      optimizationSuggestions: []
    };

    // Add chunk info
    this.bundleStats.chunks.forEach((chunk, name) => {
      report.chunks.push({
        name,
        size: chunk.size,
        sizeFormatted: this.formatBytes(chunk.size),
        modules: chunk.modules,
        initial: chunk.initial
      });
    });

    // Find largest modules
    const sortedModules = Array.from(this.bundleStats.modules.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10);
    
    report.largestModules = sortedModules.map(([name, data]) => ({
      name,
      size: data.size,
      sizeFormatted: this.formatBytes(data.size)
    }));

    return report;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Enable webpack bundle analyzer
   */
  enableBundleAnalyzer() {
    return {
      analyzerMode: this.config.mode === 'production' ? 'static' : 'server',
      reportFilename: 'bundle-report.html',
      openAnalyzer: this.config.mode === 'development',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json'
    };
  }
}

// Export singleton instance
export default new BundleOptimizer();