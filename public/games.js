// Shared mini-games (Tic Tac Toe and Dots & Boxes) for both sub-apps: the
// voice-call screen (app.js) and the text-chat page (chat.js). Both pages ship
// the same markup (see the #gameOverlay block) and the same games.css, and the
// server relays the 'game' event to whoever the sender is paired with, so the
// only per-page differences are injected here: which socket to talk on, who
// hosts the match, and how the page makes a sound.
//
// The game state is authoritative on the acting player's client and broadcast
// in full to the partner after each move, so the two clients can never desync.
//
// window.TalkLiveGames.attach({
//   socket,                     // the page's socket.io connection
//   gameBtn,                    // top-bar button that opens the overlay
//   isConnected: () => bool,    // is there a live partner right now?
//   isHost: () => bool,         // exactly one side of the pair must say true
//   partnerName: () => string,  // display name of the partner, or ''
//   myName: () => string,       // my own display name, or ''
//   vibrate, openModal, closeModal,   // the page's own helpers
//   sound: (kind) => {},        // 'move' | 'turn' | 'win' | 'lose' | 'invite'
// }) -> { reset, partnerGone, partnerLeft, attemptClose, isOpen, isPlaying,
//         isActive, open }
(function () {
  'use strict';

  function attach(opts) {
    if (!opts || !opts.socket) return null;
    const t = (key, vars) => (typeof window.t === 'function' ? window.t(key, vars) : key);
    const buzz = (pattern) => { if (opts.vibrate) opts.vibrate(pattern); };
    const sound = (kind) => { if (opts.sound) opts.sound(kind); };

    const gameBtnBadge = document.getElementById('gameBtnBadge');
    const gameOverlay = document.getElementById('gameOverlay');
    const closeGameBtn = document.getElementById('closeGameBtn');
    const gameStatus = document.getElementById('gameStatus');
    const tttBoard = document.getElementById('tttBoard');
    const gameTitle = document.getElementById('gameTitle');
    const gamePicker = document.getElementById('gamePicker');
    const dabBoardWrap = document.getElementById('dabBoardWrap');
    const tttBoardWrap = document.getElementById('tttBoardWrap');
    const dabCanvas = document.getElementById('dabCanvas');
    const gameCancelBtn = document.getElementById('gameCancelBtn');
    const gameAcceptBtn = document.getElementById('gameAcceptBtn');
    const gameDeclineBtn = document.getElementById('gameDeclineBtn');
    const tttRematchBtn = document.getElementById('tttRematchBtn');
    const tttPlayers = document.getElementById('tttPlayers');
    const tttMeAvatar = document.getElementById('tttMeAvatar');
    const tttMeName = document.getElementById('tttMeName');
    const tttMeActivity = document.getElementById('tttMeActivity');
    const tttOppAvatar = document.getElementById('tttOppAvatar');
    const tttOppName = document.getElementById('tttOppName');
    const tttOppActivity = document.getElementById('tttOppActivity');
    const tttPlayerMe = document.getElementById('tttPlayerMe');
    const tttPlayerOpp = document.getElementById('tttPlayerOpp');
    const tttBoardArea = document.getElementById('tttBoardArea');
    const tttDisconnectBanner = document.getElementById('tttDisconnectBanner');
    const tttEndConfirmModal = document.getElementById('tttEndConfirmModal');
    const tttContinueBtn = document.getElementById('tttContinueBtn');
    const tttEndBtn = document.getElementById('tttEndBtn');
    const gameInviteOverlay = document.getElementById('gameInviteOverlay');
    const gameInviteText = document.getElementById('gameInviteText');
    const gameInviteAcceptBtn = document.getElementById('gameInviteAcceptBtn');
    const gameInviteDeclineBtn = document.getElementById('gameInviteDeclineBtn');


    // All 8 ways to win on a 3x3 board.
    const TTT_LINES = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];

    let tttState = null;      // shared game state (either game), or null when no game
    let tttStage = 'idle';    // idle | inviting | invited | playing
    let myPlayerIndex = 0;    // 0 = call initiator, 1 = the other
    let tttBoardBuilt = false;
    let tttWasMyTurn = false; // tracks the transition into "it's your move"

    // Which mini-game is in play / being negotiated: 'ttt' or 'dab' (Dots & Boxes).
    let activeGame = null;
    let inviteGame = null;        // game I invited the partner to
    let pendingInviteGame = null; // game the partner invited me to

    function gameName(g) { return g === 'dab' ? t('gameDab') : t('gameTtt'); }

    // True when the game is waiting on *me* to move right now.
    function tttIsMyActionableTurn() {
      return tttStage === 'playing' && tttState && tttState.phase !== 'over'
        && tttState.turn === myPlayerIndex;
    }

    function buildTttBoard() {
      if (tttBoardBuilt) return;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'ttt-cell empty';
        cell.dataset.i = String(i);
        cell.addEventListener('click', () => tttTapCell(i));
        frag.appendChild(cell);
      }
      tttBoard.appendChild(frag);
      tttBoardBuilt = true;
    }

    function tttInitialState() {
      return { board: Array(9).fill(null), turn: 0, phase: 'move', winner: null, line: null };
    }

    function tttWinningLine(board, pidx) {
      return TTT_LINES.find((line) => line.every((i) => board[i] === pidx)) || null;
    }

    function tttApplyMove(state, pidx, i) {
      state.board[i] = pidx;
      const line = tttWinningLine(state.board, pidx);
      if (line) {
        state.phase = 'over';
        state.winner = pidx;
        state.line = line;
      } else if (state.board.every((v) => v !== null)) {
        state.phase = 'over';
        state.winner = 'draw';
      } else {
        state.turn = 1 - pidx;
      }
    }

    function broadcastTtt() {
      opts.socket.emit('game', { type: 'state', state: tttState });
    }

    function tttTapCell(i) {
      if (!tttState || tttStage !== 'playing') return;
      if (tttState.turn !== myPlayerIndex || tttState.phase !== 'move') return;
      if (tttState.board[i] !== null) return;
      tttApplyMove(tttState, myPlayerIndex, i);
      sound('move');
      buzz(15);
      broadcastTtt();
      updateGameUI();
    }

    // =====================================================================
    // Dots and Boxes - 5×5 dots (4×4 boxes), canvas-rendered at 60fps.
    // Same authority model as Tic Tac Toe: the mover applies locally and
    // broadcasts the full state. Closing a box scores a point and grants
    // another turn; most boxes when the grid is full wins.
    // =====================================================================
    const DAB_N = 4; // boxes per side → 5×5 dots, 20 h-edges + 20 v-edges

    function dabInitialState() {
      return {
        g: 'dab',
        h: Array((DAB_N + 1) * DAB_N).fill(null),
        v: Array(DAB_N * (DAB_N + 1)).fill(null),
        boxes: Array(DAB_N * DAB_N).fill(null),
        scores: [0, 0],
        turn: 0, phase: 'move', winner: null, last: null,
      };
    }

    // The four edges surrounding box (r, c).
    function dabBoxEdges(r, c) {
      return [
        ['h', r * DAB_N + c], ['h', (r + 1) * DAB_N + c],
        ['v', r * (DAB_N + 1) + c], ['v', r * (DAB_N + 1) + c + 1],
      ];
    }
    function dabBoxComplete(state, b) {
      const r = Math.floor(b / DAB_N), c = b % DAB_N;
      return dabBoxEdges(r, c).every(([k, i]) => (k === 'h' ? state.h : state.v)[i] !== null);
    }

    function dabApplyMove(state, pidx, kind, i) {
      const arr = kind === 'h' ? state.h : state.v;
      if (arr[i] !== null) return false;
      arr[i] = pidx;
      state.last = { k: kind, i };
      let closed = 0;
      for (let b = 0; b < DAB_N * DAB_N; b++) {
        if (state.boxes[b] === null && dabBoxComplete(state, b)) {
          state.boxes[b] = pidx;
          closed++;
        }
      }
      state.scores[pidx] += closed;
      if (state.boxes.every((v) => v !== null)) {
        state.phase = 'over';
        state.winner = state.scores[0] === state.scores[1] ? 'draw' : (state.scores[0] > state.scores[1] ? 0 : 1);
      } else if (!closed) {
        state.turn = 1 - pidx; // closing a box keeps the turn
      }
      return true;
    }

    // --- Canvas rendering: crisp (DPR-aware), animated line draws + box fills,
    // hover/tap edge preview. A rAF loop runs only while the board is visible. ---
    let dabCtx = null;
    let dabRafId = null;
    let dabCssSize = 0;
    const dabEdgeAnim = new Map(); // 'h12' -> timestamp the edge appeared
    const dabBoxAnim = new Map();  // boxIndex -> timestamp it was claimed
    let dabHover = null;           // { k, i } candidate edge under the pointer
    let dabPalette = null;

    function dabColors() {
      if (!dabPalette) {
        const cs = getComputedStyle(document.documentElement);
        dabPalette = {
          p0: (cs.getPropertyValue('--accent-2') || '#00d4ff').trim() || '#00d4ff',
          p0Soft: 'rgba(0, 212, 255, 0.22)',
          p1: '#ffb04d',
          p1Soft: 'rgba(255, 176, 77, 0.22)',
          dot: (cs.getPropertyValue('--text') || '#fff').trim() || '#fff',
        };
      }
      return dabPalette;
    }

    function dabResizeCanvas() {
      const wrapW = dabBoardWrap.clientWidth || 320;
      dabCssSize = Math.max(220, Math.min(wrapW, 340));
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      dabCanvas.style.width = dabCssSize + 'px';
      dabCanvas.style.height = dabCssSize + 'px';
      dabCanvas.width = Math.round(dabCssSize * dpr);
      dabCanvas.height = Math.round(dabCssSize * dpr);
      dabCtx = dabCanvas.getContext('2d');
      dabCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Board geometry in CSS pixels: dots evenly spaced with an outer margin.
    function dabGeom() {
      const pad = dabCssSize * 0.09;
      const step = (dabCssSize - pad * 2) / DAB_N;
      return { pad, step };
    }
    function dabEdgeEnds(kind, i) {
      const { pad, step } = dabGeom();
      if (kind === 'h') {
        const r = Math.floor(i / DAB_N), c = i % DAB_N;
        return [pad + c * step, pad + r * step, pad + (c + 1) * step, pad + r * step];
      }
      const r = Math.floor(i / (DAB_N + 1)), c = i % (DAB_N + 1);
      return [pad + c * step, pad + r * step, pad + c * step, pad + (r + 1) * step];
    }

    // Nearest empty edge to a point, within a comfortable touch distance.
    function dabPickEdge(x, y) {
      if (!tttState || tttState.g !== 'dab') return null;
      const { step } = dabGeom();
      let best = null, bestD = step * 0.42;
      const consider = (kind, count) => {
        for (let i = 0; i < count; i++) {
          if ((kind === 'h' ? tttState.h : tttState.v)[i] !== null) continue;
          const [x1, y1, x2, y2] = dabEdgeEnds(kind, i);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          // Distance to the segment's midpoint, biased so you can tap anywhere along it.
          const along = kind === 'h' ? Math.abs(x - mx) - step * 0.32 : Math.abs(y - my) - step * 0.32;
          const across = kind === 'h' ? Math.abs(y - my) : Math.abs(x - mx);
          const d = Math.max(along, 0) + across;
          if (d < bestD) { bestD = d; best = { k: kind, i }; }
        }
      };
      consider('h', tttState.h.length);
      consider('v', tttState.v.length);
      return best;
    }

    function drawDabBoard(now) {
      if (!dabCtx || !tttState || tttState.g !== 'dab') return;
      const ctx = dabCtx;
      const colors = dabColors();
      const { step } = dabGeom();
      ctx.clearRect(0, 0, dabCssSize, dabCssSize);

      // Claimed boxes fade in with a slight grow.
      for (let b = 0; b < DAB_N * DAB_N; b++) {
        const owner = tttState.boxes[b];
        if (owner === null) { dabBoxAnim.delete(b); continue; }
        if (!dabBoxAnim.has(b)) dabBoxAnim.set(b, now);
        const p = Math.min((now - dabBoxAnim.get(b)) / 260, 1);
        const ease = 1 - (1 - p) * (1 - p);
        const r = Math.floor(b / DAB_N), c = b % DAB_N;
        const [bx, by] = [dabEdgeEnds('h', r * DAB_N + c)[0], dabEdgeEnds('h', r * DAB_N + c)[1]];
        const inset = 5 + (1 - ease) * step * 0.18;
        ctx.globalAlpha = ease;
        ctx.fillStyle = owner === 0 ? colors.p0Soft : colors.p1Soft;
        const rr = 7;
        const x = bx + inset, y = by + inset, w = step - inset * 2, h = step - inset * 2;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, rr);
        ctx.fill();
        // Owner initial in the middle of the box.
        ctx.globalAlpha = ease * 0.95;
        ctx.fillStyle = owner === 0 ? colors.p0 : colors.p1;
        ctx.font = `800 ${Math.round(step * 0.34)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ownerName = owner === myPlayerIndex
          ? t('you')
          : (opts.partnerName() || '?');
        ctx.fillText((ownerName[0] || '?').toUpperCase(), bx + step / 2, by + step / 2 + 1);
        ctx.globalAlpha = 1;
      }

      // Hover / tap-preview edge (only when it's my move).
      if (dabHover && tttIsMyActionableTurn()) {
        const [x1, y1, x2, y2] = dabEdgeEnds(dabHover.k, dabHover.i);
        ctx.strokeStyle = myPlayerIndex === 0 ? colors.p0 : colors.p1;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.setLineDash([2, 7]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Drawn edges animate outward from their centre.
      const drawEdge = (kind, i, owner) => {
        const key = kind + i;
        if (!dabEdgeAnim.has(key)) dabEdgeAnim.set(key, now);
        const p = Math.min((now - dabEdgeAnim.get(key)) / 180, 1);
        const [x1, y1, x2, y2] = dabEdgeEnds(kind, i);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const isLast = tttState.last && tttState.last.k === kind && tttState.last.i === i;
        ctx.strokeStyle = owner === 0 ? colors.p0 : colors.p1;
        ctx.lineWidth = isLast ? 5.5 : 4.5;
        ctx.lineCap = 'round';
        if (isLast && p >= 1) {
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 7;
        }
        ctx.beginPath();
        ctx.moveTo(mx + (x1 - mx) * p, my + (y1 - my) * p);
        ctx.lineTo(mx + (x2 - mx) * p, my + (y2 - my) * p);
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      tttState.h.forEach((owner, i) => { if (owner !== null) drawEdge('h', i, owner); else dabEdgeAnim.delete('h' + i); });
      tttState.v.forEach((owner, i) => { if (owner !== null) drawEdge('v', i, owner); else dabEdgeAnim.delete('v' + i); });

      // Dots on top.
      ctx.fillStyle = colors.dot;
      for (let r = 0; r <= DAB_N; r++) {
        for (let c = 0; c <= DAB_N; c++) {
          const { pad, step: s } = dabGeom();
          ctx.beginPath();
          ctx.arc(pad + c * s, pad + r * s, dabCssSize * 0.013 + 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function dabLoop(ts) {
      drawDabBoard(ts || performance.now());
      dabRafId = requestAnimationFrame(dabLoop);
    }
    function startDabLoop() {
      if (dabRafId !== null) return;
      dabResizeCanvas();
      dabRafId = requestAnimationFrame(dabLoop);
    }
    function stopDabLoop() {
      if (dabRafId !== null) cancelAnimationFrame(dabRafId);
      dabRafId = null;
    }
    window.addEventListener('resize', () => { if (dabRafId !== null) dabResizeCanvas(); });

    function dabPointerPos(e) {
      const rect = dabCanvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }
    dabCanvas.addEventListener('pointermove', (e) => {
      const [x, y] = dabPointerPos(e);
      dabHover = dabPickEdge(x, y);
    });
    dabCanvas.addEventListener('pointerleave', () => { dabHover = null; });
    dabCanvas.addEventListener('pointerdown', (e) => {
      if (!tttState || tttState.g !== 'dab' || !tttIsMyActionableTurn()) return;
      const [x, y] = dabPointerPos(e);
      const edge = dabPickEdge(x, y);
      if (!edge) return;
      if (!dabApplyMove(tttState, myPlayerIndex, edge.k, edge.i)) return;
      dabHover = null;
      sound('move');
      buzz(15);
      broadcastTtt();
      updateGameUI();
    });

    function renderTttBoard() {
      if (activeGame === 'dab') return;
      buildTttBoard();
      const cells = tttBoard.querySelectorAll('.ttt-cell');
      const myTurn = tttState && tttState.turn === myPlayerIndex && tttState.phase === 'move';
      cells.forEach((cell, i) => {
        const val = tttState ? tttState.board[i] : null;
        cell.classList.toggle('empty', val === null);
        cell.classList.toggle('p0', val === 0);
        cell.classList.toggle('p1', val === 1);
        cell.classList.toggle('movable', myTurn && val === null);
        cell.classList.toggle('win', !!(tttState && tttState.line && tttState.line.includes(i)));
        cell.innerHTML = val === null ? '' : `<span class="ttt-mark">${val === 0 ? '✕' : '◯'}</span>`;
      });
    }

    // The player status bar: avatar, name, whose turn, and what the opponent is
    // doing right now - so you never have to guess what's happening.
    function renderTttPlayers() {
      const playing = tttStage === 'playing' && tttState;
      tttPlayers.classList.toggle('hidden', !playing);
      if (!playing) return;

      const oppName = opts.partnerName() || '-';
      tttMeName.textContent = t('you');
      tttOppName.textContent = oppName;
      // Colour each chip by that player's actual mark/colour (0 = host, 1 = guest).
      tttMeAvatar.className = 'ttt-player-avatar p' + myPlayerIndex;
      tttOppAvatar.className = 'ttt-player-avatar p' + (1 - myPlayerIndex);
      tttMeAvatar.textContent = (((opts.myName() || t('you'))[0]) || 'Y').toUpperCase();
      tttOppAvatar.textContent = ((oppName && oppName[0]) || '?').toUpperCase();

      const live = tttState.phase !== 'over';
      const myTurn = live && tttState.turn === myPlayerIndex;
      const oppTurn = live && tttState.turn !== myPlayerIndex;
      tttPlayerMe.classList.toggle('active', myTurn);
      tttPlayerOpp.classList.toggle('active', oppTurn);

      if (activeGame === 'dab' && Array.isArray(tttState.scores)) {
        // Dots & Boxes: the activity line doubles as a live score.
        tttMeActivity.textContent = `${t('dabBoxes')}: ${tttState.scores[myPlayerIndex]}`;
        tttOppActivity.textContent = `${t('dabBoxes')}: ${tttState.scores[1 - myPlayerIndex]}`;
      } else {
        tttMeActivity.textContent = myTurn ? t('tttYourTurn') : '';
        tttOppActivity.textContent = oppTurn ? t('tttActThinking') : '';
      }
    }

    function updateGameUI() {
      const name = opts.partnerName() || t('chat');
      [gameCancelBtn, gameAcceptBtn, gameDeclineBtn, tttRematchBtn].forEach((b) => b.classList.add('hidden'));
      renderTttPlayers();

      // Which board (if any) is visible, and the picker only when nothing's afoot.
      const showBoards = tttStage === 'playing' || tttStage === 'gone';
      gamePicker.classList.toggle('hidden', tttStage !== 'idle');
      tttBoardWrap.classList.toggle('hidden', !(showBoards && activeGame !== 'dab'));
      dabBoardWrap.classList.toggle('hidden', !(showBoards && activeGame === 'dab'));
      const negotiating = tttStage === 'inviting' || tttStage === 'invited';
      gameTitle.textContent = tttStage === 'idle'
        ? t('gamesTitle')
        : gameName(negotiating ? (tttStage === 'inviting' ? inviteGame : pendingInviteGame) : activeGame);

      if (tttStage === 'idle') {
        gameStatus.textContent = t('gamePickPrompt', { name });
      } else if (tttStage === 'inviting') {
        gameStatus.textContent = t('tttInviteSent', { name });
        gameCancelBtn.classList.remove('hidden');
      } else if (tttStage === 'invited') {
        gameStatus.textContent = t('gameInvited', { name, game: gameName(pendingInviteGame) });
        gameAcceptBtn.classList.remove('hidden');
        gameDeclineBtn.classList.remove('hidden');
      } else if (tttStage === 'playing' && tttState) {
        // Offered once a game has ended; mid-game it read as "start over".
        tttRematchBtn.classList.toggle('hidden', tttState.phase !== 'over');
        const myTurn = tttState.turn === myPlayerIndex;
        if (tttState.phase === 'over') {
          gameStatus.textContent = tttState.winner === 'draw'
            ? t('tttDraw')
            : (tttState.winner === myPlayerIndex ? t('tttYouWin') : t('tttTheyWin', { name }));
          if (!tttOverAnnounced) {
            tttOverAnnounced = true;
            if (tttState.winner === myPlayerIndex) { sound('win'); buzz([40, 60, 40, 60, 80]); }
            else if (tttState.winner !== 'draw') { sound('lose'); }
          }
        } else {
          const yourTurnKey = activeGame === 'dab' ? 'dabYourTurn' : 'tttYourTurn';
          gameStatus.textContent = myTurn ? t(yourTurnKey) : t('tttTheirTurn', { name });
        }
      } else if (tttStage === 'playing') {
        // handshake done, waiting for the host's first state broadcast
        gameStatus.textContent = t('tttTheirTurn', { name });
      }
      renderTttBoard();

      // Keep the Dots & Boxes render loop alive only while its board is on screen.
      const dabVisible = activeGame === 'dab' && showBoards && !gameOverlay.classList.contains('hidden');
      if (dabVisible) startDabLoop(); else stopDabLoop();

      // Chime once when the turn passes to you; show a "your move" badge on the
      // game button while it's your turn and you're not looking at the board.
      const mine = tttIsMyActionableTurn();
      const overlayOpen = !gameOverlay.classList.contains('hidden');
      if (mine && !tttWasMyTurn) {
        sound('turn');
        buzz(30);
      }
      if (mine && !overlayOpen) {
        gameBtnBadge.textContent = activeGame === 'dab' ? '●' : (myPlayerIndex === 0 ? '✕' : '◯');
        gameBtnBadge.classList.add('is-move');
        gameBtnBadge.classList.remove('hidden');
      } else if (overlayOpen && gameBtnBadge.classList.contains('is-move')) {
        gameBtnBadge.classList.add('hidden');
        gameBtnBadge.classList.remove('is-move');
      }
      tttWasMyTurn = mine;
    }

    let tttOverAnnounced = false;

    // The centred "wants to play" prompt. It sits above everything else so an
    // invite is impossible to miss, wherever the user happens to be looking.
    function showInvitePopup() {
      if (!gameInviteOverlay) return;
      gameInviteText.textContent = t('gameInvited', {
        name: opts.partnerName() || t('chat'),
        game: gameName(pendingInviteGame),
      });
      gameInviteOverlay.classList.remove('hidden');
    }
    function hideInvitePopup() {
      if (gameInviteOverlay) gameInviteOverlay.classList.add('hidden');
    }

    // Shared by the popup and the in-overlay buttons.
    function acceptInvite() {
      hideInvitePopup();
      if (tttStage !== 'invited') return;
      const game = pendingInviteGame || 'ttt';
      opts.socket.emit('game', { type: 'accept', game });
      onGameHandshake(game);
    }
    function declineInvite() {
      hideInvitePopup();
      if (tttStage !== 'invited') return;
      opts.socket.emit('game', { type: 'decline' });
      tttStage = 'idle';
      pendingInviteGame = null;
      closeGameOverlay();
    }

    function openGameOverlay() {
      hideInvitePopup();
      buildTttBoard();
      clearGameDisconnect();
      gameOverlay.classList.remove('hidden');
      gameBtnBadge.classList.add('hidden');
      gameBtnBadge.classList.remove('is-move', 'is-invite');
    }
    function closeGameOverlay() {
      gameOverlay.classList.add('hidden');
      stopDabLoop();
      opts.closeModal(tttEndConfirmModal);
    }
    function resetGame() {
      hideInvitePopup();
      tttStage = 'idle';
      tttState = null;
      activeGame = null;
      inviteGame = null;
      pendingInviteGame = null;
      tttWasMyTurn = false;
      tttOverAnnounced = false;
      dabEdgeAnim.clear();
      dabBoxAnim.clear();
      dabHover = null;
      clearGameDisconnect();
      gameBtnBadge.classList.add('hidden');
      gameBtnBadge.classList.remove('is-move', 'is-invite');
      gameBtnBadge.textContent = '!';
      closeGameOverlay();
    }

    // Grayscale the board + show a red message when the call itself drops mid-game.
    function markGamePartnerGone() {
      if (gameOverlay.classList.contains('hidden')) { resetGame(); return; }
      tttBoardArea.classList.add('is-dead');
      tttDisconnectBanner.textContent = t('tttPartnerHungUp');
      tttDisconnectBanner.classList.remove('hidden');
      gameStatus.textContent = t('tttPartnerHungUp');
      tttStage = 'gone';
      sound('lose');
    }
    function clearGameDisconnect() {
      tttBoardArea.classList.remove('is-dead');
      tttDisconnectBanner.classList.add('hidden');
    }

    // The partner deliberately left the game (closed their window / End Game).
    function markGamePartnerLeft() {
      tttDisconnectBanner.textContent = t('tttPartnerLeft');
      tttDisconnectBanner.classList.remove('hidden');
      tttBoardArea.classList.add('is-dead');
      gameStatus.textContent = t('tttPartnerLeft');
      tttStage = 'gone';
      sound('lose');
      // Auto-clear back to the invite screen after a moment so a rematch is easy.
      setTimeout(() => {
        if (tttStage === 'gone' && opts.isConnected()) {
          tttStage = 'idle'; tttState = null; tttOverAnnounced = false;
          clearGameDisconnect();
          updateGameUI();
        }
      }, 2600);
    }

    // Host (call initiator) builds the authoritative initial state and shares it.
    function startGame(game) {
      activeGame = game === 'dab' ? 'dab' : 'ttt';
      tttState = activeGame === 'dab' ? dabInitialState() : tttInitialState();
      myPlayerIndex = 0;
      tttStage = 'playing';
      tttOverAnnounced = false;
      dabEdgeAnim.clear();
      dabBoxAnim.clear();
      clearGameDisconnect();
      broadcastTtt();
      openGameOverlay();
      updateGameUI();
    }

    // Both sides have agreed to play - exactly one of them is the host.
    function onGameHandshake(game) {
      if (opts.isHost()) {
        startGame(game);
      } else {
        activeGame = game === 'dab' ? 'dab' : 'ttt';
        myPlayerIndex = 1;
        tttStage = 'playing';
        tttOverAnnounced = false;
        dabEdgeAnim.clear();
        dabBoxAnim.clear();
        clearGameDisconnect();
        openGameOverlay();
        updateGameUI();
      }
    }

    // Closing the game window mid-play asks for confirmation first (and, if the
    // user confirms, tells the partner the game ended). Any other stage just closes.
    function isGameActive() {
      return tttStage === 'playing' && tttState && tttState.phase !== 'over';
    }
    function attemptCloseGame() {
      if (isGameActive()) {
        opts.openModal(tttEndConfirmModal);
        return false;
      }
      if (tttStage === 'playing' || tttStage === 'inviting' || tttStage === 'invited') {
        // A finished/over game or a pending invite - leave cleanly.
        opts.socket.emit('game', { type: 'left' });
        resetGame();
      } else {
        closeGameOverlay();
      }
      return true;
    }

    opts.gameBtn.addEventListener('click', () => {
      if (!opts.isConnected()) return;
      openGameOverlay();
      updateGameUI();
    });
    closeGameBtn.addEventListener('click', attemptCloseGame);
    tttContinueBtn.addEventListener('click', () => opts.closeModal(tttEndConfirmModal));
    tttEndBtn.addEventListener('click', () => {
      opts.closeModal(tttEndConfirmModal);
      opts.socket.emit('game', { type: 'left' });
      resetGame();
    });

    // Picking a game from the picker sends the invite for that game.
    gamePicker.addEventListener('click', (e) => {
      const card = e.target.closest('.game-pick-card');
      if (!card || !opts.isConnected() || tttStage !== 'idle') return;
      inviteGame = card.dataset.game === 'dab' ? 'dab' : 'ttt';
      tttStage = 'inviting';
      sound('invite');
      opts.socket.emit('game', { type: 'invite', game: inviteGame });
      updateGameUI();
    });
    gameCancelBtn.addEventListener('click', () => {
      opts.socket.emit('game', { type: 'decline' });
      tttStage = 'idle';
      inviteGame = null;
      updateGameUI();
    });
    gameAcceptBtn.addEventListener('click', acceptInvite);
    gameDeclineBtn.addEventListener('click', declineInvite);
    if (gameInviteAcceptBtn) gameInviteAcceptBtn.addEventListener('click', acceptInvite);
    if (gameInviteDeclineBtn) gameInviteDeclineBtn.addEventListener('click', declineInvite);
    tttRematchBtn.addEventListener('click', () => {
      if (opts.isHost()) startGame(activeGame);
      else opts.socket.emit('game', { type: 'rematch' });
    });

    opts.socket.on('game', (data) => {
      if (!data || typeof data !== 'object' || !opts.isConnected()) return;
      const name = opts.partnerName() || t('chat');
      switch (data.type) {
        case 'invite': {
          if (tttStage === 'playing') return;
          const invitedTo = data.game === 'dab' ? 'dab' : 'ttt';
          // Both invited each other at once - just start the host's pick.
          if (tttStage === 'inviting') { onGameHandshake(opts.isHost() ? inviteGame : invitedTo); break; }
          tttStage = 'invited';
          pendingInviteGame = invitedTo;
          if (!gameOverlay.classList.contains('hidden')) {
            // They're already looking at the games screen - show the accept UI.
            updateGameUI();
          } else {
            // Ask right away, in the middle of the screen: a play request is a
            // live invitation, so it gets a prompt rather than a quiet badge.
            gameBtnBadge.textContent = '!';
            gameBtnBadge.classList.add('is-invite');
            gameBtnBadge.classList.remove('hidden', 'is-move');
            showInvitePopup();
          }
          sound('invite');
          buzz(30);
          break;
        }
        case 'accept':
          if (tttStage === 'inviting') onGameHandshake(inviteGame || (data.game === 'dab' ? 'dab' : 'ttt'));
          break;
        case 'decline':
          hideInvitePopup();
          tttStage = 'idle';
          tttState = null;
          pendingInviteGame = null;
          updateGameUI();
          gameStatus.textContent = t('tttDeclined', { name });
          break;
        case 'state': {
          if (!data.state) break;
          hideInvitePopup();
          myPlayerIndex = opts.isHost() ? 0 : 1;
          // Open the board on the first state (game start); afterwards just update -
          // don't yank a closed board back open, so the "your move" badge can show.
          const firstState = tttStage !== 'playing';
          if (firstState) tttOverAnnounced = false;
          tttStage = 'playing';
          activeGame = data.state.g === 'dab' ? 'dab' : 'ttt';
          tttState = data.state;
          buildTttBoard();
          clearGameDisconnect();
          if (firstState) openGameOverlay();
          updateGameUI();
          break;
        }
        case 'left':
          // Partner closed their game window / chose End Game.
          if (tttStage === 'playing' || tttStage === 'gone') markGamePartnerLeft();
          else { resetGame(); }
          break;
        case 'rematch':
          if (opts.isHost()) startGame(activeGame);
          break;
      }
    });

    return {
      // Back to "no game", e.g. a new partner or the call ended.
      reset: resetGame,
      // The connection itself dropped mid-game (call hung up / partner left).
      partnerGone: markGamePartnerGone,
      partnerLeft: markGamePartnerLeft,
      // Back-button / close handling: false means "a confirm is now showing".
      attemptClose: attemptCloseGame,
      isOpen: () => !gameOverlay.classList.contains('hidden'),
      isPlaying: () => tttStage === 'playing',
      isNegotiating: () => tttStage === 'inviting' || tttStage === 'invited',
      isActive: isGameActive,
      open: () => { openGameOverlay(); updateGameUI(); },
    };
  }

  window.TalkLiveGames = { attach };
}());
