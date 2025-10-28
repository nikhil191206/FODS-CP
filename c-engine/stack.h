#ifndef STACK_H
#define STACK_H

#define STACK_SIZE 10
#define MAX_WORD_LENGTH 50

typedef struct {
    char items[STACK_SIZE][MAX_WORD_LENGTH];
    int top;
} Stack;

// Function declarations
Stack* createStack();
void push(Stack* s, const char* searchTerm);
char* pop(Stack* s);
int isStackEmpty(Stack* s);
int isStackFull(Stack* s);

#endif