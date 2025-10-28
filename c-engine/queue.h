#ifndef QUEUE_H
#define QUEUE_H

#define HISTORY_SIZE 5
#define MAX_WORD_LENGTH 50

typedef struct {
    char items[HISTORY_SIZE][MAX_WORD_LENGTH];
    int front;
    int rear;
    int count;
} Queue;

// Function declarations
Queue* createQueue();
void enqueue(Queue* q, const char* searchTerm);
void dequeue(Queue* q);
void displayQueue(Queue* q, char history[][MAX_WORD_LENGTH], int* count);
int isQueueEmpty(Queue* q);
int isQueueFull(Queue* q);

#endif