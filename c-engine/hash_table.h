#ifndef HASH_TABLE_H
#define HASH_TABLE_H

#define HASH_SIZE 1000
#define MAX_DOCUMENTS 100
#define MAX_KEYWORD_LENGTH 50

typedef struct Document {
    char filename[100];
    int frequency;
} Document;

typedef struct HashEntry {
    char keyword[MAX_KEYWORD_LENGTH];
    Document documents[MAX_DOCUMENTS];
    int docCount;
    struct HashEntry* next;
} HashEntry;

typedef struct {
    HashEntry* table[HASH_SIZE];
} HashTable;

// Function declarations
unsigned int hashFunction(const char* str);
HashTable* createHashTable();
void insertHashTable(HashTable* ht, const char* keyword, const char* filename, int frequency);
HashEntry* searchHashTable(HashTable* ht, const char* keyword);
void freeHashTable(HashTable* ht);

#endif