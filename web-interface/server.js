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

// Handle ALL commands for the C engine (Search, Process, History, Undo)
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
                console.log('📄 C Engine:', text.trim());
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                console.error('❌ C Engine Error:', text.trim());
            });

            // Send commands to C engine (simulate user input)
            const sendCommand = (cmd, delay = 100) => {
                setTimeout(() => {
                    child.stdin.write(cmd + '\n');
                    console.log(`📤 Sent to C engine: ${cmd}`);
                }, delay);
            };

            // Command sequence based on what user clicked
            if (command === 1 && input) {
                // Search: 1 → search term → 5 (exit)
                sendCommand('1');
                sendCommand(input, 200);
                sendCommand('5', 300);
            } else if (command === 2) {
                // Process Documents: 2 → 5 (exit)
                sendCommand('2');
                sendCommand('5', 200);
            } else if (command === 3) {
                // Show History: 3 → 5 (exit)
                sendCommand('3');
                sendCommand('5', 200);
            } else if (command === 4) {
                // Undo Search: 4 → 5 (exit)
                sendCommand('4');
                sendCommand('5', 200);
            } else {
                reject(new Error('Invalid command'));
                return;
            }

            // End stdin after sending commands
            setTimeout(() => {
                child.stdin.end();
            }, 500);

            child.on('close', (code) => {
                console.log(`🔚 C Engine exited with code ${code}`);
                if (code === 0) {
                    resolve({ output });
                } else {
                    reject(new Error(`C Engine failed: ${errorOutput || 'Unknown error'}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to start C Engine: ${error.message}`));
            });
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
            error: 'Command failed: ' + error.message
        }));
    }
}

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Knowledge Graph Search System running at http://localhost:${PORT}`);
    console.log(`📁 Documents directory: ${DOCUMENTS_DIR}`);
    console.log(`🔧 C Engine path: ${path.join(__dirname, '..', 'c-engine', 'search_engine.exe')}`);
    console.log(`💡 Upload .txt files and use the buttons to interact with C engine`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});