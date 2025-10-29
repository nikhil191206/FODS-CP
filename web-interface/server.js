const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const url = require('url');

const PORT = 3000;
const DOCUMENTS_DIR = path.join(__dirname, '..', 'documents');

// Ensure documents directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    console.log(`📨 ${req.method} ${pathname}`);

    // API routes
    if (pathname === '/api/upload' && req.method === 'POST') {
        await handleUpload(req, res);
    } else if (pathname === '/api/command' && req.method === 'POST') {
        await handleCommand(req, res);
    } else {
        serveStaticFile(req, res);
    }
});

// Serve static files (HTML, CSS, JS)
function serveStaticFile(req, res) {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Handle file upload - REAL FILE SAVING
async function handleUpload(req, res) {
    console.log('📥 Handling file upload...');
    
    try {
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
            throw new Error('No boundary in content-type');
        }

        let body = Buffer.from('');
        req.on('data', chunk => {
            body = Buffer.concat([body, chunk]);
        });
        
        await new Promise((resolve, reject) => {
            req.on('end', resolve);
            req.on('error', reject);
        });

        const files = parseMultipartFormData(body, boundary);
        console.log(`📄 Found ${files.length} files to save`);

        const savedFiles = [];
        
        for (const file of files) {
            if (file.filename && file.data) {
                const filePath = path.join(DOCUMENTS_DIR, file.filename);
                fs.writeFileSync(filePath, file.data);
                console.log(`💾 Saved: ${file.filename} (${file.data.length} bytes)`);
                savedFiles.push({
                    filename: file.filename,
                    size: file.data.length,
                    path: filePath
                });
            }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: `Successfully uploaded ${savedFiles.length} files`,
            files: savedFiles
        }));

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'Upload failed: ' + error.message
        }));
    }
}

// Parse multipart form data
function parseMultipartFormData(body, boundary) {
    const files = [];
    const parts = body.toString().split('--' + boundary);
    
    for (const part of parts) {
        if (part.includes('Content-Disposition: form-data') && part.includes('filename=')) {
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd !== -1) {
                const headers = part.substring(0, headerEnd);
                const data = part.substring(headerEnd + 4, part.length - 2);
                
                const filenameMatch = headers.match(/filename="([^"]+)"/);
                if (filenameMatch && data.length > 0) {
                    files.push({
                        filename: filenameMatch[1],
                        data: Buffer.from(data)
                    });
                }
            }
        }
    }
    
    return files;
}

// Handle ALL commands for the C engine (Search, Process, History, Undo, Path Tracing)
async function handleCommand(req, res) {
    try {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        
        await new Promise((resolve, reject) => {
            req.on('end', resolve);
            req.on('error', reject);
        });

        const { command, input } = JSON.parse(body);
        console.log(`🎯 Command: ${command}, Input: "${input}"`);

        const cEnginePath = path.join(__dirname, '..', 'c-engine', 'search_engine.exe');
        
        // Check if C engine exists
        if (!fs.existsSync(cEnginePath)) {
            throw new Error('C Engine not found. Please compile search_engine.exe first.');
        }

        const result = await new Promise((resolve, reject) => {
            const child = spawn(cEnginePath, [], {
                cwd: path.join(__dirname, '..', 'c-engine'),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log('📄', text);
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                console.error('❌', text);
            });

            // Prepare command string based on command type
            let commandString = '';
            
            if (command === 1 && input) {
                // Search: 1 → search term → 6
                commandString = `1\n${input}\n6\n`;
                console.log(`📤 Search: "${input}"`);
            } else if (command === 2) {
                // Process Documents: 2 → 6
                commandString = `2\n6\n`;
                console.log(`📤 Process documents`);
            } else if (command === 3) {
                // Show History: 3 → 6
                commandString = `3\n6\n`;
                console.log(`📤 Show history`);
            } else if (command === 4) {
                // Undo: 4 → 6
                commandString = `4\n6\n`;
                console.log(`📤 Undo`);
            } else if (command === 5 && input) {
                // Path Tracing: 5 → keyword1 → keyword2 → 6
                const keywords = input.split('|');
                if (keywords.length !== 2) {
                    child.kill();
                    reject(new Error('Invalid path tracing input'));
                    return;
                }
                commandString = `5\n${keywords[0].trim()}\n${keywords[1].trim()}\n6\n`;
                console.log(`📤 Path trace: "${keywords[0]}" → "${keywords[1]}"`);
            } else {
                child.kill();
                reject(new Error('Invalid command'));
                return;
            }

            // Send commands after a short delay for initialization
            setTimeout(() => {
                console.log('✅ Sending commands now...');
                child.stdin.write(commandString);
            }, 2000); // Wait 2 seconds for C engine to initialize and show menu

            // Close stdin after commands are sent
            setTimeout(() => {
                child.stdin.end();
                console.log('🔒 stdin closed');
            }, 2500);

            child.on('close', (code) => {
                console.log(`🔚 Exit code: ${code}, Output: ${output.length} chars`);
                resolve({ output });
            });

            child.on('error', (error) => {
                console.error('💥 Spawn error:', error);
                reject(error);
            });

            // Timeout after 30 seconds (increased for document processing)
            setTimeout(() => {
                if (!child.killed) {
                    console.log('⏱️ Timeout - killing process');
                    child.kill();
                    resolve({ output: output || 'Timeout - no output' });
                }
            }, 30000);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            output: result.output
        }));

    } catch (error) {
        console.error('❌ Command error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
}

// Start server
server.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Knowledge Graph Search System`);
    console.log(`${'='.repeat(60)}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📁 Docs: ${DOCUMENTS_DIR}`);
    console.log(`🔧 Engine: search_engine.exe`);
    console.log(`${'='.repeat(60)}\n`);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});