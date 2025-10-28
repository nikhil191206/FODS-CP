#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "queue.h"

Queue* createQueue() {
    Queue* q = (Queue*)malloc(sizeof(Queue));
    q->front = 0;
    q->rear = -1;
    q->count = 0;
    return q;
}

void enqueue(Queue* q, const char* searchTerm) {
    // If queue is full, dequeue oldest item first
    if (isQueueFull(q)) {
        dequeue(q);
    }
    
    q->rear = (q->rear + 1) % HISTORY_SIZE;
    strcpy(q->items[q->rear], searchTerm);
    q->count++;
}

void dequeue(Queue* q) {
    if (isQueueEmpty(q)) return;
    
    q->front = (q->front + 1) % HISTORY_SIZE;
    q->count--;
}

void displayQueue(Queue* q, char history[][MAX_WORD_LENGTH], int* count) {
    *count = 0;
    if (isQueueEmpty(q)) return;
    
    int i = q->front;
    int itemsProcessed = 0;
    
    while (itemsProcessed < q->count) {
        strcpy(history[*count], q->items[i]);
        (*count)++;
        i = (i + 1) % HISTORY_SIZE;
        itemsProcessed++;
    }
}

int isQueueEmpty(Queue* q) {
    return q->count == 0;
}

int isQueueFull(Queue* q) {
    return q->count == HISTORY_SIZE;
}