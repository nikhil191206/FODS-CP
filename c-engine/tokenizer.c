#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <windows.h>
#include "tokenizer.h"

void toLowerCase(char* str) {
    for (int i = 0; str[i]; i++) {
        str[i] = tolower(str[i]);
    }
}

void removePunctuation(char* str) {
    int i, j = 0;
    for (i = 0; str[i]; i++) {
        if (isalpha(str[i]) || str[i] == ' ') {
            str[j++] = str[i];
        }
    }
    str[j] = '\0';
}

int tokenizeFile(const char* filename, char tokens[][MAX_WORD_LENGTH], int* tokenCount) {
    FILE* file = fopen(filename, "r");
    if (!file) {
        printf("Error: Cannot open file %s\n", filename);
        return 0;
    }
    
    char line[1024];
    *tokenCount = 0;
    
    while (fgets(line, sizeof(line), file) && *tokenCount < MAX_TOKENS) {
        removePunctuation(line);
        toLowerCase(line);
        
        char* token = strtok(line, " \t\n");
        while (token != NULL && *tokenCount < MAX_TOKENS) {
            if (strlen(token) > 1) {
                strcpy(tokens[*tokenCount], token);
                (*tokenCount)++;
            }
            token = strtok(NULL, " \t\n");
        }
    }
    
    fclose(file);
    return 1;
}

// Windows-specific directory processing
void processDirectory(const char* directoryPath) {
    WIN32_FIND_DATA findFileData;
    HANDLE hFind;
    char searchPath[256];
    
    snprintf(searchPath, sizeof(searchPath), "%s\\*.txt", directoryPath);
    
    hFind = FindFirstFile(searchPath, &findFileData);
    if (hFind == INVALID_HANDLE_VALUE) {
        printf("Error: Cannot open directory %s\n", directoryPath);
        return;
    }
    
    printf("Processing files in directory: %s\n", directoryPath);
    
    do {
        if (!(findFileData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY)) {
            char filepath[256];
            snprintf(filepath, sizeof(filepath), "%s\\%s", directoryPath, findFileData.cFileName);
            
            printf("Processing: %s\n", findFileData.cFileName);
            
            char tokens[MAX_TOKENS][MAX_WORD_LENGTH];
            int tokenCount = 0;
            
            if (tokenizeFile(filepath, tokens, &tokenCount)) {
                printf("  Found %d tokens in %s\n", tokenCount, findFileData.cFileName);
            }
        }
    } while (FindNextFile(hFind, &findFileData) != 0);
    
    FindClose(hFind);
}