#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "hash_table.h"

unsigned int hashFunction(const char* str) {
    unsigned int hash = 0;
    for (int i = 0; str[i] != '\0'; i++) {
        hash = hash * 31 + tolower(str[i]);
    }
    return hash % HASH_SIZE;
}

HashTable* createHashTable() {
    HashTable* ht = (HashTable*)malloc(sizeof(HashTable));
    for (int i = 0; i < HASH_SIZE; i++) {
        ht->table[i] = NULL;
    }
    return ht;
}

void insertHashTable(HashTable* ht, const char* keyword, const char* filename, int frequency) {
    unsigned int index = hashFunction(keyword);
    
    // Check if keyword already exists
    HashEntry* current = ht->table[index];
    while (current != NULL) {
        if (strcasecmp(current->keyword, keyword) == 0) {
            // Keyword exists, update document frequency
            for (int i = 0; i < current->docCount; i++) {
                if (strcmp(current->documents[i].filename, filename) == 0) {
                    current->documents[i].frequency += frequency;
                    return;
                }
            }
            // Add new document
            if (current->docCount < MAX_DOCUMENTS) {
                strcpy(current->documents[current->docCount].filename, filename);
                current->documents[current->docCount].frequency = frequency;
                current->docCount++;
            }
            return;
        }
        current = current->next;
    }
    
    // Create new entry
    HashEntry* newEntry = (HashEntry*)malloc(sizeof(HashEntry));
    strcpy(newEntry->keyword, keyword);
    strcpy(newEntry->documents[0].filename, filename);
    newEntry->documents[0].frequency = frequency;
    newEntry->docCount = 1;
    newEntry->next = ht->table[index];
    ht->table[index] = newEntry;
}

HashEntry* searchHashTable(HashTable* ht, const char* keyword) {
    unsigned int index = hashFunction(keyword);
    HashEntry* current = ht->table[index];
    
    while (current != NULL) {
        if (strcasecmp(current->keyword, keyword) == 0) {
            return current;
        }
        current = current->next;
    }
    return NULL;
}

void freeHashTable(HashTable* ht) {
    for (int i = 0; i < HASH_SIZE; i++) {
        HashEntry* current = ht->table[i];
        while (current != NULL) {
            HashEntry* temp = current;
            current = current->next;
            free(temp);
        }
    }
    free(ht);
}