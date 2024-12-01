# Minimax Algorithm for Tic-Tac-Toe

# Utility functions
def is_winner(board, player):
    # Check rows, columns, and diagonals for a win
    for row in board:
        if all(s == player for s in row):
            return True
    for col in zip(*board):
        if all(s == player for s in col):
            return True
    if all(board[i][i] == player for i in range(3)):
        return True
    if all(board[i][2-i] == player for i in range(3)):
        return True
    return False

def is_draw(board):
    return all(cell != ' ' for row in board for cell in row)

def minimax(board, depth, is_maximizing, alpha, beta):
    if is_winner(board, 'X'):
        return 1
    if is_winner(board, 'O'):
        return -1
    if is_draw(board):
        return 0

    if is_maximizing:
        max_eval = -float('inf')
        for i in range(3):
            for j in range(3):
                if board[i][j] == ' ':
                    board[i][j] = 'X'
                    eval = minimax(board, depth + 1, False, alpha, beta)
                    board[i][j] = ' '
                    max_eval = max(max_eval, eval)
                    alpha = max(alpha, eval)
                    if beta <= alpha:
                        break
        return max_eval
    else:
        min_eval = float('inf')
        for i in range(3):
            for j in range(3):
                if board[i][j] == ' ':
                    board[i][j] = 'O'
                    eval = minimax(board, depth + 1, True, alpha, beta)
                    board[i][j] = ' '
                    min_eval = min(min_eval, eval)
                    beta = min(beta, eval)
                    if beta <= alpha:
                        break
        return min_eval

def best_move(board):
    best_val = -float('inf')
    move = (-1, -1)
    for i in range(3):
        for j in range(3):
            if board[i][j] == ' ':
                board[i][j] = 'X'
                move_val = minimax(board, 0, False, -float('inf'), float('inf'))
                board[i][j] = ' '
                if move_val > best_val:
                    best_val = move_val
                    move = (i, j)
    return move

def print_board(board):
    for row in board:
        print(" | ".join(row))
        print("-" * 5)

# Main Game loop
def play_game():
    board = [[' ' for _ in range(3)] for _ in range(3)]
    print("Welcome to Tic-Tac-Toe!")
    print_board(board)

    while True:
        # Player O (Human)
        print("\nPlayer O's turn")
        row, col = map(int, input("Enter row and column (0-2) for O: ").split())
        if board[row][col] != ' ':
            print("Cell is already taken, try again!")
            continue
        board[row][col] = 'O'
        print_board(board)
        if is_winner(board, 'O'):
            print("Player O wins!")
            break
        if is_draw(board):
            print("It's a draw!")
            break

        # Player X (AI)
        print("\nPlayer X's (AI) turn")
        row, col = best_move(board)
        board[row][col] = 'X'
        print_board(board)
        if is_winner(board, 'X'):
            print("Player X (AI) wins!")
            break
        if is_draw(board):
            print("It's a draw!")
            break

# Run the game
play_game()
