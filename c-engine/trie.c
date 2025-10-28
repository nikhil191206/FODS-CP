#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "trie.h"

TrieNode* createTrieNode() {
    TrieNode* node = (TrieNode*)malloc(sizeof(TrieNode));
    node->isEndOfWord = 0;
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        node->children[i] = NULL;
    }
    return node;
}

void insertTrie(TrieNode* root, const char* word) {
    TrieNode* current = root;
    
    for (int i = 0; word[i] != '\0'; i++) {
        int index = tolower(word[i]) - 'a';
        if (index < 0 || index >= ALPHABET_SIZE) continue;
        
        if (current->children[index] == NULL) {
            current->children[index] = createTrieNode();
        }
        current = current->children[index];
    }
    current->isEndOfWord = 1;
}

int searchTrie(TrieNode* root, const char* word) {
    TrieNode* current = root;
    
    for (int i = 0; word[i] != '\0'; i++) {
        int index = tolower(word[i]) - 'a';
        if (index < 0 || index >= ALPHABET_SIZE) return 0;
        
        if (current->children[index] == NULL) {
            return 0;
        }
        current = current->children[index];
    }
    return current != NULL && current->isEndOfWord;
}

void collectWords(TrieNode* node, char* prefix, int length, char suggestions[][MAX_WORD_LENGTH], int* count) {
    if (node == NULL) return;
    
    if (node->isEndOfWord) {
        prefix[length] = '\0';
        strcpy(suggestions[*count], prefix);
        (*count)++;
        if (*count >= MAX_SUGGESTIONS) return;
    }
    
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (node->children[i] != NULL) {
            prefix[length] = 'a' + i;
            collectWords(node->children[i], prefix, length + 1, suggestions, count);
            if (*count >= MAX_SUGGESTIONS) return;
        }
    }
}

void findWordsWithPrefix(TrieNode* root, const char* prefix, char suggestions[][MAX_WORD_LENGTH], int* count) {
    *count = 0;
    TrieNode* current = root;
    char tempPrefix[MAX_WORD_LENGTH];
    strcpy(tempPrefix, prefix);
    int prefixLen = strlen(prefix);
    
    // Traverse to the end of prefix
    for (int i = 0; i < prefixLen; i++) {
        int index = tolower(prefix[i]) - 'a';
        if (index < 0 || index >= ALPHABET_SIZE) return;
        
        if (current->children[index] == NULL) {
            return; // Prefix not found
        }
        current = current->children[index];
    }
    
    // Collect all words with this prefix
    collectWords(current, tempPrefix, prefixLen, suggestions, count);
}

void freeTrie(TrieNode* root) {
    if (root == NULL) return;
    
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        freeTrie(root->children[i]);
    }
    free(root);
}