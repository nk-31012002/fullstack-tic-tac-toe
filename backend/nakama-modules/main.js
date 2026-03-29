// Nakama Server-Side JavaScript Module
// Multiplayer Tic-Tac-Toe — server-authoritative game logic

const MODULE_NAME = "tictactoe";

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];
const TURN_TIMEOUT_MS = 30000;
const POINTS_WIN = 200;
const POINTS_LOSS = -50;

function checkWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== "")) return "draw";
  return null;
}

function symbolToUserId(state, symbol) {
  for (const [uid, data] of Object.entries(state.players)) {
    if (data.symbol === symbol) return uid;
  }
  return null;
}

function awardPoints(nk, logger, userId, username, delta) {
  try {
    nk.leaderboardRecordWrite("global_leaderboard", userId, username, delta, 0, {});
    logger.info("Leaderboard updated: %s %d", userId, delta);
  } catch (e) {
    logger.error("Failed to update leaderboard for %s: %v", userId, e);
  }
}

// ── Match handlers ────────────────────────────────────────────────────────────

const matchInit = function(ctx, logger, nk, params) {
  const state = {
    board: ["","","","","","","","",""],
    turn: "",
    players: {},
    winner: null,
    status: "waiting",
    timerDeadline: 0,
    moveCount: 0,
    timedMode: !!(params && params.timedMode),
  };
  return { state, tickRate: 1, label: JSON.stringify({ open: true, timedMode: state.timedMode }) };
};

const matchJoinAttempt = function(ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
  if (state.status !== "waiting") {
    return { state, accept: false, rejectMessage: "Game already in progress" };
  }
  if (Object.keys(state.players).length >= 2) {
    return { state, accept: false, rejectMessage: "Room is full" };
  }
  return { state, accept: true };
};

const matchJoin = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const presence of presences) {
    const symbol = Object.keys(state.players).length === 0 ? "X" : "O";
    state.players[presence.userId] = {
      symbol,
      displayName: presence.username,
    };
    logger.info("Player %s joined as %s", presence.userId, symbol);
  }

  if (Object.keys(state.players).length === 2) {
    state.status = "playing";
    const xPlayer = symbolToUserId(state, "X");
    state.turn = xPlayer;
    state.timerDeadline = state.timedMode ? Date.now() + TURN_TIMEOUT_MS : 0;

    dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "game_start",
      state,
    }), null, null, true);

    logger.info("Game started in match %s", ctx.matchId);
  } else {
    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "waiting",
      message: "Waiting for opponent...",
    }), null, null, true);
  }

  return { state };
};

const matchLeave = function(ctx, logger, nk, dispatcher, tick, state, presences) {
  for (const presence of presences) {
    logger.info("Player %s left match %s", presence.userId, ctx.matchId);

    if (state.status === "playing") {
      const remainingUid = Object.keys(state.players).find(uid => uid !== presence.userId);
      if (remainingUid) {
        state.winner = remainingUid;
        state.status = "finished";

        dispatcher.broadcastMessage(1, JSON.stringify({
          type: "game_over",
          reason: "opponent_left",
          winner: remainingUid,
          state,
        }), null, null, true);

        awardPoints(nk, logger, remainingUid, state.players[remainingUid].displayName, POINTS_WIN);
        awardPoints(nk, logger, presence.userId, state.players[presence.userId].displayName, POINTS_LOSS);
      }
    }

    delete state.players[presence.userId];
  }

  return { state };
};

const matchLoop = function(ctx, logger, nk, dispatcher, tick, state, messages) {
  if (Object.keys(state.players).length === 0) {
    logger.info("Match %s empty — terminating", ctx.matchId);
    return null;
  }

  for (const msg of messages) {
    if (state.status !== "playing") continue;

    let data;
    try {
      data = JSON.parse(nk.binaryToString(msg.data));
    } catch (e) {
      logger.error("Failed to parse message: %v", e);
      continue;
    }

    const senderId = msg.sender.userId;

    if (senderId !== state.turn) {
      dispatcher.broadcastMessage(2, JSON.stringify({
        type: "error",
        message: "Not your turn",
      }), [msg.sender], null, true);
      continue;
    }

    const pos = data.position;

    if (pos < 0 || pos > 8 || state.board[pos] !== "") {
      dispatcher.broadcastMessage(2, JSON.stringify({
        type: "error",
        message: "Invalid move",
      }), [msg.sender], null, true);
      continue;
    }

    const symbol = state.players[senderId].symbol;
    state.board[pos] = symbol;
    state.moveCount++;

    const resultSymbol = checkWinner(state.board);
    if (resultSymbol) {
      state.winner = resultSymbol === "draw" ? "draw" : symbolToUserId(state, resultSymbol);
      state.status = "finished";
      state.timerDeadline = 0;

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_over",
        reason: "finished",
        winner: state.winner,
        state,
      }), null, null, true);

      if (state.winner !== "draw") {
        const loserId = Object.keys(state.players).find(uid => uid !== state.winner);
        awardPoints(nk, logger, state.winner, state.players[state.winner].displayName, POINTS_WIN);
        awardPoints(nk, logger, loserId, state.players[loserId].displayName, POINTS_LOSS);
      }
    } else {
      const otherUid = Object.keys(state.players).find(uid => uid !== senderId);
      state.turn = otherUid;
      state.timerDeadline = data.timedMode ? Date.now() + TURN_TIMEOUT_MS : 0;

      dispatcher.broadcastMessage(1, JSON.stringify({
        type: "game_update",
        state,
      }), null, null, true);
    }
  }

  // Timer enforcement
  if (state.status === "playing" && state.timerDeadline > 0 && Date.now() > state.timerDeadline) {
    const timedOutUid = state.turn;
    const winnerUid = Object.keys(state.players).find(uid => uid !== timedOutUid);

    state.winner = winnerUid;
    state.status = "finished";
    state.timerDeadline = 0;

    dispatcher.broadcastMessage(1, JSON.stringify({
      type: "game_over",
      reason: "timeout",
      timedOut: timedOutUid,
      winner: winnerUid,
      state,
    }), null, null, true);

    awardPoints(nk, logger, winnerUid, state.players[winnerUid].displayName, POINTS_WIN);
    awardPoints(nk, logger, timedOutUid, state.players[timedOutUid].displayName, POINTS_LOSS);
  }

  return { state };
};

const matchTerminate = function(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state };
};

const matchSignal = function(ctx, logger, nk, dispatcher, tick, state) {
  return { state };
};

// ── RPCs ──────────────────────────────────────────────────────────────────────

const rpcFindOrCreateMatch = function(ctx, logger, nk, payload) {
  let timedMode = false;
  try {
    const p = JSON.parse(payload || "{}");
    timedMode = !!p.timedMode;
  } catch (_) {}

  const matches = nk.matchList(10, true, null, null, null, "");
  const open = matches.find(m => {
    try { 
      const label = JSON.parse(m.label || "{}");
      return label.open === true && label.timedMode === timedMode; 
    }
    catch (_) { return false; }
  });

  if (open) {
    logger.info("Joining existing match %s", open.matchId);
    return JSON.stringify({ matchId: open.matchId, created: false });
  }

  const matchId = nk.matchCreate(MODULE_NAME, { timedMode });
  logger.info("Created new match %s (timedMode=%s)", matchId, timedMode);
  return JSON.stringify({ matchId, created: true });
};

const rpcGetLeaderboard = function(ctx, logger, nk, payload) {
  try {
    const records = nk.leaderboardRecordsList("global_leaderboard", [], 20, null, null);
    return JSON.stringify({
      records: (records.records || []).map(r => ({
        rank: r.rank,
        username: r.username,
        score: r.score,
        userId: r.ownerId,
      })),
    });
  } catch (e) {
    logger.error("rpcGetLeaderboard error: %v", e);
    return JSON.stringify({ records: [] });
  }
};

const rpcGetPlayerStats = function(ctx, logger, nk, payload) {
  try {
    const records = nk.leaderboardRecordsList("global_leaderboard", [ctx.userId], 1, null, null);
    const mine = records.ownerRecords && records.ownerRecords[0];
    return JSON.stringify(mine
      ? { score: mine.score, rank: mine.rank, username: mine.username }
      : { score: 0, rank: null, username: ctx.username });
  } catch (e) {
    return JSON.stringify({ score: 0, rank: null });
  }
};

// ── InitModule ────────────────────────────────────────────────────────────────

var InitModule = function(ctx, logger, nk, initializer) {
  initializer.registerMatch(MODULE_NAME, {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  initializer.registerRpc("find_or_create_match", rpcFindOrCreateMatch);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
  initializer.registerRpc("get_player_stats", rpcGetPlayerStats);

  try {
    nk.leaderboardCreate("global_leaderboard", false, "desc", "incr", "", {});
    logger.info("Leaderboard created");
  } catch (_) {
    // Already exists — fine
  }

  logger.info("TicTacToe module initialised ✓");
}