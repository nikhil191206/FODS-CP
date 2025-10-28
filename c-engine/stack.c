#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "stack.h"

Stack* createStack() {
    Stack* s = (Stack*)malloc(sizeof(Stack));
    s->top = -1;
    return s;
}

void push(Stack* s, const char* searchTerm) {
    if (isStackFull(s)) return;
    
    s->top++;
    strcpy(s->items[s->top], searchTerm);
}

char* pop(Stack* s) {
    if (isStackEmpty(s)) return NULL;
    
    return s->items[s->top--];
}

int isStackEmpty(Stack* s) {
    return s->top == -1;
}

int isStackFull(Stack* s) {
    return s->top == STACK_SIZE - 1;
}