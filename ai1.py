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
////////////

from collections import deque

# Function to perform BFS
def bfs(graph, start):
    visited = set()  # Set to track visited nodes
    queue = deque([start])  # Queue to explore nodes level by level
    visited.add(start)
    traversal = []

    while queue:
        node = queue.popleft()  # Get the first node in the queue
        traversal.append(node)

        # Add all unvisited neighbors to the queue
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return traversal

# Input graph from user
graph = {}
num_nodes = int(input("Enter the number of nodes in the graph: "))
for _ in range(num_nodes):
    node = input("Enter the node: ")
    neighbors = input(f"Enter neighbors of {node} separated by spaces: ").split()
    graph[node] = neighbors

# Input starting node
start_node = input("Enter the starting node for BFS: ")

# Perform BFS
if start_node in graph:
    result = bfs(graph, start_node)
    print("BFS Traversal:", result)
else:
    print(f"Starting node '{start_node}' is not present in the graph.")
 '''
 input from user
 Enter the number of nodes in the graph: 6
Enter the node: A
Enter neighbors of A separated by spaces: B C
Enter the node: B
Enter neighbors of B separated by spaces: A D E
Enter the node: C
Enter neighbors of C separated by spaces: A F
Enter the node: D
Enter neighbors of D separated by spaces: B
Enter the node: E
Enter neighbors of E separated by spaces: B F
Enter the node: F
Enter neighbors of F separated by spaces: C E
Enter the starting node for BFS: A
'''
