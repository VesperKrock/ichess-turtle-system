(function (root) {
  "use strict";

  const BEE3_VERSION = "Bee 3 Skeleton - Design Locked";

  const PIECE_VALUES = Object.freeze({
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
  });

  const BEE3_SOFT_THINK_LIMIT_MS = 1500;

  const REJECTION_REASONS = Object.freeze({
    ILLEGAL_MOVE: "ILLEGAL_MOVE",
    ALLOWS_MATE_IN_ONE: "ALLOWS_MATE_IN_ONE",
    HANGS_QUEEN: "HANGS_QUEEN",
    HANGS_ROOK: "HANGS_ROOK",
    HANGS_MINOR_PIECE: "HANGS_MINOR_PIECE",
    PAWN_ATTACKED_MINOR_EMERGENCY: "PAWN_ATTACKED_MINOR_EMERGENCY",
    HANGS_QUEEN_AFTER_MOVE: "HANGS_QUEEN_AFTER_MOVE",
    HANGS_ROOK_AFTER_MOVE: "HANGS_ROOK_AFTER_MOVE",
    HANGS_MINOR_AFTER_MOVE: "HANGS_MINOR_AFTER_MOVE",
    MOVES_QUEEN_INTO_KNIGHT_ATTACK: "MOVES_QUEEN_INTO_KNIGHT_ATTACK",
    BAD_RECAPTURE_WITH_QUEEN: "BAD_RECAPTURE_WITH_QUEEN",
    BAD_EXCHANGE_BALANCE: "BAD_EXCHANGE_BALANCE",
    BAD_STATIC_EXCHANGE: "BAD_STATIC_EXCHANGE",
    BAD_CAPTURE_SEE_NEGATIVE: "BAD_CAPTURE_SEE_NEGATIVE",
    IGNORES_DIRECT_RECAPTURE: "IGNORES_DIRECT_RECAPTURE",
    IGNORES_MATERIAL_RECOVERY: "IGNORES_MATERIAL_RECOVERY",
    IGNORES_CHECK: "IGNORES_CHECK",
    IGNORES_MATE_THREAT: "IGNORES_MATE_THREAT",
    IGNORES_MATERIAL_EMERGENCY: "IGNORES_MATERIAL_EMERGENCY",
    POINTLESS_QUEEN_MOVE: "POINTLESS_QUEEN_MOVE",
    POINTLESS_ROOK_MOVE: "POINTLESS_ROOK_MOVE",
    POINTLESS_PAWN_MOVE: "POINTLESS_PAWN_MOVE",
    POINTLESS_KNIGHT_REPEAT: "POINTLESS_KNIGHT_REPEAT",
    BISHOP_SHUFFLE: "BISHOP_SHUFFLE",
    REPEATED_MINOR_MOVE: "REPEATED_MINOR_MOVE",
    TEMPO_WASTE: "TEMPO_WASTE",
    KNIGHT_RIM_OPENING: "KNIGHT_RIM_OPENING",
    KING_PAWN_WEAKENING: "KING_PAWN_WEAKENING",
    KING_PAWN_INTRUSION: "KING_PAWN_INTRUSION",
    ALLOWS_STRUCTURE_DAMAGE: "ALLOWS_STRUCTURE_DAMAGE",
    KING_SHIELD_STRUCTURE_RISK: "KING_SHIELD_STRUCTURE_RISK",
    HIGHER_VALUE_UNIT_PRIORITY: "HIGHER_VALUE_UNIT_PRIORITY",
    STALEMATE_RISK: "STALEMATE_RISK",
    TRADE_TO_DRAW_WHEN_WINNING: "TRADE_TO_DRAW_WHEN_WINNING",
    TRADE_BAD_WHEN_BEHIND: "TRADE_BAD_WHEN_BEHIND",
    NO_CLEAR_PURPOSE: "NO_CLEAR_PURPOSE",
    OVERPROTECT_FAKE_THREAT: "OVERPROTECT_FAKE_THREAT",
    OPENING_REPERTOIRE_VIOLATION: "OPENING_REPERTOIRE_VIOLATION",
    MEANINGLESS_SHUFFLE: "MEANINGLESS_SHUFFLE",
    REPEATED_ROOK_SHUFFLE: "REPEATED_ROOK_SHUFFLE",
    NO_MIDDLEGAME_PURPOSE: "NO_MIDDLEGAME_PURPOSE",
    PASSIVE_BACK_AND_FORTH: "PASSIVE_BACK_AND_FORTH",
    PROMOTION_DANGER: "PROMOTION_DANGER",
    IGNORES_PROMOTION_DANGER: "IGNORES_PROMOTION_DANGER",
    STOPS_PASSED_PAWN: "STOPS_PASSED_PAWN",
    PUSHES_DANGEROUS_PASSED_PAWN: "PUSHES_DANGEROUS_PASSED_PAWN",
    ALLOWS_FORK: "ALLOWS_FORK",
    ALLOWS_SKEWER: "ALLOWS_SKEWER",
    ALLOWS_DISCOVERED_ATTACK: "ALLOWS_DISCOVERED_ATTACK",
    BAD_CHECK_RESPONSE: "BAD_CHECK_RESPONSE",
    BAD_BLOCK_CHECK: "BAD_BLOCK_CHECK",
    BAD_KING_MOVE: "BAD_KING_MOVE",
    MISSES_WINNING_MATE: "MISSES_WINNING_MATE",
    MISSES_FREE_MATERIAL: "MISSES_FREE_MATERIAL",
    OVEREXTENDS_WHEN_AHEAD: "OVEREXTENDS_WHEN_AHEAD",
    PERPETUAL_RISK: "PERPETUAL_RISK",
    INSUFFICIENT_MATERIAL_DRAW_RISK: "INSUFFICIENT_MATERIAL_DRAW_RISK",
    ALL_MOVES_BAD_FALLBACK: "ALL_MOVES_BAD_FALLBACK"
  });

  const PURPOSE_TAGS = Object.freeze({
    CHECKMATE: "CHECKMATE",
    STOP_MATE: "STOP_MATE",
    CHECK_RESPONSE: "CHECK_RESPONSE",
    WIN_MATERIAL: "WIN_MATERIAL",
    SAFE_RECAPTURE: "SAFE_RECAPTURE",
    DEFEND_MATERIAL: "DEFEND_MATERIAL",
    DEVELOP: "DEVELOP",
    CASTLE: "CASTLE",
    CONTROL_CENTER: "CONTROL_CENTER",
    IMPROVE_KING_SAFETY: "IMPROVE_KING_SAFETY",
    ATTACK_WEAKNESS: "ATTACK_WEAKNESS",
    CREATE_SAFE_THREAT: "CREATE_SAFE_THREAT",
    TRADE_WHEN_AHEAD: "TRADE_WHEN_AHEAD",
    KEEP_PIECES_WHEN_BEHIND: "KEEP_PIECES_WHEN_BEHIND",
    ROOK_PLAN: "ROOK_PLAN",
    ENDGAME_PLAN: "ENDGAME_PLAN",
    STOP_PROMOTION: "STOP_PROMOTION",
    PUSH_PASSED_PAWN: "PUSH_PASSED_PAWN",
    IMPROVE_PIECE: "IMPROVE_PIECE",
    DRAW_DEFENSE: "DRAW_DEFENSE",
    SURVIVAL: "SURVIVAL"
  });

  function oppositeColor(color) {
    return color === "w" ? "b" : "w";
  }

  function getPieceValue(pieceOrType) {
    if (!pieceOrType) {
      return 0;
    }

    return PIECE_VALUES[typeof pieceOrType === "string" ? pieceOrType : pieceOrType.type] || 0;
  }

  function coordsFromSquare(square) {
    if (!square || square.length < 2) {
      return null;
    }

    return {
      file: "abcdefgh".indexOf(square[0]),
      rank: Number(square[1]) - 1
    };
  }

  function squareFromCoords(file, rank) {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return null;
    }

    return "abcdefgh"[file] + String(rank + 1);
  }

  function boardArraySquare(row, col) {
    return "abcdefgh"[col] + String(8 - row);
  }

  function getPieceAt(game, square) {
    if (!game || !square) {
      return null;
    }

    if (typeof game.get === "function") {
      return game.get(square);
    }

    if (typeof game.board !== "function") {
      return null;
    }

    const coords = coordsFromSquare(square);
    if (!coords) {
      return null;
    }

    const board = game.board();
    const row = 8 - Number(square[1]);
    return board[row] ? board[row][coords.file] : null;
  }

  function findKingSquare(game, color) {
    if (!game || typeof game.board !== "function") {
      return null;
    }

    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color && piece.type === "k") {
          return boardArraySquare(row, col);
        }
      }
    }

    return null;
  }

  function isPathClear(game, from, to) {
    const fromCoords = coordsFromSquare(from);
    const toCoords = coordsFromSquare(to);
    if (!fromCoords || !toCoords) {
      return false;
    }

    const fileStep = Math.sign(toCoords.file - fromCoords.file);
    const rankStep = Math.sign(toCoords.rank - fromCoords.rank);
    let file = fromCoords.file + fileStep;
    let rank = fromCoords.rank + rankStep;

    while (file !== toCoords.file || rank !== toCoords.rank) {
      if (getPieceAt(game, squareFromCoords(file, rank))) {
        return false;
      }

      file += fileStep;
      rank += rankStep;
    }

    return true;
  }

  function doesPieceAttackSquare(game, from, piece, targetSquare) {
    const fromCoords = coordsFromSquare(from);
    const targetCoords = coordsFromSquare(targetSquare);
    if (!fromCoords || !targetCoords || !piece) {
      return false;
    }

    const fileDelta = targetCoords.file - fromCoords.file;
    const rankDelta = targetCoords.rank - fromCoords.rank;
    const absFile = Math.abs(fileDelta);
    const absRank = Math.abs(rankDelta);

    if (piece.type === "p") {
      const pawnRankStep = piece.color === "w" ? 1 : -1;
      return rankDelta === pawnRankStep && absFile === 1;
    }

    if (piece.type === "n") {
      return absFile * absRank === 2;
    }

    if (piece.type === "k") {
      return Math.max(absFile, absRank) === 1;
    }

    if (piece.type === "b") {
      return absFile === absRank && isPathClear(game, from, targetSquare);
    }

    if (piece.type === "r") {
      return (fileDelta === 0 || rankDelta === 0) && isPathClear(game, from, targetSquare);
    }

    if (piece.type === "q") {
      const diagonal = absFile === absRank;
      const straight = fileDelta === 0 || rankDelta === 0;
      return (diagonal || straight) && isPathClear(game, from, targetSquare);
    }

    return false;
  }

  function doesColorAttackSquare(game, color, square) {
    if (!game || typeof game.board !== "function" || !square) {
      return false;
    }

    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        const from = boardArraySquare(row, col);
        if (piece && piece.color === color && doesPieceAttackSquare(game, from, piece, square)) {
          return true;
        }
      }
    }

    return false;
  }

  function getCheapestAttacker(game, color, square) {
    if (!game || typeof game.board !== "function" || !square) {
      return null;
    }

    let cheapest = null;
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        const from = boardArraySquare(row, col);
        if (!piece || piece.color !== color || !doesPieceAttackSquare(game, from, piece, square)) {
          continue;
        }

        const value = getPieceValue(piece);
        if (!cheapest || value < cheapest.value) {
          cheapest = {
            piece: piece,
            from: from,
            value: value
          };
        }
      }
    }

    return cheapest;
  }

  function isKingInCheckByColor(game, color) {
    const kingSquare = findKingSquare(game, color);
    if (!kingSquare) {
      return true;
    }

    return doesColorAttackSquare(game, oppositeColor(color), kingSquare);
  }

  function movesMatch(candidate, move) {
    if (!candidate || !move) {
      return false;
    }

    if (candidate.from && move.from) {
      return candidate.from === move.from &&
        candidate.to === move.to &&
        (candidate.promotion || "") === (move.promotion || "");
    }

    return Boolean(candidate.san && move.san && candidate.san === move.san);
  }

  function getVerboseMove(game, move) {
    const legalMoves = getLegalMovesDeterministic(game);
    return legalMoves.find(function (candidate) {
      return movesMatch(candidate, move);
    }) || move;
  }

  function cloneMoveForApply(move) {
    if (!move) {
      return null;
    }

    if (move.from && move.to) {
      const cloned = {
        from: move.from,
        to: move.to
      };
      if (move.promotion) {
        cloned.promotion = move.promotion;
      }
      return cloned;
    }

    return move.san || move;
  }

  function applyMoveSafely(game, move) {
    if (!game || typeof game.move !== "function" || !move) {
      return null;
    }

    try {
      return game.move(cloneMoveForApply(move));
    } catch (error) {
      return null;
    }
  }

  function undoMoveSafely(game) {
    if (game && typeof game.undo === "function") {
      game.undo();
    }
  }

  function getHistorySignature(game) {
    if (!game || typeof game.history !== "function") {
      return "";
    }

    try {
      return game.history().join(" ");
    } catch (error) {
      return "";
    }
  }

  function getVerboseHistoryLength(game) {
    if (!game || typeof game.history !== "function") {
      return 0;
    }

    try {
      return game.history({ verbose: true }).length;
    } catch (error) {
      return 0;
    }
  }

  function createBee3GameClone(game, fenOverride) {
    const fen = fenOverride || (game && typeof game.fen === "function" ? game.fen() : null);
    if (!fen) {
      return null;
    }

    try {
      if (game && typeof game.constructor === "function") {
        return new game.constructor(fen);
      }
    } catch (error) {
      // Fall through to global Chess when available.
    }

    try {
      if (typeof Chess !== "undefined") {
        return new Chess(fen);
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function withTemporaryMove(game, move, callback) {
    const fenBefore = game && typeof game.fen === "function" ? game.fen() : "";
    const historyBefore = getHistorySignature(game);
    const verboseLengthBefore = getVerboseHistoryLength(game);
    const applied = applyMoveSafely(game, move);

    if (!applied) {
      return callback(null, false);
    }

    try {
      return callback(applied, true);
    } finally {
      undoMoveSafely(game);
      if (fenBefore && game && typeof game.fen === "function" && game.fen() !== fenBefore) {
        console.warn("Bee 3 temporary move changed FEN unexpectedly.");
      }
      if (getHistorySignature(game) !== historyBefore || getVerboseHistoryLength(game) !== verboseLengthBefore) {
        console.warn("Bee 3 temporary move changed history unexpectedly.");
      }
    }
  }

  function withTemporaryMoves(game, moves, callback) {
    const appliedMoves = [];
    const moveList = moves || [];
    const fenBefore = game && typeof game.fen === "function" ? game.fen() : "";
    const historyBefore = getHistorySignature(game);
    const verboseLengthBefore = getVerboseHistoryLength(game);

    for (let index = 0; index < moveList.length; index++) {
      const applied = applyMoveSafely(game, moveList[index]);
      if (!applied) {
        while (appliedMoves.length) {
          undoMoveSafely(game);
          appliedMoves.pop();
        }
        return callback(appliedMoves.slice(), false);
      }
      appliedMoves.push(applied);
    }

    try {
      return callback(appliedMoves.slice(), true);
    } finally {
      while (appliedMoves.length) {
        undoMoveSafely(game);
        appliedMoves.pop();
      }
      if (fenBefore && game && typeof game.fen === "function" && game.fen() !== fenBefore) {
        console.warn("Bee 3 temporary moves changed FEN unexpectedly.");
      }
      if (getHistorySignature(game) !== historyBefore || getVerboseHistoryLength(game) !== verboseLengthBefore) {
        console.warn("Bee 3 temporary moves changed history unexpectedly.");
      }
    }
  }

  function assertBee3DoesNotMutateHistory(game, callback) {
    const fenBefore = game && typeof game.fen === "function" ? game.fen() : "";
    const historyBefore = getHistorySignature(game);
    const verboseLengthBefore = getVerboseHistoryLength(game);
    const result = callback();
    const fenAfter = game && typeof game.fen === "function" ? game.fen() : "";
    const historyAfter = getHistorySignature(game);
    const verboseLengthAfter = getVerboseHistoryLength(game);

    return {
      ok: fenBefore === fenAfter && historyBefore === historyAfter && verboseLengthBefore === verboseLengthAfter,
      result: result,
      fenBefore: fenBefore,
      fenAfter: fenAfter,
      historyBefore: historyBefore,
      historyAfter: historyAfter,
      verboseLengthBefore: verboseLengthBefore,
      verboseLengthAfter: verboseLengthAfter
    };
  }

  function addUnique(target, items) {
    items.forEach(function (item) {
      if (target.indexOf(item) === -1) {
        target.push(item);
      }
    });
    return target;
  }

  function appendNote(trace, note) {
    if (!trace || !note) {
      return trace;
    }

    trace.note = trace.note ? trace.note + " " + note : note;
    return trace;
  }

  function isValidReason(reason) {
    return Boolean(reason && Object.prototype.hasOwnProperty.call(REJECTION_REASONS, reason));
  }

  function isValidPurposeTag(tag) {
    return Boolean(tag && Object.prototype.hasOwnProperty.call(PURPOSE_TAGS, tag));
  }

  function addUniqueReason(trace, reason) {
    if (!trace) {
      return trace;
    }

    if (!Array.isArray(trace.reasons)) {
      trace.reasons = [];
    }

    if (isValidReason(reason) && trace.reasons.indexOf(reason) === -1) {
      trace.reasons.push(reason);
    }

    return trace;
  }

  function addUniquePurposeTag(trace, tag) {
    if (!trace) {
      return trace;
    }

    if (!Array.isArray(trace.purposeTags)) {
      trace.purposeTags = [];
    }

    if (isValidPurposeTag(tag) && trace.purposeTags.indexOf(tag) === -1) {
      trace.purposeTags.push(tag);
    }

    return trace;
  }

  function rejectMove(trace, reason, note) {
    if (!trace || !isValidReason(reason)) {
      return trace;
    }

    trace.rejected = true;
    addUniqueReason(trace, reason);
    appendNote(trace, note);
    return trace;
  }

  function markPurpose(trace, purposeTag, note) {
    if (!trace || !isValidPurposeTag(purposeTag)) {
      return trace;
    }

    addUniquePurposeTag(trace, purposeTag);
    appendNote(trace, note);
    return trace;
  }

  function getHangReason(pieceType) {
    if (pieceType === "q") {
      return REJECTION_REASONS.HANGS_QUEEN;
    }

    if (pieceType === "r") {
      return REJECTION_REASONS.HANGS_ROOK;
    }

    return REJECTION_REASONS.HANGS_MINOR_PIECE;
  }

  function getPostMoveHangReason(pieceType) {
    if (pieceType === "q") {
      return REJECTION_REASONS.HANGS_QUEEN_AFTER_MOVE;
    }

    if (pieceType === "r") {
      return REJECTION_REASONS.HANGS_ROOK_AFTER_MOVE;
    }

    return REJECTION_REASONS.HANGS_MINOR_AFTER_MOVE;
  }

  function getLegalMovesDeterministic(game) {
    if (!game || typeof game.moves !== "function") {
      return [];
    }

    try {
      return game.moves({ verbose: true }).slice().sort(function (a, b) {
        const left = [a.from || "", a.to || "", a.promotion || "", a.san || ""].join("|");
        const right = [b.from || "", b.to || "", b.promotion || "", b.san || ""].join("|");
        return left < right ? -1 : left > right ? 1 : 0;
      });
    } catch (error) {
      return [];
    }
  }

  function isLegalMoveObject(game, move) {
    if (!move) {
      return false;
    }

    return getLegalMovesDeterministic(game).some(function (candidate) {
      return movesMatch(candidate, move);
    });
  }

  function detectMovedHighValuePieceHangingAfterMove(game, move, botColor, cache) {
    const verboseMove = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "movedPieceHanging", getPositionMoveCacheKey(botColor, verboseMove || move), function () {
      return computeMovedHighValuePieceHangingAfterMove(game, verboseMove || move, botColor, cache);
    });
  }

  function computeMovedHighValuePieceHangingAfterMove(game, move, botColor, cache) {
    const verboseMove = getVerboseMove(game, move);
    const base = {
      hanging: false,
      severity: 0,
      reasons: [],
      bestOpponentCapture: null
    };

    if (!verboseMove || isCheckmateAfterMove(game, verboseMove)) {
      return base;
    }

    const recaptureSafety = evaluateRecaptureSafety(game, verboseMove, botColor, cache);
    if (!recaptureSafety.safe) {
      return {
        hanging: true,
        severity: recaptureSafety.severity,
        reasons: recaptureSafety.reasons,
        bestOpponentCapture: recaptureSafety.bestOpponentCapture
      };
    }

    const originalCapturedValue = getPieceValue(verboseMove.captured);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        hanging: true,
        severity: 999999,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        bestOpponentCapture: null
      };
    }

    try {
      const movedPiece = getPieceAt(game, applied.to);
      if (!movedPiece || movedPiece.color !== botColor || ["q", "r", "b", "n"].indexOf(movedPiece.type) === -1) {
        return base;
      }

      const movedValue = getPieceValue(movedPiece);
      const opponentCaptures = getLegalMovesDeterministic(game).filter(function (reply) {
        return reply.to === applied.to && Boolean(reply.captured);
      });

      let worst = null;
      opponentCaptures.forEach(function (reply) {
        const attackerValue = getPieceValue(reply.piece);
        let net = originalCapturedValue - movedValue;
        const replyApplied = applyMoveSafely(game, reply);
        if (replyApplied) {
          try {
            const recapturer = getCheapestAttackerToSquare(game, replyApplied.to, botColor);
            if (recapturer) {
              net += attackerValue;
            }
          } finally {
            undoMoveSafely(game);
          }
        }

        const losingClearly = net < -100 && attackerValue < movedValue;
        if (!losingClearly) {
          return;
        }

        const severity = Math.abs(net) + movedValue - attackerValue;
        if (!worst || severity > worst.severity) {
          worst = {
            reply: reply,
            net: net,
            severity: severity,
            attackerValue: attackerValue
          };
        }
      });

      if (!worst) {
        return base;
      }

      const reasons = [getPostMoveHangReason(movedPiece.type), REJECTION_REASONS.BAD_EXCHANGE_BALANCE];
      if (movedPiece.type === "q" && worst.reply.piece === "n") {
        addUnique(reasons, [REJECTION_REASONS.MOVES_QUEEN_INTO_KNIGHT_ATTACK]);
      }
      if (movedPiece.type === "q" && verboseMove.captured) {
        addUnique(reasons, [REJECTION_REASONS.BAD_RECAPTURE_WITH_QUEEN]);
      }

      return {
        hanging: true,
        severity: worst.severity,
        reasons: reasons,
        bestOpponentCapture: worst.reply
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function moveLeavesMovedPieceEnPrise(game, move, botColor) {
    return detectMovedHighValuePieceHangingAfterMove(game, move, botColor).hanging;
  }

  function compareFastFallbackMoves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseFastLegalFallbackMove(game, botColor) {
    const moves = getLegalMovesDeterministic(game);
    if (!moves.length) {
      return null;
    }

    const inCheck = isBotInCheck(game, botColor);
    const scored = moves.map(function (move) {
      let score = 0;
      if (inCheck) {
        score += 10000;
      }

      if (move.captured === "q") {
        score += 2500;
      } else if (move.captured === "r") {
        score += 1500;
      } else if (move.captured) {
        score += 400 + getPieceValue(move.captured);
      }

      if (move.piece === "k" && !inCheck && !isCastlingMove(move)) {
        score -= 500;
      }

      if (isCastlingMove(move)) {
        score += 700;
      }

      if (move.piece === "n" || move.piece === "b") {
        score += 120;
      }

      if (["e4", "d4", "e5", "d5"].indexOf(move.to) !== -1) {
        score += 100;
      }

      const hanging = detectMovedHighValuePieceHangingAfterMove(game, move, botColor);
      if (hanging.hanging) {
        score -= hanging.severity + 10000;
      }

      return {
        move: move,
        score: score
      };
    });

    scored.sort(compareFastFallbackMoves);
    return scored[0].move;
  }

  function withTemporaryTurn(game, color, callback) {
    if (!game || typeof game.fen !== "function") {
      return callback(game);
    }

    const originalFen = game.fen();
    const parts = originalFen.split(" ");
    if (parts.length !== 6) {
      return callback(game);
    }

    parts[1] = color;
    const clone = createBee3GameClone(game, parts.join(" "));
    if (!clone) {
      return callback(game);
    }

    return callback(clone);
  }

  function isLegalSafe(game, move, botColor) {
    const reasons = [];

    if (!game || !move) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    const legalMoves = getLegalMovesDeterministic(game);
    const legalMove = legalMoves.find(function (candidate) {
      return movesMatch(candidate, move);
    });

    if (!legalMove) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    const wasInCheck = isKingInCheckByColor(game, botColor);
    const applied = applyMoveSafely(game, legalMove);
    if (!applied) {
      return {
        safe: false,
        reasons: [wasInCheck ? REJECTION_REASONS.IGNORES_CHECK : REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    try {
      const stillInCheck = isKingInCheckByColor(game, botColor);
      if (stillInCheck) {
        reasons.push(wasInCheck ? REJECTION_REASONS.IGNORES_CHECK : REJECTION_REASONS.BAD_KING_MOVE);
      }

      return {
        safe: reasons.length === 0,
        reasons: reasons
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function isMaterialSafe(game, move, botColor, cache) {
    const verboseForKey = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "materialSafety", getPositionMoveCacheKey(botColor, verboseForKey || move), function () {
      return computeMaterialSafe(game, verboseForKey || move, botColor, cache);
    });
  }

  function computeMaterialSafe(game, move, botColor, cache) {
    const legalSafety = isLegalSafe(game, move, botColor);
    if (!legalSafety.safe) {
      return {
        safe: false,
        reasons: legalSafety.reasons.slice()
      };
    }

    const legalMoves = getLegalMovesDeterministic(game);
    const legalMove = legalMoves.find(function (candidate) {
      return movesMatch(candidate, move);
    });

    if (isCheckmateAfterMove(game, legalMove || move)) {
      return {
        safe: true,
        reasons: []
      };
    }

    const hangingAfterMove = detectMovedHighValuePieceHangingAfterMove(game, legalMove || move, botColor, cache);
    if (hangingAfterMove.hanging) {
      return {
        safe: false,
        reasons: hangingAfterMove.reasons
      };
    }

    if ((legalMove || move).captured && captureSequenceLosesMaterialClearly(game, legalMove || move, botColor, cache)) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]
      };
    }

    const applied = applyMoveSafely(game, legalMove || move);
    if (!applied) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    try {
      const movedPiece = getPieceAt(game, applied.to || move.to);
      if (!movedPiece || movedPiece.color !== botColor) {
        return {
          safe: true,
          reasons: []
        };
      }

      if (["q", "r", "b", "n"].indexOf(movedPiece.type) === -1) {
        return {
          safe: true,
          reasons: []
        };
      }

      const movedValue = getPieceValue(movedPiece);
      const cheapestAttacker = getCheapestAttacker(game, oppositeColor(botColor), applied.to || move.to);
      if (cheapestAttacker && cheapestAttacker.value < movedValue && getPieceValue((legalMove || move).captured) < movedValue - 100) {
        return {
          safe: false,
          reasons: [applied.captured ? REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE : getHangReason(movedPiece.type)]
        };
      }

      return {
        safe: true,
        reasons: []
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function isBossSafe(game, move, botColor, cache) {
    const verboseForKey = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "bossSafety", getPositionMoveCacheKey(botColor, verboseForKey || move), function () {
      return computeBossSafe(game, verboseForKey || move, botColor, cache);
    });
  }

  function computeBossSafe(game, move, botColor, cache) {
    const reasons = [];
    const legalSafety = isLegalSafe(game, move, botColor);
    addUnique(reasons, legalSafety.reasons);

    const materialSafety = legalSafety.safe ? isMaterialSafe(game, move, botColor, cache) : {
      safe: false,
      reasons: legalSafety.reasons
    };
    addUnique(reasons, materialSafety.reasons);

    // TODO Phase 15: integrate opponent mate-in-1 into full pipeline hard filter
    // TODO Phase 15: integrate king danger into full pipeline hard filter
    // TODO Phase 14+: draw/stalemate risk

    return {
      safe: legalSafety.safe && materialSafety.safe,
      reasons: reasons
    };
  }

  function classifyMoveSafety(game, move, botColor, cache) {
    const verboseForKey = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "moveSafety", getPositionMoveCacheKey(botColor, verboseForKey || move), function () {
      return computeMoveSafety(game, verboseForKey || move, botColor, cache);
    });
  }

  function computeMoveSafety(game, move, botColor, cache) {
    const reasons = [];
    const legalSafety = isLegalSafe(game, move, botColor);
    const materialSafety = isMaterialSafe(game, move, botColor, cache);
    const bossSafety = isBossSafe(game, move, botColor, cache);

    addUnique(reasons, legalSafety.reasons);
    addUnique(reasons, materialSafety.reasons);
    addUnique(reasons, bossSafety.reasons);

    return {
      move: move,
      legalSafe: legalSafety.safe,
      materialSafe: materialSafety.safe,
      bossSafe: bossSafety.safe,
      reasons: reasons
    };
  }

  function createMoveTrace(move) {
    return {
      move: move || null,
      rejected: false,
      reasons: [],
      purposeTags: [],
      safety: {
        legalSafe: null,
        materialSafe: null,
        bossSafe: null
      },
      score: 0,
      note: ""
    };
  }

  function createSafetyTraceForMove(game, move, botColor) {
    const trace = createMoveTrace(move);
    const safety = classifyMoveSafety(game, move, botColor);

    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    safety.reasons.forEach(function (reason) {
      addUniqueReason(trace, reason);
    });

    if (!safety.bossSafe) {
      rejectMove(trace, trace.reasons[0], "Rejected by Phase 2 safety core.");
    }

    return trace;
  }

  function isOpeningPly(game) {
    if (!game || typeof game.history !== "function") {
      return false;
    }

    return game.history().length < 20;
  }

  function isBackRankForColor(square, color) {
    return Boolean(square && (color === "w" && square[1] === "1" || color === "b" && square[1] === "8"));
  }

  function isBasicDevelopmentMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    return isOpeningPly(game) &&
      verboseMove &&
      (verboseMove.piece === "n" || verboseMove.piece === "b") &&
      isBackRankForColor(verboseMove.from, botColor) &&
      !isBackRankForColor(verboseMove.to, botColor);
  }

  function controlsCenterAfterMove(game, move, botColor) {
    const centerSquares = ["d4", "e4", "d5", "e5"];
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return false;
    }

    if (verboseMove.piece === "p" && centerSquares.indexOf(verboseMove.to) !== -1) {
      return true;
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return false;
    }

    try {
      const movedPiece = getPieceAt(game, applied.to);
      return Boolean(movedPiece && movedPiece.color === botColor && centerSquares.some(function (square) {
        return doesPieceAttackSquare(game, applied.to, movedPiece, square);
      }));
    } finally {
      undoMoveSafely(game);
    }
  }

  function isCastlingMove(move) {
    if (!move) {
      return false;
    }

    return move.san === "O-O" ||
      move.san === "O-O-O" ||
      typeof move.flags === "string" && (move.flags.indexOf("k") !== -1 || move.flags.indexOf("q") !== -1);
  }

  function annotateMove(game, move, botColor) {
    const trace = createSafetyTraceForMove(game, move, botColor);
    const verboseMove = getVerboseMove(game, move);

    if (verboseMove && verboseMove.captured && trace.safety.materialSafe) {
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL, "Safe capture has material purpose.");
    }

    if (isCastlingMove(verboseMove)) {
      markPurpose(trace, PURPOSE_TAGS.CASTLE, "Castling purpose.");
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY, "Castling improves king safety.");
    }

    if (isBasicDevelopmentMove(game, verboseMove, botColor)) {
      markPurpose(trace, PURPOSE_TAGS.DEVELOP, "Basic opening development.");
    }

    if (controlsCenterAfterMove(game, verboseMove, botColor)) {
      markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER, "Controls a center square.");
    }

    if (!trace.rejected && trace.purposeTags.length === 0) {
      addUniqueReason(trace, REJECTION_REASONS.NO_CLEAR_PURPOSE);
      appendNote(trace, "HEAVY_PENALTY only: no clear Phase 3 purpose tag.");
    }

    return trace;
  }

  function isBotInCheck(game, botColor) {
    return isKingInCheckByColor(game, botColor);
  }

  function getCheckingPieces(game, botColor) {
    const kingSquare = findKingSquare(game, botColor);
    if (!game || typeof game.board !== "function" || !kingSquare) {
      return [];
    }

    const opponentColor = oppositeColor(botColor);
    const checkingPieces = [];
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        const square = boardArraySquare(row, col);
        if (piece && piece.color === opponentColor && doesPieceAttackSquare(game, square, piece, kingSquare)) {
          checkingPieces.push({
            square: square,
            piece: piece,
            value: getPieceValue(piece)
          });
        }
      }
    }

    return checkingPieces;
  }

  function moveCapturesChecker(move, checkingPieces) {
    return Boolean(move && move.captured && checkingPieces.some(function (checker) {
      return checker.square === move.to;
    }));
  }

  function classifyCheckResponse(game, move, botColor, checkingPieces) {
    const verboseMove = getVerboseMove(game, move);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return "ILLEGAL_OR_STILL_CHECKED";
    }

    try {
      if (isBotInCheck(game, botColor)) {
        return "ILLEGAL_OR_STILL_CHECKED";
      }

      const activeCheckingPieces = checkingPieces || getCheckingPieces(game, botColor);
      if (applied.piece === "k") {
        return "KING_MOVE";
      }

      if (moveCapturesChecker(applied, activeCheckingPieces)) {
        return "CAPTURE_CHECKER";
      }

      if (activeCheckingPieces.length) {
        return "BLOCK_CHECK";
      }

      return "OTHER";
    } finally {
      undoMoveSafely(game);
    }
  }

  function getHangingPiecePenalty(pieceType) {
    if (pieceType === "q") {
      return {
        score: -2500,
        reason: REJECTION_REASONS.HANGS_QUEEN
      };
    }

    if (pieceType === "r") {
      return {
        score: -1500,
        reason: REJECTION_REASONS.HANGS_ROOK
      };
    }

    if (pieceType === "b" || pieceType === "n") {
      return {
        score: -1000,
        reason: REJECTION_REASONS.HANGS_MINOR_PIECE
      };
    }

    return {
      score: -700,
      reason: null
    };
  }

  function evaluateCheckResponseMaterialSafety(game, move, botColor) {
    const result = {
      score: 0,
      reasons: []
    };
    const checkingPieces = getCheckingPieces(game, botColor);
    const responseType = classifyCheckResponse(game, move, botColor, checkingPieces);
    const verboseMove = getVerboseMove(game, move);
    const applied = applyMoveSafely(game, verboseMove);

    if (!applied) {
      return {
        score: -999999,
        reasons: [REJECTION_REASONS.BAD_CHECK_RESPONSE]
      };
    }

    try {
      if (isBotInCheck(game, botColor)) {
        return {
          score: -999999,
          reasons: [REJECTION_REASONS.BAD_CHECK_RESPONSE]
        };
      }

      const movedPiece = getPieceAt(game, applied.to);
      const movedPieceValue = movedPiece ? getPieceValue(movedPiece) : getPieceValue(applied.piece);
      const cheapestAttacker = getCheapestAttacker(game, oppositeColor(botColor), applied.to);
      if (!cheapestAttacker) {
        result.score += 200;
      } else if (cheapestAttacker.value < movedPieceValue) {
        const penalty = getHangingPiecePenalty(movedPiece ? movedPiece.type : applied.piece);
        result.score += penalty.score;
        if (penalty.reason) {
          addUnique(result.reasons, [penalty.reason]);
        }
      } else if (cheapestAttacker.value === movedPieceValue) {
        result.score -= 100;
      }

      if (responseType === "CAPTURE_CHECKER" && result.reasons.length === 0) {
        result.score += 1200;
      }

      if (responseType === "BLOCK_CHECK" && result.reasons.some(function (reason) {
        return reason === REJECTION_REASONS.HANGS_QUEEN ||
          reason === REJECTION_REASONS.HANGS_ROOK ||
          reason === REJECTION_REASONS.HANGS_MINOR_PIECE;
      })) {
        addUnique(result.reasons, [REJECTION_REASONS.BAD_BLOCK_CHECK]);
        result.score -= 500;
      }

      return result;
    } finally {
      undoMoveSafely(game);
    }
  }

  function scoreCheckResponse(game, move, botColor, checkingPieces) {
    const responseType = classifyCheckResponse(game, move, botColor, checkingPieces);
    const trace = createMoveTrace(move);

    trace.responseType = responseType;
    markPurpose(trace, PURPOSE_TAGS.CHECK_RESPONSE);

    if (responseType === "ILLEGAL_OR_STILL_CHECKED") {
      rejectMove(trace, REJECTION_REASONS.BAD_CHECK_RESPONSE);
      trace.score = -999999;
      return {
        move: move,
        responseType: responseType,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const baseScores = {
      CAPTURE_CHECKER: 3000,
      BLOCK_CHECK: 1800,
      KING_MOVE: 1400,
      OTHER: 500
    };
    const materialSafety = evaluateCheckResponseMaterialSafety(game, move, botColor);

    trace.score = (baseScores[responseType] || 0) + materialSafety.score;
    addUnique(trace.reasons, materialSafety.reasons);

    if (responseType === "CAPTURE_CHECKER" && move && move.captured && materialSafety.score > -1000) {
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    if (trace.reasons.indexOf(REJECTION_REASONS.BAD_CHECK_RESPONSE) !== -1) {
      trace.rejected = true;
    }

    return {
      move: move,
      responseType: responseType,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function getMoveDeterministicKey(move) {
    return [move && move.from || "", move && move.to || "", move && move.promotion || "", move && move.san || ""].join("|");
  }

  function getMoveCacheKey(move) {
    return [move && move.from || "", move && move.to || "", move && move.promotion || ""].join("-");
  }

  function createBee3AnalysisCache(game, botColor) {
    const fen = game && typeof game.fen === "function" ? safeCall("", function () {
      return game.fen();
    }) : "";
    return {
      fen: fen,
      botColor: botColor,
      squareAttackers: new Map(),
      squareDefenders: new Map(),
      lineAttackers: new Map(),
      knightAttackers: new Map(),
      pawnAttackers: new Map(),
      kingAttackers: new Map(),
      moveSafety: new Map(),
      recaptureSafety: new Map(),
      staticExchange: new Map(),
      movedPieceHanging: new Map(),
      materialSafety: new Map(),
      bossSafety: new Map(),
      hardSafety: new Map(),
      conservativeScore: new Map(),
      openingPhase: new Map(),
      openingForbidden: new Map(),
      openingMoveScores: new Map(),
      openingSafety: new Map(),
      promotionDanger: new Map(),
      movePurpose: new Map(),
      stats: {
        hits: 0,
        misses: 0
      }
    };
  }

  function canUseBee3Cache(game, cache) {
    if (!cache || !cache.fen || !game || typeof game.fen !== "function") {
      return false;
    }

    return cache.fen === safeCall("", function () {
      return game.fen();
    });
  }

  function getCachedAnalysisValue(game, cache, mapName, key, compute) {
    if (!canUseBee3Cache(game, cache) || !cache[mapName]) {
      return compute();
    }

    const fullKey = cache.fen + "|" + key;
    if (cache[mapName].has(fullKey)) {
      cache.stats.hits++;
      return cache[mapName].get(fullKey);
    }

    cache.stats.misses++;
    const value = compute();
    cache[mapName].set(fullKey, value);
    return value;
  }

  function getPositionMoveCacheKey(botColor, move) {
    return [botColor || "", getMoveCacheKey(move)].join("|");
  }

  function getOpeningPhaseCached(game, botColor, cache) {
    return getCachedAnalysisValue(game, cache, "openingPhase", botColor || "", function () {
      return isOpeningPhase(game, botColor);
    });
  }

  function getOpeningForbiddenCached(game, move, botColor, cache) {
    return getCachedAnalysisValue(game, cache, "openingForbidden", getPositionMoveCacheKey(botColor, move), function () {
      return isOpeningMoveForbidden(game, move, botColor);
    });
  }

  function compareCheckResponseScores(left, right) {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    if (left.reasons.length !== right.reasons.length) {
      return left.reasons.length - right.reasons.length;
    }

    const leftKey = getMoveDeterministicKey(left.move);
    const rightKey = getMoveDeterministicKey(right.move);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  }

  function selectCheckResponse(game, botColor) {
    if (!isBotInCheck(game, botColor)) {
      return null;
    }

    const legalMoves = getLegalMovesDeterministic(game);
    const checkingPieces = getCheckingPieces(game, botColor);
    const scoredMoves = legalMoves.map(function (move) {
      return scoreCheckResponse(game, move, botColor, checkingPieces);
    }).filter(function (item) {
      return item.responseType !== "ILLEGAL_OR_STILL_CHECKED";
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareCheckResponseScores);
    const cleanResponses = scoredMoves.filter(function (item) {
      return !item.rejected && item.score > 0;
    });

    if (cleanResponses.length) {
      cleanResponses.sort(compareCheckResponseScores);
      return cleanResponses[0].move;
    }

    const fallback = scoredMoves[0];
    addUnique(fallback.reasons, [REJECTION_REASONS.ALL_MOVES_BAD_FALLBACK]);
    addUnique(fallback.purposeTags, [PURPOSE_TAGS.SURVIVAL]);
    return fallback.move;
  }

  function isGameCheckmate(game) {
    if (!game) {
      return false;
    }

    if (typeof game.isCheckmate === "function") {
      return game.isCheckmate();
    }

    return typeof game.in_checkmate === "function" && game.in_checkmate();
  }

  function isCheckmateAfterMove(game, move) {
    const verboseMove = getVerboseMove(game, move);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return false;
    }

    try {
      return isGameCheckmate(game);
    } finally {
      undoMoveSafely(game);
    }
  }

  function findAllMateInOneMoves(game, botColor) {
    if (!game || typeof game.turn !== "function") {
      return [];
    }

    const collectMates = function (activeGame) {
      const targetGame = activeGame || game;
      return getLegalMovesDeterministic(targetGame).filter(function (move) {
        return isCheckmateAfterMove(targetGame, move);
      });
    };

    if (game.turn() === botColor) {
      return collectMates();
    }

    return withTemporaryTurn(game, botColor, collectMates);
  }

  function scoreMateInOneMove(game, move, botColor) {
    const trace = createMoveTrace(move);
    trace.score += 100000;
    markPurpose(trace, PURPOSE_TAGS.CHECKMATE);

    const verboseMove = getVerboseMove(game, move);
    if (!isCheckmateAfterMove(game, verboseMove)) {
      rejectMove(trace, REJECTION_REASONS.MISSES_WINNING_MATE, "Move is not checkmate.");
      trace.score = -999999;
      return {
        move: move,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE, "Mate scoring move failed to apply.");
      trace.score = -999999;
      return {
        move: move,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    try {
      const movedPiece = getPieceAt(game, applied.to);
      const attacker = getCheapestAttacker(game, oppositeColor(botColor), applied.to);
      if (!attacker || !movedPiece || attacker.value >= getPieceValue(movedPiece)) {
        trace.score += 200;
      }

      if (applied.piece === "q" || applied.piece === "r") {
        trace.score += 100;
      } else if (getPieceValue(applied.piece) < getPieceValue("r")) {
        trace.score += 50;
      }

      if (applied.captured) {
        trace.score += 100;
      }

      if (applied.promotion) {
        trace.score += 150;
      }
    } finally {
      undoMoveSafely(game);
    }

    return {
      move: move,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function compareScoredMovesDeterministic(left, right) {
    if (left.score !== right.score) {
      return right.score - left.score;
    }

    const leftKey = getMoveDeterministicKey(left.move);
    const rightKey = getMoveDeterministicKey(right.move);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  }

  function chooseCleanMateMove(game, botColor) {
    const mates = findAllMateInOneMoves(game, botColor);
    if (!mates.length) {
      return null;
    }

    return mates.map(function (move) {
      return scoreMateInOneMove(game, move, botColor);
    }).sort(compareScoredMovesDeterministic)[0].move;
  }

  function findOpponentMateInOneThreats(game, botColor) {
    const opponentColor = oppositeColor(botColor);
    if (!game || typeof game.turn !== "function") {
      return [];
    }

    if (game.turn() === opponentColor) {
      return findAllMateInOneMoves(game, opponentColor);
    }

    return withTemporaryTurn(game, opponentColor, function (activeGame) {
      return findAllMateInOneMoves(activeGame, opponentColor);
    });
  }

  function moveStopsOpponentMateThreat(game, move, botColor) {
    const reasons = [];
    const opponentColor = oppositeColor(botColor);
    const verboseMove = getVerboseMove(game, move);
    const applied = applyMoveSafely(game, verboseMove);

    if (!applied) {
      return {
        stops: false,
        opponentMateThreatsAfter: [],
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    try {
      const opponentMateThreatsAfter = findAllMateInOneMoves(game, opponentColor);
      if (!opponentMateThreatsAfter.length) {
        return {
          stops: true,
          opponentMateThreatsAfter: [],
          reasons: []
        };
      }

      addUnique(reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
      return {
        stops: false,
        opponentMateThreatsAfter: opponentMateThreatsAfter,
        reasons: reasons
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function moveCapturesMateAttacker(move, threats) {
    if (!move || !move.captured || !Array.isArray(threats)) {
      return false;
    }

    return threats.some(function (threat) {
      return threat.from === move.to;
    });
  }

  function moveGivesCheckAfterApply(game, move, botColor) {
    const opponentColor = oppositeColor(botColor);
    const verboseMove = getVerboseMove(game, move);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return false;
    }

    try {
      return isKingInCheckByColor(game, opponentColor);
    } finally {
      undoMoveSafely(game);
    }
  }

  function scoreMateDefenseMove(game, move, botColor, currentThreats) {
    const trace = createMoveTrace(move);
    const stopResult = moveStopsOpponentMateThreat(game, move, botColor);
    addUnique(trace.reasons, stopResult.reasons);

    if (!stopResult.stops) {
      rejectMove(trace, REJECTION_REASONS.ALLOWS_MATE_IN_ONE);
      trace.score = -999999;
      return {
        move: move,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    trace.score += 5000;
    markPurpose(trace, PURPOSE_TAGS.STOP_MATE);

    const verboseMove = getVerboseMove(game, move);
    if (moveCapturesMateAttacker(verboseMove, currentThreats)) {
      trace.score += 800;
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    if (moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      trace.score += 300;
    }

    if (isCastlingMove(verboseMove)) {
      trace.score += 300;
      markPurpose(trace, PURPOSE_TAGS.CASTLE);
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    const materialSafety = isMaterialSafe(game, verboseMove, botColor);
    if (!materialSafety.safe) {
      addUnique(trace.reasons, materialSafety.reasons);
      trace.score -= 2500;
    }

    return {
      move: move,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function chooseMateDefenseMove(game, botColor) {
    const currentThreats = findOpponentMateInOneThreats(game, botColor);
    if (!currentThreats.length) {
      return null;
    }

    const legalMoves = getLegalMovesDeterministic(game);
    const scoredDefenses = legalMoves.filter(function (move) {
      return isLegalSafe(game, move, botColor).safe;
    }).map(function (move) {
      return scoreMateDefenseMove(game, move, botColor, currentThreats);
    }).filter(function (item) {
      return !item.rejected && item.score > -999999;
    });

    if (!scoredDefenses.length) {
      return null;
    }

    scoredDefenses.sort(compareScoredMovesDeterministic);
    return scoredDefenses[0].move;
  }

  function getLastVerboseMove(game) {
    if (!game || typeof game.history !== "function") {
      return null;
    }

    try {
      const history = game.history({ verbose: true });
      return history && history.length ? history[history.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  function findDirectRecaptures(game, botColor) {
    const lastMove = getLastVerboseMove(game);
    if (!game || typeof game.turn !== "function" || game.turn() !== botColor || !lastMove || !lastMove.captured) {
      return [];
    }

    const targetSquare = lastMove.to;
    return getLegalMovesDeterministic(game).filter(function (move) {
      return move.to === targetSquare && Boolean(move.captured);
    });
  }

  function mergeSafetyReasons(reasons, safety) {
    if (safety && Array.isArray(safety.reasons)) {
      addUnique(reasons, safety.reasons);
    }
  }

  function isSafeRecapture(game, move, botColor) {
    const reasons = [];
    const verboseMove = getVerboseMove(game, move);

    if (!verboseMove || !verboseMove.captured) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        safe: true,
        reasons: []
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    addUnique(reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      return {
        safe: false,
        reasons: reasons
      };
    }

    const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
    if (!mateSafety.stops) {
      addUnique(reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE, REJECTION_REASONS.IGNORES_MATE_THREAT]);
      return {
        safe: false,
        reasons: reasons
      };
    }

    return {
      safe: true,
      reasons: []
    };
  }

  function getRecaptureValueBonus(capturedType) {
    if (capturedType === "q") {
      return 1400;
    }

    if (capturedType === "r") {
      return 800;
    }

    if (capturedType === "b" || capturedType === "n") {
      return 400;
    }

    return 100;
  }

  function scoreDirectRecapture(game, move, botColor) {
    const trace = createMoveTrace(move);
    const verboseMove = getVerboseMove(game, move);

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      markPurpose(trace, PURPOSE_TAGS.SAFE_RECAPTURE);
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: getPieceValue(verboseMove && verboseMove.captured),
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const safety = isSafeRecapture(game, verboseMove, botColor);
    mergeSafetyReasons(trace.reasons, safety);
    if (!safety.safe) {
      trace.score -= 999999;
      trace.rejected = true;
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: getPieceValue(verboseMove && verboseMove.captured),
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const capturedValue = getPieceValue(verboseMove.captured);
    trace.score += 5000 + getRecaptureValueBonus(verboseMove.captured);
    markPurpose(trace, PURPOSE_TAGS.SAFE_RECAPTURE);
    if (capturedValue >= getPieceValue("n")) {
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    if (getPieceValue(verboseMove.piece) <= capturedValue) {
      trace.score += 100;
    }

    return {
      move: verboseMove,
      score: trace.score,
      capturedValue: capturedValue,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function compareCaptureCandidates(itemA, itemB) {
    if (itemA.score !== itemB.score) {
      return itemB.score - itemA.score;
    }

    const capturedA = itemA.capturedValue || getPieceValue(itemA.move && itemA.move.captured);
    const capturedB = itemB.capturedValue || getPieceValue(itemB.move && itemB.move.captured);
    if (capturedA !== capturedB) {
      return capturedB - capturedA;
    }

    const keyA = getMoveDeterministicKey(itemA.move);
    const keyB = getMoveDeterministicKey(itemB.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseDirectRecapture(game, botColor) {
    const recaptures = findDirectRecaptures(game, botColor);
    if (!recaptures.length) {
      return null;
    }

    const scoredRecaptures = recaptures.map(function (move) {
      return scoreDirectRecapture(game, move, botColor);
    }).filter(function (item) {
      return !item.rejected;
    });

    if (!scoredRecaptures.length) {
      return null;
    }

    scoredRecaptures.sort(compareCaptureCandidates);
    return scoredRecaptures[0].move;
  }

  function detectLastMoveCapturedOwnPiece(game, botColor) {
    const lastMove = getLastVerboseMove(game);
    if (!game || typeof game.turn !== "function" || game.turn() !== botColor || !lastMove || !lastMove.captured) {
      return {
        active: false,
        reasons: []
      };
    }

    if (lastMove.color === botColor) {
      return {
        active: false,
        reasons: []
      };
    }

    return {
      active: true,
      square: lastMove.to,
      attackerColor: lastMove.color,
      capturedPiece: lastMove.captured,
      capturedValue: getPieceValue(lastMove.captured),
      lastMove: lastMove,
      reasons: [REJECTION_REASONS.IGNORES_DIRECT_RECAPTURE, REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]
    };
  }

  function moveHandlesPostCaptureMaterialLoss(game, move, botColor, eventInfo) {
    const verboseMove = getVerboseMove(game, move);
    if (!eventInfo || !eventInfo.active || !verboseMove) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.NO_CLEAR_PURPOSE],
        purposeTags: []
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.CHECKMATE]
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    if (!safety.legalSafe || !safety.materialSafe || !moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      return {
        handles: false,
        reasons: safety.reasons.length ? safety.reasons : [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
        purposeTags: []
      };
    }

    if (verboseMove.to === eventInfo.square && verboseMove.captured) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.SAFE_RECAPTURE, PURPOSE_TAGS.WIN_MATERIAL]
      };
    }

    if (verboseMove.captured && getPieceValue(verboseMove.captured) >= Math.max(getPieceValue("n") - 20, eventInfo.capturedValue - 30)) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.WIN_MATERIAL]
      };
    }

    const attackersBefore = getAttackersToSquare(game, eventInfo.square, botColor).map(function (attacker) {
      return attacker.square + attacker.piece.type;
    });
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        purposeTags: []
      };
    }

    try {
      const occupant = getPieceAt(game, eventInfo.square);
      const attackersAfter = getAttackersToSquare(game, eventInfo.square, botColor);
      const movedPiece = getPieceAt(game, applied.to);
      const movedPieceAttacksLossSquare = movedPiece &&
        movedPiece.color === botColor &&
        doesPieceAttackSquare(game, applied.to, movedPiece, eventInfo.square);
      const addedAttacker = attackersAfter.some(function (attacker) {
        return attackersBefore.indexOf(attacker.square + attacker.piece.type) === -1;
      });
      const attacksCapturer = occupant &&
        occupant.color === oppositeColor(botColor) &&
        (movedPieceAttacksLossSquare || addedAttacker);
      if (attacksCapturer) {
        return {
          handles: true,
          reasons: [],
          purposeTags: [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.CREATE_SAFE_THREAT]
        };
      }
    } finally {
      undoMoveSafely(game);
    }

    return {
      handles: false,
      reasons: [REJECTION_REASONS.IGNORES_MATERIAL_RECOVERY],
      purposeTags: []
    };
  }

  function scorePostCaptureMaterialResponse(game, move, botColor, eventInfo) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    const handling = moveHandlesPostCaptureMaterialLoss(game, verboseMove, botColor, eventInfo);
    addUnique(trace.reasons, handling.reasons);
    addUnique(trace.purposeTags, handling.purposeTags);

    if (!handling.handles) {
      trace.score -= 999999;
      trace.rejected = true;
      return trace;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return trace;
    }

    if (verboseMove.to === eventInfo.square && verboseMove.captured) {
      trace.score += 7000 + getPieceValue(verboseMove.captured);
      markPurpose(trace, PURPOSE_TAGS.SAFE_RECAPTURE);
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    } else if (verboseMove.captured) {
      trace.score += 4500 + getPieceValue(verboseMove.captured);
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    } else {
      trace.score += 3200 + eventInfo.capturedValue;
      markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      markPurpose(trace, PURPOSE_TAGS.CREATE_SAFE_THREAT);
    }

    return trace;
  }

  function choosePostCaptureMaterialResponse(game, botColor, candidateMoves) {
    const eventInfo = detectLastMoveCapturedOwnPiece(game, botColor);
    if (!eventInfo.active || eventInfo.capturedValue < getPieceValue("n")) {
      return null;
    }

    const moves = candidateMoves || getLegalMovesDeterministic(game);
    const eventPiece = getPieceAt(game, eventInfo.square);
    const likelyMoves = moves.filter(function (move) {
      if (move.to === eventInfo.square || move.captured) {
        return true;
      }

      if (!eventPiece || eventPiece.color === botColor) {
        return false;
      }

      const movingPiece = getPieceAt(game, move.from);
      if (!movingPiece || movingPiece.color !== botColor) {
        return false;
      }

      return doesPieceAttackSquare(game, move.to, movingPiece, eventInfo.square);
    });
    const movesToScore = likelyMoves.length ? likelyMoves : moves;
    const scoredMoves = movesToScore.map(function (move) {
      return scorePostCaptureMaterialResponse(game, move, botColor, eventInfo);
    }).filter(function (trace) {
      return !trace.rejected && trace.score > 0;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(tieBreakBee3Moves);
    return scoredMoves[0].move;
  }

  function isHighValueCapture(move) {
    return Boolean(move && ["q", "r", "b", "n"].indexOf(move.captured) !== -1);
  }

  function scoreFastHighValueCapture(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove || move);
    const capturedValue = getPieceValue(verboseMove && verboseMove.captured);

    if (!isHighValueCapture(verboseMove)) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: capturedValue,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: capturedValue,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const legalSafety = isLegalSafe(game, verboseMove, botColor);
    if (!legalSafety.safe) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, legalSafety.reasons);
    }

    const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
    if (!mateSafety.stops) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
    }

    if (captureSequenceLosesMaterialClearly(game, verboseMove, botColor)) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.ILLEGAL_MOVE]);
    } else {
      try {
        const movedPiece = getPieceAt(game, applied.to);
        const movingValue = getPieceValue(movedPiece);
        const cheapestAttacker = getCheapestAttacker(game, oppositeColor(botColor), applied.to);
        if (movedPiece && cheapestAttacker && cheapestAttacker.value < movingValue && capturedValue < movingValue) {
          trace.score -= 999999;
          trace.rejected = true;
          addUnique(trace.reasons, [getHangReason(movedPiece.type)]);
        }
      } finally {
        undoMoveSafely(game);
      }
    }

    if (trace.rejected) {
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: capturedValue,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    if (verboseMove.captured === "q") {
      trace.score += 9000;
    } else if (verboseMove.captured === "r") {
      trace.score += 5000;
    } else {
      trace.score += 3000;
    }

    if (moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      trace.score += 150;
    }

    return {
      move: verboseMove,
      score: trace.score,
      capturedValue: capturedValue,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function findFastSafeHighValueCapture(game, botColor) {
    if (!game || typeof game.turn !== "function" || game.turn() !== botColor || isBotInCheck(game, botColor)) {
      return null;
    }

    const scoredCaptures = getLegalMovesDeterministic(game).filter(function (move) {
      return isHighValueCapture(move);
    }).map(function (move) {
      return scoreFastHighValueCapture(game, move, botColor);
    }).filter(function (item) {
      return item.move && !item.rejected && item.score > 0;
    });

    if (!scoredCaptures.length) {
      return null;
    }

    scoredCaptures.sort(compareCaptureCandidates);
    return scoredCaptures[0].move;
  }

  function isSafeHighValueCapture(game, move, botColor) {
    const reasons = [];
    const verboseMove = getVerboseMove(game, move);
    const capturedValue = getPieceValue(verboseMove && verboseMove.captured);

    if (!isHighValueCapture(verboseMove)) {
      return {
        safe: false,
        capturedValue: capturedValue,
        reasons: [REJECTION_REASONS.NO_CLEAR_PURPOSE]
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        safe: true,
        capturedValue: capturedValue,
        reasons: []
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    addUnique(reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      return {
        safe: false,
        capturedValue: capturedValue,
        reasons: reasons
      };
    }

    const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
    if (!mateSafety.stops) {
      addUnique(reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
      return {
        safe: false,
        capturedValue: capturedValue,
        reasons: reasons
      };
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        safe: false,
        capturedValue: capturedValue,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    try {
      const movedPiece = getPieceAt(game, applied.to);
      const cheapestAttacker = getCheapestAttacker(game, oppositeColor(botColor), applied.to);
      if (movedPiece && cheapestAttacker && cheapestAttacker.value < getPieceValue(movedPiece) && capturedValue < getPieceValue(movedPiece)) {
        addUnique(reasons, [getHangReason(movedPiece.type)]);
        return {
          safe: false,
          capturedValue: capturedValue,
          reasons: reasons
        };
      }
    } finally {
      undoMoveSafely(game);
    }

    return {
      safe: true,
      capturedValue: capturedValue,
      reasons: []
    };
  }

  function findSafeHighValueCaptures(game, botColor) {
    if (!game || typeof game.turn !== "function" || game.turn() !== botColor) {
      return [];
    }

    return getLegalMovesDeterministic(game).filter(function (move) {
      return isHighValueCapture(move) && isSafeHighValueCapture(game, move, botColor).safe;
    });
  }

  function scoreSafeHighValueCapture(game, move, botColor) {
    const trace = createMoveTrace(move);
    const verboseMove = getVerboseMove(game, move);
    const capturedValue = getPieceValue(verboseMove && verboseMove.captured);

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: capturedValue,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    if (!isHighValueCapture(verboseMove)) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: capturedValue,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const safety = isSafeHighValueCapture(game, verboseMove, botColor);
    mergeSafetyReasons(trace.reasons, safety);
    if (!safety.safe) {
      trace.score -= 999999;
      trace.rejected = true;
      return {
        move: verboseMove,
        score: trace.score,
        capturedValue: capturedValue,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    if (verboseMove.captured === "q") {
      trace.score += 9000;
    } else if (verboseMove.captured === "r") {
      trace.score += 5000;
    } else {
      trace.score += 3200;
    }

    if (moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      trace.score += 200;
    }

    return {
      move: verboseMove,
      score: trace.score,
      capturedValue: capturedValue,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function chooseSafeHighValueCapture(game, botColor) {
    const captures = findSafeHighValueCaptures(game, botColor);
    if (!captures.length) {
      return null;
    }

    const scoredCaptures = captures.map(function (move) {
      return scoreSafeHighValueCapture(game, move, botColor);
    }).filter(function (item) {
      return !item.rejected;
    });

    if (!scoredCaptures.length) {
      return null;
    }

    scoredCaptures.sort(compareCaptureCandidates);
    return scoredCaptures[0].move;
  }

  function getAttackersToSquare(game, square, color, cache) {
    if (root.BeeVision && typeof root.BeeVision.getAttackersToSquare === "function") {
      return root.BeeVision.getAttackersToSquare(game, square, color, cache);
    }

    return getSquareAttackers(game, square, color, cache);
  }

  function getCheapestAttackerToSquare(game, square, color, cache) {
    if (root.BeeVision && typeof root.BeeVision.getCheapestAttackerToSquare === "function") {
      return root.BeeVision.getCheapestAttackerToSquare(game, square, color, cache);
    }

    const attackers = getAttackersToSquare(game, square, color, cache);
    return attackers.length ? attackers[0] : null;
  }

  function sortVisionUnits(units) {
    return (units || []).slice().sort(function (a, b) {
      const valueA = a.value || getPieceValue(a.piece);
      const valueB = b.value || getPieceValue(b.piece);
      if (valueA !== valueB) {
        return valueA - valueB;
      }
      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function makeVisionUnit(square, piece, attackType) {
    return {
      square: square,
      piece: piece,
      value: getPieceValue(piece),
      attackType: attackType
    };
  }

  function getKnightAttackersToSquare(game, square, attackerColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.getKnightAttackersToSquare === "function") {
      return root.BeeVision.getKnightAttackersToSquare(game, square, attackerColor, cache);
    }

    return getCachedAnalysisValue(game, cache, "knightAttackers", ["knight", square, attackerColor].join("|"), function () {
    const coords = coordsFromSquare(square);
    if (!coords) {
      return [];
    }

    const offsets = [
      [1, 2], [2, 1], [2, -1], [1, -2],
      [-1, -2], [-2, -1], [-2, 1], [-1, 2]
    ];
    return sortVisionUnits(offsets.map(function (offset) {
      const from = squareFromCoords(coords.file + offset[0], coords.rank + offset[1]);
      const piece = getPieceAt(game, from);
      return piece && piece.color === attackerColor && piece.type === "n" ? makeVisionUnit(from, piece, "KNIGHT") : null;
    }).filter(Boolean));
    });
  }

  function getPawnAttackersToSquare(game, square, attackerColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.getPawnAttackersToSquare === "function") {
      return root.BeeVision.getPawnAttackersToSquare(game, square, attackerColor, cache);
    }

    return getCachedAnalysisValue(game, cache, "pawnAttackers", ["pawn", square, attackerColor].join("|"), function () {
    const coords = coordsFromSquare(square);
    if (!coords) {
      return [];
    }

    const pawnStep = attackerColor === "w" ? 1 : -1;
    return sortVisionUnits([-1, 1].map(function (fileDelta) {
      const from = squareFromCoords(coords.file + fileDelta, coords.rank - pawnStep);
      const piece = getPieceAt(game, from);
      return piece && piece.color === attackerColor && piece.type === "p" ? makeVisionUnit(from, piece, "PAWN") : null;
    }).filter(Boolean));
    });
  }

  function getLineAttackersToSquare(game, square, attackerColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.getLineAttackersToSquare === "function") {
      return root.BeeVision.getLineAttackersToSquare(game, square, attackerColor, cache);
    }

    return getCachedAnalysisValue(game, cache, "lineAttackers", ["line", square, attackerColor].join("|"), function () {
    const coords = coordsFromSquare(square);
    if (!coords) {
      return [];
    }

    const directions = [
      [1, 0, "r"], [-1, 0, "r"], [0, 1, "r"], [0, -1, "r"],
      [1, 1, "b"], [1, -1, "b"], [-1, 1, "b"], [-1, -1, "b"]
    ];
    const attackers = [];
    directions.forEach(function (direction) {
      let file = coords.file + direction[0];
      let rank = coords.rank + direction[1];
      while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
        const from = squareFromCoords(file, rank);
        const piece = getPieceAt(game, from);
        if (piece) {
          if (piece.color === attackerColor &&
            (piece.type === "q" || piece.type === direction[2])) {
            attackers.push(makeVisionUnit(from, piece, direction[2] === "b" ? "DIAGONAL" : "STRAIGHT"));
          }
          break;
        }
        file += direction[0];
        rank += direction[1];
      }
    });

    return sortVisionUnits(attackers);
    });
  }

  function getKingAttackersToSquare(game, square, attackerColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.getKingAttackersToSquare === "function") {
      return root.BeeVision.getKingAttackersToSquare(game, square, attackerColor, cache);
    }

    return getCachedAnalysisValue(game, cache, "kingAttackers", ["king", square, attackerColor].join("|"), function () {
    const coords = coordsFromSquare(square);
    if (!coords) {
      return [];
    }

    const attackers = [];
    for (let fileDelta = -1; fileDelta <= 1; fileDelta++) {
      for (let rankDelta = -1; rankDelta <= 1; rankDelta++) {
        if (fileDelta === 0 && rankDelta === 0) {
          continue;
        }
        const from = squareFromCoords(coords.file + fileDelta, coords.rank + rankDelta);
        const piece = getPieceAt(game, from);
        if (piece && piece.color === attackerColor && piece.type === "k") {
          attackers.push(makeVisionUnit(from, piece, "KING"));
        }
      }
    }
    return sortVisionUnits(attackers);
    });
  }

  function getSquareAttackers(game, square, attackerColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.getSquareAttackers === "function") {
      return root.BeeVision.getSquareAttackers(game, square, attackerColor, cache);
    }

    return getCachedAnalysisValue(game, cache, "squareAttackers", ["attackers", square, attackerColor].join("|"), function () {
    return sortVisionUnits([].concat(
      getPawnAttackersToSquare(game, square, attackerColor, cache),
      getKnightAttackersToSquare(game, square, attackerColor, cache),
      getLineAttackersToSquare(game, square, attackerColor, cache),
      getKingAttackersToSquare(game, square, attackerColor, cache)
    ));
    });
  }

  function getSquareDefenders(game, square, defenderColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.getSquareDefenders === "function") {
      return root.BeeVision.getSquareDefenders(game, square, defenderColor, cache);
    }

    return getCachedAnalysisValue(game, cache, "squareDefenders", ["defenders", square, defenderColor].join("|"), function () {
      return getSquareAttackers(game, square, defenderColor, cache);
    });
  }

  function buildBoardVisionMap(game, botColor, cache) {
    if (root.BeeVision && typeof root.BeeVision.buildBoardVisionMap === "function") {
      return root.BeeVision.buildBoardVisionMap(game, botColor, cache);
    }

    const opponentColor = oppositeColor(botColor);
    const squares = [];
    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        squares.push(squareFromCoords(file, rank));
      }
    }

    const map = {
      botColor: botColor,
      opponentColor: opponentColor,
      squares: {}
    };
    squares.forEach(function (square) {
      map.squares[square] = {
        botAttackers: getSquareAttackers(game, square, botColor, cache),
        opponentAttackers: getSquareAttackers(game, square, opponentColor, cache),
        botDefenders: getSquareDefenders(game, square, botColor, cache),
        opponentDefenders: getSquareDefenders(game, square, opponentColor, cache)
      };
    });
    return map;
  }

  function isKingAValidDefenderOfSquare(game, defender, square, botColor, cache) {
    if (!defender || !defender.piece || defender.piece.type !== "k" || !square) {
      return false;
    }

    if (!doesPieceAttackSquare(game, defender.square, defender.piece, square)) {
      return false;
    }

    const opponentColor = oppositeColor(botColor);
    const opponentAttackers = getSquareAttackers(game, square, opponentColor, cache).filter(function (attacker) {
      return attacker.piece.type !== "k";
    });
    if (opponentAttackers.length) {
      return false;
    }

    return withTemporaryMove(game, {
      from: defender.square,
      to: square
    }, function (applied, ok) {
      return Boolean(ok && applied && !isKingInCheckByColor(game, botColor));
    });
  }

  function isDefenderPinnedOrOverloaded(game, defender, square, botColor, cache) {
    if (!defender || !defender.piece) {
      return true;
    }

    if (defender.piece.type === "k") {
      return !isKingAValidDefenderOfSquare(game, defender, square, botColor, cache);
    }

    if (withTemporaryMove(game, {
      from: defender.square,
      to: square
    }, function (applied, ok) {
      return Boolean(ok && applied && isKingInCheckByColor(game, botColor));
    })) {
      return true;
    }

    if ((defender.piece.type === "q" || defender.piece.type === "r") &&
      getKingZone(game, botColor).zoneSquares.indexOf(square) !== -1) {
      return true;
    }

    return false;
  }

  function evaluateDefenderQuality(game, defender, square, botColor, cache) {
    const reasons = [];
    if (!defender || !defender.piece) {
      return {
        effective: false,
        weight: 0,
        reasons: [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]
      };
    }

    if (defender.piece.type === "k" && !isKingAValidDefenderOfSquare(game, defender, square, botColor, cache)) {
      reasons.push(REJECTION_REASONS.BAD_KING_MOVE);
      return {
        effective: false,
        weight: 0,
        reasons: reasons
      };
    }

    if (isDefenderPinnedOrOverloaded(game, defender, square, botColor, cache)) {
      reasons.push(REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY);
      return {
        effective: false,
        weight: 0,
        reasons: reasons
      };
    }

    const attacker = getCheapestAttackerToSquare(game, square, oppositeColor(botColor), cache);
    const defenderValue = getPieceValue(defender.piece);
    if ((defender.piece.type === "q" || defender.piece.type === "r") &&
      attacker && attacker.value + 120 < defenderValue) {
      reasons.push(REJECTION_REASONS.BAD_EXCHANGE_BALANCE);
      return {
        effective: false,
        weight: 0,
        reasons: reasons
      };
    }

    return {
      effective: true,
      weight: defender.piece.type === "q" || defender.piece.type === "r" ? 0.75 : 1,
      reasons: reasons
    };
  }

  function countEffectiveDefenders(game, square, botColor, cache) {
    return getSquareDefenders(game, square, botColor, cache).map(function (defender) {
      const quality = evaluateDefenderQuality(game, defender, square, botColor, cache);
      return {
        square: defender.square,
        piece: defender.piece,
        value: defender.value,
        effective: quality.effective,
        weight: quality.weight,
        reasons: quality.reasons
      };
    });
  }

  function evaluateAttackDefenseBalance(game, square, botColor, cache) {
    const attackers = getSquareAttackers(game, square, oppositeColor(botColor), cache);
    const defenders = getSquareDefenders(game, square, botColor, cache);
    const effectiveDefenders = countEffectiveDefenders(game, square, botColor, cache);
    const effectiveWeight = effectiveDefenders.reduce(function (sum, defender) {
      return sum + (defender.effective ? defender.weight : 0);
    }, 0);

    return {
      attackers: attackers,
      defenders: defenders,
      effectiveDefenders: effectiveDefenders,
      attackerCount: attackers.length,
      defenderCount: defenders.length,
      effectiveDefenderWeight: effectiveWeight,
      attackerValue: attackers.length ? attackers[0].value : 0,
      defenderValue: effectiveDefenders.filter(function (defender) {
        return defender.effective;
      }).reduce(function (best, defender) {
        return best === 0 ? defender.value : Math.min(best, defender.value);
      }, 0)
    };
  }

  function evaluateRecaptureSafety(game, move, botColor, cache) {
    const verboseMove = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "recaptureSafety", getPositionMoveCacheKey(botColor, verboseMove || move), function () {
      return computeRecaptureSafety(game, verboseMove || move, botColor);
    });
  }

  function computeRecaptureSafety(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const result = {
      safe: true,
      reasons: [],
      hanging: false,
      severity: 0,
      bestOpponentCapture: null,
      attackers: [],
      effectiveDefenders: []
    };

    if (!verboseMove || isCheckmateAfterMove(game, verboseMove)) {
      return result;
    }

    const capturedValue = getPieceValue(verboseMove.captured);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        hanging: true,
        severity: 999999,
        bestOpponentCapture: null,
        attackers: [],
        effectiveDefenders: []
      };
    }

    try {
      const targetSquare = applied.to || verboseMove.to;
      const movedPiece = getPieceAt(game, targetSquare);
      if (!movedPiece || movedPiece.color !== botColor || ["q", "r", "b", "n"].indexOf(movedPiece.type) === -1) {
        return result;
      }

      const movedValue = getPieceValue(movedPiece);
      const rawAttackers = getSquareAttackers(game, targetSquare, oppositeColor(botColor));
      const effectiveDefenders = countEffectiveDefenders(game, targetSquare, botColor);
      const legalOpponentCaptures = getLegalMovesDeterministic(game).filter(function (reply) {
        return reply.to === targetSquare && Boolean(reply.captured);
      });
      result.attackers = rawAttackers;
      result.effectiveDefenders = effectiveDefenders;

      let worst = null;
      legalOpponentCaptures.forEach(function (reply) {
        const attackerValue = getPieceValue(reply.piece);
        let net = capturedValue - movedValue;
        const replyApplied = applyMoveSafely(game, reply);
        if (replyApplied) {
          try {
            const recapturer = getCheapestAttackerToSquare(game, replyApplied.to, botColor);
            if (recapturer && evaluateDefenderQuality(game, recapturer, replyApplied.to, botColor).effective) {
              net += attackerValue;
            }
          } finally {
            undoMoveSafely(game);
          }
        }

        if (net >= -100) {
          return;
        }

        const severity = Math.abs(net) + Math.max(0, movedValue - Math.min(attackerValue, movedValue));
        if (!worst || severity > worst.severity) {
          worst = {
            reply: reply,
            net: net,
            severity: severity,
            attackerValue: attackerValue
          };
        }
      });

      if (!worst && capturedValue < movedValue - 100) {
        const cheapRawAttacker = rawAttackers.filter(function (attacker) {
          return attacker.value + 100 < movedValue;
        })[0];
        if (cheapRawAttacker && !effectiveDefenders.some(function (defender) {
          return defender.effective && defender.value <= cheapRawAttacker.value + 100;
        })) {
          worst = {
            reply: null,
            net: capturedValue - movedValue,
            severity: movedValue - cheapRawAttacker.value,
            attackerValue: cheapRawAttacker.value,
            rawAttacker: cheapRawAttacker
          };
        }
      }

      if (!worst) {
        return result;
      }

      const reasons = [getPostMoveHangReason(movedPiece.type), REJECTION_REASONS.BAD_EXCHANGE_BALANCE];
      const offenderPiece = worst.reply ? worst.reply.piece : worst.rawAttacker && worst.rawAttacker.piece.type;
      if (movedPiece.type === "q" && offenderPiece === "n") {
        addUnique(reasons, [REJECTION_REASONS.MOVES_QUEEN_INTO_KNIGHT_ATTACK]);
      }
      if (movedPiece.type === "q" && verboseMove.captured) {
        addUnique(reasons, [REJECTION_REASONS.BAD_RECAPTURE_WITH_QUEEN]);
      }

      return {
        safe: false,
        reasons: reasons,
        hanging: true,
        severity: worst.severity,
        bestOpponentCapture: worst.reply || worst.rawAttacker,
        attackers: rawAttackers,
        effectiveDefenders: effectiveDefenders
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function evaluateCaptureSequenceMedium(game, move, botColor, cache) {
    const verboseMove = getVerboseMove(game, move);
    const reasons = [];

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        net: 999999,
        safe: true,
        reasons: []
      };
    }

    if (!verboseMove || !verboseMove.captured) {
      return {
        net: 0,
        safe: true,
        reasons: []
      };
    }

    const legalSafety = isLegalSafe(game, verboseMove, botColor);
    if (!legalSafety.safe) {
      return {
        net: -999999,
        safe: false,
        reasons: legalSafety.reasons.slice()
      };
    }

    const staticExchange = evaluateStaticExchangeSequence(game, verboseMove, botColor, 6, cache);
    if (!staticExchange.safe && staticExchange.net <= -150) {
      return {
        net: staticExchange.net,
        safe: false,
        reasons: staticExchange.reasons.slice()
      };
    }

    const capturedValue = getPieceValue(verboseMove.captured);
    const movingValue = getPieceValue(verboseMove.piece);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        net: -999999,
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    try {
      const opponentColor = oppositeColor(botColor);
      const opponentAttacker = getCheapestAttackerToSquare(game, applied.to, opponentColor);
      if (!opponentAttacker) {
        return {
          net: capturedValue,
          safe: true,
          reasons: []
        };
      }

      let net = capturedValue - movingValue;
      const beeRecapturer = getCheapestAttackerToSquare(game, applied.to, botColor);
      if (beeRecapturer) {
        net += opponentAttacker.value;
      }

      if (opponentAttacker.value < movingValue && net < 0) {
        addUnique(reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE, getHangReason(applied.piece)]);
        return {
          net: net,
          safe: false,
          reasons: reasons
        };
      }

      if (opponentAttacker.value < movingValue && movingValue - opponentAttacker.value >= getPieceValue("n") && capturedValue < movingValue) {
        addUnique(reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE, getHangReason(applied.piece)]);
        return {
          net: net,
          safe: false,
          reasons: reasons
        };
      }

      return {
        net: net,
        safe: net >= -100,
        reasons: net >= -100 ? [] : [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function getCheapestLegalCaptureToSquare(game, targetSquare) {
    const captures = getLegalMovesDeterministic(game).filter(function (candidate) {
      return candidate.to === targetSquare && Boolean(candidate.captured);
    });
    if (!captures.length) {
      return null;
    }

    captures.sort(function (a, b) {
      const valueDiff = getPieceValue(a.piece) - getPieceValue(b.piece);
      if (valueDiff) {
        return valueDiff;
      }
      return getMoveDeterministicKey(a) < getMoveDeterministicKey(b) ? -1 : 1;
    });
    return captures[0];
  }

  function evaluateStaticExchangeSequence(game, move, botColor, maxHalfMoves, cache) {
    const verboseMove = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "staticExchange", [getPositionMoveCacheKey(botColor, verboseMove || move), maxHalfMoves || 6].join("|"), function () {
      return computeStaticExchangeSequence(game, verboseMove || move, botColor, maxHalfMoves);
    });
  }

  function computeStaticExchangeSequence(game, move, botColor, maxHalfMoves) {
    const verboseMove = getVerboseMove(game, move);
    const result = {
      net: 0,
      safe: true,
      reasons: [],
      sequence: [],
      targetSquare: verboseMove && verboseMove.to || null
    };

    if (!verboseMove || isCheckmateAfterMove(game, verboseMove)) {
      return result;
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        net: -999999,
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        sequence: [],
        targetSquare: verboseMove.to
      };
    }

    let appliedCount = 1;
    try {
      const targetSquare = applied.to || verboseMove.to;
      const initialGain = getPieceValue(applied.captured || verboseMove.captured);
      const continuation = evaluateStaticExchangeContinuation(game, targetSquare, botColor, (typeof maxHalfMoves === "number" ? maxHalfMoves : 6) - 1);
      const net = initialGain + continuation.net;
      const sequence = [applied.san || (applied.from + applied.to)].concat(continuation.sequence);
      appliedCount += continuation.appliedCount || 0;
      const limit = typeof maxHalfMoves === "number" ? maxHalfMoves : 6;

      const reasons = [];
      if (net < -100) {
        addUnique(reasons, [REJECTION_REASONS.BAD_STATIC_EXCHANGE, REJECTION_REASONS.BAD_EXCHANGE_BALANCE, REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
      }

      return {
        net: net,
        safe: net >= -100,
        reasons: reasons,
        sequence: sequence,
        targetSquare: targetSquare
      };
    } finally {
      while (appliedCount > 0) {
        undoMoveSafely(game);
        appliedCount--;
      }
    }
  }

  function evaluateStaticExchangeContinuation(game, targetSquare, botColor, depth) {
    if (depth <= 0) {
      return {
        net: 0,
        sequence: [],
        appliedCount: 0
      };
    }

    const captures = getLegalMovesDeterministic(game).filter(function (candidate) {
      return candidate.to === targetSquare && Boolean(candidate.captured);
    }).sort(function (a, b) {
      const valueDiff = getPieceValue(a.piece) - getPieceValue(b.piece);
      if (valueDiff) {
        return valueDiff;
      }
      return getMoveDeterministicKey(a) < getMoveDeterministicKey(b) ? -1 : 1;
    });

    if (!captures.length) {
      return {
        net: 0,
        sequence: [],
        appliedCount: 0
      };
    }

    const moverColor = typeof game.turn === "function" ? game.turn() : null;
    let bestNet = 0;
    let bestSequence = [];

    for (let index = 0; index < captures.length; index++) {
      const capture = captures[index];
      const capturedPiece = getPieceAt(game, targetSquare);
      const capturedValue = getPieceValue(capturedPiece || capture.captured);
      const captureApplied = applyMoveSafely(game, capture);
      if (!captureApplied) {
        continue;
      }

      try {
        const continuation = evaluateStaticExchangeContinuation(game, targetSquare, botColor, depth - 1);
        const delta = (moverColor === botColor ? capturedValue : -capturedValue) + continuation.net;
        const sequence = [captureApplied.san || (captureApplied.from + captureApplied.to)].concat(continuation.sequence);
        if (moverColor === botColor) {
          if (delta > bestNet) {
            bestNet = delta;
            bestSequence = sequence;
          }
        } else if (delta < bestNet) {
          bestNet = delta;
          bestSequence = sequence;
        }
      } finally {
        undoMoveSafely(game);
      }
    }

    return {
      net: bestNet,
      sequence: bestSequence,
      appliedCount: 0
    };
  }

  function classifyStaticExchange(game, move, botColor, cache) {
    const staticExchange = evaluateStaticExchangeSequence(game, move, botColor, 6, cache);
    const score = staticExchange.net;
    const outcome = score > 30 ? "WINNING_EXCHANGE" :
      score >= -30 ? "EQUAL_EXCHANGE" :
        "LOSING_EXCHANGE";
    return {
      outcome: outcome,
      score: score,
      acceptable: score >= -30,
      staticExchange: staticExchange
    };
  }

  function isExchangeAcceptable(exchange) {
    return Boolean(exchange) && exchange.score >= -30;
  }

  function captureSequenceLosesMaterialClearly(game, move, botColor, cache) {
    const staticExchange = evaluateStaticExchangeSequence(game, move, botColor, 6, cache);
    if (!staticExchange.safe && staticExchange.net <= -150) {
      return true;
    }

    const result = evaluateCaptureSequenceMedium(game, move, botColor, cache);
    return !result.safe ||
      result.net <= -300 ||
      staticExchange.reasons.indexOf(REJECTION_REASONS.BAD_STATIC_EXCHANGE) !== -1 && staticExchange.net <= -150 ||
      result.reasons.indexOf(REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE) !== -1 ||
      result.reasons.indexOf(REJECTION_REASONS.HANGS_QUEEN) !== -1 ||
      result.reasons.indexOf(REJECTION_REASONS.HANGS_ROOK) !== -1 ||
      result.reasons.indexOf(REJECTION_REASONS.HANGS_MINOR_PIECE) !== -1;
  }

  function getEmergencyReason(pieceType, attackers) {
    if (pieceType === "q") {
      return REJECTION_REASONS.HANGS_QUEEN;
    }

    if (pieceType === "r") {
      return REJECTION_REASONS.HANGS_ROOK;
    }

    if (attackers.some(function (attacker) {
      return attacker.piece.type === "p";
    })) {
      return REJECTION_REASONS.HANGS_MINOR_PIECE;
    }

    return REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY;
  }

  function getEmergencySeverity(piece, attackers, defenders) {
    const value = getPieceValue(piece);
    const cheapestAttacker = attackers[0];
    if (!cheapestAttacker) {
      return 0;
    }

    if (piece.type === "q") {
      return 900 + Math.max(0, value - cheapestAttacker.value) / 10;
    }

    if (piece.type === "r") {
      return 600 + Math.max(0, value - cheapestAttacker.value) / 10;
    }

    if ((piece.type === "b" || piece.type === "n") && cheapestAttacker.piece.type === "p") {
      return 400;
    }

    if (attackers.length > defenders.length && cheapestAttacker.value < value) {
      return 250;
    }

    return 0;
  }

  function isAttackedButAdequatelyDefended(game, square, piece, botColor, attackers, balance) {
    if (!piece || !Array.isArray(attackers) || !attackers.length || !balance) {
      return false;
    }

    const pieceValue = getPieceValue(piece);
    const cheapestAttacker = attackers[0];
    const defenders = balance.effectiveDefenders.filter(function (defender) {
      return defender.effective;
    });
    if (!cheapestAttacker || !defenders.length) {
      return false;
    }

    if (piece.type === "p" && !isImportantPawn(game, square, piece, botColor)) {
      return true;
    }

    if ((piece.type === "b" || piece.type === "n") && cheapestAttacker.piece.type === "p") {
      return false;
    }

    if (cheapestAttacker.value + 30 >= pieceValue && balance.effectiveDefenderWeight >= attackers.length) {
      return true;
    }

    return cheapestAttacker.value >= pieceValue && defenders.some(function (defender) {
      return defender.value <= cheapestAttacker.value + 30;
    });
  }

  function detectMaterialEmergencies(game, botColor) {
    if (!game || typeof game.board !== "function") {
      return [];
    }

    const emergencies = [];
    const opponentColor = oppositeColor(botColor);
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (!piece || piece.color !== botColor || ["q", "r", "b", "n"].indexOf(piece.type) === -1) {
          continue;
        }

        const square = boardArraySquare(row, col);
        const attackers = getAttackersToSquare(game, square, opponentColor);
        if (!attackers.length) {
          continue;
        }

        const balance = evaluateAttackDefenseBalance(game, square, botColor);
        const defenders = balance.effectiveDefenders.filter(function (defender) {
          return defender.effective;
        });
        const cheapestAttacker = attackers[0];
        const pieceValue = getPieceValue(piece);
        const fakeThreat = cheapestAttacker.value >= pieceValue && balance.effectiveDefenderWeight >= attackers.length;
        if (fakeThreat) {
          continue;
        }

        if (isAttackedButAdequatelyDefended(game, square, piece, botColor, attackers, balance)) {
          continue;
        }

        const severity = getEmergencySeverity(piece, attackers, defenders);
        if (severity <= 0) {
          continue;
        }

        emergencies.push({
          square: square,
          piece: piece,
          value: pieceValue,
          attackers: attackers,
          defenders: defenders,
          rawDefenders: balance.defenders,
          severity: severity,
          reason: getEmergencyReason(piece.type, attackers)
        });
      }
    }

    return emergencies.sort(function (a, b) {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }

      if (a.value !== b.value) {
        return b.value - a.value;
      }

      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function detectPawnAttackedMinorEmergency(game, botColor) {
    if (!game || typeof game.board !== "function") {
      return null;
    }

    const opponentColor = oppositeColor(botColor);
    const candidates = [];
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (!piece || piece.color !== botColor || (piece.type !== "n" && piece.type !== "b")) {
          continue;
        }

        const square = boardArraySquare(row, col);
        const pawnAttackers = getPawnAttackersToSquare(game, square, opponentColor);
        if (!pawnAttackers.length) {
          continue;
        }

        const balance = evaluateAttackDefenseBalance(game, square, botColor);
        candidates.push({
          square: square,
          piece: piece,
          value: getPieceValue(piece),
          attackers: pawnAttackers,
          defenders: balance.effectiveDefenders.filter(function (defender) {
            return defender.effective;
          }),
          rawDefenders: balance.defenders,
          severity: 680,
          reason: REJECTION_REASONS.PAWN_ATTACKED_MINOR_EMERGENCY
        });
      }
    }

    candidates.sort(function (a, b) {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }
      if (a.value !== b.value) {
        return b.value - a.value;
      }
      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });

    return candidates[0] || null;
  }

  function isSquareBetweenSquares(middle, from, to) {
    const middleCoords = coordsFromSquare(middle);
    const fromCoords = coordsFromSquare(from);
    const toCoords = coordsFromSquare(to);
    if (!middleCoords || !fromCoords || !toCoords || middle === from || middle === to) {
      return false;
    }

    const fileDelta = toCoords.file - fromCoords.file;
    const rankDelta = toCoords.rank - fromCoords.rank;
    const fileStep = Math.sign(fileDelta);
    const rankStep = Math.sign(rankDelta);
    if (!(fileDelta === 0 || rankDelta === 0 || Math.abs(fileDelta) === Math.abs(rankDelta))) {
      return false;
    }

    let file = fromCoords.file + fileStep;
    let rank = fromCoords.rank + rankStep;
    while (file !== toCoords.file || rank !== toCoords.rank) {
      if (squareFromCoords(file, rank) === middle) {
        return true;
      }

      file += fileStep;
      rank += rankStep;
    }

    return false;
  }

  function lineAttackBlockedByMove(move, emergency) {
    if (!move || !emergency || !Array.isArray(emergency.attackers)) {
      return false;
    }

    return emergency.attackers.some(function (attacker) {
      return ["b", "r", "q"].indexOf(attacker.piece.type) !== -1 &&
        isSquareBetweenSquares(move.to, attacker.square, emergency.square);
    });
  }

  function moveHandlesMaterialEmergency(game, move, botColor, emergency) {
    const reasons = [];
    const purposeTags = [];
    const verboseMove = getVerboseMove(game, move);

    if (!verboseMove || !emergency) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
        purposeTags: []
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.CHECKMATE]
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    if (!safety.legalSafe || !safety.materialSafe) {
      addUnique(reasons, safety.reasons);
      return {
        handles: false,
        reasons: reasons,
        purposeTags: []
      };
    }

    const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
    if (!mateSafety.stops) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.ALLOWS_MATE_IN_ONE],
        purposeTags: []
      };
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        purposeTags: []
      };
    }

    try {
      const opponentColor = oppositeColor(botColor);
      const movedPiece = getPieceAt(game, applied.to);
      const movedPieceSafe = movedPiece && (!getCheapestAttackerToSquare(game, applied.to, opponentColor) ||
        getCheapestAttackerToSquare(game, applied.to, opponentColor).value >= getPieceValue(movedPiece));
      const capturesAttacker = emergency.attackers.some(function (attacker) {
        return verboseMove.to === attacker.square && Boolean(verboseMove.captured);
      });

      if (verboseMove.from === emergency.square && movedPieceSafe) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }

      if (capturesAttacker && movedPieceSafe) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.WIN_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }

      const pieceStillThere = getPieceAt(game, emergency.square);
      if (pieceStillThere && pieceStillThere.color === botColor) {
        const attackersAfter = getAttackersToSquare(game, emergency.square, opponentColor);
        const defendersAfter = getAttackersToSquare(game, emergency.square, botColor);
        const cheapestAfter = attackersAfter[0];
        if (!attackersAfter.length || defendersAfter.length >= attackersAfter.length && (!cheapestAfter || cheapestAfter.value >= getPieceValue(pieceStillThere))) {
          addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
          return {
            handles: true,
            reasons: [],
            purposeTags: purposeTags
          };
        }
      }

      if (lineAttackBlockedByMove(verboseMove, emergency) && movedPieceSafe) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }
    } finally {
      undoMoveSafely(game);
    }

    return {
      handles: false,
      reasons: [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
      purposeTags: []
    };
  }

  function scoreMaterialEmergencyMove(game, move, botColor, emergency) {
    const trace = createMoveTrace(move);
    const verboseMove = getVerboseMove(game, move);

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        handles: true,
        rejected: trace.rejected
      };
    }

    const handleResult = moveHandlesMaterialEmergency(game, verboseMove, botColor, emergency);
    addUnique(trace.reasons, handleResult.reasons);
    addUnique(trace.purposeTags, handleResult.purposeTags);

    if (!handleResult.handles) {
      trace.score -= 999999;
      addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
      trace.rejected = true;
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        handles: false,
        rejected: trace.rejected
      };
    }

    trace.score += 4000;
    markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
    if (emergency.attackers.some(function (attacker) {
      return verboseMove.to === attacker.square && Boolean(verboseMove.captured);
    })) {
      trace.score += 1000;
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    if (verboseMove.from === emergency.square && emergency.piece.type === "q") {
      trace.score += 1200;
    } else if (verboseMove.from === emergency.square && emergency.piece.type === "r") {
      trace.score += 800;
    } else if (verboseMove.from === emergency.square && (emergency.piece.type === "b" || emergency.piece.type === "n") && emergency.attackers[0].piece.type === "p") {
      trace.score += 600;
    } else if (lineAttackBlockedByMove(verboseMove, emergency)) {
      trace.score += 300;
    } else {
      trace.score += 400;
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    if (!safety.legalSafe || !safety.materialSafe) {
      addUnique(trace.reasons, safety.reasons);
      trace.score -= 3000;
    }

    return {
      move: verboseMove,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      handles: true,
      rejected: trace.rejected
    };
  }

  function compareMaterialEmergencyMoves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseMaterialEmergencyMove(game, botColor) {
    const emergencies = detectMaterialEmergencies(game, botColor);
    if (!emergencies.length) {
      return null;
    }

    const emergency = emergencies[0];
    const pawnAttackedMinor = detectPawnAttackedMinorEmergency(game, botColor);
    if (pawnAttackedMinor && pawnAttackedMinor.square === emergency.square) {
      const pawnMinorMove = choosePawnAttackedMinorEmergencyMove(game, botColor);
      if (pawnMinorMove) {
        return pawnMinorMove;
      }
    }

    const scoredMoves = getLegalMovesDeterministic(game).map(function (move) {
      const scored = scoreMaterialEmergencyMove(game, move, botColor, emergency);
      scored.severity = emergency.severity;
      return scored;
    }).filter(function (item) {
      return item.handles && !item.rejected && item.score > -999999;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareMaterialEmergencyMoves);
    return scoredMoves[0].move;
  }

  function moveHandlesPawnAttackedMinorEmergency(game, move, botColor, emergency) {
    return moveHandlesMaterialEmergency(game, move, botColor, emergency);
  }

  function scorePawnAttackedMinorEmergencyMove(game, move, botColor, emergency) {
    const scored = scoreMaterialEmergencyMove(game, move, botColor, emergency);
    addUnique(scored.reasons, [REJECTION_REASONS.PAWN_ATTACKED_MINOR_EMERGENCY]);
    if (scored.handles && !scored.rejected) {
      scored.score += 900;
      addUnique(scored.purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.SURVIVAL]);
    }
    return scored;
  }

  function choosePawnAttackedMinorEmergencyMove(game, botColor, candidateMoves) {
    const emergency = detectPawnAttackedMinorEmergency(game, botColor);
    if (!emergency) {
      return null;
    }

    const scoped = (candidateMoves || getLegalMovesDeterministic(game)).filter(function (move) {
      return move.from === emergency.square ||
        emergency.attackers.some(function (attacker) {
          return move.to === attacker.square && Boolean(move.captured);
        });
    });
    const moves = scoped.length ? scoped : (candidateMoves || getLegalMovesDeterministic(game));

    const scoredMoves = moves.map(function (move) {
      return scorePawnAttackedMinorEmergencyMove(game, move, botColor, emergency);
    }).filter(function (item) {
      return item.handles && !item.rejected && item.score > -999999;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareMaterialEmergencyMoves);
    return scoredMoves[0].move;
  }

  function isPassedOrNearPassedPawn(game, square, botColor) {
    const coords = coordsFromSquare(square);
    if (!game || typeof game.board !== "function" || !coords) {
      return false;
    }

    const opponentColor = oppositeColor(botColor);
    const direction = botColor === "w" ? 1 : -1;
    let blockers = 0;
    for (let file = coords.file - 1; file <= coords.file + 1; file++) {
      for (let rank = coords.rank + direction; rank >= 0 && rank <= 7; rank += direction) {
        const piece = getPieceAt(game, squareFromCoords(file, rank));
        if (piece && piece.color === opponentColor && piece.type === "p") {
          blockers += 1;
        }
      }
    }

    return blockers <= 1;
  }

  function isKingShieldPawn(game, square, botColor) {
    const coords = coordsFromSquare(square);
    const kingSquare = findKingSquare(game, botColor);
    const kingCoords = coordsFromSquare(kingSquare);
    if (!coords || !kingCoords) {
      return false;
    }

    const kingSideFiles = botColor === "w" ? [5, 6, 7] : [5, 6, 7];
    const queenSideFiles = botColor === "w" ? [0, 1, 2] : [0, 1, 2];
    const shieldRanks = botColor === "w" ? [1, 2] : [6, 5];
    const kingSide = kingCoords.file >= 5 && kingSideFiles.indexOf(coords.file) !== -1;
    const queenSide = kingCoords.file <= 2 && queenSideFiles.indexOf(coords.file) !== -1;

    return shieldRanks.indexOf(coords.rank) !== -1 && (kingSide || queenSide);
  }

  function pawnLossOpensKingFile(game, square, botColor) {
    const coords = coordsFromSquare(square);
    const kingSquare = findKingSquare(game, botColor);
    const kingCoords = coordsFromSquare(kingSquare);
    if (!coords || !kingCoords) {
      return false;
    }

    return Math.abs(coords.file - kingCoords.file) <= 1 && Math.abs(coords.rank - kingCoords.rank) <= 2;
  }

  function isImportantPawn(game, square, pawn, botColor) {
    if (!pawn || pawn.type !== "p" || pawn.color !== botColor || !square) {
      return false;
    }

    const coords = coordsFromSquare(square);
    if (!coords) {
      return false;
    }

    const centerFiles = [3, 4];
    const centerSquares = ["d4", "e4", "d5", "e5"];
    if (centerFiles.indexOf(coords.file) !== -1 || centerSquares.indexOf(square) !== -1) {
      return true;
    }

    if (isKingShieldPawn(game, square, botColor)) {
      return true;
    }

    if (isPassedOrNearPassedPawn(game, square, botColor)) {
      return true;
    }

    return pawnLossOpensKingFile(game, square, botColor);
  }

  function evaluatePawnImportanceBee3(game, square, color) {
    const result = {
      importance: 0,
      reasons: []
    };
    const pawn = getPieceAt(game, square);
    if (!pawn || pawn.type !== "p" || pawn.color !== color) {
      return result;
    }

    const coords = coordsFromSquare(square);
    if (!coords) {
      return result;
    }

    if (coords.file === 3 || coords.file === 4 || ["d4", "e4", "d5", "e5"].indexOf(square) !== -1) {
      result.importance += 220;
      addUnique(result.reasons, [PURPOSE_TAGS.CONTROL_CENTER]);
    }

    if (isKingShieldPawn(game, square, color)) {
      result.importance += 260;
      addUnique(result.reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    if (isPassedOrNearPassedPawn(game, square, color)) {
      result.importance += 230;
      addUnique(result.reasons, [PURPOSE_TAGS.ENDGAME_PLAN]);
    }

    if (pawnLossOpensKingFile(game, square, color)) {
      result.importance += 180;
      addUnique(result.reasons, [REJECTION_REASONS.KING_SHIELD_STRUCTURE_RISK]);
    }

    const defenders = getAttackersToSquare(game, square, color);
    if (defenders.length) {
      result.importance += 40;
    }

    return result;
  }

  function isNormalOpeningPawnPressure(game, square, piece, botColor, attackers, balance) {
    if (!isOpeningPhase(game, botColor) || !piece || piece.type !== "p" || !attackers || attackers.length !== 1) {
      return false;
    }

    const attacker = attackers[0];
    if (!attacker || !attacker.piece || attacker.value <= getPieceValue(piece)) {
      return false;
    }

    const coords = coordsFromSquare(square);
    if (!coords) {
      return false;
    }

    const startingRank = botColor === "w" ? 1 : 6;
    const kingSquare = findKingSquare(game, botColor);
    const kingCoords = coordsFromSquare(kingSquare);
    const kingStillHome = kingSquare === (botColor === "w" ? "e1" : "e8") ||
      kingCoords && Math.abs(kingCoords.file - coords.file) <= 1 && Math.abs(kingCoords.rank - coords.rank) <= 1;

    return coords.rank === startingRank &&
      kingStillHome &&
      attacker.piece.type !== "p" &&
      (!balance || balance.attackerValue <= getPieceValue(piece) + 450);
  }

  function getUnitRiskReason(piece, square, attackers, botColor, game) {
    if (piece.type === "q") {
      return REJECTION_REASONS.HANGS_QUEEN;
    }

    if (piece.type === "r") {
      return REJECTION_REASONS.HANGS_ROOK;
    }

    if (piece.type === "b" || piece.type === "n") {
      return REJECTION_REASONS.HANGS_MINOR_PIECE;
    }

    if (piece.type === "p" && pawnLossOpensKingFile(game, square, botColor)) {
      return REJECTION_REASONS.KING_PAWN_WEAKENING;
    }

    return REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY;
  }

  function evaluateUnitRisk(game, square, piece, botColor) {
    const emptyRisk = {
      risky: false,
      severity: 0,
      attackers: [],
      defenders: [],
      reasons: []
    };

    if (!game || !square || !piece || piece.color !== botColor) {
      return emptyRisk;
    }

    const opponentColor = oppositeColor(botColor);
    const attackers = getAttackersToSquare(game, square, opponentColor);
    const balance = evaluateAttackDefenseBalance(game, square, botColor);
    const defenders = balance.effectiveDefenders.filter(function (defender) {
      return defender.effective;
    });
    if (!attackers.length) {
      return {
        risky: false,
        severity: 0,
        attackers: attackers,
        defenders: defenders,
        reasons: []
      };
    }

    const pieceValue = getPieceValue(piece);
    const cheapestAttacker = attackers[0];
    const isMinor = piece.type === "b" || piece.type === "n";
    const importantPawn = piece.type === "p" && isImportantPawn(game, square, piece, botColor);
    const pawnImportance = importantPawn ? evaluatePawnImportanceBee3(game, square, botColor) : { importance: 0, reasons: [] };
    const defendedEnough = balance.effectiveDefenderWeight >= attackers.length &&
      (!cheapestAttacker || cheapestAttacker.value >= pieceValue || defenders[0] && defenders[0].value <= cheapestAttacker.value);
    const fakeThreat = cheapestAttacker.value >= pieceValue && defendedEnough;

    if (piece.type === "p" && !importantPawn) {
      return {
        risky: false,
        severity: 0,
        attackers: attackers,
        defenders: defenders,
        rawDefenders: balance.defenders,
        reasons: []
      };
    }

    if (importantPawn && isNormalOpeningPawnPressure(game, square, piece, botColor, attackers, balance)) {
      return {
        risky: false,
        severity: 0,
        attackers: attackers,
        defenders: defenders,
        rawDefenders: balance.defenders,
        reasons: []
      };
    }

    if (fakeThreat) {
      return {
        risky: false,
        severity: 0,
        attackers: attackers,
        defenders: defenders,
        reasons: []
      };
    }

    if (isAttackedButAdequatelyDefended(game, square, piece, botColor, attackers, balance)) {
      return {
        risky: false,
        severity: 0,
        attackers: attackers,
        defenders: defenders,
        rawDefenders: balance.defenders,
        reasons: []
      };
    }

    let severity = 0;
    if (piece.type === "q" && cheapestAttacker.value < pieceValue) {
      severity = 900 + Math.max(0, pieceValue - cheapestAttacker.value) / 10;
    } else if (piece.type === "r" && cheapestAttacker.value < pieceValue) {
      severity = 600 + Math.max(0, pieceValue - cheapestAttacker.value) / 10;
    } else if (isMinor && cheapestAttacker.piece.type === "p") {
      severity = 450;
    } else if (isMinor && (cheapestAttacker.value < pieceValue || attackers.length > defenders.length)) {
      severity = 300;
    } else if (importantPawn && attackers.length > defenders.length && cheapestAttacker.value <= pieceValue + 220) {
      severity = Math.max(isKingShieldPawn(game, square, botColor) ? 300 : 180, pawnImportance.importance);
    } else if (importantPawn && cheapestAttacker.value <= pieceValue && !defenders.length) {
      severity = Math.max(isKingShieldPawn(game, square, botColor) ? 260 : 180, pawnImportance.importance);
    }

    if (severity <= 0) {
      return {
        risky: false,
        severity: 0,
        attackers: attackers,
        defenders: defenders,
        reasons: []
      };
    }

    return {
      risky: true,
      severity: severity,
      attackers: attackers,
      defenders: defenders,
      rawDefenders: balance.defenders,
      reasons: [getUnitRiskReason(piece, square, attackers, botColor, game)]
    };
  }

  function detectUnderdefendedUnits(game, botColor) {
    if (!game || typeof game.board !== "function") {
      return [];
    }

    const units = [];
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (!piece || piece.color !== botColor) {
          continue;
        }

        const square = boardArraySquare(row, col);
        const watchPiece = ["q", "r", "b", "n"].indexOf(piece.type) !== -1 ||
          piece.type === "p" && isImportantPawn(game, square, piece, botColor);
        if (!watchPiece) {
          continue;
        }

        const risk = evaluateUnitRisk(game, square, piece, botColor);
        if (!risk.risky) {
          continue;
        }

        units.push({
          square: square,
          piece: piece,
          value: getPieceValue(piece),
          risk: risk,
          severity: risk.severity,
          attackers: risk.attackers,
          defenders: risk.defenders,
          reasons: risk.reasons
        });
      }
    }

    return units.sort(function (a, b) {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }

      if (a.value !== b.value) {
        return b.value - a.value;
      }

      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function detectPawnStewardshipRisks(game, botColor) {
    if (!game || typeof game.board !== "function") {
      return [];
    }

    const risks = [];
    const opponentColor = oppositeColor(botColor);
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (!piece || piece.color !== botColor || piece.type !== "p") {
          continue;
        }

        const square = boardArraySquare(row, col);
        const importance = evaluatePawnImportanceBee3(game, square, botColor);
        if (importance.importance < 180) {
          continue;
        }

        const attackers = getAttackersToSquare(game, square, opponentColor);
        if (!attackers.length) {
          continue;
        }

        const balance = evaluateAttackDefenseBalance(game, square, botColor);
        if (isNormalOpeningPawnPressure(game, square, piece, botColor, attackers, balance)) {
          continue;
        }

        const effectiveDefenders = balance.effectiveDefenders.filter(function (defender) {
          return defender.effective;
        });
        const cheapestAttacker = attackers[0];
        const insufficientDefense = balance.effectiveDefenderWeight < attackers.length ||
          !effectiveDefenders.length ||
          cheapestAttacker.value <= getPieceValue(piece);
        if (!insufficientDefense && !pawnLossOpensKingFile(game, square, botColor)) {
          continue;
        }

        risks.push({
          square: square,
          piece: piece,
          value: getPieceValue(piece),
          importance: importance.importance,
          severity: Math.min(420, Math.max(180, importance.importance)),
          attackers: attackers,
          defenders: effectiveDefenders,
          reasons: importance.reasons.length ? importance.reasons : [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]
        });
      }
    }

    return risks.sort(function (a, b) {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function chooseHighestValueUnitEmergency(game, botColor) {
    const units = detectUnderdefendedUnits(game, botColor).filter(function (unitInfo) {
      return !isFakeUnitThreat(game, unitInfo, botColor);
    });
    const pawnRisks = detectPawnStewardshipRisks(game, botColor).map(function (risk) {
      return {
        square: risk.square,
        piece: risk.piece,
        value: risk.value,
        risk: risk,
        severity: risk.severity,
        attackers: risk.attackers,
        defenders: risk.defenders,
        reasons: risk.reasons,
        pawnStewardship: true
      };
    });

    return units.concat(pawnRisks).sort(function (a, b) {
      const classValue = function (item) {
        if (!item || !item.piece) {
          return 0;
        }
        if (item.piece.type === "q") {
          return 5000;
        }
        if (item.piece.type === "r") {
          return 3500;
        }
        if (item.piece.type === "b" || item.piece.type === "n") {
          return 2200;
        }
        if (item.piece.type === "p") {
          return item.risk && item.risk.importance >= 300 ? 900 : 500;
        }
        return 0;
      };

      const classDiff = classValue(b) - classValue(a);
      if (classDiff) {
        return classDiff;
      }
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }
      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    })[0] || null;
  }

  function isFakeUnitThreat(game, unitInfo, botColor) {
    if (!unitInfo || !Array.isArray(unitInfo.attackers) || !unitInfo.attackers.length) {
      return true;
    }

    const piece = unitInfo.piece;
    const pieceValue = getPieceValue(piece);
    const attackers = unitInfo.attackers;
    const balance = evaluateAttackDefenseBalance(game, unitInfo.square, botColor);
    const defenders = balance.effectiveDefenders.filter(function (defender) {
      return defender.effective;
    });
    const cheapestAttacker = attackers[0];
    const importantPawn = piece.type === "p" && isImportantPawn(game, unitInfo.square, piece, botColor);

    if (piece.type === "p" && !importantPawn) {
      return true;
    }

    if (piece.type === "q" || piece.type === "r" || piece.type === "b" || piece.type === "n") {
      if (cheapestAttacker.value < pieceValue) {
        return false;
      }
    }

    if ((piece.type === "b" || piece.type === "n") && cheapestAttacker.piece.type === "p") {
      return false;
    }

    if (importantPawn && attackers.length > balance.effectiveDefenderWeight) {
      return false;
    }

    if (isAttackedButAdequatelyDefended(game, unitInfo.square, piece, botColor, attackers, balance)) {
      return true;
    }

    if (balance.effectiveDefenderWeight >= attackers.length && (!cheapestAttacker || cheapestAttacker.value >= pieceValue)) {
      return true;
    }

    return unitInfo.severity <= 0;
  }

  function unitStillRiskyAfterMove(game, square, botColor) {
    const piece = getPieceAt(game, square);
    if (!piece || piece.color !== botColor) {
      return false;
    }

    return evaluateUnitRisk(game, square, piece, botColor).risky;
  }

  function moveHandlesUnderdefendedUnit(game, move, botColor, unitInfo) {
    const reasons = [];
    const purposeTags = [];
    const verboseMove = getVerboseMove(game, move);

    if (!verboseMove || !unitInfo || isFakeUnitThreat(game, unitInfo, botColor)) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.OVERPROTECT_FAKE_THREAT],
        purposeTags: []
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.CHECKMATE]
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    if (!safety.legalSafe || !safety.materialSafe) {
      addUnique(reasons, safety.reasons);
      return {
        handles: false,
        reasons: reasons,
        purposeTags: []
      };
    }

    const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
    if (!mateSafety.stops) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.ALLOWS_MATE_IN_ONE],
        purposeTags: []
      };
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        handles: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        purposeTags: []
      };
    }

    try {
      const opponentColor = oppositeColor(botColor);
      const movedPiece = getPieceAt(game, applied.to);
      const cheapestOnMoved = movedPiece ? getCheapestAttackerToSquare(game, applied.to, opponentColor) : null;
      const movedPieceSafe = movedPiece && (!cheapestOnMoved || cheapestOnMoved.value >= getPieceValue(movedPiece));
      const capturesAttacker = unitInfo.attackers.some(function (attacker) {
        return verboseMove.to === attacker.square && Boolean(verboseMove.captured);
      });
      const createsDirectThreatOnAttacker = unitInfo.attackers.some(function (attacker) {
        return movedPiece &&
          attacker &&
          attacker.square &&
          attacker.value >= Math.max(getPieceValue(unitInfo.piece), getPieceValue("n")) &&
          doesPieceAttackSquare(game, applied.to, movedPiece, attacker.square);
      });

      if (verboseMove.from === unitInfo.square && movedPieceSafe && !unitStillRiskyAfterMove(game, applied.to, botColor)) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }

      if (capturesAttacker && movedPieceSafe) {
        const unitStillThereAfterCapture = getPieceAt(game, unitInfo.square);
        if (!unitStillThereAfterCapture || !unitStillRiskyAfterMove(game, unitInfo.square, botColor)) {
          addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.WIN_MATERIAL]);
          return {
            handles: true,
            reasons: [],
            purposeTags: purposeTags
          };
        }
      }

      if (createsDirectThreatOnAttacker && movedPieceSafe) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.CREATE_SAFE_THREAT]);
        return {
          handles: true,
          reasons: [REJECTION_REASONS.HIGHER_VALUE_UNIT_PRIORITY],
          purposeTags: purposeTags
        };
      }

      const pieceStillThere = getPieceAt(game, unitInfo.square);
      if (pieceStillThere && pieceStillThere.color === botColor && !unitStillRiskyAfterMove(game, unitInfo.square, botColor)) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }

      if (lineAttackBlockedByMove(verboseMove, unitInfo) && movedPieceSafe && !unitStillRiskyAfterMove(game, unitInfo.square, botColor)) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }

      if (unitInfo.piece.type === "p" && verboseMove.from === unitInfo.square && movedPieceSafe) {
        addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
        return {
          handles: true,
          reasons: [],
          purposeTags: purposeTags
        };
      }
    } finally {
      undoMoveSafely(game);
    }

    return {
      handles: false,
      reasons: [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
      purposeTags: []
    };
  }

  function moveHandlesPawnStewardshipRisk(game, move, botColor, risk) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !risk || !risk.square) {
      return {
        handles: false,
        reasons: [],
        purposeTags: []
      };
    }

    const higherEmergency = chooseHighestValueUnitEmergency(game, botColor);
    if (higherEmergency &&
      higherEmergency.square !== risk.square &&
      higherEmergency.value > getPieceValue(risk.piece) &&
      verboseMove.from === higherEmergency.square) {
      return {
        handles: true,
        reasons: [REJECTION_REASONS.HIGHER_VALUE_UNIT_PRIORITY],
        purposeTags: [PURPOSE_TAGS.DEFEND_MATERIAL]
      };
    }

    const unitInfo = {
      square: risk.square,
      piece: risk.piece,
      value: risk.value,
      risk: risk,
      severity: risk.severity,
      attackers: risk.attackers,
      defenders: risk.defenders,
      reasons: risk.reasons
    };

    if (moveHandlesUnderdefendedUnit(game, verboseMove, botColor, unitInfo).handles) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.DEFEND_MATERIAL]
      };
    }

    const capturesAttacker = risk.attackers.some(function (attacker) {
      return verboseMove.to === attacker.square && Boolean(verboseMove.captured);
    });
    if (capturesAttacker && isSafeHighValueCapture(game, verboseMove, botColor).safe !== false) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.WIN_MATERIAL]
      };
    }

    return withTemporaryMove(game, verboseMove, function (applied, ok) {
      if (!ok) {
        return {
          handles: false,
          reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
          purposeTags: []
        };
      }

      const pawn = getPieceAt(game, risk.square);
      if (!pawn || pawn.color !== botColor) {
        return {
          handles: verboseMove.from === risk.square,
          reasons: verboseMove.from === risk.square ? [] : [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
          purposeTags: verboseMove.from === risk.square ? [PURPOSE_TAGS.DEFEND_MATERIAL] : []
        };
      }

      const nextRisk = evaluateUnitRisk(game, risk.square, pawn, botColor);
      const currentDefenders = getAttackersToSquare(game, risk.square, botColor);
      const currentAttackers = getAttackersToSquare(game, risk.square, oppositeColor(botColor));
      const directPawnHandling = verboseMove.from === risk.square ||
        capturesAttacker ||
        currentDefenders.length > (risk.defenders ? risk.defenders.length : 0) ||
        currentAttackers.length === 0;
      return {
        handles: !nextRisk.risky && directPawnHandling,
        reasons: !nextRisk.risky && directPawnHandling ? [] : [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
        purposeTags: !nextRisk.risky && directPawnHandling ? [PURPOSE_TAGS.DEFEND_MATERIAL] : []
      };
    });
  }

  function scorePawnStewardshipMove(game, move, botColor, risk) {
    const trace = createMoveTrace(move);
    const handle = moveHandlesPawnStewardshipRisk(game, move, botColor, risk);
    addUnique(trace.reasons, handle.reasons);
    addUnique(trace.purposeTags, handle.purposeTags);

    if (handle.handles) {
      trace.score += 150 + Math.min(350, risk && risk.importance || risk && risk.severity || 0);
      markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      if (risk && risk.importance >= 300) {
        trace.score += 120;
      }
    } else if (risk && risk.severity >= 250) {
      trace.score -= Math.min(700, 250 + risk.severity);
      addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
    }

    return {
      move: getVerboseMove(game, move),
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      handles: handle.handles,
      rejected: trace.rejected
    };
  }

  function scoreUnitStewardshipMove(game, move, botColor, unitInfo) {
    const trace = createMoveTrace(move);
    const verboseMove = getVerboseMove(game, move);

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        handles: true,
        rejected: trace.rejected
      };
    }

    const handleResult = moveHandlesUnderdefendedUnit(game, verboseMove, botColor, unitInfo);
    addUnique(trace.reasons, handleResult.reasons);
    addUnique(trace.purposeTags, handleResult.purposeTags);

    if (!handleResult.handles) {
      trace.score -= 999999;
      addUnique(trace.reasons, [unitInfo && unitInfo.severity >= 300 ? REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY : REJECTION_REASONS.NO_CLEAR_PURPOSE]);
      trace.rejected = true;
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        handles: false,
        rejected: trace.rejected
      };
    }

    trace.score += 2500;
    markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
    if (unitInfo.piece.type === "q") {
      trace.score += 1200;
    } else if (unitInfo.piece.type === "r") {
      trace.score += 800;
    } else if (unitInfo.piece.type === "b" || unitInfo.piece.type === "n") {
      trace.score += 500;
    } else if (unitInfo.piece.type === "p") {
      trace.score += 250;
    }

    if (unitInfo.attackers.some(function (attacker) {
      return verboseMove.to === attacker.square && Boolean(verboseMove.captured);
    })) {
      trace.score += 700;
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    } else if (lineAttackBlockedByMove(verboseMove, unitInfo)) {
      trace.score += 250;
    } else if (verboseMove.from !== unitInfo.square) {
      trace.score += 300;
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    if (!safety.legalSafe || !safety.materialSafe) {
      addUnique(trace.reasons, safety.reasons);
      trace.score -= 3000;
    }

    return {
      move: verboseMove,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      handles: true,
      rejected: trace.rejected
    };
  }

  function compareUnitStewardshipMoves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    if (a.severity !== b.severity) {
      return b.severity - a.severity;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseUnitStewardshipMove(game, botColor) {
    const unitInfo = chooseHighestValueUnitEmergency(game, botColor);
    if (!unitInfo) {
      return null;
    }

    const scoredMoves = getLegalMovesDeterministic(game).map(function (move) {
      const scored = unitInfo.pawnStewardship ?
        scorePawnStewardshipMove(game, move, botColor, unitInfo.risk) :
        scoreUnitStewardshipMove(game, move, botColor, unitInfo);
      scored.severity = unitInfo.severity;
      return scored;
    }).filter(function (item) {
      return item.handles && !item.rejected && item.score > -999999;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareUnitStewardshipMoves);
    return scoredMoves[0].move;
  }

  function getCriticalKingPawnIntrusionSquares(botColor) {
    return botColor === "b" ? ["f7"] : ["f2"];
  }

  function detectKingPawnIntrusion(game, botColor) {
    const opponentColor = oppositeColor(botColor);
    const criticalSquares = getCriticalKingPawnIntrusionSquares(botColor);
    for (let index = 0; index < criticalSquares.length; index++) {
      const square = criticalSquares[index];
      const piece = getPieceAt(game, square);
      if (!piece || piece.color !== opponentColor) {
        continue;
      }

      const highValueTargets = getAttackedHighValueTargetsFromSquare(game, square, piece, botColor);
      const kingZone = getKingZone(game, botColor);
      const attacksKingZone = kingZone.zoneSquares.some(function (zoneSquare) {
        return doesPieceAttackSquare(game, square, piece, zoneSquare);
      });
      const severity = 850 + highValueTargets.length * 120 + (attacksKingZone ? 180 : 0);
      return {
        active: true,
        square: square,
        piece: piece,
        attackerColor: opponentColor,
        targetPawnSquare: square,
        severity: severity,
        reasons: [REJECTION_REASONS.KING_PAWN_INTRUSION, REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY],
        targets: highValueTargets
      };
    }

    return {
      active: false,
      square: null,
      piece: null,
      attackerColor: opponentColor,
      targetPawnSquare: null,
      severity: 0,
      reasons: [],
      targets: []
    };
  }

  function getAttackedHighValueTargetsFromSquare(game, from, piece, botColor) {
    if (!from || !piece || !game || typeof game.board !== "function") {
      return [];
    }

    const targets = [];
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const targetPiece = board[row][col];
        const square = boardArraySquare(row, col);
        if (!targetPiece || targetPiece.color !== botColor || square === from) {
          continue;
        }

        if ((targetPiece.type === "k" || getPieceValue(targetPiece) >= 320) &&
          doesPieceAttackSquare(game, from, piece, square)) {
          targets.push({
            square: square,
            piece: targetPiece,
            value: getPieceValue(targetPiece),
            targetType: targetPiece.type === "k" ? "KING_ZONE" : "MATERIAL"
          });
        }
      }
    }

    return targets.sort(function (a, b) {
      if (a.value !== b.value) {
        return b.value - a.value;
      }

      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function moveAttacksSquareAfterMove(game, move, botColor, targetSquare) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !targetSquare) {
      return false;
    }

    return withTemporaryMove(game, verboseMove, function (applied, ok) {
      if (!ok || !applied) {
        return false;
      }

      const movedPiece = getPieceAt(game, applied.to);
      return Boolean(movedPiece && movedPiece.color === botColor &&
        doesPieceAttackSquare(game, applied.to, movedPiece, targetSquare));
    });
  }

  function moveHandlesKingPawnIntrusion(game, move, botColor, intrusion) {
    const reasons = [];
    const purposeTags = [];
    const verboseMove = getVerboseMove(game, move);
    const activeIntrusion = intrusion || detectKingPawnIntrusion(game, botColor);
    if (!verboseMove || !activeIntrusion.active) {
      return {
        handles: false,
        reasons: [],
        purposeTags: []
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        handles: true,
        reasons: [],
        purposeTags: [PURPOSE_TAGS.CHECKMATE]
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    if (!safety.legalSafe || !safety.materialSafe || !moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      addUnique(reasons, safety.reasons);
      if (!moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
        addUnique(reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
      }
      return {
        handles: false,
        reasons: reasons,
        purposeTags: []
      };
    }

    if (verboseMove.to === activeIntrusion.square && verboseMove.captured) {
      addUnique(purposeTags, [PURPOSE_TAGS.WIN_MATERIAL, PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
      return {
        handles: true,
        reasons: reasons,
        purposeTags: purposeTags
      };
    }

    if (moveAttacksSquareAfterMove(game, verboseMove, botColor, activeIntrusion.square)) {
      addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.IMPROVE_KING_SAFETY, PURPOSE_TAGS.SURVIVAL]);
      return {
        handles: true,
        reasons: reasons,
        purposeTags: purposeTags
      };
    }

    if (activeIntrusion.targets.some(function (target) {
      return target.square === verboseMove.to || verboseMove.from === target.square;
    })) {
      addUnique(purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.SURVIVAL]);
      return {
        handles: true,
        reasons: reasons,
        purposeTags: purposeTags
      };
    }

    if (isCastlingMove(verboseMove) && evaluateMoveReducesKingDanger(game, verboseMove, botColor).reduces) {
      addUnique(purposeTags, [PURPOSE_TAGS.CASTLE, PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
      return {
        handles: true,
        reasons: reasons,
        purposeTags: purposeTags
      };
    }

    return {
      handles: false,
      reasons: [REJECTION_REASONS.KING_PAWN_INTRUSION],
      purposeTags: []
    };
  }

  function scoreKingPawnIntrusionResponse(game, move, botColor, intrusion) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    const activeIntrusion = intrusion || detectKingPawnIntrusion(game, botColor);
    if (!verboseMove || !activeIntrusion.active) {
      return trace;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return trace;
    }

    const handled = moveHandlesKingPawnIntrusion(game, verboseMove, botColor, activeIntrusion);
    addUnique(trace.reasons, handled.reasons);
    addUnique(trace.purposeTags, handled.purposeTags);
    if (!handled.handles) {
      trace.score -= 900;
      addUnique(trace.reasons, [REJECTION_REASONS.KING_PAWN_INTRUSION]);
    } else if (verboseMove.to === activeIntrusion.square && verboseMove.captured) {
      trace.score += 1200;
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    } else if (moveAttacksSquareAfterMove(game, verboseMove, botColor, activeIntrusion.square)) {
      trace.score += 800;
      if (verboseMove.piece === "r") {
        trace.score += 450;
      } else if (verboseMove.piece === "q") {
        trace.score += 100;
      } else if (verboseMove.piece === "k") {
        trace.score -= 200;
      } else if (verboseMove.piece === "n" || verboseMove.piece === "b") {
        trace.score -= 100;
      }
      markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    } else {
      trace.score += 500;
      markPurpose(trace, PURPOSE_TAGS.SURVIVAL);
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      trace.score -= 999999;
      trace.rejected = true;
    }

    if (isKingSidePawnWeakeningMove(game, verboseMove, botColor).weakening) {
      trace.score -= 1200;
      addUnique(trace.reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    return trace;
  }

  function chooseKingPawnIntrusionResponse(game, botColor, candidateMoves) {
    const intrusion = detectKingPawnIntrusion(game, botColor);
    if (!intrusion.active) {
      return null;
    }

    const moves = (candidateMoves || getLegalMovesDeterministic(game)).filter(function (move) {
      return move.to === intrusion.square && move.captured ||
        isCastlingMove(move) ||
        moveAttacksSquareAfterMove(game, move, botColor, intrusion.square) ||
        intrusion.targets.some(function (target) {
          return target.square === move.to || move.from === target.square;
        });
    });
    const scoredMoves = moves.map(function (move) {
      const trace = scoreKingPawnIntrusionResponse(game, move, botColor, intrusion);
      trace.intrusionSeverity = intrusion.severity;
      return trace;
    }).filter(function (trace) {
      return !trace.rejected && trace.score > 0 &&
        moveHandlesKingPawnIntrusion(game, trace.move, botColor, intrusion).handles;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(tieBreakBee3Moves);
    return scoredMoves[0].move;
  }

  function getHistoryVerboseSafe(game) {
    if (!game || typeof game.history !== "function") {
      return [];
    }

    try {
      return game.history({ verbose: true }) || [];
    } catch (error) {
      return [];
    }
  }

  function hasHistoryCastle(game, botColor) {
    return getHistoryVerboseSafe(game).some(function (move) {
      return move && move.color === botColor && (move.san === "O-O" || move.san === "O-O-O");
    });
  }

  function getOriginalSquares(botColor) {
    return botColor === "w" ? {
      king: "e1",
      queen: "d1",
      knights: ["b1", "g1"],
      bishops: ["c1", "f1"],
      rooks: ["a1", "h1"],
      centerPawns: ["d2", "e2"]
    } : {
      king: "e8",
      queen: "d8",
      knights: ["b8", "g8"],
      bishops: ["c8", "f8"],
      rooks: ["a8", "h8"],
      centerPawns: ["d7", "e7"]
    };
  }

  function isNaturalKnightSquare(square, botColor) {
    return botColor === "w" ? ["c3", "f3", "d2", "e2"].indexOf(square) !== -1 :
      ["c6", "f6", "d7", "e7"].indexOf(square) !== -1;
  }

  function isRimKnightSquare(square) {
    return ["a3", "h3", "a6", "h6", "a5", "h5", "b4", "d4", "b5", "d5"].indexOf(square) !== -1;
  }

  function isNaturalBishopSquare(square, botColor) {
    return botColor === "w" ? ["c4", "b5", "f4", "g5", "e2", "d3", "b3", "g2"].indexOf(square) !== -1 :
      ["c5", "b4", "f5", "g4", "e7", "d6", "b6", "g7"].indexOf(square) !== -1;
  }

  function getPly(game) {
    return getHistoryVerboseSafe(game).length;
  }

  function hasPieceMovedInOpening(game, from, pieceType, botColor) {
    return getHistoryVerboseSafe(game).some(function (historyMove) {
      return historyMove &&
        historyMove.color === botColor &&
        historyMove.piece === pieceType &&
        historyMove.from === from;
    });
  }

  function hasSamePieceMovedBefore(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return false;
    }

    return getHistoryVerboseSafe(game).some(function (historyMove) {
      return historyMove &&
        historyMove.color === botColor &&
        historyMove.piece === verboseMove.piece &&
        historyMove.to === verboseMove.from;
    });
  }

  function hasSameSanEarlierInOpening(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !verboseMove.san || typeof game.history !== "function") {
      return false;
    }

    try {
      return game.history().some(function (san, index) {
        const historyColor = index % 2 === 0 ? "w" : "b";
        return historyColor === botColor && san === verboseMove.san;
      });
    } catch (error) {
      return false;
    }
  }

  function getOpeningDevelopmentState(game, botColor) {
    const original = getOriginalSquares(botColor);
    const kingSquare = findKingSquare(game, botColor);
    const queen = getPieceAt(game, original.queen);
    const ply = getPly(game);
    const undevelopedKnights = original.knights.filter(function (square) {
      const piece = getPieceAt(game, square);
      return piece && piece.color === botColor && piece.type === "n";
    });
    const undevelopedBishops = original.bishops.filter(function (square) {
      const piece = getPieceAt(game, square);
      return piece && piece.color === botColor && piece.type === "b";
    });
    const hasCastled = hasHistoryCastle(game, botColor) || ["g1", "c1", "g8", "c8"].indexOf(kingSquare) !== -1;
    const centerPawnsAdvanced = original.centerPawns.some(function (square) {
      const piece = getPieceAt(game, square);
      return !piece || piece.color !== botColor || piece.type !== "p";
    });
    const queenMovedEarly = ply < 10 && (!queen || queen.color !== botColor || queen.type !== "q");
    const betweenRooks = botColor === "w" ? ["b1", "c1", "d1", "e1", "f1", "g1"] : ["b8", "c8", "d8", "e8", "f8", "g8"];
    const rooksConnected = betweenRooks.every(function (square) {
      const piece = getPieceAt(game, square);
      return !piece || piece.color === botColor && piece.type === "r";
    });

    return {
      botColor: botColor,
      hasCastled: hasCastled,
      kingInCenter: kingSquare === original.king,
      undevelopedKnights: undevelopedKnights,
      undevelopedBishops: undevelopedBishops,
      undevelopedMinorCount: undevelopedKnights.length + undevelopedBishops.length,
      queenMovedEarly: queenMovedEarly,
      rooksConnected: rooksConnected,
      centerPawnsAdvanced: centerPawnsAdvanced,
      ply: ply
    };
  }

  function isOpeningPhase(game, botColor) {
    const state = getOpeningDevelopmentState(game, botColor);
    const queens = ["d1", "d8"].map(function (square) {
      return getPieceAt(game, square);
    }).filter(function (piece) {
      return piece && piece.type === "q";
    });

    // TODO Phase 14+: replace this light material/endgame guard with a full endgame detector.
    if (state.ply >= 20 && queens.length === 0) {
      return false;
    }

    return state.ply < 16 ||
      !state.hasCastled ||
      state.undevelopedMinorCount > 1 ||
      !state.rooksConnected;
  }

  function isOpenOrTargetRookMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || verboseMove.piece !== "r") {
      return false;
    }

    const fromCoords = coordsFromSquare(verboseMove.from);
    const toCoords = coordsFromSquare(verboseMove.to);
    if (!fromCoords || !toCoords) {
      return false;
    }

    if (verboseMove.captured || moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      return true;
    }

    for (let rank = 0; rank <= 7; rank++) {
      const piece = getPieceAt(game, squareFromCoords(toCoords.file, rank));
      if (piece && piece.type === "p") {
        return false;
      }
    }

    return fromCoords.file !== toCoords.file || fromCoords.rank !== toCoords.rank;
  }

  function isWeakKingPawnMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || verboseMove.piece !== "p") {
      return false;
    }

    const fromCoords = coordsFromSquare(verboseMove.from);
    const kingSquare = findKingSquare(game, botColor);
    const kingCoords = coordsFromSquare(kingSquare);
    if (!fromCoords || !kingCoords) {
      return false;
    }

    const sideFiles = kingCoords.file >= 5 ? [5, 6, 7] : kingCoords.file <= 2 ? [0, 1, 2] : [];
    return sideFiles.indexOf(fromCoords.file) !== -1 &&
      !verboseMove.captured &&
      !controlsCenterAfterMove(game, verboseMove, botColor);
  }

  function isOpeningSafetyException(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return false;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return true;
    }

    if (isBotInCheck(game, botColor) && classifyCheckResponse(game, verboseMove, botColor, getCheckingPieces(game, botColor)) !== "ILLEGAL_OR_STILL_CHECKED") {
      return true;
    }

    const mateDefense = chooseMateDefenseMove(game, botColor);
    if (mateDefense && movesMatch(mateDefense, verboseMove)) {
      return true;
    }

    const directRecapture = chooseDirectRecapture(game, botColor);
    if (directRecapture && movesMatch(directRecapture, verboseMove)) {
      return true;
    }

    const highValueCapture = chooseSafeHighValueCapture(game, botColor);
    if (highValueCapture && movesMatch(highValueCapture, verboseMove)) {
      return true;
    }

    const materialEmergencyMove = chooseMaterialEmergencyMove(game, botColor);
    if (materialEmergencyMove && movesMatch(materialEmergencyMove, verboseMove)) {
      return true;
    }

    const unitStewardshipMove = chooseUnitStewardshipMove(game, botColor);
    return Boolean(unitStewardshipMove && movesMatch(unitStewardshipMove, verboseMove));
  }

  function pawnMoveAttacksOpponentPiece(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const toCoords = coordsFromSquare(verboseMove && verboseMove.to);
    if (!verboseMove || verboseMove.piece !== "p" || !toCoords) {
      return false;
    }

    const direction = botColor === "w" ? 1 : -1;
    return [-1, 1].some(function (fileDelta) {
      const targetSquare = squareFromCoords(toCoords.file + fileDelta, toCoords.rank + direction);
      const target = getPieceAt(game, targetSquare);
      return Boolean(target && target.color === oppositeColor(botColor));
    });
  }

  function isOpeningFlankPawnMoveWithoutPurpose(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !isOpeningPhase(game, botColor) || verboseMove.piece !== "p") {
      return {
        bad: false,
        reasons: []
      };
    }

    const fromCoords = coordsFromSquare(verboseMove.from);
    if (!fromCoords || [0, 1, 6, 7].indexOf(fromCoords.file) === -1) {
      return {
        bad: false,
        reasons: []
      };
    }

    if (verboseMove.captured ||
      pawnMoveAttacksOpponentPiece(game, verboseMove, botColor) ||
      moveGivesCheckAfterApply(game, verboseMove, botColor) ||
      isCheckmateAfterMove(game, verboseMove) ||
      controlsCenterAfterMove(game, verboseMove, botColor)) {
      return {
        bad: false,
        reasons: []
      };
    }

    return {
      bad: true,
      reasons: [REJECTION_REASONS.POINTLESS_PAWN_MOVE, REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION]
    };
  }

  function isKnightRimOpeningMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove ||
      !isOpeningPhase(game, botColor) ||
      verboseMove.piece !== "n" ||
      !isRimKnightSquare(verboseMove.to)) {
      return {
        bad: false,
        reasons: []
      };
    }

    if (verboseMove.captured ||
      moveGivesCheckAfterApply(game, verboseMove, botColor) ||
      isCheckmateAfterMove(game, verboseMove)) {
      return {
        bad: false,
        reasons: []
      };
    }

    return {
      bad: true,
      reasons: [REJECTION_REASONS.KNIGHT_RIM_OPENING, REJECTION_REASONS.NO_CLEAR_PURPOSE]
    };
  }

  function moveDevelopsMinorTowardCenter(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || (verboseMove.piece !== "n" && verboseMove.piece !== "b")) {
      return {
        develops: false,
        score: 0,
        purposeTags: []
      };
    }

    const fromOriginalMinor = getOriginalSquares(botColor).knights.concat(getOriginalSquares(botColor).bishops).indexOf(verboseMove.from) !== -1;
    if (!fromOriginalMinor) {
      return {
        develops: false,
        score: 0,
        purposeTags: []
      };
    }

    if (verboseMove.piece === "n" && isNaturalKnightSquare(verboseMove.to, botColor)) {
      return {
        develops: true,
        score: 380,
        purposeTags: [PURPOSE_TAGS.DEVELOP, PURPOSE_TAGS.CONTROL_CENTER]
      };
    }

    if (verboseMove.piece === "b" && isNaturalBishopSquare(verboseMove.to, botColor)) {
      return {
        develops: true,
        score: 280,
        purposeTags: [PURPOSE_TAGS.DEVELOP]
      };
    }

    if (controlsCenterAfterMove(game, verboseMove, botColor)) {
      return {
        develops: true,
        score: 180,
        purposeTags: [PURPOSE_TAGS.DEVELOP, PURPOSE_TAGS.CONTROL_CENTER]
      };
    }

    return {
      develops: false,
      score: 0,
      purposeTags: []
    };
  }

  function minorMoveWasAlreadyDeveloped(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || (verboseMove.piece !== "n" && verboseMove.piece !== "b")) {
      return false;
    }

    const original = getOriginalSquares(botColor);
    const homeSquares = verboseMove.piece === "n" ? original.knights : original.bishops;
    if (homeSquares.indexOf(verboseMove.from) !== -1) {
      return false;
    }

    return getHistoryVerboseSafe(game).some(function (historyMove) {
      return historyMove &&
        historyMove.color === botColor &&
        historyMove.piece === verboseMove.piece &&
        historyMove.to === verboseMove.from;
    });
  }

  function movedPieceIsUnderConcreteAttack(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return false;
    }

    const piece = getPieceAt(game, verboseMove.from);
    if (!piece || piece.color !== botColor) {
      return false;
    }

    const attackers = getAttackersToSquare(game, verboseMove.from, oppositeColor(botColor));
    const pieceValue = getPieceValue(piece);
    return attackers.some(function (attacker) {
      return attacker.value < pieceValue || attacker.piece.type === "p" && (piece.type === "n" || piece.type === "b");
    });
  }

  function moveHasConcreteReason(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return false;
    }

    if (verboseMove.captured ||
      isCheckmateAfterMove(game, verboseMove) ||
      moveGivesCheckAfterApply(game, verboseMove, botColor) ||
      movedPieceIsUnderConcreteAttack(game, verboseMove, botColor)) {
      return true;
    }

    if (isBotInCheck(game, botColor) &&
      classifyCheckResponse(game, verboseMove, botColor, getCheckingPieces(game, botColor)) !== "ILLEGAL_OR_STILL_CHECKED") {
      return true;
    }

    const lastMove = getLastVerboseMove(game);
    if (lastMove && lastMove.captured) {
      const directRecapture = chooseDirectRecapture(game, botColor);
      if (directRecapture && movesMatch(directRecapture, verboseMove)) {
        return true;
      }
    }

    return false;
  }

  function isRepeatedMinorMoveInOpening(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const earlyPhase = isOpeningPhase(game, botColor) || getHistoryVerboseSafe(game).length <= 40;
    if (!verboseMove ||
      !earlyPhase ||
      (verboseMove.piece !== "n" && verboseMove.piece !== "b")) {
      return false;
    }

    return minorMoveWasAlreadyDeveloped(game, verboseMove, botColor) &&
      !moveHasConcreteReason(game, verboseMove, botColor);
  }

  function isPieceShuffleMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const earlyPhase = isOpeningPhase(game, botColor) || getHistoryVerboseSafe(game).length <= 40;
    if (!verboseMove ||
      !earlyPhase ||
      (verboseMove.piece !== "n" && verboseMove.piece !== "b") ||
      moveHasConcreteReason(game, verboseMove, botColor)) {
      return false;
    }

    const fromCoords = coordsFromSquare(verboseMove.from);
    const toCoords = coordsFromSquare(verboseMove.to);
    if (!fromCoords || !toCoords) {
      return false;
    }

    const towardHome = botColor === "w" ? toCoords.rank < fromCoords.rank : toCoords.rank > fromCoords.rank;
    const returnsToEarlierSquare = getHistoryVerboseSafe(game).some(function (historyMove) {
      return historyMove &&
        historyMove.color === botColor &&
        historyMove.piece === verboseMove.piece &&
        historyMove.to === verboseMove.to;
    });

    return minorMoveWasAlreadyDeveloped(game, verboseMove, botColor) &&
      (towardHome || returnsToEarlierSquare || isBackRankForColor(verboseMove.to, botColor));
  }

  function countPawnsOnFile(game, color, file) {
    let count = 0;
    for (let rank = 0; rank <= 7; rank++) {
      const piece = getPieceAt(game, squareFromCoords(file, rank));
      if (piece && piece.color === color && piece.type === "p") {
        count += 1;
      }
    }
    return count;
  }

  function detectStructureDamageAfterMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const result = {
      damage: false,
      severity: 0,
      reasons: []
    };
    if (!verboseMove) {
      return result;
    }

    return withTemporaryMove(game, verboseMove, function (applied, ok) {
      if (!ok) {
        return result;
      }

      const movedColor = applied.color || botColor;
      const toCoords = coordsFromSquare(applied.to);
      const fromCoords = coordsFromSquare(applied.from);
      if (!toCoords || !fromCoords || applied.piece !== "p") {
        return result;
      }

      if (["d4", "e4", "d5", "e5"].indexOf(applied.to) !== -1) {
        return result;
      }

      if (countPawnsOnFile(game, movedColor, toCoords.file) > 1) {
        result.damage = true;
        result.severity += 220;
        addUnique(result.reasons, [REJECTION_REASONS.ALLOWS_STRUCTURE_DAMAGE]);
      }

      const kingSquare = findKingSquare(game, movedColor);
      const kingCoords = coordsFromSquare(kingSquare);
      const shieldFiles = kingCoords && kingCoords.file >= 5 ? [5, 6, 7] : kingCoords && kingCoords.file <= 2 ? [0, 1, 2] : [3, 4, 5, 6, 7];
      if (shieldFiles.indexOf(fromCoords.file) !== -1 || shieldFiles.indexOf(toCoords.file) !== -1) {
        result.damage = true;
        result.severity += isOpeningPhase(game, movedColor) ? 260 : 160;
        addUnique(result.reasons, [REJECTION_REASONS.KING_SHIELD_STRUCTURE_RISK]);
      }

      return result;
    });
  }

  function moveAllowsStructureDamage(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const result = {
      allows: false,
      severity: 0,
      reasons: []
    };
    if (!verboseMove || !isOpeningPhase(game, botColor)) {
      return result;
    }

    if (verboseMove.piece === "n" && ["h6", "h3", "a6", "a3"].indexOf(verboseMove.to) !== -1 && !verboseMove.captured) {
      result.allows = true;
      result.severity += 280;
      addUnique(result.reasons, [REJECTION_REASONS.ALLOWS_STRUCTURE_DAMAGE, REJECTION_REASONS.KING_SHIELD_STRUCTURE_RISK]);
    }

    if (verboseMove.piece === "p" && isKingShieldPawnAdvance(game, verboseMove, botColor)) {
      result.allows = true;
      result.severity += 220;
      addUnique(result.reasons, [REJECTION_REASONS.KING_SHIELD_STRUCTURE_RISK]);
    }

    return result;
  }

  function evaluateStructureDamageRisk(game, move, botColor) {
    const after = detectStructureDamageAfterMove(game, move, botColor);
    const allows = moveAllowsStructureDamage(game, move, botColor);
    return {
      risk: (after.damage ? after.severity : 0) + (allows.allows ? allows.severity : 0),
      reasons: addUnique(after.reasons.slice(), allows.reasons)
    };
  }

  function evaluateOpeningGoldenRulesBee3(game, move, botColor) {
    const result = {
      score: 0,
      reasons: [],
      purposeTags: []
    };
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !isOpeningPhase(game, botColor)) {
      return result;
    }

    const development = moveDevelopsMinorTowardCenter(game, verboseMove, botColor);
    if (development.develops) {
      result.score += development.score;
      addUnique(result.purposeTags, development.purposeTags);
    }

    const flankPawn = isOpeningFlankPawnMoveWithoutPurpose(game, verboseMove, botColor);
    if (flankPawn.bad) {
      result.score -= 650;
      addUnique(result.reasons, flankPawn.reasons);
    }

    const rimKnight = isKnightRimOpeningMove(game, verboseMove, botColor);
    if (rimKnight.bad) {
      result.score -= 950;
      addUnique(result.reasons, rimKnight.reasons);
    }

    const structure = evaluateStructureDamageRisk(game, verboseMove, botColor);
    if (structure.risk > 0) {
      result.score -= Math.min(700, structure.risk);
      addUnique(result.reasons, structure.reasons);
    }

    if (isCastlingMove(verboseMove)) {
      result.score += 520;
      addUnique(result.purposeTags, [PURPOSE_TAGS.CASTLE, PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
    }

    if (verboseMove.piece === "p" && ["e4", "d4", "e5", "d5"].indexOf(verboseMove.to) !== -1) {
      result.score += 320;
      addUnique(result.purposeTags, [PURPOSE_TAGS.CONTROL_CENTER]);
    }

    return result;
  }

  function evaluateOpeningTempoDiscipline(game, move, botColor) {
    const result = {
      score: 0,
      reasons: [],
      purposeTags: []
    };
    const verboseMove = getVerboseMove(game, move);
    const earlyPhase = isOpeningPhase(game, botColor) || getHistoryVerboseSafe(game).length <= 40;
    if (!verboseMove || !earlyPhase) {
      return result;
    }

    if (isRepeatedMinorMoveInOpening(game, verboseMove, botColor)) {
      result.score -= 850;
      addUnique(result.reasons, [
        REJECTION_REASONS.REPEATED_MINOR_MOVE,
        REJECTION_REASONS.TEMPO_WASTE,
        REJECTION_REASONS.NO_CLEAR_PURPOSE,
        REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION
      ]);
    }

    if (isPieceShuffleMove(game, verboseMove, botColor)) {
      result.score -= 1150;
      addUnique(result.reasons, [
        verboseMove.piece === "b" ? REJECTION_REASONS.BISHOP_SHUFFLE : REJECTION_REASONS.TEMPO_WASTE,
        REJECTION_REASONS.TEMPO_WASTE,
        REJECTION_REASONS.REPEATED_MINOR_MOVE,
        REJECTION_REASONS.NO_CLEAR_PURPOSE,
        REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION
      ]);
    }

    return result;
  }

  function isOpeningMoveForbidden(game, move, botColor) {
    const reasons = [];
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !isOpeningPhase(game, botColor)) {
      return {
        forbidden: false,
        reasons: []
      };
    }

    const state = getOpeningDevelopmentState(game, botColor);
    const knightRepeat = verboseMove.piece === "n" &&
      (hasSamePieceMovedBefore(game, verboseMove, botColor) || hasSameSanEarlierInOpening(game, verboseMove, botColor));
    const safetyException = isOpeningSafetyException(game, verboseMove, botColor);
    if (verboseMove.piece === "q" && state.undevelopedMinorCount > 1 && state.ply < 10) {
      reasons.push(REJECTION_REASONS.POINTLESS_QUEEN_MOVE);
    }

    if (verboseMove.piece === "k" && !isCastlingMove(verboseMove)) {
      reasons.push(REJECTION_REASONS.BAD_KING_MOVE);
    }

    if (verboseMove.piece === "r" && !isOpenOrTargetRookMove(game, verboseMove, botColor)) {
      reasons.push(REJECTION_REASONS.POINTLESS_ROOK_MOVE);
    }

    if (knightRepeat &&
      !verboseMove.captured &&
      !moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      reasons.push(REJECTION_REASONS.POINTLESS_KNIGHT_REPEAT);
    }

    if (verboseMove.piece === "n" && isRimKnightSquare(verboseMove.to) && !verboseMove.captured && !moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      reasons.push(REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION);
    }

    if (botColor === "b" && verboseMove.piece === "n" && verboseMove.from === "g8" && verboseMove.to === "f6" && getPieceAt(game, "e4") && getPieceAt(game, "e4").color === "w") {
      const ePawn = getPieceAt(game, "e7");
      const dPawn = getPieceAt(game, "d7");
      if (ePawn && ePawn.color === "b" && dPawn && dPawn.color === "b") {
        reasons.push(REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION);
      }
    }

    if (botColor === "b" && verboseMove.piece === "p" && verboseMove.from === "d7" && verboseMove.to === "d5" && getPieceAt(game, "e4") && getPieceAt(game, "e4").color === "w") {
      reasons.push(REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION);
    }

    if (isWeakKingPawnMove(game, verboseMove, botColor)) {
      reasons.push(REJECTION_REASONS.KING_PAWN_WEAKENING);
    }

    addUnique(reasons, isOpeningFlankPawnMoveWithoutPurpose(game, verboseMove, botColor).reasons);
    addUnique(reasons, isKnightRimOpeningMove(game, verboseMove, botColor).reasons);
    addUnique(reasons, evaluateStructureDamageRisk(game, verboseMove, botColor).reasons);
    addUnique(reasons, evaluateOpeningTempoDiscipline(game, verboseMove, botColor).reasons);

    return {
      forbidden: reasons.length > 0 && !safetyException,
      reasons: reasons
    };
  }

  function hasSafeNonKingOpeningAlternative(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove ||
      verboseMove.piece !== "k" ||
      isCastlingMove(verboseMove) ||
      !isOpeningPhase(game, botColor) ||
      isBotInCheck(game, botColor)) {
      return false;
    }

    return getLegalMovesDeterministic(game).some(function (candidate) {
      if (candidate.piece === "k") {
        return false;
      }

      const safety = classifyMoveSafety(game, candidate, botColor);
      if (!safety.legalSafe || !safety.materialSafe) {
        return false;
      }

      return moveStopsOpponentMateThreat(game, candidate, botColor).stops;
    });
  }

  function isKingShieldPawnAdvance(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || verboseMove.piece !== "p" || verboseMove.captured) {
      return false;
    }

    const fromCoords = coordsFromSquare(verboseMove.from);
    const kingCoords = coordsFromSquare(findKingSquare(game, botColor));
    if (!fromCoords || !kingCoords) {
      return false;
    }

    const castledKingSide = kingCoords.file >= 5;
    const castledQueenSide = kingCoords.file <= 2;
    const shieldFiles = castledKingSide ? [5, 6, 7] : castledQueenSide ? [0, 1, 2] : [];
    const shieldRanks = botColor === "w" ? [1, 2] : [6, 5];
    if (shieldFiles.indexOf(fromCoords.file) === -1 || shieldRanks.indexOf(fromCoords.rank) === -1) {
      return false;
    }

    return !controlsCenterAfterMove(game, verboseMove, botColor);
  }

  function hasSafeNonKingPawnWeakeningAlternative(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !isKingShieldPawnAdvance(game, verboseMove, botColor)) {
      return false;
    }

    return getLegalMovesDeterministic(game).some(function (candidate) {
      if (movesMatch(candidate, verboseMove) ||
        isKingShieldPawnAdvance(game, candidate, botColor)) {
        return false;
      }

      if (isCheckmateAfterMove(game, candidate)) {
        return true;
      }

      const safety = classifyMoveSafety(game, candidate, botColor);
      if (!safety.legalSafe || !safety.materialSafe) {
        return false;
      }

      if (candidate.captured && captureSequenceLosesMaterialClearly(game, candidate, botColor)) {
        return false;
      }

      return moveStopsOpponentMateThreat(game, candidate, botColor).stops;
    });
  }

  function evaluateOpeningPrinciplesBee3(game, move, botColor) {
    const result = {
      score: 0,
      reasons: [],
      purposeTags: []
    };
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !isOpeningPhase(game, botColor)) {
      return result;
    }

    const state = getOpeningDevelopmentState(game, botColor);
    const fromOriginalMinor = getOriginalSquares(botColor).knights.concat(getOriginalSquares(botColor).bishops).indexOf(verboseMove.from) !== -1;

    if (verboseMove.piece === "p" && ["e4", "d4", "e5", "d5"].indexOf(verboseMove.to) !== -1) {
      result.score += 300;
      addUnique(result.purposeTags, [PURPOSE_TAGS.CONTROL_CENTER]);
    } else if (controlsCenterAfterMove(game, verboseMove, botColor)) {
      result.score += verboseMove.piece === "p" ? 120 : 160;
      addUnique(result.purposeTags, [PURPOSE_TAGS.CONTROL_CENTER]);
    }

    if (verboseMove.piece === "n" && fromOriginalMinor) {
      result.score += isNaturalKnightSquare(verboseMove.to, botColor) ? 350 : 220;
      addUnique(result.purposeTags, [PURPOSE_TAGS.DEVELOP]);
    }

    if (verboseMove.piece === "b" && fromOriginalMinor) {
      result.score += isNaturalBishopSquare(verboseMove.to, botColor) ? 250 : 180;
      addUnique(result.purposeTags, [PURPOSE_TAGS.DEVELOP]);
    }

    if (isCastlingMove(verboseMove)) {
      result.score += 500;
      if (state.kingInCenter) {
        result.score += 150;
      }
      addUnique(result.purposeTags, [PURPOSE_TAGS.CASTLE, PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
    }

    if (["d3", "d6", "c3", "c6", "e3", "e6"].indexOf(verboseMove.to) !== -1 && verboseMove.piece === "p") {
      result.score += 120;
      addUnique(result.purposeTags, [PURPOSE_TAGS.CONTROL_CENTER]);
    }

    if (!state.rooksConnected && state.undevelopedMinorCount === 0 && (verboseMove.piece === "q" || verboseMove.piece === "r")) {
      result.score += 150;
    }

    const forbidden = isOpeningMoveForbidden(game, verboseMove, botColor);
    if (forbidden.reasons.indexOf(REJECTION_REASONS.POINTLESS_QUEEN_MOVE) !== -1) {
      result.score -= 600;
    }
    if (forbidden.reasons.indexOf(REJECTION_REASONS.POINTLESS_ROOK_MOVE) !== -1) {
      result.score -= 700;
    }
    if (forbidden.reasons.indexOf(REJECTION_REASONS.POINTLESS_KNIGHT_REPEAT) !== -1) {
      result.score -= 500;
    }
    if (forbidden.reasons.indexOf(REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION) !== -1 && verboseMove.piece === "n") {
      result.score -= isRimKnightSquare(verboseMove.to) ? 800 : 600;
    } else if (forbidden.reasons.indexOf(REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION) !== -1) {
      result.score -= 700;
    }
    if (forbidden.reasons.indexOf(REJECTION_REASONS.KING_PAWN_WEAKENING) !== -1) {
      result.score -= 500;
    }

    if ((hasSamePieceMovedBefore(game, verboseMove, botColor) || hasSameSanEarlierInOpening(game, verboseMove, botColor)) &&
      !verboseMove.captured &&
      !moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      result.score -= 400;
    }

    if (state.undevelopedMinorCount > 0 && ["q", "r", "k"].indexOf(verboseMove.piece) !== -1 && !isCastlingMove(verboseMove)) {
      result.score -= 250;
    }

    const golden = evaluateOpeningGoldenRulesBee3(game, verboseMove, botColor);
    result.score += golden.score;
    addUnique(result.reasons, golden.reasons);
    addUnique(result.purposeTags, golden.purposeTags);
    const tempo = evaluateOpeningTempoDiscipline(game, verboseMove, botColor);
    result.score += tempo.score;
    addUnique(result.reasons, tempo.reasons);
    addUnique(result.purposeTags, tempo.purposeTags);

    addUnique(result.reasons, forbidden.reasons);
    if (!result.purposeTags.length && !verboseMove.captured && !isCastlingMove(verboseMove)) {
      addUnique(result.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
      result.score -= 400;
    }

    return result;
  }

  function openingMoveIsSafeForSelection(game, move, botColor, cache) {
    return getCachedAnalysisValue(game, cache, "openingSafety", getPositionMoveCacheKey(botColor, move), function () {
      const safety = classifyMoveSafety(game, move, botColor, cache);
      if (!safety.legalSafe || !safety.materialSafe) {
        return false;
      }

      return moveStopsOpponentMateThreat(game, move, botColor).stops;
    });
  }

  function openingMoveBySanOrSquares(candidates, sanList, squareList) {
    for (let i = 0; i < sanList.length; i++) {
      const san = sanList[i];
      const bySan = candidates.find(function (move) {
        return move.san === san;
      });
      if (bySan) {
        return bySan;
      }
    }

    for (let j = 0; j < squareList.length; j++) {
      const wanted = squareList[j];
      const bySquare = candidates.find(function (move) {
        return move.from === wanted.from && move.to === wanted.to;
      });
      if (bySquare) {
        return bySquare;
      }
    }

    return null;
  }

  function chooseStrictBee3OpeningMove(game, botColor, candidateMoves, cache) {
    if (!getOpeningPhaseCached(game, botColor, cache)) {
      return null;
    }

    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseDirectRecapture(game, botColor) ||
      chooseSafeHighValueCapture(game, botColor) ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor)) {
      return null;
    }

    const candidates = candidateMoves || getLegalMovesDeterministic(game);
    if (!candidates.length) {
      return null;
    }

    const history = getHistoryVerboseSafe(game);
    const firstMove = history[0];
    let preferredSpecs = null;

    const choosePreferredSafeMove = function (sanList, squareList) {
      const preferred = openingMoveBySanOrSquares(candidates, sanList, squareList);
      if (!preferred) {
        return null;
      }

      if (!openingMoveIsSafeForSelection(game, preferred, botColor, cache)) {
        return null;
      }

      if (getOpeningForbiddenCached(game, preferred, botColor, cache).forbidden) {
        return null;
      }

      return preferred;
    };

    if (botColor === "w") {
      preferredSpecs = [
        ["e4", { from: "e2", to: "e4" }],
        ["Nf3", { from: "g1", to: "f3" }],
        ["Bc4", { from: "f1", to: "c4" }],
        ["Bb5", { from: "f1", to: "b5" }],
        ["O-O", { from: "e1", to: "g1" }],
        ["d3", { from: "d2", to: "d3" }],
        ["c3", { from: "c2", to: "c3" }],
        ["Nc3", { from: "b1", to: "c3" }]
      ];
    } else if (firstMove && firstMove.color === "w" && firstMove.from === "e2" && firstMove.to === "e4") {
      preferredSpecs = [
        ["e5", { from: "e7", to: "e5" }],
        ["Nc6", { from: "b8", to: "c6" }],
        ["Bc5", { from: "f8", to: "c5" }],
        ["Nf6", { from: "g8", to: "f6" }],
        ["d6", { from: "d7", to: "d6" }],
        ["Be7", { from: "f8", to: "e7" }],
        ["O-O", { from: "e8", to: "g8" }],
        ["d5", { from: "d7", to: "d5" }],
        ["a6", { from: "a7", to: "a6" }]
      ];
    } else if (firstMove && firstMove.color === "w" && firstMove.from === "d2" && firstMove.to === "d4") {
      preferredSpecs = [
        ["d5", { from: "d7", to: "d5" }],
        ["Nf6", { from: "g8", to: "f6" }],
        ["e6", { from: "e7", to: "e6" }],
        ["c6", { from: "c7", to: "c6" }],
        ["Nc6", { from: "b8", to: "c6" }],
        ["O-O", { from: "e8", to: "g8" }]
      ];
    } else if (botColor === "b") {
      preferredSpecs = [
        ["e5", { from: "e7", to: "e5" }],
        ["d5", { from: "d7", to: "d5" }],
        ["Nf6", { from: "g8", to: "f6" }],
        ["Nc6", { from: "b8", to: "c6" }],
        ["e6", { from: "e7", to: "e6" }],
        ["c6", { from: "c7", to: "c6" }]
      ];
    }

    if (!preferredSpecs) {
      return null;
    }

    for (let i = 0; i < preferredSpecs.length; i++) {
      const preferred = choosePreferredSafeMove([preferredSpecs[i][0]], [preferredSpecs[i][1]]);
      if (preferred) {
        return preferred;
      }
    }

    return null;
  }

  function isCenterTensionMove(move) {
    if (!move || !move.captured) {
      return false;
    }

    const centerTensionSquares = ["c4", "c5", "d4", "d5", "e4", "e5", "f4", "f5"];
    return centerTensionSquares.indexOf(move.to) !== -1 &&
      (move.piece === "p" || move.captured === "p" || centerTensionSquares.indexOf(move.from) !== -1);
  }

  function scoreOpeningMove(game, move, botColor, cache) {
    return getCachedAnalysisValue(game, cache, "openingMoveScores", getPositionMoveCacheKey(botColor, move), function () {
      const trace = createMoveTrace(move);
      const verboseMove = getVerboseMove(game, move);
      if (!verboseMove || !getOpeningPhaseCached(game, botColor, cache)) {
        return {
          move: verboseMove,
          score: 0,
          reasons: trace.reasons,
          purposeTags: trace.purposeTags,
          rejected: trace.rejected
        };
      }

      const safety = classifyMoveSafety(game, verboseMove, botColor, cache);
      trace.safety.legalSafe = safety.legalSafe;
      trace.safety.materialSafe = safety.materialSafe;
      trace.safety.bossSafe = safety.bossSafe;
      addUnique(trace.reasons, safety.reasons);
      if (!safety.legalSafe || !safety.materialSafe) {
        trace.score -= 999999;
        trace.rejected = true;
      }

      if (verboseMove.captured) {
        const exchange = classifyStaticExchange(game, verboseMove, botColor, cache);
        const capturedValue = getPieceValue(verboseMove.captured);
        if (exchange.outcome === "WINNING_EXCHANGE") {
          trace.score += Math.min(1200, 280 + exchange.score);
          markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
        } else if (exchange.outcome === "EQUAL_EXCHANGE") {
          trace.score += 260;
        } else {
          trace.score -= 900;
          addUnique(trace.reasons, exchange.staticExchange.reasons);
        }

        if (isCenterTensionMove(verboseMove)) {
          trace.score += exchange.acceptable ? 520 : -520;
          markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
        }

        if (capturedValue >= getPieceValue("n") && exchange.acceptable) {
          markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
        }
      }

      const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
      if (!mateSafety.stops) {
        trace.score -= 999999;
        trace.rejected = true;
        addUnique(trace.reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
      }

      const forbidden = getOpeningForbiddenCached(game, verboseMove, botColor, cache);
      addUnique(trace.reasons, forbidden.reasons);
      if (forbidden.forbidden) {
        trace.score -= 700;
      }

      const principle = evaluateOpeningPrinciplesBee3(game, verboseMove, botColor);
      trace.score += principle.score;
      addUnique(trace.reasons, principle.reasons);
      addUnique(trace.purposeTags, principle.purposeTags);

      if (isBasicDevelopmentMove(game, verboseMove, botColor)) {
        markPurpose(trace, PURPOSE_TAGS.DEVELOP);
      }

      if (isCastlingMove(verboseMove)) {
        markPurpose(trace, PURPOSE_TAGS.CASTLE);
        markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
      }

      if (controlsCenterAfterMove(game, verboseMove, botColor)) {
        markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
      }

      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    });
  }

  function compareOpeningMoves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const priority = function (item) {
      let value = 0;
      if (item.purposeTags.indexOf(PURPOSE_TAGS.CASTLE) !== -1) {
        value += 3;
      }
      if (item.purposeTags.indexOf(PURPOSE_TAGS.DEVELOP) !== -1) {
        value += 2;
      }
      if (item.purposeTags.indexOf(PURPOSE_TAGS.CONTROL_CENTER) !== -1) {
        value += 1;
      }
      return value;
    };
    const priorityDiff = priority(b) - priority(a);
    if (priorityDiff) {
      return priorityDiff;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseOpeningDisciplineMove(game, botColor, candidateMoves, cache) {
    if (!getOpeningPhaseCached(game, botColor, cache)) {
      return null;
    }

    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseDirectRecapture(game, botColor) ||
      chooseSafeHighValueCapture(game, botColor) ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor)) {
      return null;
    }

    const candidates = candidateMoves || getLegalMovesDeterministic(game);
    const strictMove = chooseStrictBee3OpeningMove(game, botColor, candidates, cache);
    if (strictMove && openingMoveIsSafeForSelection(game, strictMove, botColor, cache)) {
      return strictMove;
    }

    const scoredMoves = candidates.map(function (move) {
      return scoreOpeningMove(game, move, botColor, cache);
    }).filter(function (item) {
      return !item.rejected && item.score > -999999;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareOpeningMoves);
    return scoredMoves[0].score > 0 ? scoredMoves[0].move : null;
  }

  function uniqueSquares(squares) {
    return squares.filter(function (square, index) {
      return square && squares.indexOf(square) === index;
    });
  }

  function getKingZone(game, color) {
    const kingSquare = findKingSquare(game, color);
    const kingCoords = coordsFromSquare(kingSquare);
    if (!kingCoords) {
      return {
        kingSquare: null,
        zoneSquares: [],
        shieldSquares: []
      };
    }

    const zoneSquares = [kingSquare];
    for (let fileDelta = -1; fileDelta <= 1; fileDelta++) {
      for (let rankDelta = -1; rankDelta <= 1; rankDelta++) {
        const square = squareFromCoords(kingCoords.file + fileDelta, kingCoords.rank + rankDelta);
        if (square) {
          zoneSquares.push(square);
        }
      }
    }

    const forward = color === "w" ? 1 : -1;
    [-1, 0, 1].forEach(function (fileDelta) {
      zoneSquares.push(squareFromCoords(kingCoords.file + fileDelta, kingCoords.rank + forward * 2));
    });

    let shieldFiles;
    if (kingSquare === "g1" || kingSquare === "g8") {
      shieldFiles = [5, 6, 7];
    } else if (kingSquare === "c1" || kingSquare === "c8") {
      shieldFiles = [0, 1, 2];
    } else {
      shieldFiles = kingCoords.file <= 3 ? [2, 3, 4] : [3, 4, 5];
    }

    const shieldRanks = color === "w" ? [1, 2] : [6, 5];
    const shieldSquares = [];
    shieldFiles.forEach(function (file) {
      shieldRanks.forEach(function (rank) {
        shieldSquares.push(squareFromCoords(file, rank));
      });
    });

    return {
      kingSquare: kingSquare,
      zoneSquares: uniqueSquares(zoneSquares),
      shieldSquares: uniqueSquares(shieldSquares)
    };
  }

  function countSafeKingEscapeSquares(game, botColor) {
    const zone = getKingZone(game, botColor);
    const kingSquare = zone.kingSquare;
    const kingCoords = coordsFromSquare(kingSquare);
    if (!kingCoords) {
      return 0;
    }

    let safeSquares = 0;
    for (let fileDelta = -1; fileDelta <= 1; fileDelta++) {
      for (let rankDelta = -1; rankDelta <= 1; rankDelta++) {
        if (fileDelta === 0 && rankDelta === 0) {
          continue;
        }

        const square = squareFromCoords(kingCoords.file + fileDelta, kingCoords.rank + rankDelta);
        const piece = getPieceAt(game, square);
        if (square && (!piece || piece.color !== botColor) && !doesColorAttackSquare(game, oppositeColor(botColor), square)) {
          safeSquares += 1;
        }
      }
    }

    return safeSquares;
  }

  function collectKingZoneAttackers(game, botColor, zone) {
    if (!game || typeof game.board !== "function") {
      return [];
    }

    const attackers = [];
    const opponentColor = oppositeColor(botColor);
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        const from = boardArraySquare(row, col);
        if (!piece || piece.color !== opponentColor) {
          continue;
        }

        const attackedZones = zone.zoneSquares.filter(function (square) {
          return doesPieceAttackSquare(game, from, piece, square);
        });
        if (attackedZones.length) {
          attackers.push({
            square: from,
            piece: piece,
            value: getPieceValue(piece),
            attackedSquares: attackedZones
          });
        }
      }
    }

    return attackers.sort(function (a, b) {
      if (a.value !== b.value) {
        return b.value - a.value;
      }

      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function isMajorPieceLineToKing(game, attacker, kingSquare) {
    return Boolean(attacker &&
      ["q", "r", "b"].indexOf(attacker.piece.type) !== -1 &&
      doesPieceAttackSquare(game, attacker.square, attacker.piece, kingSquare));
  }

  function hasOpponentMajorOnKingFile(game, botColor, kingSquare) {
    const kingCoords = coordsFromSquare(kingSquare);
    if (!kingCoords || typeof game.board !== "function") {
      return false;
    }

    const opponentColor = oppositeColor(botColor);
    for (let rank = 0; rank <= 7; rank++) {
      const square = squareFromCoords(kingCoords.file, rank);
      const piece = getPieceAt(game, square);
      if (piece && piece.color === opponentColor && (piece.type === "r" || piece.type === "q")) {
        return doesPieceAttackSquare(game, square, piece, kingSquare);
      }
    }

    return false;
  }

  function opponentHasOneMoveCheck(game, botColor) {
    const opponentColor = oppositeColor(botColor);
    return withTemporaryTurn(game, opponentColor, function (activeGame) {
      return getLegalMovesDeterministic(activeGame).some(function (move) {
        const applied = applyMoveSafely(activeGame, move);
        if (!applied) {
          return false;
        }

        try {
          return isKingInCheckByColor(activeGame, botColor);
        } finally {
          undoMoveSafely(activeGame);
        }
      });
    });
  }

  function evaluateKingDanger(game, botColor) {
    const zone = getKingZone(game, botColor);
    const reasons = [];
    const attackers = collectKingZoneAttackers(game, botColor, zone);
    let score = 0;

    attackers.forEach(function (attacker) {
      if (attacker.piece.type === "q") {
        score += isMajorPieceLineToKing(game, attacker, zone.kingSquare) ? 400 : 280;
      } else if (attacker.piece.type === "r") {
        score += isMajorPieceLineToKing(game, attacker, zone.kingSquare) ? 350 : 260;
      } else if (attacker.piece.type === "b") {
        score += isMajorPieceLineToKing(game, attacker, zone.kingSquare) ? 300 : 220;
      } else if (attacker.piece.type === "n") {
        score += 250;
      } else if (attacker.piece.type === "p") {
        score += 120;
      }
    });

    if (attackers.length) {
      addUnique(reasons, [PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
    }

    const ownShieldPawns = zone.shieldSquares.filter(function (square) {
      const piece = getPieceAt(game, square);
      return piece && piece.color === botColor && piece.type === "p";
    });
    const missingShield = Math.max(0, Math.min(3, zone.shieldSquares.length / 2) - Math.min(3, ownShieldPawns.length));
    if (missingShield > 0) {
      score += missingShield * 150;
      addUnique(reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    if (hasOpponentMajorOnKingFile(game, botColor, zone.kingSquare)) {
      score += 350;
      addUnique(reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    const escapeSquares = countSafeKingEscapeSquares(game, botColor);
    if (escapeSquares === 0) {
      score += 350;
      addUnique(reasons, [REJECTION_REASONS.BAD_KING_MOVE]);
    } else if (escapeSquares === 1) {
      score += 200;
    }

    if (opponentHasOneMoveCheck(game, botColor)) {
      score += 300;
    }

    return {
      score: score,
      reasons: reasons,
      attackers: attackers,
      kingSquare: zone.kingSquare,
      zoneSquares: zone.zoneSquares
    };
  }

  function moveCapturesKingZoneAttacker(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !verboseMove.captured) {
      return false;
    }

    return evaluateKingDanger(game, botColor).attackers.some(function (attacker) {
      return attacker.square === verboseMove.to;
    });
  }

  function isKingSidePawnWeakeningMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || verboseMove.piece !== "p") {
      return {
        weakening: false,
        reasons: []
      };
    }

    if (isCheckmateAfterMove(game, verboseMove) ||
      isBotInCheck(game, botColor) ||
      moveStopsOpponentMateThreat(game, verboseMove, botColor).stops && findOpponentMateInOneThreats(game, botColor).length ||
      findDirectRecaptures(game, botColor).some(function (recapture) {
        return movesMatch(recapture, verboseMove) && isSafeRecapture(game, recapture, botColor).safe;
      }) ||
      moveCapturesKingZoneAttacker(game, verboseMove, botColor)) {
      return {
        weakening: false,
        reasons: []
      };
    }

    const zone = getKingZone(game, botColor);
    const fromCoords = coordsFromSquare(verboseMove.from);
    const beforeEscapes = countSafeKingEscapeSquares(game, botColor);
    const beforeDanger = evaluateKingDanger(game, botColor).score;
    const applied = applyMoveSafely(game, verboseMove);
    let createsEscape = false;
    if (applied) {
      try {
        createsEscape = countSafeKingEscapeSquares(game, botColor) > beforeEscapes;
      } finally {
        undoMoveSafely(game);
      }
    }

    if (createsEscape && (beforeDanger >= 300 || beforeEscapes <= 1) || verboseMove.captured) {
      return {
        weakening: false,
        reasons: []
      };
    }

    const shieldFiles = zone.shieldSquares.map(function (square) {
      return coordsFromSquare(square).file;
    });
    const weakening = fromCoords && shieldFiles.indexOf(fromCoords.file) !== -1;
    return {
      weakening: Boolean(weakening),
      reasons: weakening ? [REJECTION_REASONS.KING_PAWN_WEAKENING] : []
    };
  }

  function moveBlocksKingLine(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const danger = evaluateKingDanger(game, botColor);
    if (!verboseMove || !danger.kingSquare) {
      return false;
    }

    return danger.attackers.some(function (attacker) {
      return ["q", "r", "b"].indexOf(attacker.piece.type) !== -1 &&
        isSquareBetweenSquares(verboseMove.to, attacker.square, danger.kingSquare);
    });
  }

  function moveTradesQueens(game, move) {
    const verboseMove = getVerboseMove(game, move);
    return Boolean(verboseMove && verboseMove.piece === "q" && verboseMove.captured === "q");
  }

  function evaluateMoveReducesKingDanger(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const beforeDanger = evaluateKingDanger(game, botColor);
    const reasons = [];
    const purposeTags = [];
    if (!verboseMove) {
      return {
        reduces: false,
        before: beforeDanger.score,
        after: beforeDanger.score,
        delta: 0,
        reasons: [],
        purposeTags: []
      };
    }

    const beforeEscapes = countSafeKingEscapeSquares(game, botColor);
    const capturesAttacker = moveCapturesKingZoneAttacker(game, verboseMove, botColor);
    const blocksLine = moveBlocksKingLine(game, verboseMove, botColor);
    const tradesQueens = moveTradesQueens(game, verboseMove);
    const castling = isCastlingMove(verboseMove);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        reduces: false,
        before: beforeDanger.score,
        after: beforeDanger.score,
        delta: 0,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE],
        purposeTags: []
      };
    }

    try {
      const afterDanger = evaluateKingDanger(game, botColor);
      const afterEscapes = countSafeKingEscapeSquares(game, botColor);
      const delta = beforeDanger.score - afterDanger.score;
      const addsEscape = afterEscapes > beforeEscapes;
      if (delta > 0 || capturesAttacker || blocksLine || tradesQueens && beforeDanger.score >= 700 || castling || addsEscape && beforeDanger.score >= 300) {
        addUnique(purposeTags, [PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
      }

      if (capturesAttacker && verboseMove.captured) {
        addUnique(purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
      }

      if (delta < 0) {
        addUnique(reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
      }

      return {
        reduces: delta >= 100 || capturesAttacker || blocksLine || tradesQueens && beforeDanger.score >= 700 || castling || addsEscape && beforeDanger.score >= 300,
        before: beforeDanger.score,
        after: afterDanger.score,
        delta: delta,
        reasons: reasons,
        purposeTags: purposeTags
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function scoreKingDangerDefenseMove(game, move, botColor) {
    const trace = createMoveTrace(move);
    const verboseMove = getVerboseMove(game, move);
    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected,
        delta: 0,
        reduces: true
      };
    }

    const mateSafety = moveStopsOpponentMateThreat(game, verboseMove, botColor);
    if (!mateSafety.stops) {
      trace.score -= 999999;
      rejectMove(trace, REJECTION_REASONS.ALLOWS_MATE_IN_ONE);
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      trace.score -= 999999;
      trace.rejected = true;
    }

    if (detectMaterialEmergencies(game, botColor).length || detectUnderdefendedUnits(game, botColor).some(function (unitInfo) {
      return !isFakeUnitThreat(game, unitInfo, botColor);
    })) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
    }

    const dangerResult = evaluateMoveReducesKingDanger(game, verboseMove, botColor);
    addUnique(trace.reasons, dangerResult.reasons);
    addUnique(trace.purposeTags, dangerResult.purposeTags);

    if (dangerResult.before < 300 && !dangerResult.reduces) {
      trace.score -= 200;
    }

    if (dangerResult.before >= 300 && dangerResult.delta > 0) {
      trace.score += dangerResult.delta * 2;
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    if (moveCapturesKingZoneAttacker(game, verboseMove, botColor)) {
      trace.score += 800;
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    if (moveTradesQueens(game, verboseMove) && dangerResult.before >= 700) {
      trace.score += 900;
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    if (moveBlocksKingLine(game, verboseMove, botColor)) {
      trace.score += 500;
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    if (countSafeKingEscapeSquares(game, botColor) <= 1 && dangerResult.reduces) {
      trace.score += 350;
    }

    if (isCastlingMove(verboseMove)) {
      trace.score += 700;
      markPurpose(trace, PURPOSE_TAGS.CASTLE);
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    const weakening = isKingSidePawnWeakeningMove(game, verboseMove, botColor);
    if (weakening.weakening) {
      trace.score -= 700;
      addUnique(trace.reasons, weakening.reasons);
    }

    if (dangerResult.delta < 0 && dangerResult.before >= 300) {
      trace.score -= 800;
    }

    return {
      move: verboseMove,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected,
      delta: dangerResult.delta,
      reduces: dangerResult.reduces
    };
  }

  function compareKingDangerMoves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    if (a.delta !== b.delta) {
      return b.delta - a.delta;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseKingDangerDefenseMove(game, botColor) {
    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor)) {
      return null;
    }

    const danger = evaluateKingDanger(game, botColor);
    if (danger.score < 300) {
      return null;
    }

    const directRecapture = chooseDirectRecapture(game, botColor);
    if (directRecapture && !evaluateMoveReducesKingDanger(game, directRecapture, botColor).reduces) {
      return null;
    }

    const highValueCapture = chooseSafeHighValueCapture(game, botColor);
    if (highValueCapture && !evaluateMoveReducesKingDanger(game, highValueCapture, botColor).reduces) {
      return null;
    }

    const scoredMoves = getLegalMovesDeterministic(game).map(function (move) {
      return scoreKingDangerDefenseMove(game, move, botColor);
    }).filter(function (item) {
      return !item.rejected && item.score > -999999 && item.reduces;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareKingDangerMoves);
    return scoredMoves[0].move;
  }

  function normalizeFileIndex(fileIndexOrChar) {
    if (typeof fileIndexOrChar === "number") {
      return fileIndexOrChar;
    }

    if (typeof fileIndexOrChar === "string") {
      return "abcdefgh".indexOf(fileIndexOrChar[0]);
    }

    return -1;
  }

  function getFileIndexFromSquare(square) {
    const coords = coordsFromSquare(square);
    return coords ? coords.file : -1;
  }

  function getPawnsOnFile(game, fileIndex) {
    const pawns = [];
    for (let rank = 0; rank <= 7; rank++) {
      const square = squareFromCoords(fileIndex, rank);
      const piece = getPieceAt(game, square);
      if (piece && piece.type === "p") {
        pawns.push({
          square: square,
          piece: piece
        });
      }
    }

    return pawns;
  }

  function isFileOpenForRook(game, fileIndexOrChar) {
    const fileIndex = normalizeFileIndex(fileIndexOrChar);
    if (fileIndex < 0 || fileIndex > 7) {
      return false;
    }

    return getPawnsOnFile(game, fileIndex).length === 0;
  }

  function isFileSemiOpenForRook(game, fileIndexOrChar, botColor) {
    const fileIndex = normalizeFileIndex(fileIndexOrChar);
    if (fileIndex < 0 || fileIndex > 7) {
      return false;
    }

    const pawns = getPawnsOnFile(game, fileIndex);
    return !pawns.some(function (item) {
      return item.piece.color === botColor;
    }) && pawns.some(function (item) {
      return item.piece.color === oppositeColor(botColor);
    });
  }

  function createRookPlanResult() {
    return {
      score: 0,
      reasons: [],
      purposeTags: []
    };
  }

  function isRookMove(move) {
    return Boolean(move && move.piece === "r");
  }

  function fileHasRookTarget(game, fileIndex, botColor) {
    const opponentColor = oppositeColor(botColor);
    const opponentKing = findKingSquare(game, opponentColor);
    if (getFileIndexFromSquare(opponentKing) === fileIndex) {
      return true;
    }

    for (let rank = 0; rank <= 7; rank++) {
      const piece = getPieceAt(game, squareFromCoords(fileIndex, rank));
      if (piece && piece.color === opponentColor && (piece.type === "q" || piece.type === "r")) {
        return true;
      }
    }

    return false;
  }

  function evaluateOpenFileRook(game, move, botColor) {
    const result = createRookPlanResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      return result;
    }

    const fileIndex = getFileIndexFromSquare(verboseMove.to);
    if (isFileOpenForRook(game, fileIndex)) {
      result.score += 500;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ROOK_PLAN]);
      if (fileHasRookTarget(game, fileIndex, botColor)) {
        result.score += 250;
      }
    }

    return result;
  }

  function evaluateSemiOpenFileRook(game, move, botColor) {
    const result = createRookPlanResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      return result;
    }

    const fileIndex = getFileIndexFromSquare(verboseMove.to);
    if (isFileSemiOpenForRook(game, fileIndex, botColor)) {
      result.score += 350;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ROOK_PLAN]);
      if (fileHasRookTarget(game, fileIndex, botColor)) {
        result.score += 200;
      } else if (getPawnsOnFile(game, fileIndex).some(function (item) {
        return item.piece.color === oppositeColor(botColor);
      })) {
        result.score += 150;
      }
    }

    return result;
  }

  function rookMoveSafeForPlan(game, move, botColor) {
    const safety = classifyMoveSafety(game, move, botColor);
    return safety.legalSafe && safety.materialSafe && moveStopsOpponentMateThreat(game, move, botColor).stops;
  }

  function evaluateRookOnSeventhRank(game, move, botColor) {
    const result = createRookPlanResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      return result;
    }

    const toCoords = coordsFromSquare(verboseMove.to);
    const targetRank = botColor === "w" ? 6 : 1;
    if (toCoords && toCoords.rank === targetRank && rookMoveSafeForPlan(game, verboseMove, botColor)) {
      result.score += 600;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ROOK_PLAN]);
      const opponentColor = oppositeColor(botColor);
      const attackedTargets = ["q", "r", "p", "k"].some(function (pieceType) {
        for (let file = 0; file <= 7; file++) {
          const square = squareFromCoords(file, targetRank);
          const piece = getPieceAt(game, square);
          if (piece && piece.color === opponentColor && piece.type === pieceType) {
            return true;
          }
        }

        return false;
      });
      if (attackedTargets) {
        result.score += 200;
      }
    }

    return result;
  }

  function isPassedPawnForColor(game, square, color) {
    const piece = getPieceAt(game, square);
    return Boolean(piece && piece.color === color && piece.type === "p" && isPassedOrNearPassedPawn(game, square, color));
  }

  function isRookBehindPawn(rookSquare, pawnSquare, color) {
    const rookCoords = coordsFromSquare(rookSquare);
    const pawnCoords = coordsFromSquare(pawnSquare);
    if (!rookCoords || !pawnCoords || rookCoords.file !== pawnCoords.file) {
      return false;
    }

    return color === "w" ? rookCoords.rank < pawnCoords.rank : rookCoords.rank > pawnCoords.rank;
  }

  function isRookInFrontOfPawn(rookSquare, pawnSquare, pawnColor) {
    const rookCoords = coordsFromSquare(rookSquare);
    const pawnCoords = coordsFromSquare(pawnSquare);
    if (!rookCoords || !pawnCoords || rookCoords.file !== pawnCoords.file) {
      return false;
    }

    return pawnColor === "w" ? rookCoords.rank > pawnCoords.rank : rookCoords.rank < pawnCoords.rank;
  }

  function evaluateRookBehindPassedPawn(game, move, botColor) {
    const result = createRookPlanResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      return result;
    }

    const board = typeof game.board === "function" ? game.board() : [];
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        const square = boardArraySquare(row, col);
        if (!piece || piece.type !== "p") {
          continue;
        }

        if (piece.color === botColor && isPassedPawnForColor(game, square, botColor) && isRookBehindPawn(verboseMove.to, square, botColor)) {
          result.score += 500;
          addUnique(result.purposeTags, [PURPOSE_TAGS.ROOK_PLAN]);
        }

        if (piece.color === oppositeColor(botColor) && isPassedPawnForColor(game, square, piece.color) && isRookInFrontOfPawn(verboseMove.to, square, piece.color)) {
          result.score += 450;
          addUnique(result.purposeTags, [PURPOSE_TAGS.ROOK_PLAN]);
        }
      }
    }

    return result;
  }

  function countNonPawnNonKingPieces(game) {
    if (!game || typeof game.board !== "function") {
      return 0;
    }

    let count = 0;
    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (piece && piece.type !== "p" && piece.type !== "k") {
          count += 1;
        }
      }
    }

    return count;
  }

  function hasAnyPassedPawn(game, color) {
    if (!game || typeof game.board !== "function") {
      return false;
    }

    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        const square = boardArraySquare(row, col);
        if (piece && piece.color === color && piece.type === "p" && isPassedPawnForColor(game, square, color)) {
          return true;
        }
      }
    }

    return false;
  }

  function evaluateRookCutoff(game, move, botColor) {
    const result = createRookPlanResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      return result;
    }

    const lightEndgame = countNonPawnNonKingPieces(game) <= 6;
    const hasPassedPawn = hasAnyPassedPawn(game, botColor) || hasAnyPassedPawn(game, oppositeColor(botColor));
    if (!lightEndgame && !hasPassedPawn) {
      return result;
    }

    // TODO Phase 14+: replace this light cutoff detector with full endgame geometry.
    const rookCoords = coordsFromSquare(verboseMove.to);
    const opponentKingCoords = coordsFromSquare(findKingSquare(game, oppositeColor(botColor)));
    if (!rookCoords || !opponentKingCoords) {
      return result;
    }

    const cutsFile = Math.abs(rookCoords.file - opponentKingCoords.file) >= 1 &&
      Math.abs(rookCoords.file - 3.5) <= Math.abs(opponentKingCoords.file - 3.5);
    const cutsRank = Math.abs(rookCoords.rank - opponentKingCoords.rank) >= 1 &&
      (botColor === "w" ? rookCoords.rank > opponentKingCoords.rank : rookCoords.rank < opponentKingCoords.rank);
    if (cutsFile || cutsRank) {
      result.score += hasPassedPawn ? 500 : 300;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ROOK_PLAN]);
    }

    return result;
  }

  function rookMoveHasSafetyPurpose(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return false;
    }

    return isCheckmateAfterMove(game, verboseMove) ||
      Boolean(verboseMove.captured && rookMoveSafeForPlan(game, verboseMove, botColor)) ||
      moveCapturesKingZoneAttacker(game, verboseMove, botColor) ||
      evaluateMoveReducesKingDanger(game, verboseMove, botColor).reduces ||
      detectMaterialEmergencies(game, botColor).some(function (emergency) {
        return moveHandlesMaterialEmergency(game, verboseMove, botColor, emergency).handles;
      }) ||
      detectUnderdefendedUnits(game, botColor).some(function (unitInfo) {
        return !isFakeUnitThreat(game, unitInfo, botColor) &&
          moveHandlesUnderdefendedUnit(game, verboseMove, botColor, unitInfo).handles;
      });
  }

  function isPointlessEarlyRookMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      return {
        pointless: false,
        reasons: []
      };
    }

    const state = getOpeningDevelopmentState(game, botColor);
    const fileIndex = getFileIndexFromSquare(verboseMove.to);
    const hasFile = isFileOpenForRook(game, fileIndex) || isFileSemiOpenForRook(game, fileIndex, botColor);
    const enoughDevelopment = state.undevelopedMinorCount === 0 || state.rooksConnected;
    const hasRookPlan = evaluateOpenFileRook(game, verboseMove, botColor).score > 0 ||
      evaluateSemiOpenFileRook(game, verboseMove, botColor).score > 0 ||
      evaluateRookOnSeventhRank(game, verboseMove, botColor).score > 0 ||
      evaluateRookBehindPassedPawn(game, verboseMove, botColor).score > 0 ||
      evaluateRookCutoff(game, verboseMove, botColor).score > 0;

    const pointless = isOpeningPhase(game, botColor) &&
      state.undevelopedMinorCount > 1 &&
      !hasFile &&
      !hasRookPlan &&
      !enoughDevelopment &&
      !rookMoveHasSafetyPurpose(game, verboseMove, botColor);

    return {
      pointless: pointless,
      reasons: pointless ? [REJECTION_REASONS.POINTLESS_ROOK_MOVE] : []
    };
  }

  function mergeRookPlanScore(trace, planResult) {
    trace.score += planResult.score;
    addUnique(trace.reasons, planResult.reasons);
    addUnique(trace.purposeTags, planResult.purposeTags);
  }

  function scoreRookPlanMove(game, move, botColor) {
    const trace = createMoveTrace(move);
    const verboseMove = getVerboseMove(game, move);
    if (!isRookMove(verboseMove)) {
      trace.score = 0;
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        move: verboseMove,
        score: trace.score,
        reasons: trace.reasons,
        purposeTags: trace.purposeTags,
        rejected: trace.rejected
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      trace.score -= 999999;
      trace.rejected = true;
    }

    if (!moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
    }

    const materialEmergency = detectMaterialEmergencies(game, botColor)[0];
    if (materialEmergency && !moveHandlesMaterialEmergency(game, verboseMove, botColor, materialEmergency).handles) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
    }

    const kingDanger = evaluateKingDanger(game, botColor);
    if (kingDanger.score >= 700 && !evaluateMoveReducesKingDanger(game, verboseMove, botColor).reduces) {
      trace.score -= 1200;
      addUnique(trace.reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    mergeRookPlanScore(trace, evaluateOpenFileRook(game, verboseMove, botColor));
    mergeRookPlanScore(trace, evaluateSemiOpenFileRook(game, verboseMove, botColor));
    mergeRookPlanScore(trace, evaluateRookOnSeventhRank(game, verboseMove, botColor));
    mergeRookPlanScore(trace, evaluateRookBehindPassedPawn(game, verboseMove, botColor));
    mergeRookPlanScore(trace, evaluateRookCutoff(game, verboseMove, botColor));

    const pointless = isPointlessEarlyRookMove(game, verboseMove, botColor);
    if (pointless.pointless) {
      trace.score -= 900;
      addUnique(trace.reasons, pointless.reasons);
    }

    if (trace.purposeTags.indexOf(PURPOSE_TAGS.ROOK_PLAN) === -1 && !verboseMove.captured) {
      trace.score -= 400;
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
    }

    return {
      move: verboseMove,
      score: trace.score,
      reasons: trace.reasons,
      purposeTags: trace.purposeTags,
      rejected: trace.rejected
    };
  }

  function compareRookPlanMoves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const purposeDiff = b.purposeTags.length - a.purposeTags.length;
    if (purposeDiff) {
      return purposeDiff;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseRookPlanMove(game, botColor, candidateMoves) {
    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseDirectRecapture(game, botColor) ||
      chooseSafeHighValueCapture(game, botColor) ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor) ||
      evaluateKingDanger(game, botColor).score >= 700) {
      return null;
    }

    const candidates = (candidateMoves || getLegalMovesDeterministic(game)).filter(function (move) {
      return isRookMove(move);
    });
    const scoredMoves = candidates.map(function (move) {
      return scoreRookPlanMove(game, move, botColor);
    }).filter(function (item) {
      const pointless = isPointlessEarlyRookMove(game, item.move, botColor);
      return !item.rejected &&
        item.score > 0 &&
        item.purposeTags.indexOf(PURPOSE_TAGS.ROOK_PLAN) !== -1 &&
        !pointless.pointless;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareRookPlanMoves);
    return scoredMoves[0].move;
  }

  function createTacticalResult() {
    return {
      score: 0,
      reasons: [],
      purposeTags: [],
      targets: []
    };
  }

  function collectPiecesByColor(game, color) {
    const pieces = [];
    if (!game || typeof game.board !== "function") {
      return pieces;
    }

    const board = game.board();
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color) {
          pieces.push({
            square: boardArraySquare(row, col),
            piece: piece,
            value: getPieceValue(piece)
          });
        }
      }
    }

    return pieces;
  }

  function getHighValueTargets(game, botColor) {
    const opponentColor = oppositeColor(botColor);
    return collectPiecesByColor(game, opponentColor).filter(function (item) {
      if (item.piece.type === "k" || item.piece.type === "q" || item.piece.type === "r") {
        return true;
      }

      if (item.piece.type === "b" || item.piece.type === "n") {
        const defenders = getAttackersToSquare(game, item.square, opponentColor);
        const attackers = getAttackersToSquare(game, item.square, botColor);
        return defenders.length === 0 || attackers.length >= defenders.length;
      }

      return false;
    }).map(function (item) {
      return {
        square: item.square,
        piece: item.piece,
        value: item.value,
        targetType: item.piece.type === "k" ? "KING" :
          item.piece.type === "q" ? "QUEEN" :
            item.piece.type === "r" ? "ROOK" : "UNDERDEFENDED_MINOR"
      };
    });
  }

  function getAttackedHighValueTargetsFromSquare(game, attackerSquare, botColor) {
    const attacker = getPieceAt(game, attackerSquare);
    if (!attacker || attacker.color !== botColor) {
      return [];
    }

    return getHighValueTargets(game, botColor).filter(function (target) {
      return doesPieceAttackSquare(game, attackerSquare, attacker, target.square);
    }).map(function (target) {
      return {
        square: target.square,
        piece: target.piece,
        value: target.value,
        targetType: target.targetType,
        attackerSquare: attackerSquare
      };
    }).sort(compareTacticalTargets);
  }

  function compareTacticalTargets(a, b) {
    if (a.value !== b.value) {
      return b.value - a.value;
    }

    return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
  }

  function getAttackedHighValueTargetsAfterMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!game || !verboseMove || typeof game.fen !== "function") {
      return [];
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return [];
    }

    try {
      const targets = [];
      collectPiecesByColor(game, botColor).forEach(function (attacker) {
        getAttackedHighValueTargetsFromSquare(game, attacker.square, botColor).forEach(function (target) {
          if (!targets.some(function (existing) {
            return existing.square === target.square && existing.attackerSquare === target.attackerSquare;
          })) {
            targets.push(target);
          }
        });
      });
      return targets.sort(compareTacticalTargets);
    } finally {
      undoMoveSafely(game);
    }
  }

  function getCurrentAttackedHighValueTargets(game, botColor) {
    const targets = [];
    collectPiecesByColor(game, botColor).forEach(function (attacker) {
      getAttackedHighValueTargetsFromSquare(game, attacker.square, botColor).forEach(function (target) {
        if (!targets.some(function (existing) {
          return existing.square === target.square && existing.attackerSquare === target.attackerSquare;
        })) {
          targets.push(target);
        }
      });
    });
    return targets.sort(compareTacticalTargets);
  }

  function isTacticalMoveSafe(game, move, botColor) {
    const reasons = [];
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return {
        safe: false,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      return {
        safe: true,
        reasons: []
      };
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    addUnique(reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      return {
        safe: false,
        reasons: reasons.length ? reasons : [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]
      };
    }

    if (verboseMove.captured && captureSequenceLosesMaterialClearly(game, verboseMove, botColor, cache)) {
      addUnique(reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
    }

    if (!moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      addUnique(reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
    }

    if (isBotInCheck(game, botColor) && !isLegalSafe(game, verboseMove, botColor).safe) {
      addUnique(reasons, [REJECTION_REASONS.IGNORES_CHECK]);
    }

    const materialEmergency = detectMaterialEmergencies(game, botColor)[0];
    if (materialEmergency && !moveHandlesMaterialEmergency(game, verboseMove, botColor, materialEmergency).handles) {
      addUnique(reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
    }

    const severeUnit = detectUnderdefendedUnits(game, botColor).filter(function (unitInfo) {
      return unitInfo.severity >= 450 && !isFakeUnitThreat(game, unitInfo, botColor);
    })[0];
    if (severeUnit && !moveHandlesUnderdefendedUnit(game, verboseMove, botColor, severeUnit).handles) {
      addUnique(reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
    }

    const danger = evaluateKingDanger(game, botColor);
    if (danger.score >= 700 && !evaluateMoveReducesKingDanger(game, verboseMove, botColor).reduces) {
      addUnique(reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    return {
      safe: reasons.length === 0,
      reasons: reasons
    };
  }

  function scoreForkTargets(targets) {
    const types = targets.map(function (target) {
      return target.targetType;
    });
    const hasKing = types.indexOf("KING") !== -1;
    const hasQueen = types.indexOf("QUEEN") !== -1;
    const hasRook = types.indexOf("ROOK") !== -1;

    if (hasKing && hasQueen) {
      return 1200;
    }

    if (hasKing && hasRook) {
      return 900;
    }

    if (hasQueen && hasRook) {
      return 800;
    }

    if (hasQueen && types.indexOf("UNDERDEFENDED_MINOR") !== -1) {
      return 600;
    }

    return 400;
  }

  function detectForkMove(game, move, botColor) {
    const result = createTacticalResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isTacticalMoveSafe(game, verboseMove, botColor).safe) {
      return result;
    }

    if (!game || typeof game.fen !== "function") {
      return result;
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return result;
    }

    try {
      const targets = getAttackedHighValueTargetsFromSquare(game, applied.to, botColor);
      if (targets.length >= 2) {
        result.score += scoreForkTargets(targets);
        result.targets = targets;
        addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
        if (result.score >= 600) {
          addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
        }
      }
      return result;
    } finally {
      undoMoveSafely(game);
    }
  }

  function getLineDirectionsForPiece(pieceType) {
    if (pieceType === "b") {
      return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    }

    if (pieceType === "r") {
      return [[1, 0], [-1, 0], [0, 1], [0, -1]];
    }

    if (pieceType === "q") {
      return [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    }

    return [];
  }

  function scanLinePieces(game, from, direction) {
    const pieces = [];
    const coords = coordsFromSquare(from);
    if (!coords) {
      return pieces;
    }

    let file = coords.file + direction[0];
    let rank = coords.rank + direction[1];
    while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
      const square = squareFromCoords(file, rank);
      const piece = getPieceAt(game, square);
      if (piece) {
        pieces.push({
          square: square,
          piece: piece,
          value: getPieceValue(piece)
        });
      }

      file += direction[0];
      rank += direction[1];
    }

    return pieces;
  }

  function mergeTacticalResult(target, source) {
    target.score += source.score;
    addUnique(target.reasons, source.reasons);
    addUnique(target.purposeTags, source.purposeTags);
    if (!Array.isArray(target.targets)) {
      target.targets = [];
    }
    if (Array.isArray(source.targets)) {
      source.targets.forEach(function (item) {
        if (!target.targets.some(function (existing) {
          return existing.square === item.square && existing.targetType === item.targetType;
        })) {
          target.targets.push(item);
        }
      });
    }
  }

  function detectLineTacticAfterMove(game, move, botColor, tacticType) {
    const result = createTacticalResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isTacticalMoveSafe(game, verboseMove, botColor).safe ||
      !game || typeof game.fen !== "function") {
      return result;
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return result;
    }

    try {
      collectPiecesByColor(game, botColor).forEach(function (attacker) {
        if (["b", "r", "q"].indexOf(attacker.piece.type) === -1) {
          return;
        }

        getLineDirectionsForPiece(attacker.piece.type).forEach(function (direction) {
          const linePieces = scanLinePieces(game, attacker.square, direction);
          if (linePieces.length < 2) {
            return;
          }

          const front = linePieces[0];
          const behind = linePieces[1];
          if (front.piece.color === botColor || behind.piece.color === botColor) {
            return;
          }

          if (tacticType === "PIN" && (behind.piece.type === "k" || behind.piece.type === "q" || behind.piece.type === "r")) {
            result.score += behind.piece.type === "k" ? 700 : behind.piece.type === "q" ? 450 : 300;
            addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
            result.targets.push({
              square: front.square,
              piece: front.piece,
              value: front.value,
              targetType: behind.piece.type === "k" ? "PIN_TO_KING" : "PIN_TO_HIGH_VALUE"
            });
          }

          if (tacticType === "SKEWER" &&
            (front.piece.type === "k" || front.piece.type === "q" || front.piece.type === "r") &&
            (behind.piece.type === "q" || behind.piece.type === "r" || behind.piece.type === "b" || behind.piece.type === "n")) {
            result.score += front.piece.type === "k" ? 800 : front.piece.type === "q" ? 500 : 450;
            addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
            addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
            result.targets.push({
              square: behind.square,
              piece: behind.piece,
              value: behind.value,
              targetType: "SKEWER_TARGET"
            });
          }
        });
      });
      return result;
    } finally {
      undoMoveSafely(game);
    }
  }

  function detectPinMove(game, move, botColor) {
    return detectLineTacticAfterMove(game, move, botColor, "PIN");
  }

  function detectSkewerMove(game, move, botColor) {
    return detectLineTacticAfterMove(game, move, botColor, "SKEWER");
  }

  function detectDiscoveredAttackMove(game, move, botColor) {
    const result = createTacticalResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isTacticalMoveSafe(game, verboseMove, botColor).safe ||
      !game || typeof game.fen !== "function") {
      return result;
    }

    const beforeTargets = getCurrentAttackedHighValueTargets(game, botColor);
    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return result;
    }

    try {
      const newTargets = [];
      collectPiecesByColor(game, botColor).forEach(function (attacker) {
        if (attacker.square === applied.to || ["b", "r", "q"].indexOf(attacker.piece.type) === -1) {
          return;
        }

        getAttackedHighValueTargetsFromSquare(game, attacker.square, botColor).forEach(function (target) {
          const wasAlreadyAttacked = beforeTargets.some(function (before) {
            return before.square === target.square && before.attackerSquare === attacker.square;
          });
          if (!wasAlreadyAttacked && isSquareBetweenSquares(verboseMove.from, attacker.square, target.square)) {
            newTargets.push(target);
          }
        });
      });

      if (newTargets.length) {
        const bestValue = newTargets[0].value;
        result.score += bestValue >= 900 ? 700 : bestValue >= 500 ? 500 : 300;
        result.targets = newTargets.sort(compareTacticalTargets);
        addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
        if (bestValue >= 500) {
          addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
        }
      }
      return result;
    } finally {
      undoMoveSafely(game);
    }
  }

  function pieceDefendsTarget(game, defender, target) {
    return defender && target && doesPieceAttackSquare(game, defender.square, defender.piece, target.square);
  }

  function detectRemoveDefenderMove(game, move, botColor) {
    const result = createTacticalResult();
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !verboseMove.captured || !isTacticalMoveSafe(game, verboseMove, botColor).safe) {
      return result;
    }

    const capturedPiece = getPieceAt(game, verboseMove.to) || {
      type: verboseMove.captured,
      color: oppositeColor(botColor)
    };
    const defender = {
      square: verboseMove.to,
      piece: capturedPiece,
      value: getPieceValue(capturedPiece)
    };
    const defendedTargets = getHighValueTargets(game, botColor).filter(function (target) {
      return target.square !== defender.square && pieceDefendsTarget(game, defender, target);
    });
    if (!defendedTargets.length) {
      return result;
    }

    const bestTarget = defendedTargets.sort(compareTacticalTargets)[0];
    result.score += bestTarget.value >= 500 ? 600 : bestTarget.value >= 320 ? 350 : 250;
    result.targets = defendedTargets;
    addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
    if (bestTarget.value >= 500) {
      addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
    }
    return result;
  }

  function detectOverloadedDefenderMove(game, move, botColor) {
    const result = createTacticalResult();
    const verboseMove = getVerboseMove(game, move);
    if (!isTacticalMoveSafe(game, verboseMove, botColor).safe ||
      !game || typeof game.fen !== "function") {
      return result;
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return result;
    }

    try {
      const opponentColor = oppositeColor(botColor);
      const highTargets = getHighValueTargets(game, botColor);
      const kingZone = getKingZone(game, opponentColor);
      collectPiecesByColor(game, opponentColor).forEach(function (defender) {
        const defendedTargets = highTargets.filter(function (target) {
          return target.square !== defender.square && pieceDefendsTarget(game, defender, target);
        });
        const defendsKingZone = kingZone.zoneSquares.some(function (square) {
          return doesPieceAttackSquare(game, defender.square, defender.piece, square);
        });
        const isAttacked = doesColorAttackSquare(game, botColor, defender.square);
        if (isAttacked && (defendedTargets.length >= 2 || defendedTargets.length >= 1 && defendsKingZone)) {
          result.score += defendedTargets.some(function (target) {
            return target.value >= 500;
          }) || defendsKingZone ? 500 : 250;
          result.targets = result.targets.concat(defendedTargets);
          addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
        }
      });
      return result;
    } finally {
      undoMoveSafely(game);
    }
  }

  function getTacticalPunisherScore(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    if (!verboseMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      trace.score = -999999;
      return trace;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return trace;
    }

    const safety = isTacticalMoveSafe(game, verboseMove, botColor);
    if (!safety.safe) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, safety.reasons);
      return trace;
    }

    [
      detectForkMove,
      detectPinMove,
      detectSkewerMove,
      detectDiscoveredAttackMove,
      detectRemoveDefenderMove,
      detectOverloadedDefenderMove
    ].forEach(function (detector) {
      mergeTacticalResult(trace, detector(game, verboseMove, botColor));
    });

    if (trace.score > 0) {
      markPurpose(trace, PURPOSE_TAGS.CREATE_SAFE_THREAT);
    }

    if (trace.score >= 600 || trace.targets.some(function (target) {
      return target.value >= 500;
    })) {
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    return trace;
  }

  function compareTacticalScores(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const bestTargetA = a.targets && a.targets.length ? a.targets[0].value : 0;
    const bestTargetB = b.targets && b.targets.length ? b.targets[0].value : 0;
    if (bestTargetA !== bestTargetB) {
      return bestTargetB - bestTargetA;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseTacticalPunisherMove(game, botColor, candidateMoves) {
    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseDirectRecapture(game, botColor) ||
      chooseSafeHighValueCapture(game, botColor) ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor) ||
      evaluateKingDanger(game, botColor).score >= 700) {
      return null;
    }

    const candidates = candidateMoves || getLegalMovesDeterministic(game);
    const scoredMoves = candidates.map(function (move) {
      return getTacticalPunisherScore(game, move, botColor);
    }).filter(function (item) {
      return !item.rejected &&
        item.score > 0 &&
        (item.purposeTags.indexOf(PURPOSE_TAGS.CREATE_SAFE_THREAT) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.WIN_MATERIAL) !== -1) &&
        isTacticalMoveSafe(game, item.move, botColor).safe;
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareTacticalScores);
    return scoredMoves[0].move;
  }

  function getMaterialForColor(game, color) {
    return collectPiecesByColor(game, color).reduce(function (total, item) {
      return item.piece.type === "k" ? total : total + getPieceValue(item.piece);
    }, 0);
  }

  function getMaterialBalanceBee3(game, botColor) {
    return getMaterialForColor(game, botColor) - getMaterialForColor(game, oppositeColor(botColor));
  }

  function classifyAdvantageStateBee3(game, botColor) {
    const balance = getMaterialBalanceBee3(game, botColor);
    if (balance <= -500) {
      return "LOSING";
    }
    if (balance <= -150) {
      return "BEHIND";
    }
    if (balance <= 149) {
      return "BALANCED";
    }
    if (balance <= 299) {
      return "SLIGHTLY_AHEAD";
    }
    if (balance <= 599) {
      return "MODERATELY_AHEAD";
    }
    if (balance <= 999) {
      return "CLEARLY_AHEAD";
    }
    return "WINNING_AHEAD";
  }

  function isAheadState(advantageState) {
    return ["SLIGHTLY_AHEAD", "MODERATELY_AHEAD", "CLEARLY_AHEAD", "WINNING_AHEAD"].indexOf(advantageState) !== -1;
  }

  function isBehindState(advantageState) {
    return advantageState === "LOSING" || advantageState === "BEHIND";
  }

  function isTradeMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const notTrade = {
      isTrade: false,
      capturedValue: 0,
      movingValue: verboseMove ? getPieceValue(verboseMove.piece) : 0,
      likelyRecaptured: false,
      tradeType: "NOT_TRADE"
    };
    if (!verboseMove || !verboseMove.captured) {
      return notTrade;
    }

    const capturedValue = getPieceValue(verboseMove.captured);
    const movingValue = getPieceValue(verboseMove.piece);
    if (!game || typeof game.fen !== "function") {
      return notTrade;
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return notTrade;
    }

    try {
      const cheapestRecapture = getCheapestAttackerToSquare(game, applied.to, oppositeColor(botColor));
      const likelyRecaptured = Boolean(cheapestRecapture);
      let tradeType = "FAVORABLE_CAPTURE";
      if (likelyRecaptured && verboseMove.piece === "q" && verboseMove.captured === "q") {
        tradeType = "QUEEN_TRADE";
      } else if (likelyRecaptured && verboseMove.piece === "r" && verboseMove.captured === "r") {
        tradeType = "ROOK_TRADE";
      } else if (likelyRecaptured &&
        ["b", "n"].indexOf(verboseMove.piece) !== -1 &&
        ["b", "n"].indexOf(verboseMove.captured) !== -1) {
        tradeType = "MINOR_TRADE";
      } else if (likelyRecaptured && capturedValue + 100 < movingValue) {
        tradeType = "BAD_TRADE";
      }

      return {
        isTrade: likelyRecaptured || Math.abs(capturedValue - movingValue) <= 100,
        capturedValue: capturedValue,
        movingValue: movingValue,
        likelyRecaptured: likelyRecaptured,
        tradeType: tradeType
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function createConversionResult() {
    return {
      score: 0,
      reasons: [],
      purposeTags: []
    };
  }

  function materialAfterMove(game, move, botColor) {
    if (!game || typeof game.fen !== "function") {
      return getMaterialBalanceBee3(game, botColor);
    }

    const applied = applyMoveSafely(game, move);
    if (!applied) {
      return getMaterialBalanceBee3(game, botColor);
    }

    try {
      return getMaterialBalanceBee3(game, botColor);
    } finally {
      undoMoveSafely(game);
    }
  }

  function wouldTradeTowardDeadDraw(game, move, botColor, advantageState) {
    if (advantageState !== "CLEARLY_AHEAD" && advantageState !== "WINNING_AHEAD") {
      return false;
    }

    const trade = isTradeMove(game, move, botColor);
    if (!trade.isTrade) {
      return false;
    }

    // TODO Phase 14+: replace with draw-aware detector for insufficient material and fortress cases.
    const afterBalance = materialAfterMove(game, move, botColor);
    const afterOwnMaterial = getMaterialForColor(game, botColor) - (trade.likelyRecaptured ? trade.movingValue : 0);
    return afterBalance < 300 || afterOwnMaterial <= 330 && afterBalance < 500;
  }

  function evaluateTradeWhenAheadBee3(game, move, botColor, advantageState) {
    const result = createConversionResult();
    if (!isAheadState(advantageState)) {
      return result;
    }

    const verboseMove = getVerboseMove(game, move);
    const trade = isTradeMove(game, verboseMove, botColor);
    if (!verboseMove || !verboseMove.captured) {
      return result;
    }

    if (trade.tradeType === "QUEEN_TRADE") {
      result.score += 1200;
      addUnique(result.purposeTags, [PURPOSE_TAGS.TRADE_WHEN_AHEAD]);
    } else if (trade.tradeType === "ROOK_TRADE") {
      result.score += 800;
      addUnique(result.purposeTags, [PURPOSE_TAGS.TRADE_WHEN_AHEAD]);
    } else if (trade.tradeType === "MINOR_TRADE" && ["CLEARLY_AHEAD", "WINNING_AHEAD", "MODERATELY_AHEAD"].indexOf(advantageState) !== -1) {
      result.score += 400;
      addUnique(result.purposeTags, [PURPOSE_TAGS.TRADE_WHEN_AHEAD]);
    } else if (!trade.likelyRecaptured && trade.capturedValue > 0) {
      result.score += 700;
      addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
    }

    if (trade.capturedValue >= 500) {
      result.score += 500;
    }

    if (wouldTradeTowardDeadDraw(game, verboseMove, botColor, advantageState)) {
      result.score -= 2000;
      addUnique(result.reasons, [REJECTION_REASONS.TRADE_TO_DRAW_WHEN_WINNING]);
    }

    const beforeBalance = getMaterialBalanceBee3(game, botColor);
    const afterBalance = materialAfterMove(game, verboseMove, botColor);
    if (afterBalance + 150 < beforeBalance && afterBalance < 300) {
      result.score -= 1500;
      addUnique(result.reasons, [REJECTION_REASONS.OVEREXTENDS_WHEN_AHEAD]);
    }

    if (captureSequenceLosesMaterialClearly(game, verboseMove, botColor)) {
      result.score -= 999999;
      addUnique(result.reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
    }

    return result;
  }

  function evaluateTradeWhenBehindBee3(game, move, botColor, advantageState) {
    const result = createConversionResult();
    if (!isBehindState(advantageState)) {
      return result;
    }

    const verboseMove = getVerboseMove(game, move);
    const trade = isTradeMove(game, verboseMove, botColor);
    if (!verboseMove) {
      return result;
    }

    if (trade.isTrade && trade.tradeType === "QUEEN_TRADE") {
      result.score -= 900;
      addUnique(result.reasons, [REJECTION_REASONS.TRADE_BAD_WHEN_BEHIND]);
    } else if (trade.isTrade && trade.tradeType === "ROOK_TRADE") {
      result.score -= 500;
      addUnique(result.reasons, [REJECTION_REASONS.TRADE_BAD_WHEN_BEHIND]);
    }

    if (verboseMove.captured && trade.capturedValue > trade.movingValue || verboseMove.captured && !trade.likelyRecaptured) {
      result.score += 700;
      addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
    }

    if (trade.isTrade && materialAfterMove(game, verboseMove, botColor) > getMaterialBalanceBee3(game, botColor)) {
      result.score += 400;
      addUnique(result.purposeTags, [PURPOSE_TAGS.DRAW_DEFENSE]);
    }

    if (!trade.isTrade && isLegalSafe(game, verboseMove, botColor).safe) {
      result.score += 300;
      addUnique(result.purposeTags, [PURPOSE_TAGS.KEEP_PIECES_WHEN_BEHIND]);
    }

    return result;
  }

  function evaluateCounterplayRisk(game, move, botColor) {
    const reasons = [];
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return {
        risk: 999999,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    if (!moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      return {
        risk: 999999,
        reasons: [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]
      };
    }

    const trade = isTradeMove(game, verboseMove, botColor);
    if (trade.isTrade && trade.likelyRecaptured && trade.capturedValue >= trade.movingValue) {
      return {
        risk: 0,
        reasons: []
      };
    }

    const beforeDanger = evaluateKingDanger(game, botColor).score;
    if (!game || typeof game.fen !== "function") {
      return {
        risk: 0,
        reasons: []
      };
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        risk: 999999,
        reasons: [REJECTION_REASONS.ILLEGAL_MOVE]
      };
    }

    try {
      let risk = 0;
      const afterDanger = evaluateKingDanger(game, botColor).score;
      if (afterDanger > beforeDanger) {
        risk += (afterDanger - beforeDanger) * 2;
        if (afterDanger >= 700) {
          risk += 700;
          addUnique(reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
        }
      }

      const severeUnits = detectUnderdefendedUnits(game, botColor).filter(function (unitInfo) {
        return unitInfo.severity >= 450 && !isFakeUnitThreat(game, unitInfo, botColor);
      });
      if (severeUnits.length) {
        risk += 600;
        addUnique(reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
      }

      if (verboseMove.captured && captureSequenceLosesMaterialClearly(game, verboseMove, botColor)) {
        risk += 900;
        addUnique(reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
      }

      return {
        risk: risk,
        reasons: reasons
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function evaluateSimplificationMove(game, move, botColor, advantageState) {
    const result = createConversionResult();
    if (!isAheadState(advantageState) || advantageState === "SLIGHTLY_AHEAD") {
      return result;
    }

    const trade = isTradeMove(game, move, botColor);
    if (!trade.isTrade) {
      return result;
    }

    if (trade.tradeType === "QUEEN_TRADE") {
      result.score += 1200;
      addUnique(result.purposeTags, [PURPOSE_TAGS.TRADE_WHEN_AHEAD]);
    } else if (trade.tradeType === "ROOK_TRADE" && (advantageState === "CLEARLY_AHEAD" || advantageState === "WINNING_AHEAD")) {
      result.score += 800;
      addUnique(result.purposeTags, [PURPOSE_TAGS.TRADE_WHEN_AHEAD]);
    } else if (trade.tradeType === "MINOR_TRADE" && advantageState === "WINNING_AHEAD") {
      result.score += 400;
      addUnique(result.purposeTags, [PURPOSE_TAGS.TRADE_WHEN_AHEAD]);
    }

    if (trade.likelyRecaptured) {
      result.score += 400;
    }

    const counterplay = evaluateCounterplayRisk(game, move, botColor);
    if (counterplay.risk === 0) {
      result.score += 500;
    } else if (counterplay.risk >= 700) {
      result.score -= 1000;
      addUnique(result.reasons, counterplay.reasons);
    }

    if (wouldTradeTowardDeadDraw(game, move, botColor, advantageState)) {
      result.score -= 2000;
      addUnique(result.reasons, [REJECTION_REASONS.TRADE_TO_DRAW_WHEN_WINNING]);
    }

    return result;
  }

  function mergeConversionResult(trace, result) {
    trace.score += result.score;
    addUnique(trace.reasons, result.reasons);
    addUnique(trace.purposeTags, result.purposeTags);
  }

  function scoreAdvantageConversionMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    if (!verboseMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      trace.score = -999999;
      return trace;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return trace;
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    const tradeForSafety = isTradeMove(game, verboseMove, botColor);
    const safeEqualTrade = !safety.materialSafe &&
      tradeForSafety.isTrade &&
      tradeForSafety.likelyRecaptured &&
      tradeForSafety.capturedValue >= tradeForSafety.movingValue &&
      safety.reasons.every(function (reason) {
        return reason === REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE;
      });
    if (!safety.legalSafe || !safety.materialSafe && !safeEqualTrade) {
      trace.score -= 999999;
      trace.rejected = true;
      return trace;
    }
    if (safeEqualTrade) {
      trace.safety.materialSafe = true;
      trace.reasons = trace.reasons.filter(function (reason) {
        return reason !== REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE;
      });
    }

    if (!moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
      return trace;
    }

    const materialEmergency = detectMaterialEmergencies(game, botColor)[0];
    if (materialEmergency && !moveHandlesMaterialEmergency(game, verboseMove, botColor, materialEmergency).handles) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
      return trace;
    }

    const advantageState = classifyAdvantageStateBee3(game, botColor);
    if (isAheadState(advantageState)) {
      mergeConversionResult(trace, evaluateTradeWhenAheadBee3(game, verboseMove, botColor, advantageState));
      mergeConversionResult(trace, evaluateSimplificationMove(game, verboseMove, botColor, advantageState));
      const counterplay = evaluateCounterplayRisk(game, verboseMove, botColor);
      trace.score -= counterplay.risk;
      addUnique(trace.reasons, counterplay.reasons);
    } else if (isBehindState(advantageState)) {
      mergeConversionResult(trace, evaluateTradeWhenBehindBee3(game, verboseMove, botColor, advantageState));
    } else {
      const trade = isTradeMove(game, verboseMove, botColor);
      if (verboseMove.captured && !trade.likelyRecaptured && trade.capturedValue > 0) {
        trace.score += 500;
        markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
      } else if (trade.isTrade && trade.tradeType !== "BAD_TRADE") {
        trace.score += 100;
      }
    }

    if (!trace.purposeTags.length && trace.score <= 0) {
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
    }

    return trace;
  }

  function compareAdvantageConversionScores(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const purposeA = a.purposeTags.length;
    const purposeB = b.purposeTags.length;
    if (purposeA !== purposeB) {
      return purposeB - purposeA;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseAdvantageConversionMoveBee3(game, botColor, candidateMoves) {
    const highValueCapture = chooseSafeHighValueCapture(game, botColor);
    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseDirectRecapture(game, botColor) ||
      highValueCapture && !isTradeMove(game, highValueCapture, botColor).isTrade ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor) ||
      evaluateKingDanger(game, botColor).score >= 700) {
      return null;
    }

    const advantageState = classifyAdvantageStateBee3(game, botColor);
    const candidates = candidateMoves || getLegalMovesDeterministic(game);
    if (advantageState === "BALANCED" && !candidates.some(function (move) {
      return move.captured || isTradeMove(game, move, botColor).isTrade;
    })) {
      return null;
    }

    const scoredMoves = candidates.map(function (move) {
      return scoreAdvantageConversionMove(game, move, botColor);
    }).filter(function (item) {
      return !item.rejected &&
        item.score > 0 &&
        (item.purposeTags.indexOf(PURPOSE_TAGS.TRADE_WHEN_AHEAD) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.KEEP_PIECES_WHEN_BEHIND) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.WIN_MATERIAL) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.DRAW_DEFENSE) !== -1);
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareAdvantageConversionScores);
    return scoredMoves[0].move;
  }

  function detectEndgameBee3(game, botColor) {
    const pieces = collectPiecesByColor(game, "w").concat(collectPiecesByColor(game, "b"));
    let nonKingMaterialTotal = 0;
    let majorPieces = 0;
    let minorPieces = 0;
    let queensOnBoard = 0;

    pieces.forEach(function (item) {
      if (item.piece.type === "k") {
        return;
      }
      nonKingMaterialTotal += item.value;
      if (item.piece.type === "q") {
        queensOnBoard += 1;
        majorPieces += 1;
      } else if (item.piece.type === "r") {
        majorPieces += 1;
      } else if (item.piece.type === "b" || item.piece.type === "n") {
        minorPieces += 1;
      }
    });

    let reason = "";
    if (queensOnBoard === 0) {
      reason = "NO_QUEENS";
    } else if (nonKingMaterialTotal <= 2600) {
      reason = "LOW_MATERIAL";
    } else if (majorPieces + minorPieces <= 4) {
      reason = "FEW_PIECES";
    } else if (majorPieces <= 2 && minorPieces <= 2 && nonKingMaterialTotal <= 3200) {
      reason = "ROOK_MINOR_PAWN_ENDING";
    }

    return {
      isEndgame: Boolean(reason),
      nonKingMaterialTotal: nonKingMaterialTotal,
      majorPieces: majorPieces,
      minorPieces: minorPieces,
      queensOnBoard: queensOnBoard,
      reason: reason
    };
  }

  function detectInsufficientMaterialBee3(game) {
    const nonKingPieces = collectPiecesByColor(game, "w").concat(collectPiecesByColor(game, "b")).filter(function (item) {
      return item.piece.type !== "k";
    });
    if (!nonKingPieces.length) {
      return {
        insufficient: true,
        reason: "KING_VS_KING"
      };
    }

    if (nonKingPieces.some(function (item) {
      return item.piece.type === "p" || item.piece.type === "r" || item.piece.type === "q";
    })) {
      return {
        insufficient: false,
        reason: ""
      };
    }

    if (nonKingPieces.length === 1 && (nonKingPieces[0].piece.type === "b" || nonKingPieces[0].piece.type === "n")) {
      return {
        insufficient: true,
        reason: nonKingPieces[0].piece.type === "b" ? "KING_BISHOP_VS_KING" : "KING_KNIGHT_VS_KING"
      };
    }

    const bishops = nonKingPieces.filter(function (item) {
      return item.piece.type === "b";
    });
    if (bishops.length === nonKingPieces.length && bishops.length <= 2) {
      const colors = bishops.map(function (item) {
        return game && typeof game.square_color === "function" ? game.square_color(item.square) : null;
      });
      if (colors.length === 2 && colors[0] && colors[0] === colors[1]) {
        return {
          insufficient: true,
          reason: "SAME_COLOR_BISHOPS_ONLY"
        };
      }
    }

    return {
      insufficient: false,
      reason: ""
    };
  }

  function detectPassedPawnsBee3(game, color) {
    const direction = color === "w" ? 1 : -1;
    return collectPiecesByColor(game, color).filter(function (item) {
      return item.piece.type === "p";
    }).map(function (item) {
      const coords = coordsFromSquare(item.square);
      const enemyColor = oppositeColor(color);
      let passed = true;
      for (let file = Math.max(0, coords.file - 1); file <= Math.min(7, coords.file + 1); file++) {
        for (let rank = coords.rank + direction; rank >= 0 && rank <= 7; rank += direction) {
          const piece = getPieceAt(game, squareFromCoords(file, rank));
          if (piece && piece.color === enemyColor && piece.type === "p") {
            passed = false;
          }
        }
      }
      if (!passed) {
        return null;
      }

      const frontSquare = squareFromCoords(coords.file, coords.rank + direction);
      const promotionDistance = color === "w" ? 7 - coords.rank : coords.rank;
      const supported = getAttackersToSquare(game, item.square, color).some(function (attacker) {
        return attacker.square !== item.square;
      });
      const blocked = Boolean(frontSquare && getPieceAt(game, frontSquare));
      const rookBehind = collectPiecesByColor(game, color).some(function (pieceInfo) {
        return pieceInfo.piece.type === "r" &&
          getFileIndexFromSquare(pieceInfo.square) === coords.file &&
          (color === "w" ? coordsFromSquare(pieceInfo.square).rank < coords.rank : coordsFromSquare(pieceInfo.square).rank > coords.rank);
      });

      return {
        square: item.square,
        file: "abcdefgh"[coords.file],
        rank: coords.rank + 1,
        promotionDistance: promotionDistance,
        supported: supported,
        blocked: blocked,
        dangerous: promotionDistance <= 3 || supported || rookBehind
      };
    }).filter(Boolean).sort(function (a, b) {
      if (a.promotionDistance !== b.promotionDistance) {
        return a.promotionDistance - b.promotionDistance;
      }
      return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
    });
  }

  function distanceBetweenSquares(left, right) {
    const a = coordsFromSquare(left);
    const b = coordsFromSquare(right);
    if (!a || !b) {
      return 99;
    }
    return Math.max(Math.abs(a.file - b.file), Math.abs(a.rank - b.rank));
  }

  function evaluateKingActivityEndgame(game, move, botColor) {
    const result = createConversionResult();
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || verboseMove.piece !== "k" || !detectEndgameBee3(game, botColor).isEndgame) {
      return result;
    }

    const safety = isLegalSafe(game, verboseMove, botColor);
    if (!safety.safe) {
      result.score -= 999999;
      addUnique(result.reasons, safety.reasons);
      return result;
    }

    const centerSquares = ["d4", "e4", "d5", "e5"];
    const beforeCenter = Math.min.apply(null, centerSquares.map(function (square) {
      return distanceBetweenSquares(verboseMove.from, square);
    }));
    const afterCenter = Math.min.apply(null, centerSquares.map(function (square) {
      return distanceBetweenSquares(verboseMove.to, square);
    }));
    if (afterCenter < beforeCenter) {
      result.score += 150 + (beforeCenter - afterCenter) * 50;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN]);
    }

    const ownPassed = detectPassedPawnsBee3(game, botColor)[0];
    if (ownPassed && distanceBetweenSquares(verboseMove.to, ownPassed.square) < distanceBetweenSquares(verboseMove.from, ownPassed.square)) {
      result.score += 200;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN]);
    }

    const enemyPassed = detectPassedPawnsBee3(game, oppositeColor(botColor))[0];
    if (enemyPassed && distanceBetweenSquares(verboseMove.to, enemyPassed.square) < distanceBetweenSquares(verboseMove.from, enemyPassed.square)) {
      result.score += 250;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN, PURPOSE_TAGS.DEFEND_MATERIAL]);
    }

    return result;
  }

  function evaluatePassedPawnEndgame(game, move, botColor) {
    const result = createConversionResult();
    const verboseMove = getVerboseMove(game, move);
    const passedPawns = detectPassedPawnsBee3(game, botColor);
    const endgame = detectEndgameBee3(game, botColor).isEndgame;
    if (!verboseMove || (!endgame && !passedPawns.some(function (pawn) { return pawn.dangerous; }))) {
      return result;
    }

    if (verboseMove.promotion) {
      result.score += isCheckmateAfterMove(game, verboseMove) ? 100000 : 5000;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN, PURPOSE_TAGS.WIN_MATERIAL]);
      return result;
    }

    const ownPassed = passedPawns.find(function (pawn) {
      return pawn.square === verboseMove.from;
    });
    if (ownPassed && verboseMove.piece === "p") {
      const afterDistance = ownPassed.promotionDistance - 1;
      result.score += 400 + Math.max(0, 4 - afterDistance) * 100;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN]);
      if (!isMaterialSafe(game, verboseMove, botColor).safe) {
        result.score -= 700;
        addUnique(result.reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
      }
    }

    if (verboseMove.piece === "r" && evaluateRookBehindPassedPawn(game, verboseMove, botColor).score > 0) {
      result.score += 500;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN, PURPOSE_TAGS.ROOK_PLAN]);
    }

    if (verboseMove.piece === "k" && passedPawns.some(function (pawn) {
      return distanceBetweenSquares(verboseMove.to, pawn.square) < distanceBetweenSquares(verboseMove.from, pawn.square);
    })) {
      result.score += 300;
      addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN]);
    }

    return result;
  }

  function evaluateStopOpponentPassedPawn(game, move, botColor) {
    const result = createConversionResult();
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove) {
      return result;
    }

    const enemyPawns = detectPassedPawnsBee3(game, oppositeColor(botColor));
    enemyPawns.forEach(function (pawn) {
      const pawnCoords = coordsFromSquare(pawn.square);
      const enemyDirection = oppositeColor(botColor) === "w" ? 1 : -1;
      const frontSquare = squareFromCoords(pawnCoords.file, pawnCoords.rank + enemyDirection);
      if (verboseMove.to === pawn.square && verboseMove.captured === "p") {
        result.score += pawn.dangerous ? 1000 : 800;
        addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN, PURPOSE_TAGS.DEFEND_MATERIAL]);
      } else if (verboseMove.to === frontSquare) {
        result.score += pawn.dangerous ? 700 : 500;
        addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN, PURPOSE_TAGS.DEFEND_MATERIAL]);
      } else if ((verboseMove.piece === "k" || verboseMove.piece === "r") &&
        distanceBetweenSquares(verboseMove.to, pawn.square) < distanceBetweenSquares(verboseMove.from, pawn.square)) {
        result.score += verboseMove.piece === "r" ? 450 : 400;
        addUnique(result.purposeTags, [PURPOSE_TAGS.ENDGAME_PLAN]);
      }
      if (pawn.promotionDistance <= 2 && result.score > 0) {
        result.score += 300;
      }
    });

    return result;
  }

  function detectStalemateRiskAfterMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    if (!game || !verboseMove || typeof game.fen !== "function") {
      return {
        stalemate: false,
        reason: ""
      };
    }

    const applied = applyMoveSafely(game, verboseMove);
    if (!applied) {
      return {
        stalemate: false,
        reason: ""
      };
    }

    try {
      const stalemate = Boolean(
        typeof game.isStalemate === "function" && game.isStalemate() ||
        typeof game.in_stalemate === "function" && game.in_stalemate()
      );
      return {
        stalemate: stalemate,
        reason: stalemate ? REJECTION_REASONS.STALEMATE_RISK : ""
      };
    } finally {
      undoMoveSafely(game);
    }
  }

  function evaluateDrawRiskWhenWinning(game, move, botColor) {
    const reasons = [];
    const verboseMove = getVerboseMove(game, move);
    let risk = 0;
    if (!verboseMove) {
      return {
        risk: 0,
        reasons: reasons
      };
    }

    if (detectStalemateRiskAfterMove(game, verboseMove, botColor).stalemate) {
      risk += 999999;
      addUnique(reasons, [REJECTION_REASONS.STALEMATE_RISK]);
    }

    if (game && typeof game.fen === "function") {
      const applied = applyMoveSafely(game, verboseMove);
      if (applied) {
        try {
          if (detectInsufficientMaterialBee3(game).insufficient) {
            risk += 5000;
            addUnique(reasons, [REJECTION_REASONS.INSUFFICIENT_MATERIAL_DRAW_RISK]);
          }
          if (evaluateKingDanger(game, botColor).score >= 700 &&
            collectPiecesByColor(game, oppositeColor(botColor)).some(function (item) {
              return item.piece.type === "q" || item.piece.type === "r";
            })) {
            risk += 700;
            addUnique(reasons, [REJECTION_REASONS.PERPETUAL_RISK]);
          }
        } finally {
          undoMoveSafely(game);
        }
      }
    }

    const ownPassedBefore = detectPassedPawnsBee3(game, botColor);
    if (ownPassedBefore.length && verboseMove.from === ownPassedBefore[0].square && captureSequenceLosesMaterialClearly(game, verboseMove, botColor)) {
      risk += 800;
      addUnique(reasons, [REJECTION_REASONS.OVEREXTENDS_WHEN_AHEAD]);
    }

    return {
      risk: risk,
      reasons: reasons
    };
  }

  function evaluateDrawDefenseWhenLosing(game, move, botColor) {
    const result = createConversionResult();
    const verboseMove = getVerboseMove(game, move);
    const state = classifyAdvantageStateBee3(game, botColor);
    if (!verboseMove || !isBehindState(state)) {
      return result;
    }

    if (verboseMove.san && verboseMove.san.indexOf("+") !== -1) {
      result.score += 500;
      addUnique(result.purposeTags, [PURPOSE_TAGS.DRAW_DEFENSE, PURPOSE_TAGS.SURVIVAL]);
    }

    if (game && typeof game.fen === "function") {
      const applied = applyMoveSafely(game, verboseMove);
      if (applied) {
        try {
          if (detectInsufficientMaterialBee3(game).insufficient) {
            result.score += 800;
            addUnique(result.purposeTags, [PURPOSE_TAGS.DRAW_DEFENSE]);
          }
        } finally {
          undoMoveSafely(game);
        }
      }
    }

    const stopPawn = evaluateStopOpponentPassedPawn(game, verboseMove, botColor);
    if (stopPawn.score > 0) {
      result.score += Math.max(400, stopPawn.score);
      addUnique(result.purposeTags, [PURPOSE_TAGS.DRAW_DEFENSE, PURPOSE_TAGS.ENDGAME_PLAN]);
    }

    if (!isTradeMove(game, verboseMove, botColor).isTrade &&
      (verboseMove.piece === "q" || verboseMove.piece === "r")) {
      result.score += 300;
      addUnique(result.purposeTags, [PURPOSE_TAGS.DRAW_DEFENSE]);
    }

    return result;
  }

  function scoreEndgamePlanMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    if (!verboseMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      trace.score = -999999;
      return trace;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return trace;
    }

    const safety = classifyMoveSafety(game, verboseMove, botColor);
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      trace.score -= 999999;
      trace.rejected = true;
      return trace;
    }

    if (!moveStopsOpponentMateThreat(game, verboseMove, botColor).stops) {
      trace.score -= 999999;
      trace.rejected = true;
      addUnique(trace.reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
      return trace;
    }

    const endgame = detectEndgameBee3(game, botColor);
    const ownPassed = detectPassedPawnsBee3(game, botColor);
    const enemyPassed = detectPassedPawnsBee3(game, oppositeColor(botColor));
    if (!endgame.isEndgame && !ownPassed.concat(enemyPassed).some(function (pawn) { return pawn.dangerous; })) {
      return trace;
    }

    mergeConversionResult(trace, evaluateKingActivityEndgame(game, verboseMove, botColor));
    mergeConversionResult(trace, evaluatePassedPawnEndgame(game, verboseMove, botColor));
    mergeConversionResult(trace, evaluateStopOpponentPassedPawn(game, verboseMove, botColor));

    const advantageState = classifyAdvantageStateBee3(game, botColor);
    if (isBehindState(advantageState)) {
      mergeConversionResult(trace, evaluateDrawDefenseWhenLosing(game, verboseMove, botColor));
    }

    if (isAheadState(advantageState)) {
      const drawRisk = evaluateDrawRiskWhenWinning(game, verboseMove, botColor);
      trace.score -= drawRisk.risk;
      addUnique(trace.reasons, drawRisk.reasons);
      if (drawRisk.risk >= 999999) {
        trace.rejected = true;
      }
    }

    const dangerousEnemy = enemyPassed[0];
    if (dangerousEnemy && dangerousEnemy.dangerous && evaluateStopOpponentPassedPawn(game, verboseMove, botColor).score === 0) {
      trace.score -= dangerousEnemy.promotionDistance <= 2 ? 900 : 400;
    }

    if (verboseMove.promotion) {
      trace.score += 5000;
      markPurpose(trace, PURPOSE_TAGS.ENDGAME_PLAN);
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }

    return trace;
  }

  function compareEndgamePlanScores(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    const promotionA = a.move && a.move.promotion ? 1 : 0;
    const promotionB = b.move && b.move.promotion ? 1 : 0;
    if (promotionA !== promotionB) {
      return promotionB - promotionA;
    }
    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseEndgamePlanMoveBee3(game, botColor, candidateMoves) {
    if (isBotInCheck(game, botColor) ||
      chooseCleanMateMove(game, botColor) ||
      chooseMateDefenseMove(game, botColor) ||
      chooseMaterialEmergencyMove(game, botColor) ||
      chooseUnitStewardshipMove(game, botColor) ||
      evaluateKingDanger(game, botColor).score >= 1000) {
      return null;
    }

    const endgame = detectEndgameBee3(game, botColor);
    const passedPawns = detectPassedPawnsBee3(game, botColor).concat(detectPassedPawnsBee3(game, oppositeColor(botColor)));
    if (!endgame.isEndgame && !passedPawns.some(function (pawn) { return pawn.dangerous; })) {
      return null;
    }

    const scoredMoves = (candidateMoves || getLegalMovesDeterministic(game)).map(function (move) {
      return scoreEndgamePlanMove(game, move, botColor);
    }).filter(function (item) {
      return !item.rejected &&
        item.score > 0 &&
        (item.purposeTags.indexOf(PURPOSE_TAGS.ENDGAME_PLAN) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.DRAW_DEFENSE) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.SURVIVAL) !== -1 ||
          item.purposeTags.indexOf(PURPOSE_TAGS.WIN_MATERIAL) !== -1);
    });

    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(compareEndgamePlanScores);
    return scoredMoves[0].move;
  }

  function safeCall(fallback, callback) {
    try {
      return callback();
    } catch (error) {
      return fallback;
    }
  }

  function buildBee3Context(game, botColor) {
    const history = game && typeof game.history === "function" ? safeCall([], function () {
      return game.history();
    }) : [];
    const opponentColor = oppositeColor(botColor);
    const legalMoves = safeCall([], function () {
      return getLegalMovesDeterministic(game);
    });
    const endgame = safeCall({ isEndgame: false }, function () {
      return detectEndgameBee3(game, botColor);
    });

    return {
      botColor: botColor,
      opponentColor: opponentColor,
      turn: game && typeof game.turn === "function" ? safeCall(null, function () { return game.turn(); }) : null,
      ply: Array.isArray(history) ? history.length : 0,
      legalMoves: legalMoves,
      isInCheck: safeCall(false, function () { return isBotInCheck(game, botColor); }),
      materialBalance: safeCall(0, function () { return getMaterialBalanceBee3(game, botColor); }),
      advantageState: safeCall("BALANCED", function () { return classifyAdvantageStateBee3(game, botColor); }),
      isEndgame: Boolean(endgame && endgame.isEndgame),
      kingDanger: safeCall({ score: 0, reasons: [], attackers: [] }, function () { return evaluateKingDanger(game, botColor); }),
      materialEmergencies: safeCall([], function () { return detectMaterialEmergencies(game, botColor); }),
      underdefendedUnits: safeCall([], function () { return detectUnderdefendedUnits(game, botColor); }),
      passedPawns: safeCall([], function () { return detectPassedPawnsBee3(game, botColor); }),
      opponentPassedPawns: safeCall([], function () { return detectPassedPawnsBee3(game, opponentColor); }),
      version: BEE3_VERSION
    };
  }

  function isEmergencySource(sourceLabel) {
    return sourceLabel === "MATERIAL_EMERGENCY" ||
      sourceLabel === "PAWN_ATTACKED_MINOR_EMERGENCY" ||
      sourceLabel === "UNIT_STEWARDSHIP" ||
      sourceLabel === "POST_CAPTURE_MATERIAL_RESPONSE" ||
      sourceLabel === "KING_PAWN_INTRUSION" ||
      sourceLabel === "PROMOTION_DANGER" ||
      sourceLabel === "CHECK_RESPONSE" ||
      sourceLabel === "OWN_MATE_IN_ONE" ||
      sourceLabel === "STOP_OPPONENT_MATE";
  }

  function validateFinalBee3Move(game, move, botColor, sourceLabel, cache) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    trace.source = sourceLabel || "UNKNOWN";
    if (!verboseMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      return {
        valid: false,
        reasons: trace.reasons,
        trace: trace
      };
    }

    const legalMove = getLegalMovesDeterministic(game).find(function (candidate) {
      return movesMatch(candidate, verboseMove);
    });
    if (!legalMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      return {
        valid: false,
        reasons: trace.reasons,
        trace: trace
      };
    }

    if (isCheckmateAfterMove(game, legalMove)) {
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return {
        valid: true,
        reasons: trace.reasons,
        trace: trace
      };
    }

    const safety = classifyMoveSafety(game, legalMove, botColor, cache);
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    if (!safety.legalSafe) {
      trace.rejected = true;
    }

    if (legalMove.captured && captureSequenceLosesMaterialClearly(game, legalMove, botColor)) {
      rejectMove(trace, REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE);
    }

    if ((sourceLabel !== "CHECK_RESPONSE" &&
      sourceLabel !== "OWN_MATE_IN_ONE" &&
      sourceLabel !== "STOP_OPPONENT_MATE" &&
      sourceLabel !== "ALL_MOVES_BAD") &&
      hasSafeNonKingOpeningAlternative(game, legalMove, botColor)) {
      rejectMove(trace, REJECTION_REASONS.BAD_KING_MOVE);
    }

    if (!isEmergencySource(sourceLabel) &&
      sourceLabel !== "ALL_MOVES_BAD" &&
      hasSafeNonKingPawnWeakeningAlternative(game, legalMove, botColor)) {
      rejectMove(trace, REJECTION_REASONS.KING_PAWN_WEAKENING);
    }

    if (!moveStopsOpponentMateThreat(game, legalMove, botColor).stops) {
      rejectMove(trace, REJECTION_REASONS.ALLOWS_MATE_IN_ONE);
    }

    if (!safety.materialSafe) {
      trace.rejected = true;
    }

    const advantageState = classifyAdvantageStateBee3(game, botColor);
    if (isAheadState(advantageState)) {
      const drawRisk = evaluateDrawRiskWhenWinning(game, legalMove, botColor);
      addUnique(trace.reasons, drawRisk.reasons);
      if (drawRisk.reasons.indexOf(REJECTION_REASONS.STALEMATE_RISK) !== -1 ||
        drawRisk.reasons.indexOf(REJECTION_REASONS.INSUFFICIENT_MATERIAL_DRAW_RISK) !== -1) {
        trace.rejected = true;
      }
    }

    const safeMajorMaterialGain = Boolean(legalMove.captured && getPieceValue(legalMove.captured) >= getPieceValue("q") && safety.materialSafe);
    const materialEmergency = detectMaterialEmergencies(game, botColor)[0];
    if (materialEmergency &&
      !isEmergencySource(sourceLabel) &&
      !safeMajorMaterialGain &&
      !moveHandlesMaterialEmergency(game, legalMove, botColor, materialEmergency).handles) {
      rejectMove(trace, REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY);
    }

    const severeUnit = detectUnderdefendedUnits(game, botColor).filter(function (unitInfo) {
      return unitInfo.severity >= 450 && !isFakeUnitThreat(game, unitInfo, botColor);
    })[0];
    if (severeUnit &&
      !isEmergencySource(sourceLabel) &&
      !safeMajorMaterialGain &&
      !moveHandlesUnderdefendedUnit(game, legalMove, botColor, severeUnit).handles) {
      rejectMove(trace, REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY);
    }

    const beforeDanger = evaluateKingDanger(game, botColor).score;
    if (beforeDanger >= 700 && !evaluateMoveReducesKingDanger(game, legalMove, botColor).reduces &&
      !isEmergencySource(sourceLabel)) {
      rejectMove(trace, REJECTION_REASONS.BAD_KING_MOVE);
    }

    return {
      valid: !trace.rejected,
      reasons: trace.reasons,
      trace: trace
    };
  }

  function isHardRejectTrace(trace) {
    if (!trace || !Array.isArray(trace.reasons)) {
      return false;
    }

    return trace.rejected || trace.reasons.some(function (reason) {
      return [
        REJECTION_REASONS.ILLEGAL_MOVE,
        REJECTION_REASONS.IGNORES_CHECK,
        REJECTION_REASONS.ALLOWS_MATE_IN_ONE,
        REJECTION_REASONS.HANGS_QUEEN,
        REJECTION_REASONS.HANGS_ROOK,
        REJECTION_REASONS.HANGS_MINOR_PIECE,
        REJECTION_REASONS.HANGS_QUEEN_AFTER_MOVE,
        REJECTION_REASONS.HANGS_ROOK_AFTER_MOVE,
        REJECTION_REASONS.HANGS_MINOR_AFTER_MOVE,
        REJECTION_REASONS.MOVES_QUEEN_INTO_KNIGHT_ATTACK,
        REJECTION_REASONS.BAD_RECAPTURE_WITH_QUEEN,
        REJECTION_REASONS.BAD_EXCHANGE_BALANCE,
        REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE,
        REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY,
        REJECTION_REASONS.STALEMATE_RISK,
        REJECTION_REASONS.INSUFFICIENT_MATERIAL_DRAW_RISK,
        REJECTION_REASONS.BAD_KING_MOVE
      ].indexOf(reason) !== -1;
    });
  }

  function applyBee3HardFilter(game, moves, botColor) {
    const safeMoves = [];
    const rejectedTraces = [];
    const cache = createBee3AnalysisCache(game, botColor);
    (moves || []).forEach(function (move) {
      const validation = validateFinalBee3Move(game, move, botColor, "HARD_FILTER", cache);
      if (validation.valid) {
        safeMoves.push(getVerboseMove(game, move));
      } else {
        rejectedTraces.push(validation.trace);
      }
    });

    return {
      safeMoves: safeMoves,
      rejectedTraces: rejectedTraces
    };
  }

  function scoreGeneralSafeMove(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    const validation = validateFinalBee3Move(game, verboseMove, botColor, "GENERAL_SAFE");
    trace.safety = validation.trace.safety;
    addUnique(trace.reasons, validation.reasons);
    if (!validation.valid) {
      trace.rejected = true;
      trace.score = -999999;
      return trace;
    }

    const annotated = annotateMove(game, verboseMove, botColor);
    addUnique(trace.purposeTags, annotated.purposeTags);
    addUnique(trace.reasons, annotated.reasons.filter(function (reason) {
      return reason === REJECTION_REASONS.NO_CLEAR_PURPOSE;
    }));

    if (verboseMove.captured) {
      trace.score += Math.min(500, 150 + getPieceValue(verboseMove.captured));
      markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
    }
    if (isBasicDevelopmentMove(game, verboseMove, botColor)) {
      trace.score += 200;
      markPurpose(trace, PURPOSE_TAGS.DEVELOP);
    }
    if (controlsCenterAfterMove(game, verboseMove, botColor)) {
      trace.score += 150;
      markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
    }
    const dangerReduction = evaluateMoveReducesKingDanger(game, verboseMove, botColor);
    if (dangerReduction.reduces) {
      trace.score += Math.max(200, Math.min(500, dangerReduction.delta * 2 || 300));
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    const unit = detectUnderdefendedUnits(game, botColor).filter(function (unitInfo) {
      return !isFakeUnitThreat(game, unitInfo, botColor);
    })[0];
    if (unit && moveHandlesUnderdefendedUnit(game, verboseMove, botColor, unit).handles) {
      trace.score += 200;
      markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
    }

    const pawnRisk = detectPawnStewardshipRisks(game, botColor)[0];
    if (pawnRisk) {
      const pawnScore = scorePawnStewardshipMove(game, verboseMove, botColor, pawnRisk);
      const highestEmergency = chooseHighestValueUnitEmergency(game, botColor);
      if (pawnScore.handles) {
        trace.score += Math.min(350, Math.max(150, pawnScore.score));
        markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
        addUnique(trace.reasons, pawnScore.reasons.filter(function (reason) {
          return reason === REJECTION_REASONS.HIGHER_VALUE_UNIT_PRIORITY;
        }));
      } else if (!highestEmergency || highestEmergency.piece.type === "p") {
        trace.score -= Math.min(500, pawnRisk.severity + 120);
        addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
      }
    }

    const passedPawnScore = evaluatePassedPawnEndgame(game, verboseMove, botColor);
    if (passedPawnScore.score > 0) {
      trace.score += Math.min(400, passedPawnScore.score);
      addUnique(trace.purposeTags, passedPawnScore.purposeTags);
    }

    const conversion = scoreAdvantageConversionMove(game, verboseMove, botColor);
    if (!conversion.rejected && conversion.score > 0) {
      trace.score += Math.min(500, conversion.score);
      addUnique(trace.purposeTags, conversion.purposeTags);
    }

    const endgame = scoreEndgamePlanMove(game, verboseMove, botColor);
    if (!endgame.rejected && endgame.score > 0) {
      trace.score += Math.min(500, endgame.score);
      addUnique(trace.purposeTags, endgame.purposeTags);
    }

    const openingForbidden = isOpeningMoveForbidden(game, verboseMove, botColor);
    if (openingForbidden.forbidden) {
      trace.score -= 500;
      addUnique(trace.reasons, openingForbidden.reasons);
    }
    const golden = evaluateOpeningGoldenRulesBee3(game, verboseMove, botColor);
    trace.score += Math.min(500, Math.max(-900, golden.score));
    addUnique(trace.reasons, golden.reasons);
    addUnique(trace.purposeTags, golden.purposeTags);
    const tempo = evaluateOpeningTempoDiscipline(game, verboseMove, botColor);
    trace.score += Math.max(-1200, tempo.score);
    addUnique(trace.reasons, tempo.reasons);
    addUnique(trace.purposeTags, tempo.purposeTags);
    const structureRisk = evaluateStructureDamageRisk(game, verboseMove, botColor);
    if (structureRisk.risk > 0) {
      trace.score -= Math.min(600, structureRisk.risk);
      addUnique(trace.reasons, structureRisk.reasons);
    }
    if (isPointlessEarlyRookMove(game, verboseMove, botColor).pointless) {
      trace.score -= 600;
      addUnique(trace.reasons, [REJECTION_REASONS.POINTLESS_ROOK_MOVE]);
    }
    if (isKingSidePawnWeakeningMove(game, verboseMove, botColor).weakening) {
      trace.score -= 500;
      addUnique(trace.reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
    }

    const counterplay = evaluateCounterplayRisk(game, verboseMove, botColor);
    if (counterplay.risk > 0 && counterplay.risk < 999999) {
      trace.score -= Math.min(400, counterplay.risk);
      addUnique(trace.reasons, counterplay.reasons);
    }

    if (!trace.purposeTags.length) {
      trace.score -= 300;
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
    }

    return trace;
  }

  function getPurposePriority(trace) {
    const priority = [
      PURPOSE_TAGS.CHECKMATE,
      PURPOSE_TAGS.STOP_MATE,
      PURPOSE_TAGS.CHECK_RESPONSE,
      PURPOSE_TAGS.SAFE_RECAPTURE,
      PURPOSE_TAGS.WIN_MATERIAL,
      PURPOSE_TAGS.DEFEND_MATERIAL,
      PURPOSE_TAGS.IMPROVE_KING_SAFETY,
      PURPOSE_TAGS.STOP_PROMOTION,
      PURPOSE_TAGS.DEVELOP,
      PURPOSE_TAGS.CONTROL_CENTER,
      PURPOSE_TAGS.PUSH_PASSED_PAWN,
      PURPOSE_TAGS.IMPROVE_PIECE,
      PURPOSE_TAGS.ROOK_PLAN,
      PURPOSE_TAGS.CREATE_SAFE_THREAT,
      PURPOSE_TAGS.TRADE_WHEN_AHEAD,
      PURPOSE_TAGS.ENDGAME_PLAN,
      PURPOSE_TAGS.DRAW_DEFENSE,
      PURPOSE_TAGS.SURVIVAL
    ];
    for (let index = 0; index < priority.length; index++) {
      if (trace.purposeTags && trace.purposeTags.indexOf(priority[index]) !== -1) {
        return index;
      }
    }
    return priority.length;
  }

  function tieBreakBee3Moves(a, b) {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    const bossA = a.safety && a.safety.bossSafe === true ? 1 : 0;
    const bossB = b.safety && b.safety.bossSafe === true ? 1 : 0;
    if (bossA !== bossB) {
      return bossB - bossA;
    }

    const materialA = a.safety && a.safety.materialSafe === true ? 1 : 0;
    const materialB = b.safety && b.safety.materialSafe === true ? 1 : 0;
    if (materialA !== materialB) {
      return materialB - materialA;
    }

    const legalA = a.safety && a.safety.legalSafe === true ? 1 : 0;
    const legalB = b.safety && b.safety.legalSafe === true ? 1 : 0;
    if (legalA !== legalB) {
      return legalB - legalA;
    }

    const hardA = (a.reasons || []).filter(function (reason) {
      return isHardRejectTrace({ reasons: [reason] });
    }).length;
    const hardB = (b.reasons || []).filter(function (reason) {
      return isHardRejectTrace({ reasons: [reason] });
    }).length;
    if (hardA !== hardB) {
      return hardA - hardB;
    }

    const purposeA = getPurposePriority(a);
    const purposeB = getPurposePriority(b);
    if (purposeA !== purposeB) {
      return purposeA - purposeB;
    }

    const keyA = getMoveDeterministicKey(a.move);
    const keyB = getMoveDeterministicKey(b.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseGeneralSafeMove(game, botColor, candidateMoves) {
    const moves = candidateMoves || getLegalMovesDeterministic(game);
    const filtered = applyBee3HardFilter(game, moves, botColor);
    if (!filtered.safeMoves.length) {
      return null;
    }

    const scoredMoves = filtered.safeMoves.map(function (move) {
      return scoreGeneralSafeMove(game, move, botColor);
    }).filter(function (trace) {
      return !trace.rejected;
    });
    if (!scoredMoves.length) {
      return null;
    }

    scoredMoves.sort(tieBreakBee3Moves);
    return scoredMoves[0].move;
  }

  function scoreAllMovesBadFallbackMove(game, move, botColor) {
    const trace = createMoveTrace(move);
    trace.score = 0;
    markPurpose(trace, PURPOSE_TAGS.SURVIVAL);
    addUnique(trace.reasons, [REJECTION_REASONS.ALL_MOVES_BAD_FALLBACK]);

    const legalSafety = isLegalSafe(game, move, botColor);
    trace.safety.legalSafe = legalSafety.safe;
    if (!legalSafety.safe) {
      trace.score -= 100000;
      addUnique(trace.reasons, legalSafety.reasons);
    } else {
      trace.score += 1000;
    }

    if (moveStopsOpponentMateThreat(game, move, botColor).stops) {
      trace.score += 800;
    } else {
      trace.score -= 50000;
      addUnique(trace.reasons, [REJECTION_REASONS.ALLOWS_MATE_IN_ONE]);
    }

    const materialSafety = isMaterialSafe(game, move, botColor);
    trace.safety.materialSafe = materialSafety.safe;
    if (materialSafety.safe) {
      trace.score += 300;
    } else {
      addUnique(trace.reasons, materialSafety.reasons);
      if (materialSafety.reasons.indexOf(REJECTION_REASONS.HANGS_QUEEN) !== -1 ||
        materialSafety.reasons.indexOf(REJECTION_REASONS.HANGS_QUEEN_AFTER_MOVE) !== -1) {
        trace.score -= 9000;
      } else if (materialSafety.reasons.indexOf(REJECTION_REASONS.HANGS_ROOK) !== -1 ||
        materialSafety.reasons.indexOf(REJECTION_REASONS.HANGS_ROOK_AFTER_MOVE) !== -1) {
        trace.score -= 5000;
      } else if (materialSafety.reasons.indexOf(REJECTION_REASONS.HANGS_MINOR_PIECE) !== -1 ||
        materialSafety.reasons.indexOf(REJECTION_REASONS.HANGS_MINOR_AFTER_MOVE) !== -1) {
        trace.score -= 3200;
      } else {
        trace.score -= 1000;
      }
    }

    const hanging = detectMovedHighValuePieceHangingAfterMove(game, move, botColor);
    if (hanging.hanging) {
      trace.score -= hanging.severity + 10000;
      addUnique(trace.reasons, hanging.reasons);
    }

    const danger = evaluateKingDanger(game, botColor);
    trace.score -= Math.min(2000, danger.score);
    if (isBehindState(classifyAdvantageStateBee3(game, botColor)) && evaluateDrawDefenseWhenLosing(game, move, botColor).score > 0) {
      trace.score += 400;
      markPurpose(trace, PURPOSE_TAGS.DRAW_DEFENSE);
    }

    return trace;
  }

  function chooseAllMovesBadFallback(game, botColor, rejectedTraces) {
    const legalMoves = getLegalMovesDeterministic(game);
    if (!legalMoves.length) {
      return null;
    }

    const scoredMoves = legalMoves.map(function (move) {
      return scoreAllMovesBadFallbackMove(game, move, botColor);
    });
    scoredMoves.sort(tieBreakBee3Moves);
    return scoredMoves[0].move;
  }

  function chooseValidatedMateDefenseCandidate(game, botColor, candidateMoves) {
    const threats = findOpponentMateInOneThreats(game, botColor);
    if (!threats.length) {
      return null;
    }

    const preferred = chooseMateDefenseMove(game, botColor);
    const scoredMoves = [];
    const moves = candidateMoves || getLegalMovesDeterministic(game);
    moves.forEach(function (move) {
      const stops = moveStopsOpponentMateThreat(game, move, botColor);
      if (!stops.stops) {
        return;
      }

      const validation = validateFinalBee3Move(game, move, botColor, "STOP_OPPONENT_MATE");
      if (!validation.valid) {
        return;
      }

      const trace = scoreGeneralSafeMove(game, move, botColor);
      trace.source = "STOP_OPPONENT_MATE";
      trace.score += 5000;
      markPurpose(trace, PURPOSE_TAGS.STOP_MATE);
      if (preferred && movesMatch(preferred, move)) {
        trace.score += 250;
      }
      scoredMoves.push(trace);
    });

    if (!scoredMoves.length) {
      return preferred;
    }

    scoredMoves.sort(tieBreakBee3Moves);
    return scoredMoves[0].move;
  }

  function hasReason(reasons, reason) {
    return Array.isArray(reasons) && reasons.indexOf(reason) !== -1;
  }

  function hasAnyReason(reasons, reasonList) {
    return Array.isArray(reasons) && reasonList.some(function (reason) {
      return reasons.indexOf(reason) !== -1;
    });
  }

  function buildConservativeMoveCandidates(game, botColor) {
    return getLegalMovesDeterministic(game).map(function (move) {
      return {
        move: move,
        botColor: botColor,
        key: getMoveDeterministicKey(move),
        hardSafety: null,
        rejected: false,
        reasons: [],
        purposeTags: [],
        score: 0
      };
    });
  }

  function getPawnForwardSquare(square, color, steps) {
    const coords = coordsFromSquare(square);
    if (!coords) {
      return null;
    }

    const direction = color === "w" ? 1 : -1;
    return squareFromCoords(coords.file, coords.rank + direction * (steps || 1));
  }

  function getPawnPromotionSquare(square, color) {
    const coords = coordsFromSquare(square);
    if (!coords) {
      return null;
    }

    return squareFromCoords(coords.file, color === "w" ? 7 : 0);
  }

  function scorePassedPawnDanger(pawn) {
    if (!pawn) {
      return 0;
    }

    let severity = Math.max(0, 4 - pawn.promotionDistance) * 1400;
    if (pawn.promotionDistance <= 1) {
      severity += 4500;
    } else if (pawn.promotionDistance <= 2) {
      severity += 2500;
    } else if (pawn.promotionDistance <= 3) {
      severity += 1200;
    }
    if (pawn.supported) {
      severity += 700;
    }
    if (!pawn.blocked) {
      severity += 500;
    }
    return severity;
  }

  function detectDangerousPassedPawnBee3(game, color, context) {
    const cache = context && context.analysisCache;
    return getCachedAnalysisValue(game, cache, "promotionDanger", "danger|" + color, function () {
      const pawns = detectPassedPawnsBee3(game, color).filter(function (pawn) {
        return pawn.promotionDistance <= 3 || (pawn.promotionDistance <= 4 && pawn.supported && !pawn.blocked);
      }).map(function (pawn) {
        const enriched = Object.assign({}, pawn);
        enriched.severity = scorePassedPawnDanger(pawn);
        enriched.frontSquare = getPawnForwardSquare(pawn.square, color, 1);
        enriched.promotionSquare = getPawnPromotionSquare(pawn.square, color);
        return enriched;
      }).sort(function (a, b) {
        if (a.severity !== b.severity) {
          return b.severity - a.severity;
        }
        if (a.promotionDistance !== b.promotionDistance) {
          return a.promotionDistance - b.promotionDistance;
        }
        return a.square < b.square ? -1 : a.square > b.square ? 1 : 0;
      });

      return {
        active: pawns.length > 0,
        primary: pawns[0] || null,
        pawns: pawns,
        severity: pawns[0] ? pawns[0].severity : 0
      };
    });
  }

  function evaluatePromotionDangerBee3(game, botColor, context) {
    return {
      opponent: detectDangerousPassedPawnBee3(game, oppositeColor(botColor), context),
      own: detectDangerousPassedPawnBee3(game, botColor, context)
    };
  }

  function moveStopsPromotionDangerBee3(game, move, botColor, danger, context) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !danger || !danger.active) {
      return false;
    }

    return danger.pawns.some(function (pawn) {
      if (verboseMove.to === pawn.square && verboseMove.captured === "p") {
        return true;
      }
      if (pawn.frontSquare && verboseMove.to === pawn.frontSquare) {
        return true;
      }
      if (pawn.promotionSquare && verboseMove.to === pawn.promotionSquare) {
        return true;
      }

      return withTemporaryMove(game, verboseMove, function (applied, ok) {
        if (!ok) {
          return false;
        }

        const pawnAfter = getPieceAt(game, pawn.square);
        if (!pawnAfter || pawnAfter.color !== oppositeColor(botColor) || pawnAfter.type !== "p") {
          return true;
        }

        const frontAfter = getPawnForwardSquare(pawn.square, pawnAfter.color, 1);
        if (frontAfter && getPieceAt(game, frontAfter)) {
          return true;
        }

        const promotionSquare = getPawnPromotionSquare(pawn.square, pawnAfter.color);
        return Boolean(promotionSquare && getAttackersToSquare(game, promotionSquare, botColor).length);
      });
    });
  }

  function movePushesDangerousPassedPawnBee3(game, move, botColor, danger, context) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || !danger || !danger.active || verboseMove.piece !== "p") {
      return false;
    }

    return danger.pawns.some(function (pawn) {
      const forward = getPawnForwardSquare(pawn.square, botColor, 1);
      return pawn.square === verboseMove.from && forward === verboseMove.to && isMaterialSafe(game, verboseMove, botColor, context && context.analysisCache).safe;
    });
  }

  function scorePromotionDangerResponseBee3(game, move, botColor, danger, context) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    trace.source = "PROMOTION_DANGER";
    if (!verboseMove || !danger || !danger.active) {
      return trace;
    }

    const hardSafety = classifyCandidateHardSafety(game, verboseMove, botColor, context && context.analysisCache);
    trace.safety.legalSafe = hardSafety.legalSafe;
    trace.safety.materialSafe = hardSafety.materialSafe;
    trace.safety.bossSafe = hardSafety.bossSafe;
    addUnique(trace.reasons, hardSafety.reasons);
    if (hardSafety.hardRejected) {
      trace.rejected = true;
      trace.score = -999999;
      return trace;
    }

    if (moveStopsPromotionDangerBee3(game, verboseMove, botColor, danger, context)) {
      trace.score += 9000 + Math.min(5000, danger.severity || 0);
      markPurpose(trace, PURPOSE_TAGS.STOP_PROMOTION);
      markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      addUnique(trace.reasons, [REJECTION_REASONS.STOPS_PASSED_PAWN]);
    } else {
      trace.score -= 6000;
      addUnique(trace.reasons, [REJECTION_REASONS.PROMOTION_DANGER, REJECTION_REASONS.IGNORES_PROMOTION_DANGER]);
    }

    return trace;
  }

  function choosePromotionDangerResponseBee3(game, botColor, context) {
    const localContext = context || buildBee3Context(game, botColor);
    if (!localContext.analysisCache) {
      localContext.analysisCache = createBee3AnalysisCache(game, botColor);
    }
    const danger = evaluatePromotionDangerBee3(game, botColor, localContext).opponent;
    if (!danger.active || !danger.primary || danger.primary.promotionDistance > 3) {
      return null;
    }

    const scored = (localContext.legalMoves || getLegalMovesDeterministic(game)).map(function (move) {
      return scorePromotionDangerResponseBee3(game, move, botColor, danger, localContext);
    }).filter(function (trace) {
      return !trace.rejected && trace.score > 0 && trace.purposeTags.indexOf(PURPOSE_TAGS.STOP_PROMOTION) !== -1;
    });

    if (!scored.length) {
      return null;
    }

    scored.sort(tieBreakBee3Moves);
    return scored[0].move;
  }

  function chooseSimpleKingPressureResponseBee3(game, botColor, context) {
    const localContext = context || buildBee3Context(game, botColor);
    if (!localContext.analysisCache) {
      localContext.analysisCache = createBee3AnalysisCache(game, botColor);
    }
    if (isOpeningPhase(game, botColor) || getHistoryVerboseSafe(game).length < 24) {
      return null;
    }

    const kingSquare = findKingSquare(game, botColor);
    const legalMoves = localContext.legalMoves || getLegalMovesDeterministic(game);
    const scored = [];
    legalMoves.forEach(function (move) {
      const verboseMove = getVerboseMove(game, move);
      if (!verboseMove || verboseMove.piece !== "p" || verboseMove.captured || verboseMove.promotion) {
        return;
      }

      const trace = withTemporaryMove(game, verboseMove, function (applied, ok) {
        const result = createMoveTrace(verboseMove);
        result.source = "KING_PRESSURE_RESPONSE";
        if (!ok) {
          rejectMove(result, REJECTION_REASONS.ILLEGAL_MOVE);
          return result;
        }

        const movedPiece = getPieceAt(game, applied.to);
        if (!movedPiece) {
          return result;
        }

        collectPiecesByColor(game, oppositeColor(botColor)).forEach(function (target) {
          if (["q", "r", "b", "n"].indexOf(target.piece.type) === -1) {
            return;
          }
          const nearKing = kingSquare ? distanceBetweenSquares(target.square, kingSquare) <= 4 : true;
          if (nearKing && doesPieceAttackSquare(game, applied.to, movedPiece, target.square)) {
            result.score += target.value >= getPieceValue("r") ? 1800 : 1200;
            markPurpose(result, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
            markPurpose(result, PURPOSE_TAGS.CREATE_SAFE_THREAT);
            if (target.value >= getPieceValue("n")) {
              markPurpose(result, PURPOSE_TAGS.WIN_MATERIAL);
            }
          }
        });

        const dangerReduction = evaluateMoveReducesKingDanger(game, verboseMove, botColor);
        if (dangerReduction.reduces) {
          result.score += 600;
          markPurpose(result, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
        }

        if (!result.purposeTags.length) {
          addUnique(result.reasons, [REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE]);
        }
        return result;
      });

      if (trace && !trace.rejected && trace.score >= 1000 && trace.purposeTags.indexOf(PURPOSE_TAGS.IMPROVE_KING_SAFETY) !== -1) {
        scored.push(trace);
      }
    });

    if (!scored.length) {
      return null;
    }

    scored.sort(tieBreakBee3Moves);
    return scored[0].move;
  }

  function getRecentMoveHistory(game, plies) {
    const history = getHistoryVerboseSafe(game);
    return history.slice(Math.max(0, history.length - (plies || 10)));
  }

  function getShuffleHistoryInfo(game, move, botColor) {
    const verboseMove = getVerboseMove(game, move);
    const info = {
      repeated: false,
      reversed: false,
      returnedToRecentSquare: false,
      samePieceMoveCount: 0
    };
    if (!verboseMove || ["q", "r", "b", "n"].indexOf(verboseMove.piece) === -1) {
      return info;
    }

    getRecentMoveHistory(game, 10).forEach(function (historyMove) {
      if (!historyMove || historyMove.color !== botColor || historyMove.piece !== verboseMove.piece) {
        return;
      }

      info.samePieceMoveCount += 1;
      if (historyMove.from === verboseMove.from && historyMove.to === verboseMove.to) {
        info.repeated = true;
      }
      if (historyMove.from === verboseMove.to && historyMove.to === verboseMove.from) {
        info.reversed = true;
      }
      if (historyMove.to === verboseMove.to || historyMove.from === verboseMove.to) {
        info.returnedToRecentSquare = true;
      }
    });

    return info;
  }

  function evaluateMovePurposeBee3(game, move, botColor, context) {
    const verboseMove = getVerboseMove(game, move);
    const cache = context && context.analysisCache;
    return getCachedAnalysisValue(game, cache, "movePurpose", getPositionMoveCacheKey(botColor, verboseMove || move), function () {
      const result = {
        score: 0,
        reasons: [],
        purposeTags: [],
        purposeful: false
      };
      if (!verboseMove) {
        return result;
      }

      if (isCheckmateAfterMove(game, verboseMove)) {
        result.score += 100000;
        addUnique(result.purposeTags, [PURPOSE_TAGS.CHECKMATE]);
        result.purposeful = true;
        return result;
      }

      if (verboseMove.captured) {
        result.score += Math.min(1800, 240 + getPieceValue(verboseMove.captured));
        addUnique(result.purposeTags, [PURPOSE_TAGS.WIN_MATERIAL]);
      }

      if (moveGivesCheckAfterApply(game, verboseMove, botColor)) {
        result.score += 220;
        addUnique(result.purposeTags, [PURPOSE_TAGS.CREATE_SAFE_THREAT]);
      }

      const fromAttackers = getAttackersToSquare(game, verboseMove.from, oppositeColor(botColor));
      if (fromAttackers.length && !verboseMove.captured) {
        result.score += 420;
        addUnique(result.purposeTags, [PURPOSE_TAGS.DEFEND_MATERIAL, PURPOSE_TAGS.SURVIVAL]);
      }

      const promotion = evaluatePromotionDangerBee3(game, botColor, context);
      if (promotion.opponent.active && moveStopsPromotionDangerBee3(game, verboseMove, botColor, promotion.opponent, context)) {
        result.score += 2400 + Math.min(2500, promotion.opponent.severity || 0);
        addUnique(result.purposeTags, [PURPOSE_TAGS.STOP_PROMOTION, PURPOSE_TAGS.DEFEND_MATERIAL]);
        addUnique(result.reasons, [REJECTION_REASONS.STOPS_PASSED_PAWN]);
      }
      if (promotion.own.active && movePushesDangerousPassedPawnBee3(game, verboseMove, botColor, promotion.own, context)) {
        result.score += 1600 + Math.max(0, 4 - (promotion.own.primary ? promotion.own.primary.promotionDistance : 4)) * 350;
        addUnique(result.purposeTags, [PURPOSE_TAGS.PUSH_PASSED_PAWN, PURPOSE_TAGS.ENDGAME_PLAN]);
        addUnique(result.reasons, [REJECTION_REASONS.PUSHES_DANGEROUS_PASSED_PAWN]);
      }

      const dangerReduction = evaluateMoveReducesKingDanger(game, verboseMove, botColor);
      if (dangerReduction.reduces) {
        result.score += 520;
        addUnique(result.purposeTags, [PURPOSE_TAGS.IMPROVE_KING_SAFETY]);
      }

      const endgame = scoreEndgamePlanMove(game, verboseMove, botColor);
      if (!endgame.rejected && endgame.score > 0) {
        result.score += Math.min(650, endgame.score);
        addUnique(result.purposeTags, endgame.purposeTags);
      }

      if (verboseMove.piece === "r") {
        const rook = scoreRookPlanMove(game, verboseMove, botColor);
        if (!rook.rejected && rook.score > 0 && rook.purposeTags.indexOf(PURPOSE_TAGS.ROOK_PLAN) !== -1) {
          result.score += Math.min(650, rook.score);
          addUnique(result.purposeTags, rook.purposeTags);
        }
      }

      if (controlsCenterAfterMove(game, verboseMove, botColor)) {
        result.score += 180;
        addUnique(result.purposeTags, [PURPOSE_TAGS.CONTROL_CENTER]);
      }
      if (moveDevelopsMinorTowardCenter(game, verboseMove, botColor).develops || isBasicDevelopmentMove(game, verboseMove, botColor)) {
        result.score += 260;
        addUnique(result.purposeTags, [PURPOSE_TAGS.DEVELOP, PURPOSE_TAGS.IMPROVE_PIECE]);
      }

      const appliedPurpose = withTemporaryMove(game, verboseMove, function (applied, ok) {
        if (!ok) {
          return { score: 0, tags: [] };
        }

        const movedPiece = getPieceAt(game, applied.to);
        if (!movedPiece) {
          return { score: 0, tags: [] };
        }

        const tags = [];
        let score = 0;
        collectPiecesByColor(game, oppositeColor(botColor)).forEach(function (target) {
          if (target.piece.type === "k") {
            return;
          }
          if (doesPieceAttackSquare(game, applied.to, movedPiece, target.square)) {
            score += target.value >= getPieceValue("n") ? 620 : 180;
            addUnique(tags, [target.value >= getPieceValue("n") ? PURPOSE_TAGS.CREATE_SAFE_THREAT : PURPOSE_TAGS.ATTACK_WEAKNESS]);
            if (target.value >= getPieceValue("n")) {
              addUnique(tags, [PURPOSE_TAGS.WIN_MATERIAL]);
            }
          }
        });

        collectPiecesByColor(game, botColor).forEach(function (own) {
          if (own.square === applied.to || own.piece.type === "k") {
            return;
          }
          if (doesPieceAttackSquare(game, applied.to, movedPiece, own.square) &&
            getAttackersToSquare(game, own.square, oppositeColor(botColor)).length) {
            score += Math.min(420, own.value);
            addUnique(tags, [PURPOSE_TAGS.DEFEND_MATERIAL]);
          }
        });

        return { score: score, tags: tags };
      });
      result.score += Math.min(900, appliedPurpose.score || 0);
      addUnique(result.purposeTags, appliedPurpose.tags || []);

      result.purposeful = result.purposeTags.length > 0 || result.score > 0;
      if (!result.purposeful) {
        addUnique(result.reasons, [REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE, REJECTION_REASONS.NO_CLEAR_PURPOSE]);
      }
      return result;
    });
  }

  function moveHasMiddlegameEndgamePurposeBee3(game, move, botColor, context) {
    return evaluateMovePurposeBee3(game, move, botColor, context).purposeful === true;
  }

  function isRepeatedRookShuffleBee3(game, move, botColor, context) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove || verboseMove.piece !== "r" || verboseMove.captured || moveGivesCheckAfterApply(game, verboseMove, botColor)) {
      return false;
    }

    const info = getShuffleHistoryInfo(game, verboseMove, botColor);
    return (info.repeated || info.reversed || (info.samePieceMoveCount >= 2 && info.returnedToRecentSquare)) &&
      !moveHasMiddlegameEndgamePurposeBee3(game, verboseMove, botColor, context);
  }

  function isMeaninglessPieceShuffleBee3(game, move, botColor, context) {
    const verboseMove = getVerboseMove(game, move);
    if (!verboseMove ||
      ["q", "r", "b", "n"].indexOf(verboseMove.piece) === -1 ||
      verboseMove.captured ||
      moveGivesCheckAfterApply(game, verboseMove, botColor) ||
      isCheckmateAfterMove(game, verboseMove)) {
      return false;
    }

    const info = getShuffleHistoryInfo(game, verboseMove, botColor);
    if (!(info.repeated || info.reversed || info.returnedToRecentSquare || info.samePieceMoveCount >= 3)) {
      return false;
    }

    return !moveHasMiddlegameEndgamePurposeBee3(game, verboseMove, botColor, context);
  }

  function getConservativeStyleReasons(game, move, botColor, cache) {
    const reasons = [];
    const purposeContext = cache ? { analysisCache: cache } : null;
    const openingForbidden = safeCall({ forbidden: false, reasons: [] }, function () {
      return isOpeningMoveForbidden(game, move, botColor);
    });
    if (openingForbidden.forbidden) {
      addUnique(reasons, openingForbidden.reasons);
    }

    const golden = safeCall({ score: 0, reasons: [] }, function () {
      return evaluateOpeningGoldenRulesBee3(game, move, botColor);
    });
    if (golden.score < 0) {
      addUnique(reasons, golden.reasons);
    }

    const tempo = safeCall({ score: 0, reasons: [] }, function () {
      return evaluateOpeningTempoDiscipline(game, move, botColor);
    });
    if (tempo.score < 0) {
      addUnique(reasons, tempo.reasons);
    }

    const pointlessRook = safeCall({ pointless: false, reasons: [] }, function () {
      return isPointlessEarlyRookMove(game, move, botColor);
    });
    if (pointlessRook.pointless) {
      addUnique(reasons, [REJECTION_REASONS.POINTLESS_ROOK_MOVE]);
      addUnique(reasons, pointlessRook.reasons);
    }

    const pawnWeakening = safeCall({ weakening: false, reasons: [] }, function () {
      return isKingSidePawnWeakeningMove(game, move, botColor);
    });
    if (pawnWeakening.weakening) {
      addUnique(reasons, [REJECTION_REASONS.KING_PAWN_WEAKENING]);
      addUnique(reasons, pawnWeakening.reasons);
    }

    const structure = safeCall({ risk: 0, reasons: [] }, function () {
      return evaluateStructureDamageRisk(game, move, botColor);
    });
    if (structure.risk > 0) {
      addUnique(reasons, structure.reasons);
    }

    const purpose = safeCall({ purposeful: true, reasons: [] }, function () {
      return evaluateMovePurposeBee3(game, move, botColor, purposeContext);
    });
    if (isRepeatedRookShuffleBee3(game, move, botColor, purposeContext)) {
      addUnique(reasons, [
        REJECTION_REASONS.REPEATED_ROOK_SHUFFLE,
        REJECTION_REASONS.MEANINGLESS_SHUFFLE,
        REJECTION_REASONS.PASSIVE_BACK_AND_FORTH,
        REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE
      ]);
    } else if (isMeaninglessPieceShuffleBee3(game, move, botColor, purposeContext)) {
      addUnique(reasons, [
        REJECTION_REASONS.MEANINGLESS_SHUFFLE,
        REJECTION_REASONS.PASSIVE_BACK_AND_FORTH,
        REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE
      ]);
    } else if (!isOpeningPhase(game, botColor) && !purpose.purposeful) {
      addUnique(reasons, purpose.reasons.filter(function (reason) {
        return reason === REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE;
      }));
    }

    return reasons;
  }

  function classifyCandidateHardSafety(game, move, botColor, cache) {
    const verboseMove = getVerboseMove(game, move);
    return getCachedAnalysisValue(game, cache, "hardSafety", getPositionMoveCacheKey(botColor, verboseMove || move), function () {
      return computeCandidateHardSafety(game, verboseMove || move, botColor, cache);
    });
  }

  function computeCandidateHardSafety(game, move, botColor, cache) {
    const verboseMove = getVerboseMove(game, move);
    const trace = createMoveTrace(verboseMove);
    const hardReasons = [];
    const heavyReasons = [];
    const source = "CONSERVATIVE_HARD_FILTER";

    if (!verboseMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      return {
        move: null,
        legalSafe: false,
        materialSafe: false,
        bossSafe: false,
        hardRejected: true,
        heavyPenalty: false,
        reasons: trace.reasons,
        hardReasons: trace.reasons.slice(),
        heavyReasons: [],
        trace: trace
      };
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      trace.safety.legalSafe = true;
      trace.safety.materialSafe = true;
      trace.safety.bossSafe = true;
      return {
        move: verboseMove,
        legalSafe: true,
        materialSafe: true,
        bossSafe: true,
        hardRejected: false,
        heavyPenalty: false,
        reasons: trace.reasons,
        hardReasons: [],
        heavyReasons: [],
        trace: trace
      };
    }

    const validation = validateFinalBee3Move(game, verboseMove, botColor, source, cache);
    trace.safety = validation.trace.safety;
    addUnique(trace.reasons, validation.reasons);
    if (!validation.valid || isHardRejectTrace(validation.trace)) {
      addUnique(hardReasons, validation.reasons.filter(function (reason) {
        return isHardRejectTrace({ reasons: [reason] });
      }));
    }

    const safety = safeCall({ legalSafe: false, materialSafe: false, bossSafe: false, reasons: [REJECTION_REASONS.ILLEGAL_MOVE] }, function () {
      return classifyMoveSafety(game, verboseMove, botColor, cache);
    });
    trace.safety.legalSafe = safety.legalSafe;
    trace.safety.materialSafe = safety.materialSafe;
    trace.safety.bossSafe = safety.bossSafe;
    addUnique(trace.reasons, safety.reasons);
    if (!safety.legalSafe || !safety.materialSafe) {
      addUnique(hardReasons, safety.reasons);
    }

    if (verboseMove.captured && captureSequenceLosesMaterialClearly(game, verboseMove, botColor)) {
      addUnique(hardReasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
      addUnique(trace.reasons, [REJECTION_REASONS.BAD_CAPTURE_SEE_NEGATIVE]);
    }

    const hanging = safeCall({ hanging: false, reasons: [] }, function () {
      return detectMovedHighValuePieceHangingAfterMove(game, verboseMove, botColor, cache);
    });
    if (hanging.hanging) {
      addUnique(hardReasons, hanging.reasons);
      addUnique(trace.reasons, hanging.reasons);
    }

    const postCapture = safeCall({ active: false }, function () {
      return detectLastMoveCapturedOwnPiece(game, botColor);
    });
    if (postCapture.active && postCapture.capturedValue >= getPieceValue("n")) {
      const handling = safeCall({ handles: false, reasons: [REJECTION_REASONS.IGNORES_MATERIAL_RECOVERY] }, function () {
        return moveHandlesPostCaptureMaterialLoss(game, verboseMove, botColor, postCapture);
      });
      if (!handling.handles) {
        addUnique(hardReasons, [REJECTION_REASONS.IGNORES_DIRECT_RECAPTURE, REJECTION_REASONS.IGNORES_MATERIAL_RECOVERY]);
        addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_DIRECT_RECAPTURE, REJECTION_REASONS.IGNORES_MATERIAL_RECOVERY]);
      }
    }

    addUnique(heavyReasons, getConservativeStyleReasons(game, verboseMove, botColor, cache));
    addUnique(trace.reasons, heavyReasons);

    const hardRejected = hardReasons.length > 0;
    trace.rejected = hardRejected;
    return {
      move: verboseMove,
      legalSafe: trace.safety.legalSafe === true,
      materialSafe: trace.safety.materialSafe === true,
      bossSafe: trace.safety.bossSafe === true,
      hardRejected: hardRejected,
      heavyPenalty: heavyReasons.length > 0,
      reasons: trace.reasons,
      hardReasons: hardReasons,
      heavyReasons: heavyReasons,
      trace: trace
    };
  }

  function applyConservativeHardRejects(game, candidates, botColor, cache) {
    const classified = (candidates || buildConservativeMoveCandidates(game, botColor)).map(function (candidate) {
      const hardSafety = classifyCandidateHardSafety(game, candidate.move, botColor, cache);
      candidate.hardSafety = hardSafety;
      candidate.reasons = hardSafety.reasons.slice();
      candidate.rejected = hardSafety.hardRejected;
      return candidate;
    });

    const styleReasons = [
      REJECTION_REASONS.POINTLESS_QUEEN_MOVE,
      REJECTION_REASONS.POINTLESS_ROOK_MOVE,
      REJECTION_REASONS.POINTLESS_PAWN_MOVE,
      REJECTION_REASONS.POINTLESS_KNIGHT_REPEAT,
      REJECTION_REASONS.REPEATED_MINOR_MOVE,
      REJECTION_REASONS.TEMPO_WASTE,
      REJECTION_REASONS.BISHOP_SHUFFLE,
      REJECTION_REASONS.KNIGHT_RIM_OPENING,
      REJECTION_REASONS.KING_PAWN_WEAKENING,
      REJECTION_REASONS.ALLOWS_STRUCTURE_DAMAGE,
      REJECTION_REASONS.KING_SHIELD_STRUCTURE_RISK,
      REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION,
      REJECTION_REASONS.MEANINGLESS_SHUFFLE,
      REJECTION_REASONS.REPEATED_ROOK_SHUFFLE,
      REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE,
      REJECTION_REASONS.PASSIVE_BACK_AND_FORTH
    ];
    const cleanSafeExists = classified.some(function (candidate) {
      return !candidate.rejected && !hasAnyReason(candidate.reasons, styleReasons);
    });

    const safeCandidates = [];
    const rejectedTraces = [];
    classified.forEach(function (candidate) {
      if (cleanSafeExists && !candidate.rejected && hasAnyReason(candidate.reasons, styleReasons) && !moveHasConcreteReason(game, candidate.move, botColor)) {
        candidate.rejected = true;
      }

      if (candidate.rejected) {
        rejectedTraces.push(candidate.hardSafety.trace);
      } else {
        safeCandidates.push(candidate);
      }
    });

    return {
      candidates: classified,
      safeCandidates: safeCandidates,
      rejectedTraces: rejectedTraces
    };
  }

  function detectConservativeEmergencies(game, botColor) {
    const emergencies = [];
    const legalMoves = getLegalMovesDeterministic(game);

    if (isBotInCheck(game, botColor)) {
      emergencies.push({ type: "CHECK_RESPONSE", severity: 100000, move: selectCheckResponse(game, botColor) });
    }

    const mateMove = chooseCleanMateMove(game, botColor);
    if (mateMove) {
      emergencies.push({ type: "OWN_MATE_IN_ONE", severity: 99999, move: mateMove });
    }

    const mateDefenseMove = chooseValidatedMateDefenseCandidate(game, botColor, legalMoves);
    if (mateDefenseMove) {
      emergencies.push({ type: "STOP_OPPONENT_MATE", severity: 90000, move: mateDefenseMove });
    }

    const fastCapture = findFastSafeHighValueCapture(game, botColor);
    if (fastCapture) {
      emergencies.push({ type: "FAST_HIGH_VALUE_CAPTURE", severity: 80000, move: fastCapture });
    }

    const directRecapture = chooseDirectRecapture(game, botColor);
    if (directRecapture) {
      emergencies.push({ type: "DIRECT_RECAPTURE", severity: 76000, move: directRecapture });
    }

    const postCapture = choosePostCaptureMaterialResponse(game, botColor, legalMoves);
    if (postCapture) {
      emergencies.push({ type: "POST_CAPTURE_MATERIAL_RESPONSE", severity: 74000, move: postCapture });
    }

    const materialMove = chooseMaterialEmergencyMove(game, botColor);
    if (materialMove) {
      emergencies.push({ type: "MATERIAL_EMERGENCY", severity: 70000, move: materialMove });
    }

    const pawnAttackedMinor = detectPawnAttackedMinorEmergency(game, botColor);
    if (pawnAttackedMinor) {
      emergencies.push({
        type: "PAWN_ATTACKED_MINOR_EMERGENCY",
        severity: 68000,
        move: choosePawnAttackedMinorEmergencyMove(game, botColor, legalMoves),
        details: pawnAttackedMinor
      });
    }

    const intrusion = detectKingPawnIntrusion(game, botColor);
    if (intrusion.active) {
      emergencies.push({ type: "KING_PAWN_INTRUSION", severity: intrusion.severity || 65000, move: chooseKingPawnIntrusionResponse(game, botColor, legalMoves), details: intrusion });
    }

    const promotionContext = buildBee3Context(game, botColor);
    promotionContext.legalMoves = legalMoves;
    promotionContext.analysisCache = createBee3AnalysisCache(game, botColor);
    const promotionDanger = evaluatePromotionDangerBee3(game, botColor, promotionContext).opponent;
    if (promotionDanger.active) {
      emergencies.push({
        type: "PROMOTION_DANGER",
        severity: 64000 + Math.min(5000, promotionDanger.severity || 0),
        move: choosePromotionDangerResponseBee3(game, botColor, promotionContext),
        details: promotionDanger
      });
    }

    const unitMove = chooseUnitStewardshipMove(game, botColor);
    if (unitMove) {
      emergencies.push({ type: "UNIT_STEWARDSHIP", severity: 60000, move: unitMove });
    }

    const pawnRisk = detectPawnStewardshipRisks(game, botColor)[0];
    if (pawnRisk && (!chooseHighestValueUnitEmergency(game, botColor) || pawnRisk.importance >= 450)) {
      const pawnMoves = legalMoves.map(function (move) {
        return scorePawnStewardshipMove(game, move, botColor, pawnRisk);
      }).filter(function (trace) {
        return !trace.rejected && trace.score > 0 && trace.handles !== false;
      });
      if (pawnMoves.length) {
        pawnMoves.sort(tieBreakBee3Moves);
        emergencies.push({ type: "PAWN_STEWARDSHIP", severity: 42000 + pawnRisk.importance, move: pawnMoves[0].move, details: pawnRisk });
      }
    }

    emergencies.sort(function (a, b) {
      if (a.severity !== b.severity) {
        return b.severity - a.severity;
      }
      return a.type < b.type ? -1 : a.type > b.type ? 1 : 0;
    });
    return emergencies;
  }

  function scoreConservativeMove(game, move, botColor, context) {
    const verboseMove = getVerboseMove(game, move);
    const cache = context && context.analysisCache;
    return getCachedAnalysisValue(game, cache, "conservativeScore", getPositionMoveCacheKey(botColor, verboseMove || move), function () {
      return computeConservativeMoveScore(game, verboseMove || move, botColor, context);
    });
  }

  function computeConservativeMoveScore(game, move, botColor, context) {
    const verboseMove = getVerboseMove(game, move);
    const cache = context && context.analysisCache;
    const trace = createMoveTrace(verboseMove);
    trace.source = "CONSERVATIVE_SAFE";
    if (!verboseMove) {
      rejectMove(trace, REJECTION_REASONS.ILLEGAL_MOVE);
      trace.score = -999999;
      return trace;
    }

    const hardSafety = classifyCandidateHardSafety(game, verboseMove, botColor, cache);
    trace.safety.legalSafe = hardSafety.legalSafe;
    trace.safety.materialSafe = hardSafety.materialSafe;
    trace.safety.bossSafe = hardSafety.bossSafe;
    addUnique(trace.reasons, hardSafety.reasons);
    if (hardSafety.hardRejected) {
      trace.rejected = true;
      trace.score = -999999;
      return trace;
    }

    if (isCheckmateAfterMove(game, verboseMove)) {
      trace.score += 100000;
      markPurpose(trace, PURPOSE_TAGS.CHECKMATE);
      return trace;
    }

    if (verboseMove.captured) {
      const capturedValue = getPieceValue(verboseMove.captured);
      const movingValue = getPieceValue(verboseMove.piece);
      const exchange = classifyStaticExchange(game, verboseMove, botColor, cache);
      if (exchange.outcome === "WINNING_EXCHANGE") {
        trace.score += capturedValue >= getPieceValue("q") ? 9000 :
          capturedValue >= getPieceValue("r") ? 5000 :
            capturedValue >= getPieceValue("n") ? 2200 : 350;
        trace.score += Math.min(900, Math.max(120, exchange.score));
        markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
      } else if (exchange.outcome === "EQUAL_EXCHANGE") {
        trace.score += capturedValue >= getPieceValue("n") ? 520 : 260;
        if (isCenterTensionMove(verboseMove)) {
          trace.score += 340;
          markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
        }
        if (capturedValue >= movingValue - 20) {
          trace.score += 180;
        }
      } else {
        trace.score -= 1800;
        addUnique(trace.reasons, exchange.staticExchange.reasons);
      }
      if (exchange.acceptable && capturedValue >= getPieceValue("n")) {
        markPurpose(trace, PURPOSE_TAGS.WIN_MATERIAL);
      }
    }

    const postCapture = detectLastMoveCapturedOwnPiece(game, botColor);
    if (postCapture.active && postCapture.capturedValue >= getPieceValue("n")) {
      const handling = moveHandlesPostCaptureMaterialLoss(game, verboseMove, botColor, postCapture);
      if (handling.handles) {
        trace.score += 6500 + postCapture.capturedValue;
        addUnique(trace.purposeTags, handling.purposeTags);
      } else {
        trace.score -= 5000;
        addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_RECOVERY]);
      }
    }

    const materialEmergency = (context && context.materialEmergencies && context.materialEmergencies[0]) || detectMaterialEmergencies(game, botColor)[0];
    if (materialEmergency) {
      const handling = moveHandlesMaterialEmergency(game, verboseMove, botColor, materialEmergency);
      if (handling.handles) {
        trace.score += 5000 + (materialEmergency.severity || 0);
        markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      } else {
        trace.score -= 5000;
        addUnique(trace.reasons, [REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
      }
    }

    const pawnAttackedMinor = detectPawnAttackedMinorEmergency(game, botColor);
    if (pawnAttackedMinor) {
      const handling = moveHandlesPawnAttackedMinorEmergency(game, verboseMove, botColor, pawnAttackedMinor);
      if (handling.handles) {
        trace.score += 4200 + (pawnAttackedMinor.severity || 0);
        markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
        addUnique(trace.reasons, [REJECTION_REASONS.PAWN_ATTACKED_MINOR_EMERGENCY]);
      } else {
        trace.score -= 5200;
        addUnique(trace.reasons, [REJECTION_REASONS.PAWN_ATTACKED_MINOR_EMERGENCY, REJECTION_REASONS.IGNORES_MATERIAL_EMERGENCY]);
      }
    }

    const intrusion = detectKingPawnIntrusion(game, botColor);
    if (intrusion.active) {
      const intrusionScore = scoreKingPawnIntrusionResponse(game, verboseMove, botColor, intrusion);
      if (!intrusionScore.rejected && intrusionScore.score > 0) {
        trace.score += Math.min(2200, intrusionScore.score);
        addUnique(trace.purposeTags, intrusionScore.purposeTags);
        addUnique(trace.reasons, intrusionScore.reasons);
      } else {
        trace.score -= 1200;
        addUnique(trace.reasons, [REJECTION_REASONS.KING_PAWN_INTRUSION]);
      }
    }

    const promotionDanger = evaluatePromotionDangerBee3(game, botColor, context);
    if (promotionDanger.opponent.active) {
      const promotionScore = scorePromotionDangerResponseBee3(game, verboseMove, botColor, promotionDanger.opponent, context);
      if (!promotionScore.rejected && promotionScore.score > 0) {
        trace.score += Math.min(4200, promotionScore.score);
        addUnique(trace.purposeTags, promotionScore.purposeTags);
        addUnique(trace.reasons, promotionScore.reasons);
      } else if (promotionDanger.opponent.primary && promotionDanger.opponent.primary.promotionDistance <= 3) {
        trace.score -= Math.min(3600, 1200 + (promotionDanger.opponent.severity || 0));
        addUnique(trace.reasons, [REJECTION_REASONS.PROMOTION_DANGER, REJECTION_REASONS.IGNORES_PROMOTION_DANGER]);
      }
    }
    if (promotionDanger.own.active && movePushesDangerousPassedPawnBee3(game, verboseMove, botColor, promotionDanger.own, context)) {
      trace.score += 1700;
      markPurpose(trace, PURPOSE_TAGS.PUSH_PASSED_PAWN);
      markPurpose(trace, PURPOSE_TAGS.ENDGAME_PLAN);
      addUnique(trace.reasons, [REJECTION_REASONS.PUSHES_DANGEROUS_PASSED_PAWN]);
    }

    const severeUnit = ((context && context.underdefendedUnits) || detectUnderdefendedUnits(game, botColor)).filter(function (unitInfo) {
      return unitInfo.severity >= 300 && !isFakeUnitThreat(game, unitInfo, botColor);
    })[0];
    if (severeUnit) {
      const unitHandling = moveHandlesUnderdefendedUnit(game, verboseMove, botColor, severeUnit);
      if (unitHandling.handles) {
        trace.score += 1600 + severeUnit.severity;
        markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      } else {
        trace.score -= Math.min(1800, severeUnit.severity + 500);
      }
    }

    const pawnRisk = detectPawnStewardshipRisks(game, botColor)[0];
    if (pawnRisk) {
      const pawnScore = scorePawnStewardshipMove(game, verboseMove, botColor, pawnRisk);
      const higherEmergency = chooseHighestValueUnitEmergency(game, botColor);
      if (pawnScore.handles) {
        trace.score += Math.min(600, pawnScore.score + 150);
        markPurpose(trace, PURPOSE_TAGS.DEFEND_MATERIAL);
      } else if (!higherEmergency || higherEmergency.piece.type === "p") {
        trace.score -= Math.min(700, pawnRisk.severity + 150);
      } else {
        addUnique(trace.reasons, [REJECTION_REASONS.HIGHER_VALUE_UNIT_PRIORITY]);
      }
    }

    if (isCastlingMove(verboseMove)) {
      trace.score += 850;
      markPurpose(trace, PURPOSE_TAGS.CASTLE);
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }
    if (isOpeningPly(game) && verboseMove.piece === "p") {
      if (verboseMove.to === (botColor === "w" ? "e4" : "e5")) {
        trace.score += 820;
        markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
      } else if (verboseMove.to === (botColor === "w" ? "d4" : "d5")) {
        trace.score += 760;
        markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
      }
    }
    if (moveDevelopsMinorTowardCenter(game, verboseMove, botColor).develops) {
      trace.score += 650;
      markPurpose(trace, PURPOSE_TAGS.DEVELOP);
      markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
    } else if (isBasicDevelopmentMove(game, verboseMove, botColor)) {
      trace.score += 350;
      markPurpose(trace, PURPOSE_TAGS.DEVELOP);
    }
    if (controlsCenterAfterMove(game, verboseMove, botColor)) {
      trace.score += 220;
      markPurpose(trace, PURPOSE_TAGS.CONTROL_CENTER);
    }

    const advantageState = (context && context.advantageState) || classifyAdvantageStateBee3(game, botColor);
    if (isAheadState(advantageState)) {
      const simplification = evaluateSimplificationMove(game, verboseMove, botColor, advantageState);
      if (simplification.score > 0) {
        trace.score += Math.min(900, simplification.score);
        addUnique(trace.purposeTags, simplification.purposeTags);
      }
    } else if (isBehindState(advantageState)) {
      const behind = evaluateTradeWhenBehindBee3(game, verboseMove, botColor, advantageState);
      trace.score += Math.max(-700, Math.min(500, behind.score));
      addUnique(trace.purposeTags, behind.purposeTags);
    }

    const dangerReduction = evaluateMoveReducesKingDanger(game, verboseMove, botColor);
    if (dangerReduction.reduces) {
      trace.score += 600;
      markPurpose(trace, PURPOSE_TAGS.IMPROVE_KING_SAFETY);
    }

    if (context && context.isEndgame) {
      const endgame = scoreEndgamePlanMove(game, verboseMove, botColor);
      if (!endgame.rejected && endgame.score > 0) {
        trace.score += Math.min(500, endgame.score);
        addUnique(trace.purposeTags, endgame.purposeTags);
      }
    }

    const purpose = evaluateMovePurposeBee3(game, verboseMove, botColor, context);
    trace.score += Math.max(-1400, Math.min(1400, purpose.score));
    addUnique(trace.purposeTags, purpose.purposeTags);
    addUnique(trace.reasons, purpose.reasons);
    if (isRepeatedRookShuffleBee3(game, verboseMove, botColor, context)) {
      trace.score -= 2600;
      addUnique(trace.reasons, [
        REJECTION_REASONS.REPEATED_ROOK_SHUFFLE,
        REJECTION_REASONS.MEANINGLESS_SHUFFLE,
        REJECTION_REASONS.PASSIVE_BACK_AND_FORTH,
        REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE
      ]);
    } else if (isMeaninglessPieceShuffleBee3(game, verboseMove, botColor, context)) {
      trace.score -= 2000;
      addUnique(trace.reasons, [
        REJECTION_REASONS.MEANINGLESS_SHUFFLE,
        REJECTION_REASONS.PASSIVE_BACK_AND_FORTH,
        REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE
      ]);
    }

    const heavyPenaltyReasons = [
      REJECTION_REASONS.NO_CLEAR_PURPOSE,
      REJECTION_REASONS.POINTLESS_QUEEN_MOVE,
      REJECTION_REASONS.POINTLESS_ROOK_MOVE,
      REJECTION_REASONS.POINTLESS_PAWN_MOVE,
      REJECTION_REASONS.REPEATED_MINOR_MOVE,
      REJECTION_REASONS.TEMPO_WASTE,
      REJECTION_REASONS.KNIGHT_RIM_OPENING,
      REJECTION_REASONS.KING_PAWN_WEAKENING,
      REJECTION_REASONS.ALLOWS_STRUCTURE_DAMAGE,
      REJECTION_REASONS.KING_SHIELD_STRUCTURE_RISK,
      REJECTION_REASONS.OPENING_REPERTOIRE_VIOLATION,
      REJECTION_REASONS.MEANINGLESS_SHUFFLE,
      REJECTION_REASONS.REPEATED_ROOK_SHUFFLE,
      REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE,
      REJECTION_REASONS.PASSIVE_BACK_AND_FORTH,
      REJECTION_REASONS.IGNORES_PROMOTION_DANGER
    ];
    heavyPenaltyReasons.forEach(function (reason) {
      if (hasReason(trace.reasons, reason)) {
        trace.score -= reason === REJECTION_REASONS.NO_CLEAR_PURPOSE ? 350 : 650;
      }
    });

    if (!trace.purposeTags.length) {
      trace.score -= 500;
      addUnique(trace.reasons, [REJECTION_REASONS.NO_CLEAR_PURPOSE]);
    }

    return trace;
  }

  function getConservativeRiskScore(trace) {
    if (!trace || !Array.isArray(trace.reasons)) {
      return 0;
    }
    return trace.reasons.reduce(function (total, reason) {
      if (isHardRejectTrace({ reasons: [reason] })) {
        return total + 10000;
      }
      if (reason === REJECTION_REASONS.KING_PAWN_WEAKENING || reason === REJECTION_REASONS.ALLOWS_STRUCTURE_DAMAGE) {
        return total + 500;
      }
      if (reason === REJECTION_REASONS.REPEATED_MINOR_MOVE || reason === REJECTION_REASONS.TEMPO_WASTE || reason === REJECTION_REASONS.BISHOP_SHUFFLE) {
        return total + 400;
      }
      if (reason === REJECTION_REASONS.REPEATED_ROOK_SHUFFLE || reason === REJECTION_REASONS.MEANINGLESS_SHUFFLE || reason === REJECTION_REASONS.PASSIVE_BACK_AND_FORTH) {
        return total + 600;
      }
      if (reason === REJECTION_REASONS.IGNORES_PROMOTION_DANGER) {
        return total + 900;
      }
      if (reason === REJECTION_REASONS.NO_MIDDLEGAME_PURPOSE) {
        return total + 260;
      }
      if (reason === REJECTION_REASONS.NO_CLEAR_PURPOSE) {
        return total + 200;
      }
      return total + 50;
    }, 0);
  }

  function tieBreakConservativeMoves(a, b) {
    const traceA = a.trace || a;
    const traceB = b.trace || b;
    if (traceA.score !== traceB.score) {
      return traceB.score - traceA.score;
    }

    const riskA = getConservativeRiskScore(traceA);
    const riskB = getConservativeRiskScore(traceB);
    if (riskA !== riskB) {
      return riskA - riskB;
    }

    const materialA = traceA.safety && traceA.safety.materialSafe === true ? 1 : 0;
    const materialB = traceB.safety && traceB.safety.materialSafe === true ? 1 : 0;
    if (materialA !== materialB) {
      return materialB - materialA;
    }

    const bossA = traceA.safety && traceA.safety.bossSafe === true ? 1 : 0;
    const bossB = traceB.safety && traceB.safety.bossSafe === true ? 1 : 0;
    if (bossA !== bossB) {
      return bossB - bossA;
    }

    const purposeA = getPurposePriority(traceA);
    const purposeB = getPurposePriority(traceB);
    if (purposeA !== purposeB) {
      return purposeA - purposeB;
    }

    const keyA = getMoveDeterministicKey(traceA.move);
    const keyB = getMoveDeterministicKey(traceB.move);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  function chooseConservativeFallbackMove(game, botColor, context) {
    const candidates = buildConservativeMoveCandidates(game, botColor);
    if (!candidates.length) {
      return null;
    }

    const localContext = context || buildBee3Context(game, botColor);
    if (!localContext.analysisCache) {
      localContext.analysisCache = createBee3AnalysisCache(game, botColor);
    }
    const filtered = applyConservativeHardRejects(game, candidates, botColor, localContext.analysisCache);
    const safeCandidates = filtered.safeCandidates.length ? filtered.safeCandidates : [];
    const scored = [];
    const startedAt = localContext && localContext.startedAt;
    const maxThinkMs = localContext && localContext.maxThinkMs || BEE3_SOFT_THINK_LIMIT_MS;
    for (let index = 0; index < safeCandidates.length; index++) {
      const trace = scoreConservativeMove(game, safeCandidates[index].move, botColor, localContext);
      if (trace && !trace.rejected) {
        scored.push({ trace: trace });
      }
      if (!isOpeningPly(game) && startedAt && scored.length && Date.now() - startedAt > maxThinkMs) {
        break;
      }
    }

    if (scored.length) {
      scored.sort(tieBreakConservativeMoves);
      return scored[0].trace.move;
    }

    return chooseAllMovesBadFallback(game, botColor, filtered.rejectedTraces);
  }

  function selectBee3MoveWithTrace(game, botColor) {
    const startedAt = Date.now();
    const fastLegalMoves = getLegalMovesDeterministic(game);
    if (!fastLegalMoves.length) {
      return {
        move: null,
        source: "NO_LEGAL_MOVES",
        trace: null,
        context: {
          botColor: botColor,
          opponentColor: oppositeColor(botColor),
          turn: game && typeof game.turn === "function" ? game.turn() : null,
          ply: game && typeof game.history === "function" ? game.history().length : 0,
          legalMoves: [],
          version: BEE3_VERSION
        },
        elapsedMs: Date.now() - startedAt
      };
    }
    const analysisCache = createBee3AnalysisCache(game, botColor);

    function fastFallbackResult(source, context) {
      const fallbackMove = chooseFastLegalFallbackMove(game, botColor);
      const elapsedMs = Date.now() - startedAt;
      const trace = createMoveTrace(fallbackMove);
      trace.source = source;
      trace.elapsedMs = elapsedMs;
      markPurpose(trace, PURPOSE_TAGS.SURVIVAL);
      addUnique(trace.reasons, [REJECTION_REASONS.ALL_MOVES_BAD_FALLBACK]);
      if (elapsedMs > 1500 && typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Bee 3 slow move:", elapsedMs, source, fallbackMove && (fallbackMove.san || fallbackMove.from + fallbackMove.to));
      }

      return {
        move: fallbackMove,
        source: source,
        trace: trace,
        context: context || {
          botColor: botColor,
          opponentColor: oppositeColor(botColor),
          turn: game && typeof game.turn === "function" ? game.turn() : null,
          ply: game && typeof game.history === "function" ? game.history().length : 0,
          legalMoves: fastLegalMoves,
          version: BEE3_VERSION
        },
        elapsedMs: elapsedMs
      };
    }

    function earlySelected(source, move) {
      if (!move) {
        return null;
      }

      const validation = validateFinalBee3Move(game, move, botColor, source, analysisCache);
      if (!validation.valid) {
        return null;
      }

      validation.trace.source = source;
      const elapsedMs = Date.now() - startedAt;
      validation.trace.elapsedMs = elapsedMs;
      if (elapsedMs > 1500 && typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Bee 3 slow move:", elapsedMs, source, validation.trace.move && (validation.trace.move.san || validation.trace.move.from + validation.trace.move.to));
      }

      return {
        move: getVerboseMove(game, move),
        source: source,
        trace: validation.trace,
        context: {
          botColor: botColor,
          opponentColor: oppositeColor(botColor),
          turn: game && typeof game.turn === "function" ? game.turn() : null,
          ply: game && typeof game.history === "function" ? game.history().length : 0,
          legalMoves: fastLegalMoves,
          isInCheck: isBotInCheck(game, botColor),
          version: BEE3_VERSION
        },
        elapsedMs: elapsedMs
      };
    }

    const earlyCheckResponse = isBotInCheck(game, botColor) ? earlySelected("CHECK_RESPONSE", selectCheckResponse(game, botColor)) : null;
    if (earlyCheckResponse) {
      return earlyCheckResponse;
    }

    const earlyMate = earlySelected("OWN_MATE_IN_ONE", chooseCleanMateMove(game, botColor));
    if (earlyMate) {
      return earlyMate;
    }

    const earlyMateDefense = earlySelected("STOP_OPPONENT_MATE", chooseValidatedMateDefenseCandidate(game, botColor, fastLegalMoves));
    if (earlyMateDefense) {
      return earlyMateDefense;
    }

    const earlyFastCapture = earlySelected("FAST_HIGH_VALUE_CAPTURE", findFastSafeHighValueCapture(game, botColor));
    if (earlyFastCapture) {
      return earlyFastCapture;
    }

    if (!isBotInCheck(game, botColor) &&
      detectKingPawnIntrusion(game, botColor).active &&
      !chooseCleanMateMove(game, botColor) &&
      !chooseValidatedMateDefenseCandidate(game, botColor, fastLegalMoves)) {
      const intrusionMove = chooseKingPawnIntrusionResponse(game, botColor, fastLegalMoves);
      if (intrusionMove) {
        const validation = validateFinalBee3Move(game, intrusionMove, botColor, "KING_PAWN_INTRUSION");
        if (validation.valid) {
          validation.trace.source = "KING_PAWN_INTRUSION";
          const elapsedMs = Date.now() - startedAt;
          validation.trace.elapsedMs = elapsedMs;
          if (elapsedMs > 1500 && typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn("Bee 3 slow move:", elapsedMs, "KING_PAWN_INTRUSION", validation.trace.move && (validation.trace.move.san || validation.trace.move.from + validation.trace.move.to));
          }
          return {
            move: getVerboseMove(game, intrusionMove),
            source: "KING_PAWN_INTRUSION",
            trace: validation.trace,
            context: {
              botColor: botColor,
              opponentColor: oppositeColor(botColor),
              turn: game && typeof game.turn === "function" ? game.turn() : null,
              ply: game && typeof game.history === "function" ? game.history().length : 0,
              legalMoves: fastLegalMoves,
              isInCheck: false,
              version: BEE3_VERSION
            },
            elapsedMs: elapsedMs
          };
        }
      }
    }

    const context = buildBee3Context(game, botColor);
    context.analysisCache = analysisCache;
    context.startedAt = startedAt;
    context.maxThinkMs = BEE3_SOFT_THINK_LIMIT_MS;
    const rejectedTraces = [];
    if (!context.legalMoves.length) {
      return {
        move: null,
        source: "NO_LEGAL_MOVES",
        trace: null,
        context: context
      };
    }

    function selected(source, move) {
      if (!move) {
        return null;
      }
      const validation = validateFinalBee3Move(game, move, botColor, source, context.analysisCache);
      if (validation.valid) {
        validation.trace.source = source;
        const elapsedMs = Date.now() - startedAt;
        validation.trace.elapsedMs = elapsedMs;
        if (elapsedMs > 1500 && typeof console !== "undefined" && typeof console.warn === "function") {
          console.warn("Bee 3 slow move:", elapsedMs, source, validation.trace.move && (validation.trace.move.san || validation.trace.move.from + validation.trace.move.to));
        }
        return {
          move: getVerboseMove(game, move),
          source: source,
          trace: validation.trace,
          context: context,
          elapsedMs: elapsedMs
        };
      }
      validation.trace.source = source;
      rejectedTraces.push(validation.trace);
      if (source === "ALL_MOVES_BAD" && validation.trace.safety && validation.trace.safety.legalSafe === true) {
        markPurpose(validation.trace, PURPOSE_TAGS.SURVIVAL);
        addUnique(validation.trace.reasons, [REJECTION_REASONS.ALL_MOVES_BAD_FALLBACK]);
        const elapsedMs = Date.now() - startedAt;
        validation.trace.elapsedMs = elapsedMs;
        return {
          move: getVerboseMove(game, move),
          source: source,
          trace: validation.trace,
          context: context,
          elapsedMs: elapsedMs
        };
      }
      return null;
    }

    const emergencyByType = {};

    const pipeline = [
      ["CHECK_RESPONSE", function () { return context.isInCheck ? selectCheckResponse(game, botColor) : null; }],
      ["OWN_MATE_IN_ONE", function () { return chooseCleanMateMove(game, botColor); }],
      ["STOP_OPPONENT_MATE", function () { return chooseValidatedMateDefenseCandidate(game, botColor, context.legalMoves); }],
      ["FAST_HIGH_VALUE_CAPTURE", function () { return findFastSafeHighValueCapture(game, botColor); }],
      ["DIRECT_RECAPTURE", function () { return emergencyByType.DIRECT_RECAPTURE || chooseDirectRecapture(game, botColor); }],
      ["POST_CAPTURE_MATERIAL_RESPONSE", function () { return emergencyByType.POST_CAPTURE_MATERIAL_RESPONSE || choosePostCaptureMaterialResponse(game, botColor, context.legalMoves); }],
      ["MATERIAL_EMERGENCY", function () { return emergencyByType.MATERIAL_EMERGENCY || chooseMaterialEmergencyMove(game, botColor); }],
      ["PAWN_ATTACKED_MINOR_EMERGENCY", function () { return emergencyByType.PAWN_ATTACKED_MINOR_EMERGENCY || choosePawnAttackedMinorEmergencyMove(game, botColor, context.legalMoves); }],
      ["KING_PAWN_INTRUSION", function () { return emergencyByType.KING_PAWN_INTRUSION || chooseKingPawnIntrusionResponse(game, botColor, context.legalMoves); }],
      ["PROMOTION_DANGER", function () { return emergencyByType.PROMOTION_DANGER || choosePromotionDangerResponseBee3(game, botColor, context); }],
      ["KING_PRESSURE_RESPONSE", function () { return chooseSimpleKingPressureResponseBee3(game, botColor, context); }],
      ["UNIT_STEWARDSHIP", function () { return emergencyByType.UNIT_STEWARDSHIP || chooseUnitStewardshipMove(game, botColor); }],
      ["PAWN_STEWARDSHIP", function () { return emergencyByType.PAWN_STEWARDSHIP || null; }],
      ["OPENING_DISCIPLINE", function () {
        const initialPosition = typeof game.fen === "function" &&
          game.fen().indexOf("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR") === 0;
        return context.isEndgame || (!context.ply && !initialPosition) ? null : chooseOpeningDisciplineMove(game, botColor, context.legalMoves, context.analysisCache);
      }],
      ["CONSERVATIVE_SAFE", function () { return chooseConservativeFallbackMove(game, botColor, context); }],
      ["ALL_MOVES_BAD", function () { return chooseAllMovesBadFallback(game, botColor, rejectedTraces); }]
    ];

    for (let index = 0; index < pipeline.length; index++) {
      const source = pipeline[index][0];
      const lowPriority = ["CONSERVATIVE_SAFE"].indexOf(source) !== -1;
      if (lowPriority && Date.now() - startedAt > BEE3_SOFT_THINK_LIMIT_MS) {
        return fastFallbackResult("TIME_BUDGET_FALLBACK", context);
      }
      const move = safeCall(null, pipeline[index][1]);
      const result = selected(source, move);
      if (result) {
        return result;
      }
    }

    return fastFallbackResult("NO_VALID_MOVE_FALLBACK", context);
  }

  function safeChooseBee3Move(game, botColor) {
    try {
      const result = selectBee3MoveWithTrace(game, botColor);
      if (result && result.move && isLegalMoveObject(game, result.move)) {
        return result.move;
      }

      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Bee 3 pipeline returned no valid move, using fast fallback.");
      }
      return chooseFastLegalFallbackMove(game, botColor);
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.error === "function") {
        console.error("Bee 3 crashed, using fast fallback:", error);
      }
      return chooseFastLegalFallbackMove(game, botColor);
    }
  }

  function chooseBee3Move(game, botColor) {
    return safeChooseBee3Move(game, botColor);
  }

  root.Bee3Bot = {
    BEE3_VERSION: BEE3_VERSION,
    REJECTION_REASONS: REJECTION_REASONS,
    PURPOSE_TAGS: PURPOSE_TAGS,
    buildBee3Context: buildBee3Context,
    createBee3AnalysisCache: createBee3AnalysisCache,
    createMoveTrace: createMoveTrace,
    withTemporaryMove: withTemporaryMove,
    withTemporaryMoves: withTemporaryMoves,
    assertBee3DoesNotMutateHistory: assertBee3DoesNotMutateHistory,
    addUniqueReason: addUniqueReason,
    addUniquePurposeTag: addUniquePurposeTag,
    annotateMove: annotateMove,
    rejectMove: rejectMove,
    markPurpose: markPurpose,
    createSafetyTraceForMove: createSafetyTraceForMove,
    getLegalMovesDeterministic: getLegalMovesDeterministic,
    isLegalSafe: isLegalSafe,
    isMaterialSafe: isMaterialSafe,
    isBossSafe: isBossSafe,
    classifyMoveSafety: classifyMoveSafety,
    isBotInCheck: isBotInCheck,
    getCheckingPieces: getCheckingPieces,
    classifyCheckResponse: classifyCheckResponse,
    evaluateCheckResponseMaterialSafety: evaluateCheckResponseMaterialSafety,
    scoreCheckResponse: scoreCheckResponse,
    selectCheckResponse: selectCheckResponse,
    isCheckmateAfterMove: isCheckmateAfterMove,
    findAllMateInOneMoves: findAllMateInOneMoves,
    scoreMateInOneMove: scoreMateInOneMove,
    chooseCleanMateMove: chooseCleanMateMove,
    findOpponentMateInOneThreats: findOpponentMateInOneThreats,
    moveStopsOpponentMateThreat: moveStopsOpponentMateThreat,
    chooseMateDefenseMove: chooseMateDefenseMove,
    getLastVerboseMove: getLastVerboseMove,
    detectLastMoveCapturedOwnPiece: detectLastMoveCapturedOwnPiece,
    findDirectRecaptures: findDirectRecaptures,
    isSafeRecapture: isSafeRecapture,
    scoreDirectRecapture: scoreDirectRecapture,
    chooseDirectRecapture: chooseDirectRecapture,
    moveHandlesPostCaptureMaterialLoss: moveHandlesPostCaptureMaterialLoss,
    scorePostCaptureMaterialResponse: scorePostCaptureMaterialResponse,
    choosePostCaptureMaterialResponse: choosePostCaptureMaterialResponse,
    isHighValueCapture: isHighValueCapture,
    findFastSafeHighValueCapture: findFastSafeHighValueCapture,
    scoreFastHighValueCapture: scoreFastHighValueCapture,
    isSafeHighValueCapture: isSafeHighValueCapture,
    findSafeHighValueCaptures: findSafeHighValueCaptures,
    scoreSafeHighValueCapture: scoreSafeHighValueCapture,
    chooseSafeHighValueCapture: chooseSafeHighValueCapture,
    compareCaptureCandidates: compareCaptureCandidates,
    getSquareAttackers: getSquareAttackers,
    getSquareDefenders: getSquareDefenders,
    getLineAttackersToSquare: getLineAttackersToSquare,
    getKnightAttackersToSquare: getKnightAttackersToSquare,
    getPawnAttackersToSquare: getPawnAttackersToSquare,
    evaluateRecaptureSafety: evaluateRecaptureSafety,
    buildBoardVisionMap: buildBoardVisionMap,
    getAttackersToSquare: getAttackersToSquare,
    getCheapestAttackerToSquare: getCheapestAttackerToSquare,
    isKingAValidDefenderOfSquare: isKingAValidDefenderOfSquare,
    isDefenderPinnedOrOverloaded: isDefenderPinnedOrOverloaded,
    evaluateDefenderQuality: evaluateDefenderQuality,
    countEffectiveDefenders: countEffectiveDefenders,
    evaluateAttackDefenseBalance: evaluateAttackDefenseBalance,
    evaluateStaticExchangeSequence: evaluateStaticExchangeSequence,
    classifyStaticExchange: classifyStaticExchange,
    isExchangeAcceptable: isExchangeAcceptable,
    evaluateCaptureSequenceMedium: evaluateCaptureSequenceMedium,
    captureSequenceLosesMaterialClearly: captureSequenceLosesMaterialClearly,
    detectMaterialEmergencies: detectMaterialEmergencies,
    moveHandlesMaterialEmergency: moveHandlesMaterialEmergency,
    scoreMaterialEmergencyMove: scoreMaterialEmergencyMove,
    chooseMaterialEmergencyMove: chooseMaterialEmergencyMove,
    detectPawnAttackedMinorEmergency: detectPawnAttackedMinorEmergency,
    moveHandlesPawnAttackedMinorEmergency: moveHandlesPawnAttackedMinorEmergency,
    scorePawnAttackedMinorEmergencyMove: scorePawnAttackedMinorEmergencyMove,
    choosePawnAttackedMinorEmergencyMove: choosePawnAttackedMinorEmergencyMove,
    isImportantPawn: isImportantPawn,
    evaluatePawnImportanceBee3: evaluatePawnImportanceBee3,
    detectPawnStewardshipRisks: detectPawnStewardshipRisks,
    moveHandlesPawnStewardshipRisk: moveHandlesPawnStewardshipRisk,
    scorePawnStewardshipMove: scorePawnStewardshipMove,
    chooseHighestValueUnitEmergency: chooseHighestValueUnitEmergency,
    evaluateUnitRisk: evaluateUnitRisk,
    detectUnderdefendedUnits: detectUnderdefendedUnits,
    isFakeUnitThreat: isFakeUnitThreat,
    moveHandlesUnderdefendedUnit: moveHandlesUnderdefendedUnit,
    scoreUnitStewardshipMove: scoreUnitStewardshipMove,
    chooseUnitStewardshipMove: chooseUnitStewardshipMove,
    detectKingPawnIntrusion: detectKingPawnIntrusion,
    moveHandlesKingPawnIntrusion: moveHandlesKingPawnIntrusion,
    scoreKingPawnIntrusionResponse: scoreKingPawnIntrusionResponse,
    chooseKingPawnIntrusionResponse: chooseKingPawnIntrusionResponse,
    isOpeningPhase: isOpeningPhase,
    getOpeningDevelopmentState: getOpeningDevelopmentState,
    isOpeningFlankPawnMoveWithoutPurpose: isOpeningFlankPawnMoveWithoutPurpose,
    isKnightRimOpeningMove: isKnightRimOpeningMove,
    moveDevelopsMinorTowardCenter: moveDevelopsMinorTowardCenter,
    isRepeatedMinorMoveInOpening: isRepeatedMinorMoveInOpening,
    isPieceShuffleMove: isPieceShuffleMove,
    moveHasConcreteReason: moveHasConcreteReason,
    evaluateOpeningTempoDiscipline: evaluateOpeningTempoDiscipline,
    evaluateOpeningGoldenRulesBee3: evaluateOpeningGoldenRulesBee3,
    detectStructureDamageAfterMove: detectStructureDamageAfterMove,
    moveAllowsStructureDamage: moveAllowsStructureDamage,
    evaluateStructureDamageRisk: evaluateStructureDamageRisk,
    isOpeningMoveForbidden: isOpeningMoveForbidden,
    evaluateOpeningPrinciplesBee3: evaluateOpeningPrinciplesBee3,
    chooseStrictBee3OpeningMove: chooseStrictBee3OpeningMove,
    scoreOpeningMove: scoreOpeningMove,
    chooseOpeningDisciplineMove: chooseOpeningDisciplineMove,
    getKingZone: getKingZone,
    evaluateKingDanger: evaluateKingDanger,
    isKingSidePawnWeakeningMove: isKingSidePawnWeakeningMove,
    evaluateMoveReducesKingDanger: evaluateMoveReducesKingDanger,
    scoreKingDangerDefenseMove: scoreKingDangerDefenseMove,
    chooseKingDangerDefenseMove: chooseKingDangerDefenseMove,
    isFileOpenForRook: isFileOpenForRook,
    isFileSemiOpenForRook: isFileSemiOpenForRook,
    evaluateOpenFileRook: evaluateOpenFileRook,
    evaluateSemiOpenFileRook: evaluateSemiOpenFileRook,
    evaluateRookOnSeventhRank: evaluateRookOnSeventhRank,
    evaluateRookBehindPassedPawn: evaluateRookBehindPassedPawn,
    evaluateRookCutoff: evaluateRookCutoff,
    isPointlessEarlyRookMove: isPointlessEarlyRookMove,
    scoreRookPlanMove: scoreRookPlanMove,
    chooseRookPlanMove: chooseRookPlanMove,
    getAttackedHighValueTargetsAfterMove: getAttackedHighValueTargetsAfterMove,
    detectForkMove: detectForkMove,
    detectPinMove: detectPinMove,
    detectSkewerMove: detectSkewerMove,
    detectDiscoveredAttackMove: detectDiscoveredAttackMove,
    detectRemoveDefenderMove: detectRemoveDefenderMove,
    detectOverloadedDefenderMove: detectOverloadedDefenderMove,
    isTacticalMoveSafe: isTacticalMoveSafe,
    getTacticalPunisherScore: getTacticalPunisherScore,
    chooseTacticalPunisherMove: chooseTacticalPunisherMove,
    getMaterialForColor: getMaterialForColor,
    getMaterialBalanceBee3: getMaterialBalanceBee3,
    classifyAdvantageStateBee3: classifyAdvantageStateBee3,
    isTradeMove: isTradeMove,
    evaluateTradeWhenAheadBee3: evaluateTradeWhenAheadBee3,
    evaluateTradeWhenBehindBee3: evaluateTradeWhenBehindBee3,
    evaluateCounterplayRisk: evaluateCounterplayRisk,
    evaluateSimplificationMove: evaluateSimplificationMove,
    scoreAdvantageConversionMove: scoreAdvantageConversionMove,
    chooseAdvantageConversionMoveBee3: chooseAdvantageConversionMoveBee3,
    detectEndgameBee3: detectEndgameBee3,
    detectInsufficientMaterialBee3: detectInsufficientMaterialBee3,
    detectPassedPawnsBee3: detectPassedPawnsBee3,
    evaluateKingActivityEndgame: evaluateKingActivityEndgame,
    evaluatePassedPawnEndgame: evaluatePassedPawnEndgame,
    evaluateStopOpponentPassedPawn: evaluateStopOpponentPassedPawn,
    evaluatePromotionDangerBee3: evaluatePromotionDangerBee3,
    detectDangerousPassedPawnBee3: detectDangerousPassedPawnBee3,
    moveStopsPromotionDangerBee3: moveStopsPromotionDangerBee3,
    scorePromotionDangerResponseBee3: scorePromotionDangerResponseBee3,
    choosePromotionDangerResponseBee3: choosePromotionDangerResponseBee3,
    chooseSimpleKingPressureResponseBee3: chooseSimpleKingPressureResponseBee3,
    detectStalemateRiskAfterMove: detectStalemateRiskAfterMove,
    evaluateDrawRiskWhenWinning: evaluateDrawRiskWhenWinning,
    evaluateDrawDefenseWhenLosing: evaluateDrawDefenseWhenLosing,
    scoreEndgamePlanMove: scoreEndgamePlanMove,
    chooseEndgamePlanMoveBee3: chooseEndgamePlanMoveBee3,
    buildConservativeMoveCandidates: buildConservativeMoveCandidates,
    classifyCandidateHardSafety: classifyCandidateHardSafety,
    applyConservativeHardRejects: applyConservativeHardRejects,
    detectConservativeEmergencies: detectConservativeEmergencies,
    scoreConservativeMove: scoreConservativeMove,
    isMeaninglessPieceShuffleBee3: isMeaninglessPieceShuffleBee3,
    isRepeatedRookShuffleBee3: isRepeatedRookShuffleBee3,
    moveHasMiddlegameEndgamePurposeBee3: moveHasMiddlegameEndgamePurposeBee3,
    evaluateMovePurposeBee3: evaluateMovePurposeBee3,
    tieBreakConservativeMoves: tieBreakConservativeMoves,
    chooseConservativeFallbackMove: chooseConservativeFallbackMove,
    validateFinalBee3Move: validateFinalBee3Move,
    applyBee3HardFilter: applyBee3HardFilter,
    isLegalMoveObject: isLegalMoveObject,
    chooseFastLegalFallbackMove: chooseFastLegalFallbackMove,
    detectMovedHighValuePieceHangingAfterMove: detectMovedHighValuePieceHangingAfterMove,
    moveLeavesMovedPieceEnPrise: moveLeavesMovedPieceEnPrise,
    scoreGeneralSafeMove: scoreGeneralSafeMove,
    tieBreakBee3Moves: tieBreakBee3Moves,
    chooseGeneralSafeMove: chooseGeneralSafeMove,
    chooseAllMovesBadFallback: chooseAllMovesBadFallback,
    selectBee3MoveWithTrace: selectBee3MoveWithTrace,
    safeChooseBee3Move: safeChooseBee3Move,
    chooseBee3Move: chooseBee3Move
  };
})(typeof self !== "undefined" ? self : window);
