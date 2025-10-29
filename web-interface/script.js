// Global state
let selectedFiles = [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Show selected files
function showSelectedFiles() {
    const files = document.getElementById('fileInput').files;
    const fileList = document.getElementById('fileList');
    
    if (files.length === 0) {
        fileList.innerHTML = '';
        return;
    }
    
    fileList.innerHTML = `<p style="color: #a0aec0;"><strong>Selected files:</strong> ${files.length} file(s) ready for upload</p>`;
}

// Upload files
async function uploadFiles() {
    const files = document.getElementById('fileInput').files;
    if (files.length === 0) {
        showStatus('❌ Please select files first!', 'error');
        return;
    }

    showStatus('📤 Uploading files...', 'info');
    
    const formData = new FormData();
    for (let file of files) {
        formData.append('files', file);
    }

    try {
        const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) throw new Error('Upload failed');
        
        showStatus('✅ Files uploaded! Processing with C engine...', 'info');
        await processDocuments();
        
    } catch (error) {
        showStatus(`❌ Upload failed: ${error.message}`, 'error');
    }
}

// Process documents
async function processDocuments() {
    showStatus('⚙️ Processing documents with C engine...', 'info');
    const result = await sendCommand(2);
    parseAndDisplayResults(result);
}

// Search function
async function search() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        showStatus('❌ Please enter a search term', 'error');
        return;
    }
    
    // Add to history
    if (!searchHistory.includes(query)) {
        searchHistory.unshift(query);
        if (searchHistory.length > 5) searchHistory.pop();
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }
    
    showStatus(`🔍 Searching for: "${query}"...`, 'info');
    const result = await sendCommand(1, query);
    parseAndDisplayResults(result, query);
}

// Show history
async function showHistory() {
    showStatus('📜 Loading search history...', 'info');
    const result = await sendCommand(3);
    parseAndDisplayResults(result);
}

// Undo search
async function undoSearch() {
    showStatus('↩️ Undoing last search...', 'info');
    const result = await sendCommand(4);
    parseAndDisplayResults(result);
}

// NEW: Trace Path between keywords
async function tracePath() {
    const keyword1 = document.getElementById('pathKeyword1').value.trim();
    const keyword2 = document.getElementById('pathKeyword2').value.trim();
    
    if (!keyword1 || !keyword2) {
        showStatus('❌ Please enter both keywords for path tracing', 'error');
        return;
    }
    
    if (keyword1.toLowerCase() === keyword2.toLowerCase()) {
        showStatus('❌ Please enter two different keywords', 'error');
        return;
    }
    
    showStatus(`🔍 Tracing path from "${keyword1}" to "${keyword2}"...`, 'info');
    
    try {
        const result = await sendCommand(5, `${keyword1}|${keyword2}`);
        parsePathResults(result, keyword1, keyword2);
    } catch (error) {
        showStatus(`❌ Path tracing failed: ${error.message}`, 'error');
    }
}

// Handle Enter key
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        search();
    }
}

// Send command to server
async function sendCommand(command, input = '') {
    try {
        const response = await fetch('/api/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command, input })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        
        return result.output;
        
    } catch (error) {
        showStatus(`❌ Command failed: ${error.message}`, 'error');
        throw error;
    }
}

// NEW: Parse path tracing results
function parsePathResults(output, keyword1, keyword2) {
    const card = document.getElementById('pathResultsCard');
    const container = document.getElementById('pathResults');
    
    // Check if path was found
    const pathFound = output.includes('PATH FOUND');
    const noPathFound = output.includes('NO PATH FOUND');
    
    if (pathFound) {
        // Extract path - handle both -> and → arrows
        const pathMatch = output.match(/Path:\s*(.+?)(?:\n|$)/);
        let pathNodes = [];
        
        if (pathMatch) {
            // Split by either -> or → 
            const pathString = pathMatch[1];
            if (pathString.includes('->')) {
                pathNodes = pathString.split('->').map(node => node.trim()).filter(n => n.length > 0);
            } else if (pathString.includes('→')) {
                pathNodes = pathString.split('→').map(node => node.trim()).filter(n => n.length > 0);
            }
        }
        
        // If we still don't have nodes, try to extract from the full output
        if (pathNodes.length === 0) {
            console.log('Could not parse path, trying alternative method...');
            console.log('Full output:', output);
        }
        
        // Extract path length
        const lengthMatch = output.match(/Length:\s*(\d+)/);
        const pathLength = lengthMatch ? parseInt(lengthMatch[1]) : pathNodes.length;
        
        // Extract relationship info
        const connectionsMatch = output.match(/(\d+)\s+connection\(s\)/);
        const connections = connectionsMatch ? parseInt(connectionsMatch[1]) : pathLength - 1;
        
        // Determine connection type
        let connectionType = '';
        if (output.includes('Direct connection')) {
            connectionType = 'Direct connection (these keywords appear together)';
        } else if (output.includes('2nd degree connection')) {
            connectionType = '2nd degree connection (connected through 1 intermediate keyword)';
        } else {
            const degreeMatch = output.match(/(\d+)\s+degree connection/);
            if (degreeMatch) {
                connectionType = `${degreeMatch[1]} degree connection`;
            } else {
                connectionType = `${connections} degree connection`;
            }
        }
        
        // Display successful path
        container.innerHTML = `
            <div class="path-visualization">
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-check-circle" style="color: #48bb78; font-size: 3rem;"></i>
                    <h3 style="color: #48bb78; margin-top: 10px;">Path Found!</h3>
                </div>
                
                ${pathNodes.length > 0 ? `
                    <div class="path-chain">
                        ${pathNodes.map((node, index) => `
                            <div class="path-node">${node}</div>
                            ${index < pathNodes.length - 1 ? '<i class="fas fa-arrow-right path-arrow-icon"></i>' : ''}
                        `).join('')}
                    </div>
                ` : `
                    <div style="text-align: center; padding: 20px; color: #a0aec0;">
                        <p>Path exists but visualization unavailable.</p>
                        <p style="margin-top: 10px; font-size: 0.9em;">Check console for details.</p>
                    </div>
                `}
                
                <div class="path-info">
                    <div class="path-info-item">
                        <i class="fas fa-info-circle"></i>
                        <strong>Path Length:</strong> ${pathLength} node(s)
                    </div>
                    <div class="path-info-item">
                        <i class="fas fa-link"></i>
                        <strong>Connections:</strong> ${connections} link(s)
                    </div>
                    <div class="path-info-item">
                        <i class="fas fa-project-diagram"></i>
                        <strong>Relationship:</strong> ${connectionType}
                    </div>
                </div>
            </div>
        `;
        
        showStatus('✅ Path found successfully!', 'success');
        
    } else if (noPathFound) {
        // Display no path found
        container.innerHTML = `
            <div class="path-visualization">
                <div class="no-path-message">
                    <i class="fas fa-unlink"></i>
                    <h3 style="color: #fc8181; margin-top: 10px;">No Path Found</h3>
                    <p style="margin-top: 15px;">
                        The keywords "<strong>${keyword1}</strong>" and "<strong>${keyword2}</strong>" 
                        are not connected in the knowledge graph.
                    </p>
                    <p style="margin-top: 10px; color: #a0aec0;">
                        This could mean:
                    </p>
                    <ul style="text-align: left; display: inline-block; margin-top: 10px;">
                        <li>One or both keywords don't exist in the documents</li>
                        <li>They appear in different, unrelated contexts</li>
                        <li>They don't co-occur within the same document windows</li>
                    </ul>
                </div>
            </div>
        `;
        
        showStatus('ℹ️ No connection found between these keywords', 'info');
        
    } else {
        // Fallback for unexpected output
        container.innerHTML = `
            <div class="path-visualization">
                <div class="no-path-message">
                    <i class="fas fa-question-circle"></i>
                    <h3 style="color: #a0aec0;">Unable to determine path</h3>
                    <p style="margin-top: 15px;">Please try again or check if the keywords exist in the documents.</p>
                </div>
            </div>
        `;
        
        showStatus('⚠️ Unable to trace path. Please try again.', 'error');
    }
    
    card.style.display = 'block';
    
    // Scroll to results
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Parse C engine output and display beautifully
function parseAndDisplayResults(output, query = '') {
    hideAllResults();
    
    // Parse search results
    const searchResults = parseSearchResults(output);
    if (searchResults.documents.length > 0) {
        displaySearchResults(searchResults, query);
    }
    
    // Parse suggestions
    const suggestions = parseSuggestions(output);
    if (suggestions.length > 0) {
        displaySuggestions(suggestions);
    }
    
    // Parse related terms
    const relatedTerms = parseRelatedTerms(output);
    if (relatedTerms.length > 0) {
        displayRelatedTerms(relatedTerms);
    }
    
    // Parse history
    const history = parseHistory(output);
    if (history.length > 0) {
        displayHistory(history);
    }
    
    // Show status based on content
    if (searchResults.documents.length === 0 && !output.includes('AUTOMATED_PROCESS_COMPLETE')) {
        showStatus('🔍 No results found. Try different search terms.', 'info');
    } else if (output.includes('AUTOMATED_PROCESS_COMPLETE')) {
        showStatus('✅ Documents processed successfully! Ready for searching.', 'success');
    }
}

// Parse search results from C engine output
function parseSearchResults(output) {
    const results = {
        documents: [],
        total: 0
    };
    
    const lines = output.split('\n');
    let inResults = false;
    
    for (const line of lines) {
        if (line.includes('FOUND_IN:')) {
            const match = line.match(/FOUND_IN:\s*(\d+)\s*documents/);
            if (match) results.total = parseInt(match[1]);
        }
        
        if (line.includes('RESULT:')) {
            const match = line.match(/RESULT:\s*(\d+)\.\s+([^(]+)\s+\(frequency:\s*(\d+)\)/i);
            if (match) {
                results.documents.push({
                    rank: parseInt(match[1]),
                    name: match[2].trim(),
                    frequency: parseInt(match[3])
                });
            }
        }
    }
    
    return results;
}

// Parse suggestions from C engine output
function parseSuggestions(output) {
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('SUGGESTIONS:')) {
            const suggestionsPart = line.split(':')[1]?.trim();
            if (suggestionsPart) {
                return suggestionsPart.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
        }
    }
    return [];
}

// Parse related terms from C engine output
function parseRelatedTerms(output) {
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('RELATED:')) {
            const relatedPart = line.split(':')[1]?.trim();
            if (relatedPart) {
                return relatedPart.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
        }
    }
    return [];
}

// Parse history from C engine output
function parseHistory(output) {
    const lines = output.split('\n');
    for (const line of lines) {
        if (line.includes('HISTORY:')) {
            const historyPart = line.split(':')[1]?.trim();
            if (historyPart) {
                return historyPart.split('→').map(s => s.trim()).filter(s => s.length > 0);
            }
        }
    }
    return searchHistory; // Fallback to local history
}

// Display search results
function displaySearchResults(results, query) {
    const card = document.getElementById('searchResultsCard');
    const container = document.getElementById('searchResults');
    const count = document.getElementById('resultsCount');
    
    count.textContent = `${results.total} documents`;
    
    if (results.documents.length === 0) {
        container.innerHTML = '<div class="status-message status-info">No documents found matching your search.</div>';
    } else {
        container.innerHTML = results.documents.map(doc => `
            <div class="document-card">
                <div class="document-header">
                    <div class="document-name">
                        <i class="fas fa-file-alt"></i>
                        ${doc.name}
                    </div>
                    <div class="document-stats">
                        <span class="badge badge-rank">Rank #${doc.rank}</span>
                        <span class="badge badge-frequency">${doc.frequency} matches</span>
                    </div>
                </div>
                <div class="relevance-bar">
                    <div class="relevance-fill" style="width: ${Math.min(doc.frequency * 10, 100)}%"></div>
                </div>
            </div>
        `).join('');
    }
    
    card.style.display = 'block';
}

// Display suggestions
function displaySuggestions(suggestions) {
    const card = document.getElementById('suggestionsCard');
    const container = document.getElementById('suggestionsList');
    
    container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-chip" onclick="document.getElementById('searchInput').value = '${suggestion}'; search()">
            ${suggestion}
        </div>
    `).join('');
    
    card.style.display = 'block';
}

// Display related terms
function displayRelatedTerms(terms) {
    const card = document.getElementById('relatedTermsCard');
    const container = document.getElementById('relatedTermsList');
    
    container.innerHTML = terms.map(term => `
        <div class="related-term" onclick="document.getElementById('searchInput').value = '${term}'; search()">
            ${term}
        </div>
    `).join('');
    
    card.style.display = 'block';
}

// Display history
function displayHistory(history) {
    const card = document.getElementById('historyCard');
    const container = document.getElementById('historyList');
    
    container.innerHTML = history.map((term, index) => `
        <div class="history-item" onclick="document.getElementById('searchInput').value = '${term}'; search()">
            <div class="history-number">${index + 1}</div>
            <span class="history-term">${term}</span>
            <i class="fas fa-search" style="margin-left: auto; color: #a0aec0;"></i>
        </div>
    `).join('');
    
    card.style.display = 'block';
}

// Hide all result sections
function hideAllResults() {
    document.querySelectorAll('.results-container').forEach(el => {
        el.style.display = 'none';
    });
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    showStatus('🎉 System ready! Upload documents or start searching.', 'success');
});