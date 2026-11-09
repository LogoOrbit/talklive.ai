package app.talklive.ui.game

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.talklive.R
import app.talklive.game.Board
import app.talklive.game.GameKind
import app.talklive.game.GameUi
import app.talklive.game.Stage
import app.talklive.ui.components.PrimaryButton
import app.talklive.ui.components.SecondaryButton
import app.talklive.ui.theme.BrandTeal
import app.talklive.ui.theme.BrandViolet
import kotlin.math.abs

private val P0 = BrandViolet
private val P1 = BrandTeal

/** The games sheet: pick and invite, wait, then play. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameSheet(
    ui: GameUi,
    partnerName: String,
    onInvite: (GameKind) -> Unit,
    onCell: (Int) -> Unit,
    onEdge: (Char, Int) -> Unit,
    onRematch: () -> Unit,
    onClose: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onClose, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = MaterialTheme.colorScheme.background) {
        GameContent(ui, partnerName, onInvite, onCell, onEdge, onRematch, onClose)
    }
}

/** What the games sheet shows; separate so it can be previewed. */
@Composable
internal fun GameContent(
    ui: GameUi,
    partnerName: String,
    onInvite: (GameKind) -> Unit,
    onCell: (Int) -> Unit,
    onEdge: (Char, Int) -> Unit,
    onRematch: () -> Unit,
    onClose: () -> Unit,
) {
    run {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            AnimatedContent(targetState = ui.stage, transitionSpec = { (fadeIn() + scaleIn(initialScale = 0.95f)) togetherWith fadeOut() }, label = "stage") { stage ->
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    when (stage) {
                        Stage.Idle, Stage.Invited -> Picker(ui.declined, partnerName, onInvite)
                        Stage.Inviting, Stage.Waiting -> {
                            app.talklive.ui.components.SymbolIcon("🎮", 44.dp)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                stringResource(if (stage == Stage.Inviting) R.string.game_waiting else R.string.game_starting, partnerName),
                                style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground,
                            )
                            Spacer(Modifier.height(16.dp))
                            SecondaryButton(stringResource(R.string.cancel), onClick = onClose)
                        }
                        Stage.Playing, Stage.Gone -> ui.board?.let { b -> Playing(b, ui.me, stage == Stage.Gone, partnerName, onCell, onEdge, onRematch, onClose) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Picker(declined: Boolean, partnerName: String, onInvite: (GameKind) -> Unit) {
    Text(stringResource(R.string.games_title), style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onBackground)
    Text(stringResource(R.string.games_body, partnerName), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    if (declined) {
        Spacer(Modifier.height(8.dp))
        Text(stringResource(R.string.game_declined, partnerName), color = app.talklive.ui.theme.DangerText, style = MaterialTheme.typography.bodyMedium)
    }
    Spacer(Modifier.height(16.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        GameCard("❌⭕", stringResource(R.string.tic_tac_toe), Modifier.weight(1f)) { onInvite(GameKind.TicTacToe) }
        GameCard("🔳", stringResource(R.string.dots_boxes), Modifier.weight(1f)) { onInvite(GameKind.Dots) }
    }
}

@Composable
private fun GameCard(emoji: String, title: String, modifier: Modifier, onClick: () -> Unit) {
    Surface(onClick = onClick, shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surface, modifier = modifier) {
        Column(Modifier.padding(vertical = 22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            app.talklive.ui.components.SymbolIcon(emoji, 34.dp)
            Spacer(Modifier.height(8.dp))
            Text(title, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(stringResource(R.string.invite), style = MaterialTheme.typography.labelMedium, color = app.talklive.ui.theme.AccentText)
        }
    }
}

@Composable
private fun Playing(b: Board, me: Int, gone: Boolean, partnerName: String, onCell: (Int) -> Unit, onEdge: (Char, Int) -> Unit, onRematch: () -> Unit, onClose: () -> Unit) {
    val haptics = LocalHapticFeedback.current
    LaunchedEffect(b.over, b.winner) { if (b.over && b.winner == me) haptics.performHapticFeedback(HapticFeedbackType.LongPress) }
    val status = when {
        gone -> stringResource(R.string.game_left, partnerName)
        b.over && b.winner == -1 -> stringResource(R.string.game_draw)
        b.over && b.winner == me -> stringResource(R.string.game_you_win)
        b.over -> stringResource(R.string.game_they_win, partnerName)
        b.turn == me -> stringResource(R.string.game_your_turn)
        else -> stringResource(R.string.game_their_turn, partnerName)
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        PlayerTag(stringResource(R.string.you), if (me == 0) P0 else P1, active = !b.over && b.turn == me, score = if (b.kind == GameKind.Dots) b.scores[me] else null)
        PlayerTag(partnerName, if (me == 0) P1 else P0, active = !b.over && b.turn != me, score = if (b.kind == GameKind.Dots) b.scores[1 - me] else null)
    }
    Spacer(Modifier.height(12.dp))
    AnimatedContent(targetState = status, label = "status") { Text(it, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground) }
    Spacer(Modifier.height(12.dp))
    Box(Modifier.widthIn(max = 360.dp).fillMaxWidth().aspectRatio(1f).scale(if (gone) 0.97f else 1f)) {
        if (b.kind == GameKind.TicTacToe) TttBoard(b, enabled = !gone && !b.over && b.turn == me) { haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); onCell(it) }
        else DotsBoard(b, enabled = !gone && !b.over && b.turn == me) { k, i -> haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove); onEdge(k, i) }
    }
    Spacer(Modifier.height(16.dp))
    if (b.over && !gone) PrimaryButton(stringResource(R.string.rematch), onClick = onRematch)
    TextButton(onClick = onClose) { Text(stringResource(R.string.end_game)) }
}

@Composable
private fun PlayerTag(name: String, color: Color, active: Boolean, score: Int?) {
    val a by animateFloatAsState(if (active) 1f else 0.45f, label = "a")
    Row(
        Modifier.clip(CircleShape).background(color.copy(alpha = 0.12f * a + 0.04f)).padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color.copy(alpha = a)))
        Spacer(Modifier.size(8.dp))
        Text(name + (score?.let { "  $it" } ?: ""), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f + a / 2))
    }
}

/** 3×3 board; marks spring in, the winning line draws across. */
@Composable
private fun TttBoard(b: Board, enabled: Boolean, onCell: (Int) -> Unit) {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        for (r in 0 until 3) Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            for (c in 0 until 3) {
                val i = r * 3 + c
                val v = b.cells[i]
                val win = b.line?.contains(i) == true
                Box(
                    Modifier.weight(1f).fillMaxSize().clip(RoundedCornerShape(18.dp))
                        .background(if (win) (if (v == 0) P0 else P1).copy(alpha = 0.18f) else MaterialTheme.colorScheme.surface)
                        .clickable(enabled = enabled && v == null) { onCell(i) },
                    contentAlignment = Alignment.Center,
                ) {
                    if (v != null) key(v) {
                        val grow = remember { Animatable(0f) }
                        LaunchedEffect(Unit) { grow.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = 400f)) }
                        Canvas(Modifier.fillMaxSize(0.5f).scale(grow.value)) {
                            val w = size.minDimension * 0.16f
                            if (v == 0) {
                                drawLine(P0, Offset(0f, 0f), Offset(size.width, size.height), w, StrokeCap.Round)
                                drawLine(P0, Offset(size.width, 0f), Offset(0f, size.height), w, StrokeCap.Round)
                            } else {
                                drawCircle(P1, radius = size.minDimension / 2 - w / 2, style = Stroke(w))
                            }
                        }
                    }
                }
            }
        }
    }
}

/** 5×5 dots: tap between two dots to draw a line; closed boxes fill with the closer's colour. */
@Composable
private fun DotsBoard(b: Board, enabled: Boolean, onEdge: (Char, Int) -> Unit) {
    val n = Board.DAB_N
    val surface = MaterialTheme.colorScheme.surface
    val dot = MaterialTheme.colorScheme.onSurfaceVariant
    val faint = MaterialTheme.colorScheme.outline
    Canvas(
        Modifier.fillMaxSize().clip(RoundedCornerShape(20.dp)).background(surface).pointerInput(enabled, b) {
            if (!enabled) return@pointerInput
            detectTapGestures { p ->
                val pad = size.width * 0.1f
                val cell = (size.width - 2 * pad) / n
                val x = (p.x - pad) / cell
                val y = (p.y - pad) / cell
                // Nearest edge: horizontal edges sit on whole-number rows, vertical on whole-number columns.
                val hr = Math.round(y); val hc = x.toInt()
                val vc = Math.round(x); val vr = y.toInt()
                val dh = abs(y - hr); val dv = abs(x - vc)
                if (dh <= dv && hr in 0..n && hc in 0 until n) onEdge('h', hr * n + hc)
                else if (vc in 0..n && vr in 0 until n) onEdge('v', vr * (n + 1) + vc)
            }
        },
    ) {
        val pad = size.width * 0.1f
        val cell = (size.width - 2 * pad) / n
        fun pt(r: Int, c: Int) = Offset(pad + c * cell, pad + r * cell)
        // Boxes.
        for (bx in 0 until n * n) {
            val owner = b.boxes[bx] ?: continue
            val r = bx / n; val c = bx % n
            drawRoundRect((if (owner == 0) P0 else P1).copy(alpha = 0.22f), pt(r, c) + Offset(cell * 0.08f, cell * 0.08f), Size(cell * 0.84f, cell * 0.84f), androidx.compose.ui.geometry.CornerRadius(cell * 0.15f))
        }
        val w = cell * 0.1f
        // Horizontal and vertical edges.
        for (r in 0..n) for (c in 0 until n) {
            val owner = b.h[r * n + c]
            drawLine(if (owner == null) faint else if (owner == 0) P0 else P1, pt(r, c), pt(r, c + 1), if (owner == null) w * 0.35f else w, StrokeCap.Round)
        }
        for (r in 0 until n) for (c in 0..n) {
            val owner = b.v[r * (n + 1) + c]
            drawLine(if (owner == null) faint else if (owner == 0) P0 else P1, pt(r, c), pt(r + 1, c), if (owner == null) w * 0.35f else w, StrokeCap.Round)
        }
        for (r in 0..n) for (c in 0..n) drawCircle(dot, w * 0.75f, pt(r, c))
    }
}

/** "Sofia wants to play" over the call. */
@Composable
fun GameInviteDialog(kind: GameKind, partnerName: String, onAccept: () -> Unit, onDecline: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDecline,
        icon = { app.talklive.ui.components.SymbolIcon("🎮", 34.dp) },
        title = { Text(stringResource(R.string.game_invite_title, partnerName)) },
        text = { Text(stringResource(if (kind == GameKind.Dots) R.string.dots_boxes else R.string.tic_tac_toe)) },
        confirmButton = { TextButton(onClick = onAccept) { Text(stringResource(R.string.play)) } },
        dismissButton = { TextButton(onClick = onDecline) { Text(stringResource(R.string.not_now)) } },
    )
}

