#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include "graph.h"

Graph* createGraph() {
    Graph* graph = (Graph*)malloc(sizeof(Graph));
    graph->nodeCount = 0;
    return graph;
}

int findOrAddNode(Graph* graph, const char* keyword) {
    // Check if node already exists
    for (int i = 0; i < graph->nodeCount; i++) {
        if (strcasecmp(graph->nodes[i].keyword, keyword) == 0) {
            return i; // Return existing index
        }
    }
    
    // Add new node
    if (graph->nodeCount < MAX_KEYWORDS) {
        strcpy(graph->nodes[graph->nodeCount].keyword, keyword);
        graph->nodes[graph->nodeCount].relatedCount = 0;
        graph->nodes[graph->nodeCount].visited = 0;
        graph->nodeCount++;
        return graph->nodeCount - 1;
    }
    return -1; // Graph full
}

void addEdge(Graph* graph, const char* keyword1, const char* keyword2) {
    int index1 = findOrAddNode(graph, keyword1);
    int index2 = findOrAddNode(graph, keyword2);
    
    if (index1 == -1 || index2 == -1 || index1 == index2) return;
    
    // Check if edge already exists from keyword1 to keyword2
    for (int i = 0; i < graph->nodes[index1].relatedCount; i++) {
        if (graph->nodes[index1].related[i] == index2) return;
    }
    
    // Add edge in both directions (undirected graph)
    if (graph->nodes[index1].relatedCount < MAX_RELATED) {
        graph->nodes[index1].related[graph->nodes[index1].relatedCount++] = index2;
    }
    
    if (graph->nodes[index2].relatedCount < MAX_RELATED) {
        graph->nodes[index2].related[graph->nodes[index2].relatedCount++] = index1;
    }
}

void BFS(Graph* graph, int startIndex, char related[][MAX_WORD_LENGTH], int* count) {
    if (startIndex == -1) return;
    
    // Reset visited flags
    for (int i = 0; i < graph->nodeCount; i++) {
        graph->nodes[i].visited = 0;
    }
    
    int queue[MAX_KEYWORDS];
    int front = 0, rear = 0;
    
    // BFS initialization
    graph->nodes[startIndex].visited = 1;
    queue[rear++] = startIndex;
    *count = 0;
    
    while (front < rear && *count < MAX_RELATED) {
        int current = queue[front++];
        
        // Add related nodes (excluding the start node itself)
        if (current != startIndex) {
            strcpy(related[*count], graph->nodes[current].keyword);
            (*count)++;
        }
        
        // Enqueue all unvisited neighbors
        for (int i = 0; i < graph->nodes[current].relatedCount && *count < MAX_RELATED; i++) {
            int neighbor = graph->nodes[current].related[i];
            if (!graph->nodes[neighbor].visited) {
                graph->nodes[neighbor].visited = 1;
                queue[rear++] = neighbor;
            }
        }
    }
}

void findRelatedKeywords(Graph* graph, const char* keyword, char related[][MAX_WORD_LENGTH], int* count) {
    int index = -1;
    for (int i = 0; i < graph->nodeCount; i++) {
        if (strcasecmp(graph->nodes[i].keyword, keyword) == 0) {
            index = i;
            break;
        }
    }
    
    if (index != -1) {
        BFS(graph, index, related, count);
    } else {
        *count = 0;
    }
}

void freeGraph(Graph* graph) {
    free(graph);
}