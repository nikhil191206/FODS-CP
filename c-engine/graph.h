#ifndef GRAPH_H
#define GRAPH_H

#define MAX_KEYWORDS 1000
#define MAX_RELATED 20
#define MAX_WORD_LENGTH 50
#define MAX_PATH_LENGTH 10  // New: Maximum path length for tracing

typedef struct GraphNode {
    char keyword[MAX_WORD_LENGTH];
    int related[MAX_RELATED];
    int relatedCount;
    int visited;
    int parent;  // New: For path reconstruction
} GraphNode;

typedef struct {
    GraphNode nodes[MAX_KEYWORDS];
    int nodeCount;
} Graph;

// Existing function declarations
Graph* createGraph();
int findOrAddNode(Graph* graph, const char* keyword);
void addEdge(Graph* graph, const char* keyword1, const char* keyword2);
void findRelatedKeywords(Graph* graph, const char* keyword, char related[][MAX_WORD_LENGTH], int* count);
void freeGraph(Graph* graph);

// New: Path tracing function declaration
int findPathBetweenKeywords(Graph* graph, const char* startKeyword, const char* endKeyword, 
                            char path[][MAX_WORD_LENGTH], int* pathLength);

#endif