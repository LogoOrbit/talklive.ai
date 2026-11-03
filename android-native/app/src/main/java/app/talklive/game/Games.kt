package app.talklive.game

import app.talklive.call.CallManager
import app.talklive.call.CallPhase
import app.talklive.net.ServerEvent
import app.talklive.net.TalkSocket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

enum class GameKind(val wire: String) { TicTacToe("ttt"), Dots("dab") }
enum class Stage { Idle, Inviting, Invited, Waiting, Playing, Gone }

/** The shared board, exactly as public/games.js sends it. Winner: 0, 1, -1 for draw, null while playing. */
data class Board(
    val kind: GameKind,
    val cells: List<Int?> = List(9) { null },
    val line: List<Int>? = null,
    val h: List<Int?> = List(DAB_EDGES) { null },
    val v: List<Int?> = List(DAB_EDGES) { null },
    val boxes: List<Int?> = List(DAB_N * DAB_N) { null },
    val scores: List<Int> = listOf(0, 0),
    val last: Pair<Char, Int>? = null,
    val turn: Int = 0,
    val over: Boolean = false,
    val winner: Int? = null,
) {
    fun toJson(): JSONObject {
        val o = JSONObject().put("turn", turn).put("phase", if (over) "over" else "move")
            .put("winner", when (winner) { null -> JSONObject.NULL; -1 -> "draw"; else -> winner })
        fun arr(l: List<Int?>) = JSONArray(l.map { it ?: JSONObject.NULL })
        if (kind == GameKind.TicTacToe) {
            o.put("board", arr(cells)).put("line", line?.let { JSONArray(it) } ?: JSONObject.NULL)
        } else {
            o.put("g", "dab").put("h", arr(h)).put("v", arr(v)).put("boxes", arr(boxes)).put("scores", JSONArray(scores))
                .put("last", last?.let { JSONObject().put("k", it.first.toString()).put("i", it.second) } ?: JSONObject.NULL)
        }
        return o
    }

    companion object {
        const val DAB_N = 4
        const val DAB_EDGES = (DAB_N + 1) * DAB_N
        private val LINES = listOf(
            listOf(0, 1, 2), listOf(3, 4, 5), listOf(6, 7, 8), listOf(0, 3, 6),
            listOf(1, 4, 7), listOf(2, 5, 8), listOf(0, 4, 8), listOf(2, 4, 6),
        )

        fun from(o: JSONObject): Board {
            fun ints(a: JSONArray?, n: Int) = List(n) { i -> a?.takeIf { i < it.length() && !it.isNull(i) }?.optInt(i) }
            val winner = when {
                o.isNull("winner") -> null
                o.opt("winner") == "draw" -> -1
                else -> o.optInt("winner")
            }
            val over = o.optString("phase") == "over"
            return if (o.optString("g") == "dab") {
                val last = o.optJSONObject("last")?.let { it.optString("k").firstOrNull()?.let { k -> k to it.optInt("i") } }
                Board(
                    GameKind.Dots, h = ints(o.optJSONArray("h"), DAB_EDGES), v = ints(o.optJSONArray("v"), DAB_EDGES),
                    boxes = ints(o.optJSONArray("boxes"), DAB_N * DAB_N),
                    scores = o.optJSONArray("scores")?.let { listOf(it.optInt(0), it.optInt(1)) } ?: listOf(0, 0),
                    last = last, turn = o.optInt("turn"), over = over, winner = winner,
                )
            } else {
                Board(
                    GameKind.TicTacToe, cells = ints(o.optJSONArray("board"), 9),
                    line = o.optJSONArray("line")?.let { a -> (0 until a.length()).map { a.optInt(it) } },
                    turn = o.optInt("turn"), over = over, winner = winner,
                )
            }
        }

        /** Tic Tac Toe move by player [p] on cell [i]; null if not allowed. */
        fun Board.tttMove(p: Int, i: Int): Board? {
            if (over || turn != p || cells.getOrNull(i) != null) return null
            val next = cells.toMutableList().also { it[i] = p }
            val win = LINES.firstOrNull { l -> l.all { next[it] == p } }
            return when {
                win != null -> copy(cells = next, over = true, winner = p, line = win)
                next.all { it != null } -> copy(cells = next, over = true, winner = -1)
                else -> copy(cells = next, turn = 1 - p)
            }
        }

        /** Dots & Boxes move: player [p] draws edge [kind] ('h' or 'v') number [i]. */
        fun Board.dabMove(p: Int, kind: Char, i: Int): Board? {
            if (over || turn != p) return null
            val hh = h.toMutableList(); val vv = v.toMutableList()
            val arr = if (kind == 'h') hh else vv
            if (arr.getOrNull(i) != null) return null
            arr[i] = p
            val bx = boxes.toMutableList()
            var closed = 0
            for (b in 0 until DAB_N * DAB_N) {
                val r = b / DAB_N; val c = b % DAB_N
                val done = hh[r * DAB_N + c] != null && hh[(r + 1) * DAB_N + c] != null &&
                    vv[r * (DAB_N + 1) + c] != null && vv[r * (DAB_N + 1) + c + 1] != null
                if (bx[b] == null && done) { bx[b] = p; closed++ }
            }
            val sc = scores.toMutableList().also { it[p] += closed }
            val full = bx.all { it != null }
            return copy(
                h = hh, v = vv, boxes = bx, scores = sc, last = kind to i,
                over = full,
                winner = if (!full) null else if (sc[0] == sc[1]) -1 else if (sc[0] > sc[1]) 0 else 1,
                turn = if (full || closed > 0) turn else 1 - p,
            )
        }
    }
}

data class GameUi(
    val stage: Stage = Stage.Idle,
    val kind: GameKind = GameKind.TicTacToe,
    val board: Board? = null,
    val me: Int = 0,
    val declined: Boolean = false,
)

/**
 * Tic Tac Toe and Dots & Boxes with the person on the call or in the text
 * chat, over the server's 'game' relay. The host (the call initiator) owns
 * the first board; after that whoever moves sends the whole state, so both
 * sides can never disagree. Same protocol as public/games.js.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class Games @Inject constructor(private val socket: TalkSocket, private val calls: CallManager) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default.limitedParallelism(1))
    private val _ui = MutableStateFlow(GameUi())
    val ui: StateFlow<GameUi> = _ui
    private var goneJob: Job? = null

    private val isHost get() = calls.state.value.isHost

    init {
        scope.launch { socket.events.collect { if (it is ServerEvent.Game) onGame(it.data) } }
        // A new partner (or none) starts from scratch.
        scope.launch {
            calls.state.map { (it.phase as? CallPhase.Connected)?.partner?.clientId }.distinctUntilChanged().collect { reset() }
        }
    }

    fun invite(kind: GameKind) = scope.launch {
        _ui.update { it.copy(stage = Stage.Inviting, kind = kind, declined = false) }
        send(JSONObject().put("type", "invite").put("game", kind.wire))
    }

    fun accept() = scope.launch {
        val kind = _ui.value.kind
        send(JSONObject().put("type", "accept").put("game", kind.wire))
        handshake(kind)
    }

    fun decline() = scope.launch {
        send(JSONObject().put("type", "decline"))
        reset()
    }

    fun tapCell(i: Int) = scope.launch {
        val u = _ui.value
        val b = u.board ?: return@launch
        with(Board) { b.tttMove(u.me, i) }?.let { play(it) }
    }

    fun drawEdge(kind: Char, i: Int) = scope.launch {
        val u = _ui.value
        val b = u.board ?: return@launch
        with(Board) { b.dabMove(u.me, kind, i) }?.let { play(it) }
    }

    fun rematch() = scope.launch {
        if (isHost) start(_ui.value.kind) else send(JSONObject().put("type", "rematch"))
    }

    fun leave() = scope.launch {
        if (_ui.value.stage == Stage.Playing || _ui.value.stage == Stage.Inviting) send(JSONObject().put("type", "left"))
        reset()
    }

    private fun play(next: Board) {
        _ui.update { it.copy(board = next) }
        send(JSONObject().put("type", "state").put("state", next.toJson()))
    }

    private fun handshake(kind: GameKind) {
        if (isHost) start(kind) else _ui.update { it.copy(stage = Stage.Waiting, kind = kind) }
    }

    private fun start(kind: GameKind) {
        val board = Board(kind)
        _ui.update { GameUi(stage = Stage.Playing, kind = kind, board = board, me = 0) }
        send(JSONObject().put("type", "state").put("state", board.toJson()))
    }

    private fun onGame(d: JSONObject) {
        val u = _ui.value
        when (d.optString("type")) {
            "invite" -> {
                if (u.stage == Stage.Playing) return
                val kind = if (d.optString("game") == "dab") GameKind.Dots else GameKind.TicTacToe
                if (u.stage == Stage.Inviting) handshake(if (isHost) u.kind else kind)
                else _ui.update { it.copy(stage = Stage.Invited, kind = kind, declined = false) }
            }
            "accept" -> if (u.stage == Stage.Inviting) handshake(u.kind)
            "decline" -> _ui.update { GameUi(declined = true) }
            "state" -> d.optJSONObject("state")?.let { st ->
                val board = Board.from(st)
                _ui.update { it.copy(stage = Stage.Playing, kind = board.kind, board = board, me = if (isHost) 0 else 1) }
            }
            "left" -> if (u.stage == Stage.Playing) {
                _ui.update { it.copy(stage = Stage.Gone) }
                goneJob?.cancel()
                goneJob = scope.launch { delay(2600); if (_ui.value.stage == Stage.Gone) reset() }
            } else reset()
            "rematch" -> if (isHost) start(u.kind)
        }
    }

    private fun reset() { goneJob?.cancel(); _ui.value = GameUi() }

    private fun send(o: JSONObject) {
        if (calls.state.value.phase is CallPhase.Connected) socket.emit("game", o)
    }
}
