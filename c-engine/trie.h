#ifndef TRIE_H
#define TRIE_H

#define MAX_SUGGESTIONS 10
#define ALPHABET_SIZE 26
#define MAX_WORD_LENGTH 50

typedef struct TrieNode {
    struct TrieNode* children[ALPHABET_SIZE];
    int isEndOfWord;
} TrieNode;

// Function declarations
TrieNode* createTrieNode();
void insertTrie(TrieNode* root, const char* word);
int searchTrie(TrieNode* root, const char* word);
void findWordsWithPrefix(TrieNode* root, const char* prefix, char suggestions[][MAX_WORD_LENGTH], int* count);
void freeTrie(TrieNode* root);

#endif