// Simple HTTP server for KC V2
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`404 - File not found: ${req.url}`, 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`   KC V2 Server Running`);
    console.log(`   Root: ${ROOT}`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Press Ctrl+C to stop`);
    console.log(`========================================\n`);
    
    // List some key files to verify
    const checkFiles = ['index.html', 'js/core/EventBus.js', 'js/app.js'];
    checkFiles.forEach(file => {
        const exists = fs.existsSync(path.join(ROOT, file));
        console.log(`${exists ? '✅' : '❌'} ${file}`);
    });
});

// Open browser automatically
const { exec } = require('child_process');
exec(`start http://localhost:${PORT}`);