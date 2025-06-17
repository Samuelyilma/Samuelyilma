import unittest
import tictactoe # Import the module itself

class TestTicTacToe(unittest.TestCase):
    def setUp(self):
        # Reset board in the tictactoe module before each test
        tictactoe.board = [[" ", " ", " "], [" ", " ", " "], [" ", " ", " "]]

    # Tests for tictactoe.check_win(player)
    def test_check_win_horizontal_X_row0(self):
        tictactoe.board[0] = ["X", "X", "X"]
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_horizontal_X_row1(self):
        tictactoe.board[1] = ["X", "X", "X"]
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_horizontal_X_row2(self):
        tictactoe.board[2] = ["X", "X", "X"]
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_horizontal_O_row1(self):
        tictactoe.board[1] = ["O", "O", "O"]
        self.assertTrue(tictactoe.check_win("O"))

    def test_check_win_vertical_X_col0(self):
        tictactoe.board[0][0] = "X"
        tictactoe.board[1][0] = "X"
        tictactoe.board[2][0] = "X"
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_vertical_X_col1(self):
        tictactoe.board[0][1] = "X"
        tictactoe.board[1][1] = "X"
        tictactoe.board[2][1] = "X"
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_vertical_O_col2(self):
        tictactoe.board[0][2] = "O"
        tictactoe.board[1][2] = "O"
        tictactoe.board[2][2] = "O"
        self.assertTrue(tictactoe.check_win("O"))

    def test_check_win_diagonal_X_top_left_to_bottom_right(self):
        tictactoe.board[0][0] = "X"
        tictactoe.board[1][1] = "X"
        tictactoe.board[2][2] = "X"
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_diagonal_X_top_right_to_bottom_left(self):
        tictactoe.board[0][2] = "X"
        tictactoe.board[1][1] = "X"
        tictactoe.board[2][0] = "X"
        self.assertTrue(tictactoe.check_win("X"))

    def test_check_win_diagonal_O_top_left_to_bottom_right(self):
        tictactoe.board[0][0] = "O"
        tictactoe.board[1][1] = "O"
        tictactoe.board[2][2] = "O"
        self.assertTrue(tictactoe.check_win("O"))

    def test_no_win_empty_board(self):
        self.assertFalse(tictactoe.check_win("X"))
        self.assertFalse(tictactoe.check_win("O"))

    def test_no_win_partially_filled(self):
        tictactoe.board[0][0] = "X"
        tictactoe.board[1][1] = "O"
        tictactoe.board[0][2] = "X"
        self.assertFalse(tictactoe.check_win("X"))
        self.assertFalse(tictactoe.check_win("O"))

    # Tests for tictactoe.check_draw()
    def test_check_draw_is_draw(self):
        tictactoe.board = [
            ["X", "O", "X"],
            ["X", "O", "X"],
            ["O", "X", "O"]
        ]
        self.assertTrue(tictactoe.check_draw())

    def test_check_draw_not_draw_empty(self):
        self.assertFalse(tictactoe.check_draw())

    def test_check_draw_not_draw_X_wins(self):
        tictactoe.board[0] = ["X", "X", "X"]
        tictactoe.board[1] = ["O", "O", " "]
        tictactoe.board[2] = ["X", " ", "O"]
        self.assertFalse(tictactoe.check_draw()) # X has won, so not a draw

    def test_check_draw_not_draw_O_wins(self):
        tictactoe.board[0] = ["O", "O", "O"]
        tictactoe.board[1] = ["X", "X", " "]
        tictactoe.board[2] = ["O", " ", "X"]
        self.assertFalse(tictactoe.check_draw()) # O has won, so not a draw

    def test_check_draw_not_draw_still_empty_cells(self):
        tictactoe.board[0] = ["X", "O", "X"]
        tictactoe.board[1] = ["X", " ", "X"] # Empty cell here
        tictactoe.board[2] = ["O", "X", "O"]
        self.assertFalse(tictactoe.check_draw())

    # Tests for tictactoe.make_move(row, col, player)
    def test_make_move_valid(self):
        self.assertTrue(tictactoe.make_move(0, 0, "X"))
        self.assertEqual(tictactoe.board[0][0], "X")
        self.assertTrue(tictactoe.make_move(1, 1, "O"))
        self.assertEqual(tictactoe.board[1][1], "O")

    def test_make_move_occupied_cell(self):
        tictactoe.board[0][0] = "X" # Pre-occupy the cell
        self.assertFalse(tictactoe.make_move(0, 0, "O"))
        self.assertEqual(tictactoe.board[0][0], "X") # Ensure it wasn't changed

    def test_make_move_out_of_bounds(self):
        self.assertFalse(tictactoe.make_move(3, 0, "X"))
        self.assertFalse(tictactoe.make_move(0, 3, "X"))
        self.assertFalse(tictactoe.make_move(-1, 0, "X"))

if __name__ == '__main__':
    unittest.main()
