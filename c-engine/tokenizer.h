#ifndef TOKENIZER_H
#define TOKENIZER_H

#define MAX_TOKENS 1000
#define MAX_WORD_LENGTH 50

// Function declarations
void toLowerCase(char* str);
void removePunctuation(char* str);
int tokenizeFile(const char* filename, char tokens[][MAX_WORD_LENGTH], int* tokenCount);
void processDirectory(const char* directoryPath);

#endif