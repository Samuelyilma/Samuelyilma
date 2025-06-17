board = [[" ", " ", " "], [" ", " ", " "], [" ", " ", " "]]

def display_board():
    """Displays the Tic-Tac-Toe board."""
    print("-------------")
    for row in board:
        print(f"| {row[0]} | {row[1]} | {row[2]} |")
        print("-------------")

if __name__ == '__main__':
    play_game() # Changed from display_board() to play_game()


def get_player_input(player):
    """Gets and validates player input for their move."""
    while True:
        try:
            move = input(f"Player {player}, enter your move (row,col): ")
            row_str, col_str = move.split(',')
            row = int(row_str.strip())
            col = int(col_str.strip())
            if 0 <= row <= 2 and 0 <= col <= 2:
                return row, col
            else:
                print("Input out of bounds. Row and column must be between 0 and 2.")
        except ValueError:
            print("Invalid input format. Please enter as row,col (e.g., 1,2).")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

def play_game():
    """Main game loop for Tic-Tac-Toe."""
    current_player = "X"
    game_over = False

    while not game_over:
        display_board()
        print(f"Player {current_player}'s turn")
        row, col = get_player_input(current_player)

        if make_move(row, col, current_player):
            if check_win(current_player):
                display_board()
                print(f"Congratulations! Player {current_player} wins!")
                game_over = True
            elif check_draw():
                display_board()
                print("It's a draw!")
                game_over = True
            else:
                current_player = "O" if current_player == "X" else "X"
        # If make_move returns False, the loop continues, and the same player is prompted again.

    # Display final board if not already shown by win/draw condition
    if not game_over: # This case should ideally not be reached if logic is correct
        display_board()


def check_win(player):
    """Checks if the given player has won."""
    # Check rows
    for row in board:
        if all(s == player for s in row):
            return True
    # Check columns
    for col in range(3):
        if all(board[row][col] == player for row in range(3)):
            return True
    # Check diagonals
    if all(board[i][i] == player for i in range(3)):
        return True
    if all(board[i][2 - i] == player for i in range(3)):
        return True
    return False


def check_draw():
    """Checks if the game is a draw."""
    if not check_win("X") and not check_win("O"):
        for row in board:
            if any(s == " " for s in row):
                return False  # There's an empty cell
        return True  # All cells are filled, and no one won
    return False # Someone won, so it's not a draw


def make_move(row, col, player):
    """Makes a move on the board."""
    if 0 <= row < 3 and 0 <= col < 3:
        if board[row][col] == " ":
            board[row][col] = player
            return True
        else:
            print("Cell already taken. Try again.")
            return False
    else:
        print("Invalid input. Row and column must be between 0 and 2.")
        return False
