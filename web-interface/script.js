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