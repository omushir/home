from collections import deque

# Function to perform BFS
def bfs(graph, start):
    visited = set()  # Set to track visited nodes
    queue = deque([start])  # Queue to explore nodes level by level
    visited.add(start)

    while queue:
        node = queue.popleft()  # Get the first node in the queue
        print(node, end=" ")

        # Add all unvisited neighbors to the queue
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

# Example graph (adjacency list)
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

# Starting BFS from node 'A'
bfs(graph, 'A')
