import heapq

# A* Algorithm ai
def a_star(start, goal, h_func, neighbors_func):
    # The priority queue to explore nodes with minimum f = g + h
    open_list = []
    heapq.heappush(open_list, (0 + h_func(start), 0, start))  # (f, g, node)
    
    came_from = {}  # To track the best path to each node
    g_score = {start: 0}  # Distance from start to each node
    f_score = {start: h_func(start)}  # Estimated distance from start to goal

    while open_list:
        _, g, current = heapq.heappop(open_list)  # Get the node with the lowest f score
        
        if current == goal:  # Reached the goal
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            return path[::-1]  # Reverse the path to get the correct order
        
        for neighbor in neighbors_func(current):  # Explore neighbors
            tentative_g_score = g + 1  # All neighbors have a cost of 1
            
            if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = g_score[neighbor] + h_func(neighbor)
                heapq.heappush(open_list, (f_score[neighbor], tentative_g_score, neighbor))
    
    return None  # No path found


# Example grid and helper functions

def heuristic(node):
    # Simple Manhattan distance heuristic
    return abs(node[0] - goal[0]) + abs(node[1] - goal[1])

def neighbors(node):
    # List possible neighbors (up, down, left, right)
    x, y = node
    return [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]

# Example grid environment
start = (0, 0)  # Starting point
goal = (3, 3)  # Goal point

# Run A* algorithm
path = a_star(start, goal, heuristic, neighbors)
print("Path:", path)
