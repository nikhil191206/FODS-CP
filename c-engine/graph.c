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
        graph->nodes[graph->nodeCount].parent = -1;  // Initialize parent
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

// NEW: Find path between two keywords using BFS with stack-based reconstruction
int findPathBetweenKeywords(Graph* graph, const char* startKeyword, const char* endKeyword, 
                            char path[][MAX_WORD_LENGTH], int* pathLength) {
    *pathLength = 0;
    
    // Find start and end node indices
    int startIndex = -1, endIndex = -1;
    for (int i = 0; i < graph->nodeCount; i++) {
        if (strcasecmp(graph->nodes[i].keyword, startKeyword) == 0) {
            startIndex = i;
        }
        if (strcasecmp(graph->nodes[i].keyword, endKeyword) == 0) {
            endIndex = i;
        }
    }
    
    // Check if both keywords exist
    if (startIndex == -1 || endIndex == -1) {
        return 0; // Keywords not found
    }
    
    // Same keyword
    if (startIndex == endIndex) {
        strcpy(path[0], startKeyword);
        *pathLength = 1;
        return 1;
    }
    
    // Reset visited flags and parents
    for (int i = 0; i < graph->nodeCount; i++) {
        graph->nodes[i].visited = 0;
        graph->nodes[i].parent = -1;
    }
    
    // BFS to find shortest path
    int queue[MAX_KEYWORDS];
    int front = 0, rear = 0;
    
    graph->nodes[startIndex].visited = 1;
    queue[rear++] = startIndex;
    
    int found = 0;
    while (front < rear && !found) {
        int current = queue[front++];
        
        // Check if we reached the destination
        if (current == endIndex) {
            found = 1;
            break;
        }
        
        // Explore neighbors
        for (int i = 0; i < graph->nodes[current].relatedCount; i++) {
            int neighbor = graph->nodes[current].related[i];
            if (!graph->nodes[neighbor].visited) {
                graph->nodes[neighbor].visited = 1;
                graph->nodes[neighbor].parent = current;
                queue[rear++] = neighbor;
            }
        }
    }
    
    // If no path found
    if (!found) {
        return 0;
    }
    
    // Reconstruct path using stack (going backwards from end to start)
    int tempPath[MAX_PATH_LENGTH];
    int tempLength = 0;
    int current = endIndex;
    
    while (current != -1 && tempLength < MAX_PATH_LENGTH) {
        tempPath[tempLength++] = current;
        current = graph->nodes[current].parent;
    }
    
    // Reverse the path (stack behavior - LIFO)
    *pathLength = tempLength;
    for (int i = 0; i < tempLength; i++) {
        strcpy(path[i], graph->nodes[tempPath[tempLength - 1 - i]].keyword);
    }
    
    return 1; // Path found
}

void freeGraph(Graph* graph) {
    free(graph);
}