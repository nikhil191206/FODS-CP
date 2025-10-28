#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <dirent.h>
#include <sys/stat.h>
#include "trie.h"
#include "hash_table.h"
#include "graph.h"
#include "queue.h"
#include "stack.h"
#include "tokenizer.h"

// Global data structures
TrieNode* trie;
HashTable* hashTable;
Graph* graph;
Queue* searchHistory;
Stack* undoStack;
Stack* redoStack;

// Windows-compatible function to check if a file is regular file
int isRegularFile(const char* path) {
    struct stat path_stat;
    if (stat(path, &path_stat) != 0) {
        return 0;
    }
    return S_ISREG(path_stat.st_mode);
}

void initializeSystem() {
    printf("Initializing Knowledge Graph Search System...\n");
    trie = createTrieNode();
    hashTable = createHashTable();
    graph = createGraph();
    searchHistory = createQueue();
    undoStack = createStack();
    redoStack = createStack();
    printf("System initialized successfully!\n");
}

void processDocument(const char* filename) {
    char tokens[1000][MAX_WORD_LENGTH];
    int tokenCount = 0;
    
    printf("Processing document: %s\n", filename);
    
    if (tokenizeFile(filename, tokens, &tokenCount)) {
        // Add tokens to Trie and build co-occurrence graph
        for (int i = 0; i < tokenCount; i++) {
            // Insert into Trie
            insertTrie(trie, tokens[i]);
            
            // Insert into Hash Table
            insertHashTable(hashTable, tokens[i], filename, 1);
            
            // Build graph edges for co-occurring words (within window of 3)
            for (int j = i + 1; j < i + 4 && j < tokenCount; j++) {
                addEdge(graph, tokens[i], tokens[j]);
            }
        }
        printf("  Added %d tokens from %s\n", tokenCount, filename);
    }
}

void processAllDocuments(const char* directoryPath) {
    DIR* dir;
    struct dirent* entry;
    
    dir = opendir(directoryPath);
    if (dir == NULL) {
        printf("Error: Cannot open directory %s\n", directoryPath);
        return;
    }
    
    printf("\n=== PROCESSING DOCUMENTS FROM: %s ===\n", directoryPath);
    
    int fileCount = 0;
    while ((entry = readdir(dir)) != NULL) {
        char filepath[256];
        snprintf(filepath, sizeof(filepath), "%s/%s", directoryPath, entry->d_name);
        
        // Use Windows-compatible file type check
        if (isRegularFile(filepath)) {
            if (strstr(entry->d_name, ".txt") != NULL) {
                processDocument(filepath);
                fileCount++;
            }
        }
    }
    
    closedir(dir);
    printf("=== PROCESSED %d DOCUMENTS ===\n\n", fileCount);
}

void searchKeywordForAPI(const char* keyword) {
    printf("\n=== SEARCH RESULTS FOR: '%s' ===\n", keyword);
    
    // 1. Add to search history
    enqueue(searchHistory, keyword);
    
    // 2. Push to undo stack
    push(undoStack, keyword);
    
    // 3. Get autocomplete suggestions
    char suggestions[MAX_SUGGESTIONS][MAX_WORD_LENGTH];
    int suggestionCount = 0;
    findWordsWithPrefix(trie, keyword, suggestions, &suggestionCount);
    
    printf("SUGGESTIONS: ");
    for (int i = 0; i < suggestionCount; i++) {
        printf("%s", suggestions[i]);
        if (i < suggestionCount - 1) printf(", ");
    }
    printf("\n");
    
    // 4. Search in hash table
    HashEntry* entry = searchHashTable(hashTable, keyword);
    if (entry != NULL) {
        printf("FOUND_IN: %d documents\n", entry->docCount);
        for (int i = 0; i < entry->docCount; i++) {
            printf("RESULT: %d. %s (frequency: %d)\n", i + 1, 
                   entry->documents[i].filename, 
                   entry->documents[i].frequency);
        }
    } else {
        printf("FOUND_IN: 0 documents\n");
    }
    
    // 5. Find related keywords
    char related[MAX_RELATED][MAX_WORD_LENGTH];
    int relatedCount = 0;
    findRelatedKeywords(graph, keyword, related, &relatedCount);
    
    printf("RELATED: ");
    for (int i = 0; i < relatedCount; i++) {
        printf("%s", related[i]);
        if (i < relatedCount - 1) printf(", ");
    }
    printf("\n");
    
    // 6. Show search history
    char history[HISTORY_SIZE][MAX_WORD_LENGTH];
    int historyCount = 0;
    displayQueue(searchHistory, history, &historyCount);
    
    printf("HISTORY: ");
    for (int i = 0; i < historyCount; i++) {
        printf("%s", history[i]);
        if (i < historyCount - 1) printf(" → ");
    }
    printf("\n");
    
    printf("=== END RESULTS ===\n");
}

// New function for automated processing
void automatedProcess() {
    printf("AUTOMATED_PROCESS_START\n");
    processAllDocuments("../documents");
    printf("AUTOMATED_PROCESS_COMPLETE\n");
}

// New function for automated search
void automatedSearch(const char* query) {
    printf("AUTOMATED_SEARCH_START\n");
    searchKeywordForAPI(query);
    printf("AUTOMATED_SEARCH_END\n");
}

void showMenu() {
    printf("\n=== KNOWLEDGE GRAPH SEARCH SYSTEM ===\n");
    printf("1. Search Keyword\n");
    printf("2. Process Documents\n");
    printf("3. Show Search History\n");
    printf("4. Undo Last Search\n");
    printf("5. Exit\n");
    printf("Choose an option: ");
}

// Modified main function to handle command-line arguments
int main(int argc, char *argv[]) {
    initializeSystem();
    
    // Check for command line arguments for automated processing
    if (argc > 1) {
        if (strcmp(argv[1], "process") == 0) {
            automatedProcess();
            return 0;
        } else if (strcmp(argv[1], "search") == 0 && argc > 2) {
            automatedSearch(argv[2]);
            return 0;
        }
    }
    
    // Original interactive mode
    printf("Initializing Knowledge Graph Search System...\n");
    
    // First, process any existing documents
    processAllDocuments("../documents");
    
    int choice;
    char searchTerm[MAX_WORD_LENGTH];
    
    while (1) {
        showMenu();
        scanf("%d", &choice);
        getchar(); // Consume newline
        
        switch (choice) {
            case 1:
                printf("Enter search term: ");
                fgets(searchTerm, sizeof(searchTerm), stdin);
                searchTerm[strcspn(searchTerm, "\n")] = 0; // Remove newline
                searchKeywordForAPI(searchTerm);
                break;
                
            case 2:
                processAllDocuments("../documents");
                break;
                
            case 3:
                {
                    char history[HISTORY_SIZE][MAX_WORD_LENGTH];
                    int historyCount = 0;
                    displayQueue(searchHistory, history, &historyCount);
                    
                    if (historyCount > 0) {
                        printf("\nSearch History:\n");
                        for (int i = 0; i < historyCount; i++) {
                            printf("%d. %s\n", i + 1, history[i]);
                        }
                    } else {
                        printf("No search history available.\n");
                    }
                }
                break;
                
            case 4:
                if (!isStackEmpty(undoStack)) {
                    char* lastSearch = pop(undoStack);
                    push(redoStack, lastSearch);
                    printf("Undo: Returning to previous search\n");
                } else {
                    printf("No searches to undo.\n");
                }
                break;
                
            case 5:
                printf("Exiting system. Goodbye!\n");
                freeTrie(trie);
                freeHashTable(hashTable);
                freeGraph(graph);
                free(searchHistory);
                free(undoStack);
                free(redoStack);
                return 0;
                
            default:
                printf("Invalid option. Please try again.\n");
        }
    }
    
    return 0;
}