package app.talklive

import app.talklive.game.Board
import app.talklive.game.Board.Companion.dabMove
import app.talklive.game.Board.Companion.tttMove
import app.talklive.game.GameKind
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** The games must follow public/games.js exactly, or app and web players would disagree. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class GameRulesTest {
    @Test fun ttt_win_draw_and_turns() {
        var b = Board(GameKind.TicTacToe)
        assertNull("not your turn", b.tttMove(1, 0))
        for ((p, i) in listOf(0 to 0, 1 to 3, 0 to 1, 1 to 4)) b = b.tttMove(p, i)!!
        assertNull("cell taken", b.tttMove(0, 1))
        b = b.tttMove(0, 2)!!
        assertTrue(b.over); assertEquals(0, b.winner); assertEquals(listOf(0, 1, 2), b.line)

        var d = Board(GameKind.TicTacToe)
        for ((p, i) in listOf(0 to 0, 1 to 1, 0 to 2, 1 to 4, 0 to 3, 1 to 5, 0 to 7, 1 to 6, 0 to 8)) d = d.tttMove(p, i)!!
        assertTrue(d.over); assertEquals(-1, d.winner)
    }

    @Test fun dab_closing_a_box_keeps_the_turn_and_scores() {
        var b = Board(GameKind.Dots)
        val n = Board.DAB_N
        // Box 0: h0 (top), h[n] (bottom), v0 (left), v1 (right).
        b = b.dabMove(0, 'h', 0)!!; assertEquals(1, b.turn)
        b = b.dabMove(1, 'h', n)!!; assertEquals(0, b.turn)
        b = b.dabMove(0, 'v', 0)!!; assertEquals(1, b.turn)
        b = b.dabMove(1, 'v', 1)!!
        assertEquals(1, b.boxes[0]); assertEquals(listOf(0, 1), b.scores)
        assertEquals("closer moves again", 1, b.turn)
        assertNull("edge taken", b.dabMove(1, 'v', 1))
        assertFalse(b.over)
    }

    @Test fun json_matches_the_website_format() {
        val web = JSONObject("""{"board":[0,null,1,null,0,null,null,null,null],"turn":1,"phase":"move","winner":null,"line":null}""")
        val b = Board.from(web)
        assertEquals(GameKind.TicTacToe, b.kind); assertEquals(1, b.turn); assertEquals(0, b.cells[0]); assertNull(b.cells[1])
        val back = b.toJson()
        assertTrue(back.isNull("winner")); assertEquals("move", back.getString("phase")); assertEquals(9, back.getJSONArray("board").length())

        val dab = Board(GameKind.Dots).dabMove(0, 'h', 3)!!.toJson()
        assertEquals("dab", dab.getString("g")); assertEquals(20, dab.getJSONArray("h").length()); assertEquals(16, dab.getJSONArray("boxes").length())
        assertEquals("h", dab.getJSONObject("last").getString("k"))
        val draw = Board(GameKind.TicTacToe).copy(over = true, winner = -1).toJson()
        assertEquals("draw", draw.getString("winner"))
    }
}
