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
            let commandsSent = false;

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log('📄 C Engine:', text.trim());
                
                // Send commands after we see the menu (to avoid timing issues)
                if (!commandsSent && text.includes('Choose an option:')) {
                    commandsSent = true;
                    sendCommandSequence();
                }
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                console.error('❌ C Engine Error:', text.trim());
            });

            // Send command sequence based on what user clicked
            const sendCommandSequence = () => {
                if (command === 1 && input) {
                    // Search: 1 → search term → 6 (exit)
                    console.log(`📤 Sending search command for: "${input}"`);
                    child.stdin.write('1\n');
                    setTimeout(() => child.stdin.write(input + '\n'), 100);
                    setTimeout(() => child.stdin.write('6\n'), 500);
                    setTimeout(() => child.stdin.end(), 800);
                } else if (command === 2) {
                    // Process Documents: 2 → 6 (exit)
                    console.log(`📤 Sending process documents command`);
                    child.stdin.write('2\n');
                    setTimeout(() => child.stdin.write('6\n'), 2000); // Wait longer for processing
                    setTimeout(() => child.stdin.end(), 2500);
                } else if (command === 3) {
                    // Show History: 3 → 6 (exit)
                    console.log(`📤 Sending show history command`);
                    child.stdin.write('3\n');
                    setTimeout(() => child.stdin.write('6\n'), 300);
                    setTimeout(() => child.stdin.end(), 600);
                } else if (command === 4) {
                    // Undo Search: 4 → 6 (exit)
                    console.log(`📤 Sending undo command`);
                    child.stdin.write('4\n');
                    setTimeout(() => child.stdin.write('6\n'), 300);
                    setTimeout(() => child.stdin.end(), 600);
                } else if (command === 5 && input) {
                    // NEW: Path Tracing: 5 → keyword1 → keyword2 → 6 (exit)
                    const keywords = input.split('|');
                    if (keywords.length !== 2) {
                        child.kill();
                        reject(new Error('Invalid path tracing input. Expected format: keyword1|keyword2'));
                        return;
                    }
                    
                    console.log(`📤 Tracing path: "${keywords[0]}" → "${keywords[1]}"`);
                    child.stdin.write('5\n');
                    setTimeout(() => child.stdin.write(keywords[0].trim() + '\n'), 200);
                    setTimeout(() => child.stdin.write(keywords[1].trim() + '\n'), 400);
                    setTimeout(() => child.stdin.write('6\n'), 800);
                    setTimeout(() => child.stdin.end(), 1100);
                } else {
                    child.kill();
                    reject(new Error('Invalid command'));
                    return;
                }
            };

            child.on('close', (code) => {
                console.log(`🔚 C Engine exited with code ${code}`);
                resolve({ output });
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to start C Engine: ${error.message}`));
            });

            // Timeout after 15 seconds
            setTimeout(() => {
                if (!child.killed) {
                    console.log('⏱️ C Engine timeout - forcing exit');
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            child.kill('SIGKILL');
                        }
                    }, 1000);
                    resolve({ output }); // Resolve with whatever output we have
                }
            }, 15000);
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
    console.log(`\n📋 Available Commands:`);
    console.log(`   1. Search keyword`);
    console.log(`   2. Process documents`);
    console.log(`   3. Show history`);
    console.log(`   4. Undo search`);
    console.log(`   5. Trace path between keywords (NEW!)`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});