(function () {
  "use strict";

  const DEBUG_BEE1_BOT = false;

  const BEE1_BASE_DEPTH = 3;
  const BEE1_WEAK_ENDGAME_DEPTH = 2;
  const BEE1_OPENING_DEPTH = 2;
  const BEE1_MAX_QUIESCENCE_DEPTH = 2;
  const BEE1_NODE_LIMIT = 25000;
  const BEE1_TIME_LIMIT_MS = 50;
  const BEE1_QUIESCENCE_MOVE_CAP = 6;
  const BEE1_CHECKMATE_SCORE = 1000000;
  const BEE1_INFINITY = 10000000;
  const BEE1_PUNISH_THRESHOLD = 180;
  const BEE1_STRONG_PUNISH_THRESHOLD = 500;
  const BEE1_CRUSHING_PUNISH_THRESHOLD = 900;

  const BEE1_PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
  };

  const BEE1_CENTER = ["d4", "e4", "d5", "e5"];
  const BEE1_EXTENDED_CENTER = ["c3", "d3", "e3", "f3", "c4", "f4", "c5", "f5", "c6", "d6", "e6", "f6"];
  const BEE1_KNIGHT_ADVENTURE_SQUARES = {
    w: ["c6", "d5", "e5", "f6"],
    b: ["c3", "d4", "e4", "f3"]
  };

  const BEE1_WEAKNESS_TYPES = {
    KING_WEAKNESS: "KING_WEAKNESS",
    UNDEFENDED_PIECE: "UNDEFENDED_PIECE",
    LOW_VALUE_ATTACKS_HIGH_VALUE: "LOW_VALUE_ATTACKS_HIGH_VALUE",
    ATTACKERS_MORE_THAN_DEFENDERS: "ATTACKERS_MORE_THAN_DEFENDERS",
    ATTACKERS_EQUAL_DEFENDERS: "ATTACKERS_EQUAL_DEFENDERS",
    HANGING_MAJOR_PIECE: "HANGING_MAJOR_PIECE",
    HANGING_MINOR_PIECE: "HANGING_MINOR_PIECE",
    POTENTIAL_WEAKNESS: "POTENTIAL_WEAKNESS"
  };

  const BEE1_OPENING_BOOK = {
    "": ["e4", "d4", "Nf3"],
    e4: ["e5", "c5", "e6"],
    "e4 Nc6": ["d4"],
    "e4 Nc6 d4": ["d5", "e5"],
    "e4 Nc6 d4 Nf6 e5": ["Nd5", "Ng8", "d6"],
    "e4 e5": ["Nf3"],
    "e4 e5 Nf3": ["Nc6"],
    "e4 e5 Nf3 Nc6": ["Bc4", "Bb5"],
    "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "Nf6"],
    "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O": ["Nf6", "d6", "O-O", "a6"],
    "e4 e5 Nf3 Nc6 Bc4 Nf6": ["c3", "d3", "O-O"],
    "e4 e5 Nf3 Nc6 Bc4 Nf6 c3": ["Bc5", "d6", "Be7"],
    "e4 e5 Nf3 Nc6 Bc4 Bc5": ["c3", "d3", "O-O"],
    "e4 e5 Nf3 Nc6 Bc4 Bc5 c3": ["d6", "Nf6", "O-O"],
    "e4 e5 Nf3 Nc6 Bc4 Nf6 c3 Bc5 O-O": ["O-O", "d6"],
    "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6"],
    "e4 e5 Nf3 Nc6 Bb5 Nf6": ["O-O", "d3", "c3"],
    "e4 e5 Nf3 Nc6 Bb5 Nf6 c3": ["a6", "Be7", "d6"],
    "e4 e5 Nf3 Nc6 Bb5 a6": ["Ba4"],
    "e4 e5 Nf3 Nc6 Bb5 a6 Ba4": ["Nf6", "Be7"],
    d4: ["d5", "Nf6"],
    "d4 d5": ["c4", "Nf3"],
    "d4 Nf6": ["c4", "Nf3"],
    h3: ["e5", "d5", "Nf6"],
    a3: ["e5", "d5", "Nf6"],
    f3: ["d5", "e5", "Nf6"],
    a4: ["e5", "d5", "Nf6"]
  };

  let nodeCounter = 0;
  let nodeLimitReached = false;
  let searchStartTime = 0;
  let killerMoves = {};

  function getContext() {
    if (!window.Bee1BotContext) {
      throw new Error("Bee 1 bot context is not ready.");
    }

    return window.Bee1BotContext;
  }

  function debugLog(label, payload) {
    if (DEBUG_BEE1_BOT) {
      console.log("[Bee1]", label, payload || "");
    }
  }

  function oppositeColor(color) {
    return color === "w" ? "b" : "w";
  }

  function boardArraySquare(row, col) {
    return "abcdefgh"[col] + (8 - row);
  }

  function coordsFromSquare(square) {
    return {
      file: "abcdefgh".indexOf(square[0]),
      rank: Number(square[1])
    };
  }

  function squareFromCoords(file, rank) {
    return "abcdefgh"[file] + rank;
  }

  function isInsideBoard(file, rank) {
    return file >= 0 && file < 8 && rank >= 1 && rank <= 8;
  }

  function pieceValue(type) {
    return BEE1_PIECE_VALUES[type] || 0;
  }

  function getPieces(chessGame, color) {
    const rows = chessGame.board();
    const pieces = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (piece && (!color || piece.color === color)) {
          pieces.push({
            square: boardArraySquare(rowIndex, colIndex),
            piece: piece
          });
        }
      });
    });

    return pieces;
  }

  function getKingSquare(chessGame, color) {
    const king = getPieces(chessGame, color).find(function (item) {
      return item.piece.type === "k";
    });

    return king ? king.square : null;
  }

  function getMaterial(chessGame, color) {
    return getPieces(chessGame, color).reduce(function (total, item) {
      return total + pieceValue(item.piece.type);
    }, 0);
  }

  function getMaterialBalance(chessGame, color) {
    return getMaterial(chessGame, color) - getMaterial(chessGame, oppositeColor(color));
  }

  function isPathClear(chessGame, fromCoords, toCoords, fileStep, rankStep) {
    let file = fromCoords.file + fileStep;
    let rank = fromCoords.rank + rankStep;

    while (file !== toCoords.file || rank !== toCoords.rank) {
      if (chessGame.get(squareFromCoords(file, rank))) {
        return false;
      }

      file += fileStep;
      rank += rankStep;
    }

    return true;
  }

  function doesPieceAttackSquare(chessGame, from, targetSquare) {
    const piece = chessGame.get(from);

    if (!piece || from === targetSquare) {
      return false;
    }

    const fromCoords = coordsFromSquare(from);
    const targetCoords = coordsFromSquare(targetSquare);
    const fileDelta = targetCoords.file - fromCoords.file;
    const rankDelta = targetCoords.rank - fromCoords.rank;
    const absFile = Math.abs(fileDelta);
    const absRank = Math.abs(rankDelta);

    if (piece.type === "p") {
      const direction = piece.color === "w" ? 1 : -1;
      return absFile === 1 && rankDelta === direction;
    }

    if (piece.type === "n") {
      return absFile * absRank === 2;
    }

    if (piece.type === "k") {
      return absFile <= 1 && absRank <= 1;
    }

    if (piece.type === "b") {
      return absFile === absRank && isPathClear(chessGame, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "r") {
      return (fileDelta === 0 || rankDelta === 0) && isPathClear(chessGame, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "q") {
      const straight = fileDelta === 0 || rankDelta === 0;
      const diagonal = absFile === absRank;
      return (straight || diagonal) && isPathClear(chessGame, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    return false;
  }

  function getAttackersOfSquare(chessGame, square, byColor) {
    return getPieces(chessGame, byColor).filter(function (item) {
      return doesPieceAttackSquare(chessGame, item.square, square);
    });
  }

  function isSquareAttacked(chessGame, square, byColor) {
    return getAttackersOfSquare(chessGame, square, byColor).length > 0;
  }

  function isPieceDefended(chessGame, square, color) {
    return isSquareAttacked(chessGame, square, color);
  }

  function hasCastled(chessGame, color) {
    const kingSquare = getKingSquare(chessGame, color);
    return color === "w" ? kingSquare === "g1" || kingSquare === "c1" : kingSquare === "g8" || kingSquare === "c8";
  }

  function detectBee1Phase() {
    const game = getContext().game;
    const historyLength = game.history().length;
    const totalMaterial = getMaterial(game, "w") + getMaterial(game, "b");
    const queens = getPieces(game).filter(function (item) {
      return item.piece.type === "q";
    }).length;

    if (historyLength < 12 && totalMaterial > 6000) {
      return "opening";
    }

    if (totalMaterial <= 3900 || historyLength >= 54 && queens < 2) {
      return "endgame";
    }

    return "middlegame";
  }

  function getPhase(chessGame) {
    const historyLength = chessGame.history().length;
    const totalMaterial = getMaterial(chessGame, "w") + getMaterial(chessGame, "b");
    const queens = getPieces(chessGame).filter(function (item) {
      return item.piece.type === "q";
    }).length;

    if (historyLength < 12 && totalMaterial > 6000) {
      return "opening";
    }

    if (totalMaterial <= 3900 || historyLength >= 54 && queens < 2) {
      return "endgame";
    }

    return "middlegame";
  }

  function detectGamePhase(chessGame) {
    return getPhase(chessGame);
  }

  function isCheckMove(move) {
    return typeof move.san === "string" && move.san.indexOf("+") !== -1;
  }

  function isMateMove(move) {
    return typeof move.san === "string" && move.san.indexOf("#") !== -1;
  }

  function isPromotionMove(move) {
    return Boolean(move.promotion);
  }

  function isCaptureMove(move) {
    return Boolean(move.captured);
  }

  function getMoveKey(move) {
    return move.from + "-" + move.to + "-" + (move.promotion || "");
  }

  function isQuietMove(move) {
    return !isCaptureMove(move) && !isCheckMove(move) && !isPromotionMove(move);
  }

  function isSearchLimited() {
    return nodeCounter >= BEE1_NODE_LIMIT || searchStartTime && Date.now() - searchStartTime >= BEE1_TIME_LIMIT_MS;
  }

  function resetSearchBudget() {
    nodeCounter = 0;
    nodeLimitReached = false;
    searchStartTime = Date.now();
    killerMoves = {};
  }

  function isForcingMove(move) {
    return isMateMove(move) || isCheckMove(move) || isCaptureMove(move) || isPromotionMove(move);
  }

  function isCastlingMove(move) {
    return typeof move.flags === "string" && (move.flags.indexOf("k") !== -1 || move.flags.indexOf("q") !== -1);
  }

  function isDevelopingMove(move, color) {
    const homeRank = color === "w" ? "1" : "8";
    return (move.piece === "n" || move.piece === "b") && move.from[1] === homeRank;
  }

  function getHistoryKey(chessGame) {
    return chessGame.history().join(" ");
  }

  function isUnsafeOpeningAdventure(move, color) {
    return move.piece === "n" && BEE1_KNIGHT_ADVENTURE_SQUARES[color].includes(move.to);
  }

  function isEarlyCenterPawnGrab(move, color) {
    if (move.piece !== "n" || move.captured !== "p") {
      return false;
    }

    const riskySquares = color === "w" ? ["d5", "e5"] : ["d4", "e4"];
    return riskySquares.includes(move.to);
  }

  function isKingSidePawnPush(move, color) {
    if (move.piece !== "p") {
      return false;
    }

    if (!["f", "g", "h"].includes(move.from[0])) {
      return false;
    }

    return color === "w" ? Number(move.to[1]) > Number(move.from[1]) : Number(move.to[1]) < Number(move.from[1]);
  }

  function isOpeningPawnStormMove(move, color) {
    if (move.piece !== "p") {
      return false;
    }

    const stormSquares = color === "w" ? ["g4", "g5", "h4", "h5"] : ["g5", "g4", "h5", "h4"];
    return stormSquares.includes(move.to);
  }

  function isEarlyGame(chessGame) {
    return chessGame.history().length < 24 && getMaterial(chessGame, "w") + getMaterial(chessGame, "b") > 6000;
  }

  function isRepeatedPieceMove(chessGame, move, color) {
    if (move.piece === "p" || move.piece === "k" || isCastlingMove(move)) {
      return false;
    }

    return chessGame.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === color && pastMove.to === move.from;
    });
  }

  function hasMovedPieceTo(chessGame, color, square, pieceType) {
    return chessGame.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === color && pastMove.to === square && (!pieceType || pastMove.piece === pieceType);
    });
  }

  function hasCenterPawnResponse(chessGame, color) {
    return chessGame.history({ verbose: true }).some(function (pastMove) {
      if (pastMove.color !== color || pastMove.piece !== "p") {
        return false;
      }

      return ["e5", "d5", "c5", "e6", "d6", "c6"].includes(pastMove.to);
    });
  }

  function opponentHasAdvancedCenter(chessGame, color) {
    const enemy = oppositeColor(color);

    return getPieces(chessGame, enemy).some(function (item) {
      return item.piece.type === "p" && ["e4", "d4", "e5", "d5"].includes(item.square);
    });
  }

  function isEarlyKnightOccupation(move, color) {
    if (move.piece !== "n") {
      return false;
    }

    const riskySquares = color === "b" ? ["e4", "g4", "d4", "a5"] : ["e5", "g5", "d5", "a4"];
    return riskySquares.includes(move.to);
  }

  function getOpeningCenterStabilityPenalty(chessGame, move, botColor) {
    if (getPhase(chessGame) !== "opening" && !isEarlyGame(chessGame)) {
      return 0;
    }

    let penalty = 0;
    const centerResponse = hasCenterPawnResponse(chessGame, botColor);
    const enemyCenter = opponentHasAdvancedCenter(chessGame, botColor);

    if (enemyCenter && move.piece === "n" && !centerResponse && !move.captured) {
      penalty += 520;
    }

    if (enemyCenter && move.piece === "p" && ["e5", "d5", "c5", "e6", "d6"].includes(move.to)) {
      penalty -= 360;
    }

    if (botColor === "b" && hasMovedPieceTo(chessGame, botColor, "c6", "n") && hasMovedPieceTo(chessGame, botColor, "f6", "n") && !centerResponse && move.piece !== "p") {
      penalty += 720;
    }

    if (isEarlyKnightOccupation(move, botColor)) {
      penalty += isKickableByPawnAfterMove(chessGame, move, botColor) ? 1250 : 760;
    }

    return penalty;
  }

  function getOpeningMovePenalty(chessGame, move, botColor) {
    const phase = getPhase(chessGame);

    if (phase !== "opening" && !isEarlyGame(chessGame)) {
      return 0;
    }

    let penalty = 0;
    const uncastled = !hasCastled(chessGame, botColor);

    if (uncastled && isEarlyCenterPawnGrab(move, botColor)) {
      penalty += 900;
    }

    if (uncastled && isUnsafeOpeningAdventure(move, botColor)) {
      penalty += move.captured ? 780 : 520;
    }

    if (move.piece === "q" && uncastled) {
      penalty += 260;
    }

    if (move.piece === "r" && uncastled) {
      penalty += 220;
    }

    if (!move.captured && move.piece !== "p" && !isCastlingMove(move) && !isDevelopingMove(move, botColor)) {
      const repeated = chessGame.history({ verbose: true }).some(function (pastMove) {
        return pastMove.color === botColor && pastMove.to === move.from;
      });

      if (repeated) {
        penalty += 260;
      }
    }

    if (move.captured === "p" && uncastled && !isCheckMove(move) && !isMateMove(move)) {
      penalty += 180;
    }

    if (uncastled && isKingSidePawnPush(move, botColor)) {
      penalty += move.from[0] === "g" ? 600 : move.from[0] === "h" ? 520 : 430;
    }

    if (isOpeningPawnStormMove(move, botColor) && !isMateMove(move) && !isCheckMove(move)) {
      penalty += 720;
    }

    penalty += Math.max(0, getOpeningCenterStabilityPenalty(chessGame, move, botColor));

    return penalty;
  }

  function getOpeningAdventurePenalty(chessGame, move, botColor) {
    if (getPhase(chessGame) !== "opening" && !isEarlyGame(chessGame)) {
      return 0;
    }

    let penalty = 0;
    const repeated = chessGame.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === botColor && pastMove.to === move.from;
    });

    if (move.piece === "n" && BEE1_KNIGHT_ADVENTURE_SQUARES[botColor].includes(move.to)) {
      penalty += move.captured ? 900 : 620;
    }

    if (repeated && !isMateMove(move) && !isCheckMove(move)) {
      penalty += 320;
    }

    if (move.piece === "n" && move.captured && pieceValue(move.captured) <= 100 && repeated) {
      penalty += 520;
    }

    return penalty;
  }

  function getOpeningMoveBonus(chessGame, move, botColor) {
    const phase = getPhase(chessGame);

    if (phase !== "opening" && !isEarlyGame(chessGame)) {
      return 0;
    }

    let bonus = 0;

    if (isDevelopingMove(move, botColor)) {
      bonus += 150;
    }

    if (isCastlingMove(move)) {
      bonus += 420;
    }

    if (["d6", "d5", "c5", "e6", "e5", "Bc5", "Be7", "Nf6", "Nc6", "O-O"].includes(move.san)) {
      bonus += 120;
    }

    bonus += Math.max(0, -getOpeningCenterStabilityPenalty(chessGame, move, botColor));

    if (BEE1_CENTER.includes(move.to)) {
      bonus += 55;
    }

    return bonus;
  }

  function getSafePrincipleScore(chessGame, move, botColor) {
    const phase = getPhase(chessGame);
    let score = 0;

    if (phase === "opening" || isEarlyGame(chessGame)) {
      if (isDevelopingMove(move, botColor)) {
        score += 170;
      }

      if (isCastlingMove(move)) {
        score += 360;
      }

      if (["d6", "d5", "e6", "e5", "c6", "c5", "Nf6", "Nc6", "Bc5", "Be7", "O-O"].includes(move.san)) {
        score += 100;
      }

      score += Math.max(0, -getOpeningCenterStabilityPenalty(chessGame, move, botColor)) * 0.7;
    }

    if (move.captured && isSafeCapture(chessGame, move, botColor)) {
      score += pieceValue(move.captured) * 0.65;
    }

    if (!move.captured && !isCheckMove(move)) {
      chessGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      const movedPiece = chessGame.get(move.to);

      if (movedPiece && movedPiece.type !== "k" && isSquareAttacked(chessGame, move.to, oppositeColor(botColor)) && !isPieceDefended(chessGame, move.to, botColor)) {
        score -= pieceValue(movedPiece.type) * 0.7;
      }

      chessGame.undo();
    }

    return score;
  }

  function isBookMoveSafe(chessGame, move, botColor) {
    if (!move.captured && !isUnsafeOpeningAdventure(move, botColor) && (isCastlingMove(move) || isDevelopingMove(move, botColor) || ["d6", "d5", "e6", "e5", "c6", "c5"].includes(move.to))) {
      return true;
    }

    const before = evaluatePosition(chessGame, botColor);
    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const after = evaluatePosition(chessGame, botColor);
    const danger = getHangingPenaltyForColor(chessGame, botColor);
    chessGame.undo();

    return after - before > -220 && danger < 520 && !isUnsafeOpeningAdventure(move, botColor);
  }

  function chooseMaterialRecoveryMove(chessGame, moves, botColor) {
    const recoveryUrgency = getMaterialRecoveryUrgency(chessGame, botColor);
    const phase = getPhase(chessGame);
    const captureMoves = moves.filter(function (move) {
      if (!move.captured || !isSafeCapture(chessGame, move, botColor) || getUnsoundCheckPenalty(chessGame, move, botColor)) {
        return false;
      }

      if (phase === "opening" && isEarlyCenterPawnGrab(move, botColor) && recoveryUrgency < 250) {
        return false;
      }

      return true;
    }).map(function (move) {
      return {
        move: move,
        score: pieceValue(move.captured) + getStaticExchangeScore(chessGame, move, botColor) + getHangingEnemyPieceBonus(chessGame, move, botColor)
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (!captureMoves.length) {
      return null;
    }

    if (captureMoves[0].score >= 300 || recoveryUrgency >= 180 && captureMoves[0].score >= 180) {
      return captureMoves[0].move;
    }

    return null;
  }

  function chooseOpeningBookMove(chessGame, moves, botColor) {
    const key = getHistoryKey(chessGame);
    const preferredSan = BEE1_OPENING_BOOK[key];

    if (!preferredSan) {
      return null;
    }

    for (let index = 0; index < preferredSan.length; index++) {
      const san = preferredSan[index];
      const move = moves.find(function (candidate) {
        return candidate.san === san;
      });

      if (move && isBookMoveSafe(chessGame, move, botColor)) {
        return move;
      }
    }

    return null;
  }

  function getHangingPenaltyForColor(chessGame, color) {
    const enemy = oppositeColor(color);
    let penalty = 0;

    getPieces(chessGame, color).forEach(function (item) {
      if (item.piece.type === "k") {
        return;
      }

      const attacked = isSquareAttacked(chessGame, item.square, enemy);
      const defended = isPieceDefended(chessGame, item.square, color);

      if (attacked && !defended) {
        const value = pieceValue(item.piece.type);
        penalty += value >= 500 ? value * 0.95 : value * 0.65;
      } else if (attacked && item.piece.type === "q") {
        penalty += 180;
      }
    });

    return penalty;
  }

  function getHangingPressureAgainst(chessGame, color) {
    const enemy = oppositeColor(color);
    let score = 0;

    getPieces(chessGame, color).forEach(function (item) {
      if (item.piece.type === "k") {
        return;
      }

      const attacked = isSquareAttacked(chessGame, item.square, enemy);
      const defended = isPieceDefended(chessGame, item.square, color);

      if (attacked && !defended) {
        score += pieceValue(item.piece.type) * 0.55;
      } else if (attacked) {
        score += pieceValue(item.piece.type) * 0.18;
      }
    });

    return score;
  }

  function addWeakness(weaknesses, square, piece, weaknessType, priority, attackers, defenders, severity) {
    const attackerValues = attackers.map(function (item) {
      return pieceValue(item.piece.type);
    });

    weaknesses.push({
      square: square,
      piece: piece,
      weaknessType: weaknessType,
      priority: priority,
      attackers: attackers,
      defenders: defenders,
      attackerCount: attackers.length,
      defenderCount: defenders.length,
      weakestAttackerValue: attackerValues.length ? Math.min.apply(null, attackerValues) : 0,
      pieceValue: pieceValue(piece.type),
      severity: severity
    });
  }

  function createWeaknessMap(chessGame, color) {
    const enemy = oppositeColor(color);
    const weaknesses = [];
    const kingSquare = getKingSquare(chessGame, color);

    if (kingSquare) {
      const kingAttackers = getAttackersOfSquare(chessGame, kingSquare, enemy);
      let kingSeverity = kingAttackers.length * 260;
      const kingCoords = coordsFromSquare(kingSquare);

      [-1, 0, 1].forEach(function (fileOffset) {
        [-1, 0, 1].forEach(function (rankOffset) {
          if (fileOffset === 0 && rankOffset === 0) {
            return;
          }

          const file = kingCoords.file + fileOffset;
          const rank = kingCoords.rank + rankOffset;

          if (isInsideBoard(file, rank) && isSquareAttacked(chessGame, squareFromCoords(file, rank), enemy)) {
            kingSeverity += 34;
          }
        });
      });

      if (kingSeverity > 0) {
        addWeakness(weaknesses, kingSquare, { color: color, type: "k" }, BEE1_WEAKNESS_TYPES.KING_WEAKNESS, 1, kingAttackers, getAttackersOfSquare(chessGame, kingSquare, color), kingSeverity);
      }
    }

    getPieces(chessGame, color).forEach(function (item) {
      if (item.piece.type === "k") {
        return;
      }

      const attackers = getAttackersOfSquare(chessGame, item.square, enemy);
      const defenders = getAttackersOfSquare(chessGame, item.square, color).filter(function (defender) {
        return defender.square !== item.square;
      });
      const value = pieceValue(item.piece.type);
      const weakestAttackerValue = attackers.length ? Math.min.apply(null, attackers.map(function (attacker) {
        return pieceValue(attacker.piece.type);
      })) : 0;

      if (!defenders.length) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.UNDEFENDED_PIECE, value >= 500 ? 2 : 4, attackers, defenders, attackers.length ? value * 0.95 + 120 : value * 0.18);
      }

      if (attackers.length && !defenders.length && value >= 500) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE, 2, attackers, defenders, value * 1.25 + 240);
      }

      if (attackers.length && !defenders.length && value >= 300 && value < 500) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE, 3, attackers, defenders, value * 1.05 + 160);
      }

      if (attackers.length && weakestAttackerValue > 0 && weakestAttackerValue < value) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.LOW_VALUE_ATTACKS_HIGH_VALUE, value >= 500 ? 2 : 3, attackers, defenders, value - weakestAttackerValue + 120);
      }

      if (attackers.length > defenders.length) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.ATTACKERS_MORE_THAN_DEFENDERS, value >= 500 ? 2 : 3, attackers, defenders, value * 0.72 + (attackers.length - defenders.length) * 85);
      } else if (attackers.length && attackers.length === defenders.length) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.ATTACKERS_EQUAL_DEFENDERS, 6, attackers, defenders, value * 0.18 + 35);
      } else if (!attackers.length && !defenders.length && value >= 300) {
        addWeakness(weaknesses, item.square, item.piece, BEE1_WEAKNESS_TYPES.POTENTIAL_WEAKNESS, 7, attackers, defenders, value * 0.12);
      }
    });

    return weaknesses.sort(function (a, b) {
      return b.severity - a.severity || a.priority - b.priority;
    });
  }

  function getWeaknessSeverity(weaknessMap) {
    return weaknessMap.reduce(function (total, weakness) {
      return total + weakness.severity;
    }, 0);
  }

  function getOwnWeaknessPenalty(chessGame, botColor) {
    const map = createWeaknessMap(chessGame, botColor);

    return map.reduce(function (total, weakness) {
      const multiplier = weakness.weaknessType === BEE1_WEAKNESS_TYPES.KING_WEAKNESS ? 1.05
        : weakness.pieceValue >= 500 ? 1.2
          : weakness.pieceValue >= 300 ? 1
            : 0.45;
      return total + weakness.severity * multiplier;
    }, 0);
  }

  function getOpponentWeaknessTargetScore(chessGame, botColor) {
    const map = createWeaknessMap(chessGame, oppositeColor(botColor));

    return map.reduce(function (total, weakness) {
      const multiplier = weakness.weaknessType === BEE1_WEAKNESS_TYPES.KING_WEAKNESS ? 0.35
        : weakness.pieceValue >= 500 ? 0.72
          : weakness.pieceValue >= 300 ? 0.58
            : 0.22;
      return total + weakness.severity * multiplier;
    }, 0);
  }

  function getWeaknessDeltaScore(beforeOwnMap, afterOwnMap, beforeOpponentMap, afterOpponentMap) {
    const ownBefore = getWeaknessSeverity(beforeOwnMap);
    const ownAfter = getWeaknessSeverity(afterOwnMap);
    const opponentBefore = getWeaknessSeverity(beforeOpponentMap);
    const opponentAfter = getWeaknessSeverity(afterOpponentMap);

    return (ownBefore - ownAfter) * 0.9 + (opponentAfter - opponentBefore) * 0.52;
  }

  function getMoveWeaknessDelta(chessGame, move, botColor) {
    const beforeOwnMap = createWeaknessMap(chessGame, botColor);
    const beforeOpponentMap = createWeaknessMap(chessGame, oppositeColor(botColor));

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const afterOwnMap = createWeaknessMap(chessGame, botColor);
    const afterOpponentMap = createWeaknessMap(chessGame, oppositeColor(botColor));
    chessGame.undo();

    return {
      beforeOwnMap: beforeOwnMap,
      afterOwnMap: afterOwnMap,
      beforeOpponentMap: beforeOpponentMap,
      afterOpponentMap: afterOpponentMap,
      ownBefore: getWeaknessSeverity(beforeOwnMap),
      ownAfter: getWeaknessSeverity(afterOwnMap),
      opponentBefore: getWeaknessSeverity(beforeOpponentMap),
      opponentAfter: getWeaknessSeverity(afterOpponentMap),
      score: getWeaknessDeltaScore(beforeOwnMap, afterOwnMap, beforeOpponentMap, afterOpponentMap)
    };
  }

  function getDefenseUrgencyScore(chessGame, move, botColor) {
    const delta = getMoveWeaknessDelta(chessGame, move, botColor);
    const ownReduction = delta.ownBefore - delta.ownAfter;

    if (delta.ownBefore < 260) {
      return Math.max(0, ownReduction * 0.25);
    }

    if (ownReduction > 0) {
      return ownReduction * 1.15 + 120;
    }

    if (!move.captured && !isCheckMove(move) && delta.ownAfter > delta.ownBefore + 80) {
      return -Math.min(900, delta.ownAfter - delta.ownBefore);
    }

    if (!move.captured && !isCheckMove(move)) {
      return -Math.min(420, delta.ownBefore * 0.35);
    }

    return 0;
  }

  function getTargetedAttackMoveScore(chessGame, move, botColor) {
    const delta = getMoveWeaknessDelta(chessGame, move, botColor);
    const opponentIncrease = delta.opponentAfter - delta.opponentBefore;

    if (opponentIncrease <= 0) {
      return 0;
    }

    if (delta.ownAfter > delta.ownBefore + 160 && !move.captured) {
      return opponentIncrease * 0.18;
    }

    return opponentIncrease * (move.captured ? 0.48 : 0.68);
  }

  function isUsefulHeavyPieceMove(chessGame, move, botColor, delta) {
    if (move.captured || isCheckMove(move) || isMateMove(move)) {
      return true;
    }

    if (delta && delta.ownBefore - delta.ownAfter > 160) {
      return true;
    }

    if (move.piece === "r") {
      const ownPawnOnFile = getPieces(chessGame, botColor).some(function (item) {
        return item.piece.type === "p" && item.square[0] === move.to[0];
      });
      const enemyPawnOnFile = getPieces(chessGame, oppositeColor(botColor)).some(function (item) {
        return item.piece.type === "p" && item.square[0] === move.to[0];
      });

      return !ownPawnOnFile;
    }

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const attacksRealTarget = createWeaknessMap(chessGame, oppositeColor(botColor)).some(function (weakness) {
      return weakness.pieceValue >= 500 && weakness.attackerCount > 0 && weakness.severity >= 420;
    });
    chessGame.undo();

    if (attacksRealTarget) {
      return true;
    }

    return false;
  }

  function getHeavyPieceSanityPenalty(chessGame, move, botColor, phase, delta) {
    if (move.piece !== "r" && move.piece !== "q") {
      return 0;
    }

    if (phase === "endgame" || !isEarlyGame(chessGame) && getDevelopedMinorCount(chessGame, botColor) >= 3) {
      return 0;
    }

    if (isUsefulHeavyPieceMove(chessGame, move, botColor, delta)) {
      return 0;
    }

    return move.piece === "q" ? 1100 : 1500;
  }

  function evaluateOwnWeakness(chessGame, botColor) {
    return getOwnWeaknessPenalty(chessGame, botColor);
  }

  function evaluateOpponentWeakness(chessGame, botColor) {
    return getOpponentWeaknessTargetScore(chessGame, botColor);
  }

  function getStaticExchangeScore(chessGame, move, botColor) {
    const capturedValue = pieceValue(move.captured || "k");
    const movingValue = pieceValue(move.piece);
    let score = capturedValue;

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = chessGame.get(move.to);
    const enemy = oppositeColor(botColor);

    if (movedPiece && isSquareAttacked(chessGame, move.to, enemy)) {
      const defended = isPieceDefended(chessGame, move.to, botColor);
      score -= defended ? movingValue * 0.55 : movingValue;
    }

    chessGame.undo();

    return score;
  }

  function isSafeCapture(chessGame, move, botColor) {
    return Boolean(move.captured) && getStaticExchangeScore(chessGame, move, botColor) >= -40;
  }

  function getHangingEnemyPieceBonus(chessGame, move, botColor) {
    if (!move.captured) {
      return 0;
    }

    const enemy = oppositeColor(botColor);
    const targetDefended = isPieceDefended(chessGame, move.to, enemy);
    const targetAttacked = isSquareAttacked(chessGame, move.to, botColor);

    if (targetAttacked && !targetDefended) {
      return pieceValue(move.captured) * 0.9 + 180;
    }

    if (isSafeCapture(chessGame, move, botColor)) {
      return pieceValue(move.captured) * 0.35;
    }

    return 0;
  }

  function getMaterialRecoveryUrgency(chessGame, botColor) {
    return Math.max(0, -getMaterialBalance(chessGame, botColor));
  }

  function getUnsoundCheckPenalty(chessGame, move, botColor) {
    if (!isCheckMove(move) || isMateMove(move)) {
      return 0;
    }

    const see = getStaticExchangeScore(chessGame, move, botColor);
    const recoveryUrgency = getMaterialRecoveryUrgency(chessGame, botColor);
    const lowValueCheck = !move.captured || pieceValue(move.captured) <= 100;
    const sacrificeRisk = pieceValue(move.piece) >= 300 && see < -120;

    if (lowValueCheck && sacrificeRisk) {
      return recoveryUrgency >= 250 ? 900 : 650;
    }

    if (lowValueCheck && recoveryUrgency >= 250 && see < 120) {
      return 420;
    }

    return 0;
  }

  function getMoveMaterialSwing(chessGame, move, botColor) {
    const before = getMaterialBalance(chessGame, botColor);

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const after = getMaterialBalance(chessGame, botColor);
    chessGame.undo();

    return after - before;
  }

  function getMaterialFirstScore(chessGame, move, botColor) {
    if (!move.captured) {
      return 0;
    }

    const see = getStaticExchangeScore(chessGame, move, botColor);
    const targetValue = pieceValue(move.captured);
    const recoveryUrgency = getMaterialRecoveryUrgency(chessGame, botColor);
    let score = 0;

    if (see >= 0) {
      score += targetValue * 1.2 + see * 0.8;
    }

    if (getHangingEnemyPieceBonus(chessGame, move, botColor) > 0) {
      score += targetValue * 0.9 + 180;
    }

    if (recoveryUrgency >= 180 && see >= -40) {
      score += Math.min(recoveryUrgency, targetValue) * 1.1 + 220;
    }

    if (targetValue >= 300 && see >= -40) {
      score += 260;
    }

    return score;
  }

  function isSpeculativeSacrifice(chessGame, move, botColor) {
    return false;
  }

  function getMacroSafetyPenalty(chessGame, move, botColor) {
    const phase = getPhase(chessGame);
    const earlyGame = isEarlyGame(chessGame);
    let penalty = 0;

    if (isSpeculativeSacrifice(chessGame, move, botColor)) {
      penalty += isCheckMove(move) ? 1800 : 1350;
    }

    penalty += getOpeningAdventurePenalty(chessGame, move, botColor);
    penalty += getUnsoundCheckPenalty(chessGame, move, botColor);

    if (earlyGame && move.piece === "n" && move.captured === "p" && BEE1_KNIGHT_ADVENTURE_SQUARES[botColor].includes(move.to)) {
      penalty += isSafeCapture(chessGame, move, botColor) && !isRepeatedPieceMove(chessGame, move, botColor) ? 320 : 1100;
    }

    if (earlyGame && isRepeatedPieceMove(chessGame, move, botColor) && !isMateMove(move)) {
      penalty += move.captured && pieceValue(move.captured) >= 300 && isSafeCapture(chessGame, move, botColor) ? 120 : 460;
    }

    if (isCheckMove(move) && !isMateMove(move) && getMoveMaterialSwing(chessGame, move, botColor) <= 100 && getStaticExchangeScore(chessGame, move, botColor) < 120) {
      penalty += phase === "opening" || earlyGame ? 520 : 300;
    }

    return penalty;
  }

  function evaluateMaterialSafety(chessGame, botColor) {
    const ownWeakness = createWeaknessMap(chessGame, botColor);
    const enemyWeakness = createWeaknessMap(chessGame, oppositeColor(botColor));
    const ownDanger = ownWeakness.reduce(function (total, weakness) {
      if (weakness.pieceValue >= 300 || weakness.weaknessType === BEE1_WEAKNESS_TYPES.LOW_VALUE_ATTACKS_HIGH_VALUE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE) {
        return total + weakness.severity;
      }

      return total;
    }, 0);
    const enemyOpportunity = enemyWeakness.reduce(function (total, weakness) {
      if (weakness.pieceValue >= 300 || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE) {
        return total + weakness.severity;
      }

      return total;
    }, 0);

    return enemyOpportunity - ownDanger;
  }

  function detectMaterialEmergency(chessGame, botColor) {
    const items = createWeaknessMap(chessGame, botColor).filter(function (weakness) {
      if (weakness.pieceValue < 300) {
        return false;
      }

      if (weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE) {
        return true;
      }

      if (weakness.weakestAttackerValue && weakness.weakestAttackerValue + 120 < weakness.pieceValue) {
        return true;
      }

      return weakness.attackerCount > weakness.defenderCount;
    }).map(function (weakness) {
      const estimatedLoss = Math.max(0, weakness.pieceValue - (weakness.weakestAttackerValue || 0));
      let reason = "MATERIAL_WEAKNESS";

      if (weakness.pieceValue >= 900 && weakness.weakestAttackerValue && weakness.weakestAttackerValue < weakness.pieceValue) {
        reason = "QUEEN_ATTACKED_BY_CHEAPER_PIECE";
      } else if (weakness.pieceValue >= 500 && weakness.weakestAttackerValue && weakness.weakestAttackerValue < weakness.pieceValue) {
        reason = "ROOK_ATTACKED_BY_CHEAPER_PIECE";
      } else if (weakness.pieceValue >= 300 && weakness.weakestAttackerValue === 100) {
        reason = "MINOR_ATTACKED_BY_PAWN";
      } else if (weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE) {
        reason = "HANGING_PIECE";
      } else if (weakness.attackerCount > weakness.defenderCount) {
        reason = "ATTACKERS_MORE_THAN_DEFENDERS";
      }

      return {
        square: weakness.square,
        piece: weakness.piece,
        attackers: weakness.attackers,
        defenders: weakness.defenders,
        weakestAttackerValue: weakness.weakestAttackerValue,
        pieceValue: weakness.pieceValue,
        estimatedLoss: estimatedLoss,
        severity: weakness.severity + estimatedLoss * 0.8,
        reason: reason
      };
    }).sort(function (a, b) {
      return b.severity - a.severity;
    });

    return {
      hasEmergency: items.length > 0,
      items: items,
      maxSeverity: items.length ? items[0].severity : 0
    };
  }

  function doesMoveLoseMaterial(chessGame, move, botColor) {
    if (isMateMove(move)) {
      return false;
    }

    const beforePenalty = getOwnWeaknessPenalty(chessGame, botColor);
    const beforeMaterial = getMaterialBalance(chessGame, botColor);

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const afterPenalty = getOwnWeaknessPenalty(chessGame, botColor);
    const afterMaterial = getMaterialBalance(chessGame, botColor);
    const movedPiece = chessGame.get(move.to);
    const movedPieceLoose = movedPiece && movedPiece.type !== "k" && pieceValue(movedPiece.type) >= 300 && isSquareAttacked(chessGame, move.to, oppositeColor(botColor)) && !isPieceDefended(chessGame, move.to, botColor);
    chessGame.undo();

    if (afterMaterial - beforeMaterial < -120) {
      return true;
    }

    if (movedPieceLoose && !move.captured && !isCheckMove(move)) {
      return true;
    }

    return afterPenalty > beforePenalty + 520;
  }

  function isMaterialLossMove(chessGame, move, botColor) {
    if (isMateMove(move)) {
      return false;
    }

    if (move.captured && getStaticExchangeScore(chessGame, move, botColor) < -80) {
      return true;
    }

    return doesMoveLoseMaterial(chessGame, move, botColor);
  }

  function isForcedLosingExchange(chessGame, move, color) {
    if (!move.captured || isMateMove(move)) {
      return false;
    }

    return getStaticExchangeScore(chessGame, move, color) < -80;
  }

  function isUnsafeCapture(chessGame, move, color) {
    if (!move.captured || isMateMove(move)) {
      return false;
    }

    return getStaticExchangeScore(chessGame, move, color) < -40 || !isSquareSafeAfterMove(chessGame, move, color);
  }

  function createsNewMaterialEmergency(chessGame, move, color) {
    if (isMateMove(move)) {
      return false;
    }

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = chessGame.get(move.to);
    let createsEmergency = false;

    if (movedPiece && movedPiece.color === color && pieceValue(movedPiece.type) >= 300) {
      createsEmergency = createWeaknessMap(chessGame, color).some(function (weakness) {
        return weakness.square === move.to && (weakness.weakestAttackerValue && weakness.weakestAttackerValue <= weakness.pieceValue || weakness.attackerCount > weakness.defenderCount || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE);
      });
    }

    chessGame.undo();

    return createsEmergency;
  }

  function isKickableByPawnAfterMove(chessGame, move, color) {
    if (!["n", "b", "r", "q"].includes(move.piece) || isMateMove(move)) {
      return false;
    }

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = chessGame.get(move.to);
    const enemy = oppositeColor(color);
    const kickable = movedPiece && movedPiece.color === color && getAttackersOfSquare(chessGame, move.to, enemy).some(function (attacker) {
      return attacker.piece.type === "p" && pieceValue(attacker.piece.type) + 120 < pieceValue(movedPiece.type);
    });

    chessGame.undo();

    return Boolean(kickable);
  }

  function getLevel1EmergencyReason(chessGame, move, color) {
    if (isMateMove(move)) {
      return "";
    }

    if (isForcedLosingExchange(chessGame, move, color)) {
      return "FORCED_LOSING_EXCHANGE";
    }

    if (isUnsafeCapture(chessGame, move, color)) {
      return "UNSAFE_CAPTURE";
    }

    if (createsNewMaterialEmergency(chessGame, move, color)) {
      return "HIGH_VALUE_PIECE_UNSAFE_DESTINATION";
    }

    if (isKickableByPawnAfterMove(chessGame, move, color)) {
      return "PIECE_MOVES_TO_KICKABLE_SQUARE";
    }

    return "";
  }

  function getOpeningStabilityRejectReason(chessGame, move, color) {
    if (getPhase(chessGame) !== "opening" && !isEarlyGame(chessGame)) {
      return "";
    }

    if (isEarlyKnightOccupation(move, color) && !move.captured && !isMateMove(move)) {
      return "EARLY_KNIGHT_OCCUPATION_UNSTABLE";
    }

    return "";
  }

  function isSquareSafeAfterMove(chessGame, move, color) {
    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = chessGame.get(move.to);

    if (!movedPiece || movedPiece.color !== color || movedPiece.type === "k") {
      chessGame.undo();
      return true;
    }

    const attackers = getAttackersOfSquare(chessGame, move.to, oppositeColor(color));
    const defenders = getAttackersOfSquare(chessGame, move.to, color).filter(function (defender) {
      return defender.square !== move.to;
    });
    const movedValue = pieceValue(movedPiece.type);
    const unsafe = attackers.length > defenders.length || attackers.some(function (attacker) {
      return pieceValue(attacker.piece.type) + 120 < movedValue;
    });

    chessGame.undo();

    return !unsafe;
  }

  function handlesMaterialEmergency(chessGame, move, botColor, emergencyInfo) {
    if (!emergencyInfo || !emergencyInfo.hasEmergency || !emergencyInfo.items.length) {
      return true;
    }

    const emergency = emergencyInfo.items[0];
    const movedEmergencyPiece = move.from === emergency.square;
    const capturedAttacker = emergency.attackers.some(function (attacker) {
      return attacker.square === move.to;
    });
    const safeDestination = isSquareSafeAfterMove(chessGame, move, botColor);

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const sameSquarePiece = chessGame.get(emergency.square);
    const emergencyStillExists = sameSquarePiece && sameSquarePiece.color === botColor && sameSquarePiece.type === emergency.piece.type && createWeaknessMap(chessGame, botColor).some(function (weakness) {
      return weakness.square === emergency.square && (weakness.weakestAttackerValue && weakness.weakestAttackerValue + 120 < weakness.pieceValue || weakness.attackerCount > weakness.defenderCount || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.HANGING_MINOR_PIECE);
    });
    const movedPiece = chessGame.get(move.to);
    const movedPieceSafe = !movedEmergencyPiece || movedPiece && movedPiece.color === botColor && movedPiece.type === emergency.piece.type && !(pieceValue(movedPiece.type) >= 300 && isSquareAttacked(chessGame, move.to, oppositeColor(botColor)) && getAttackersOfSquare(chessGame, move.to, oppositeColor(botColor)).some(function (attacker) {
      return pieceValue(attacker.piece.type) + 120 < pieceValue(movedPiece.type);
    }));
    chessGame.undo();

    if (movedEmergencyPiece) {
      return movedPieceSafe && safeDestination;
    }

    if (capturedAttacker && !emergencyStillExists) {
      return safeDestination;
    }

    return !emergencyStillExists && safeDestination;
  }

  function evaluateKingSafety(chessGame, botColor) {
    const phase = detectGamePhase(chessGame);

    return getKingSafetyScore(chessGame, botColor, phase) - getOpeningKingStructurePenalty(chessGame, botColor);
  }

  function detectMateThreat(chessGame, color) {
    if (chessGame.turn() !== color) {
      return false;
    }

    return chessGame.moves({ verbose: true }).some(function (move) {
      return isMateMove(move);
    });
  }

  function moveAllowsImmediateMate(chessGame, move, botColor) {
    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const allowsMate = detectMateThreat(chessGame, oppositeColor(botColor));
    chessGame.undo();

    return allowsMate;
  }

  function evaluateMoveIntent(chessGame, move, botColor, phase, weaknessDelta) {
    let score = 0;

    if (isMateMove(move)) {
      return 5000;
    }

    if (move.captured && isSafeCapture(chessGame, move, botColor)) {
      score += pieceValue(move.captured) + 220;
    }

    if (isCheckMove(move) && getUnsoundCheckPenalty(chessGame, move, botColor) === 0) {
      score += 120;
    }

    if (phase === "opening" || isEarlyGame(chessGame)) {
      score += getOpeningMoveBonus(chessGame, move, botColor);
      score -= getOpeningMovePenalty(chessGame, move, botColor);
    }

    if (weaknessDelta) {
      if (weaknessDelta.ownBefore > weaknessDelta.ownAfter) {
        score += (weaknessDelta.ownBefore - weaknessDelta.ownAfter) * 0.65;
      }

      if (weaknessDelta.opponentAfter > weaknessDelta.opponentBefore) {
        score += (weaknessDelta.opponentAfter - weaknessDelta.opponentBefore) * 0.42;
      }
    }

    score += detectDelayedThreat(chessGame, move, botColor) * 0.5;

    return score;
  }

  function detectDelayedThreat(chessGame, move, botColor) {
    if (isSpeculativeSacrifice(chessGame, move, botColor) || doesMoveLoseMaterial(chessGame, move, botColor)) {
      return 0;
    }

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const candidateThreats = createWeaknessMap(chessGame, oppositeColor(botColor)).filter(function (weakness) {
      return weakness.pieceValue >= 300 && (weakness.weaknessType === BEE1_WEAKNESS_TYPES.UNDEFENDED_PIECE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.LOW_VALUE_ATTACKS_HIGH_VALUE || weakness.weaknessType === BEE1_WEAKNESS_TYPES.ATTACKERS_EQUAL_DEFENDERS || weakness.weaknessType === BEE1_WEAKNESS_TYPES.ATTACKERS_MORE_THAN_DEFENDERS);
    });
    chessGame.undo();

    if (!candidateThreats.length) {
      return 0;
    }

    return Math.min(420, candidateThreats.reduce(function (best, threat) {
      return Math.max(best, threat.severity);
    }, 0));
  }

  function detectUselessMove(chessGame, move, botColor, phase, weaknessDelta) {
    if (isMateMove(move) || move.captured || isPromotionMove(move)) {
      return false;
    }

    if (evaluateMoveIntent(chessGame, move, botColor, phase, weaknessDelta) >= 120) {
      return false;
    }

    if (isDevelopingMove(move, botColor) || isCastlingMove(move)) {
      return false;
    }

    if (BEE1_CENTER.includes(move.to) || BEE1_EXTENDED_CENTER.includes(move.to) && move.piece !== "q" && move.piece !== "r") {
      return false;
    }

    return true;
  }

  function classifyMoveIntent(chessGame, move, botColor) {
    const phase = detectGamePhase(chessGame);
    const secondaryIntents = [];
    const weaknessDelta = getMoveWeaknessDelta(chessGame, move, botColor);
    let primaryIntent = "NO_PURPOSE";
    let explanation = "No clear educational purpose.";

    if (isMateMove(move)) {
      return {
        primaryIntent: "CHECKMATE",
        secondaryIntents: [],
        isUseful: true,
        explanation: "Immediate checkmate."
      };
    }

    if (chessGame.in_check && chessGame.in_check()) {
      primaryIntent = "ESCAPE_CHECK";
      explanation = "Legal response while in check.";
    }

    if (move.captured && isSafeCapture(chessGame, move, botColor)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "WIN_MATERIAL";
        explanation = "Safe material gain.";
      } else {
        secondaryIntents.push("WIN_MATERIAL");
      }
    }

    if (weaknessDelta.ownBefore - weaknessDelta.ownAfter > 140) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "FIX_OWN_WEAKNESS";
        explanation = "Reduces own weakness.";
      } else {
        secondaryIntents.push("FIX_OWN_WEAKNESS");
      }

      secondaryIntents.push("DEFEND_PIECE");
    }

    if (isCastlingMove(move)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "CASTLE";
        explanation = "Improves king safety.";
      } else {
        secondaryIntents.push("CASTLE");
      }
    } else if (isDevelopingMove(move, botColor)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "DEVELOP";
        explanation = "Develops a minor piece.";
      } else {
        secondaryIntents.push("DEVELOP");
      }
    }

    if (BEE1_CENTER.includes(move.to)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "CONTROL_CENTER";
        explanation = "Controls or occupies the center.";
      } else {
        secondaryIntents.push("CONTROL_CENTER");
      }
    }

    if (weaknessDelta.opponentAfter - weaknessDelta.opponentBefore > 160) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "ATTACK_WEAKNESS";
        explanation = "Increases pressure on an opponent weakness.";
      } else {
        secondaryIntents.push("ATTACK_WEAKNESS");
      }
    }

    if (isCheckMove(move) && getUnsoundCheckPenalty(chessGame, move, botColor) === 0) {
      secondaryIntents.push("CREATE_MATE_THREAT");
    }

    if (detectDelayedThreat(chessGame, move, botColor) >= 180) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "CREATE_DELAYED_THREAT";
        explanation = "Creates a simple delayed threat.";
      } else {
        secondaryIntents.push("CREATE_DELAYED_THREAT");
      }
    }

    if (primaryIntent === "NO_PURPOSE" && phase !== "opening" && !doesMoveLoseMaterial(chessGame, move, botColor) && !isSpeculativeSacrifice(chessGame, move, botColor)) {
      primaryIntent = "IMPROVE_WORST_PIECE";
      explanation = "Quiet improving move without tactical damage.";
    }

    return {
      primaryIntent: primaryIntent,
      secondaryIntents: secondaryIntents.filter(function (intent, index, list) {
        return list.indexOf(intent) === index && intent !== primaryIntent;
      }),
      isUseful: primaryIntent !== "NO_PURPOSE",
      explanation: explanation
    };
  }

  function classifyCheckResponse(chessGame, move, botColor) {
    if (!(chessGame.in_check && chessGame.in_check())) {
      return "NOT_IN_CHECK";
    }

    if (isMateMove(move)) {
      return "CHECKMATE";
    }

    if (move.captured) {
      return "CAPTURE_CHECKER";
    }

    if (move.piece === "k") {
      return "KING_ESCAPE";
    }

    return "BLOCK_CHECK";
  }

  function evaluateCheckResponse(chessGame, move, botColor) {
    const responseType = classifyCheckResponse(chessGame, move, botColor);
    const phase = detectGamePhase(chessGame);
    const weaknessDelta = getMoveWeaknessDelta(chessGame, move, botColor);
    const emergency = detectMaterialEmergency(chessGame, botColor);
    const gate = lowerLevelGate(chessGame, move, botColor, phase, weaknessDelta, emergency);
    let score = 0;

    if (isMateMove(move)) {
      return BEE1_CHECKMATE_SCORE;
    }

    if (gate.rejected) {
      score -= gate.severity || gate.penalty || 5000;
    } else {
      score -= gate.penalty;
    }

    if (responseType === "CAPTURE_CHECKER") {
      score += isSafeCapture(chessGame, move, botColor) ? 900 + pieceValue(move.captured) : 120;
    } else if (responseType === "BLOCK_CHECK") {
      score += doesMoveLoseMaterial(chessGame, move, botColor) ? 80 : 520;
    } else if (responseType === "KING_ESCAPE") {
      score += 360;
    }

    if (weaknessDelta.ownAfter > weaknessDelta.ownBefore + 180) {
      score -= weaknessDelta.ownAfter - weaknessDelta.ownBefore;
    }

    if (move.captured && isSafeCapture(chessGame, move, botColor)) {
      score += pieceValue(move.captured);
    }

    return score;
  }

  function lowerLevelGate(chessGame, move, botColor, phase, weaknessDelta, emergency) {
    const result = {
      rejected: false,
      rejectReason: "",
      severity: 0,
      penalty: 0,
      reason: ""
    };

    if (isMateMove(move)) {
      return result;
    }

    const level1Reason = getLevel1EmergencyReason(chessGame, move, botColor);

    if (level1Reason) {
      result.rejected = true;
      result.penalty += level1Reason === "PIECE_MOVES_TO_KICKABLE_SQUARE" ? 5200 : 7200;
      result.rejectReason = level1Reason;
      result.reason = result.rejectReason;
      result.severity = result.penalty;
      return result;
    }

    const openingStabilityReject = getOpeningStabilityRejectReason(chessGame, move, botColor);

    if (openingStabilityReject) {
      result.rejected = true;
      result.penalty += 5400;
      result.rejectReason = openingStabilityReject;
      result.reason = result.rejectReason;
      result.severity = result.penalty;
      return result;
    }

    if (move.captured && getStaticExchangeScore(chessGame, move, botColor) < -140) {
      result.rejected = true;
      result.penalty += 5000;
      result.rejectReason = "LEVEL_1_BAD_EXCHANGE";
      result.reason = result.rejectReason;
      result.severity = 5000;
      return result;
    }

    if (isMaterialLossMove(chessGame, move, botColor)) {
      result.rejected = true;
      result.penalty += 5200;
      result.rejectReason = "LEVEL_1_MATERIAL_SAFETY";
      result.reason = result.rejectReason;
      result.severity = 5200;
      return result;
    }

    if (emergency && emergency.hasEmergency && !handlesMaterialEmergency(chessGame, move, botColor, emergency)) {
      result.rejected = true;
      result.penalty += emergency.items[0].pieceValue >= 500 ? 7000 : 5600;
      result.rejectReason = "IGNORE_MATERIAL_EMERGENCY";
      result.reason = result.rejectReason;
      result.severity = result.penalty + emergency.maxSeverity;
      return result;
    }

    if (moveAllowsImmediateMate(chessGame, move, botColor)) {
      result.rejected = true;
      result.penalty += 6000;
      result.rejectReason = "LEVEL_2_ALLOWS_MATE";
      result.reason = result.rejectReason;
      result.severity = 6000;
      return result;
    }

    if (evaluateKingSafety(chessGame, botColor) < -260 && !isCastlingMove(move) && !isCheckMove(move) && !move.captured) {
      result.penalty += 260;
    }

    if (detectUselessMove(chessGame, move, botColor, phase, weaknessDelta)) {
      result.penalty += move.piece === "q" || move.piece === "r" ? 900 : 520;
      result.reason = result.reason || "LEVEL_3_USELESS_MOVE";
    }

    if ((phase === "opening" || isEarlyGame(chessGame)) && (move.piece === "r" || move.piece === "q") && !move.captured && !isCheckMove(move) && !isMateMove(move)) {
      const ownPawnOnTargetFile = getPieces(chessGame, botColor).some(function (item) {
        return item.piece.type === "p" && item.square[0] === move.to[0];
      });

      if (move.piece === "q" || ownPawnOnTargetFile) {
        result.rejected = true;
        result.penalty += 4200;
        result.rejectReason = "LEVEL_3_EARLY_HEAVY_PIECE_NO_PLAN";
        result.reason = result.rejectReason;
        result.severity = 4200;
        return result;
      }
    }

    const heavyPiecePenalty = getHeavyPieceSanityPenalty(chessGame, move, botColor, phase, weaknessDelta);

    if (heavyPiecePenalty > 0) {
      if ((!emergency || !handlesMaterialEmergency(chessGame, move, botColor, emergency)) && !move.captured && !isCheckMove(move) && !isMateMove(move)) {
        result.rejected = true;
        result.penalty += heavyPiecePenalty + 2600;
        result.rejectReason = "LEVEL_3_HEAVY_PIECE_WITHOUT_TARGET";
        result.reason = result.rejectReason;
        result.severity = result.penalty;
        return result;
      }

      result.penalty += heavyPiecePenalty;
      result.reason = result.reason || "LEVEL_3_HEAVY_PIECE_WITHOUT_TARGET";
    }

    if (weaknessDelta && weaknessDelta.ownAfter > weaknessDelta.ownBefore + 220 && weaknessDelta.opponentAfter <= weaknessDelta.opponentBefore + 120) {
      result.penalty += 900;
      result.reason = result.reason || "LEVEL_4_ATTACK_EXPOSES_OWN_WEAKNESS";
    }

    return result;
  }

  function rejectMoveIfViolatesLowerLevel(chessGame, move, botColor, phase, weaknessDelta, emergency) {
    return lowerLevelGate(chessGame, move, botColor, phase, weaknessDelta, emergency).rejected;
  }

  function getKingSafetyScore(chessGame, color, phase) {
    const enemy = oppositeColor(color);
    const kingSquare = getKingSquare(chessGame, color);

    if (!kingSquare) {
      return 0;
    }

    let score = 0;
    const castled = hasCastled(chessGame, color);

    if (castled) {
      score += phase === "endgame" ? 20 : 150;
    } else if (phase !== "endgame") {
      score -= phase === "opening" ? 190 : 120;
    }

    const kingCoords = coordsFromSquare(kingSquare);

    [-1, 0, 1].forEach(function (fileOffset) {
      [-1, 0, 1].forEach(function (rankOffset) {
        if (fileOffset === 0 && rankOffset === 0) {
          return;
        }

        const file = kingCoords.file + fileOffset;
        const rank = kingCoords.rank + rankOffset;

        if (isInsideBoard(file, rank) && isSquareAttacked(chessGame, squareFromCoords(file, rank), enemy)) {
          score -= phase === "endgame" ? 8 : 26;
        }
      });
    });

    return score;
  }

  function getKingPressureScore(chessGame, color) {
    const enemy = oppositeColor(color);
    const enemyKing = getKingSquare(chessGame, enemy);

    if (!enemyKing) {
      return 0;
    }

    const kingCoords = coordsFromSquare(enemyKing);
    let score = 0;

    getPieces(chessGame, color).forEach(function (item) {
      const coords = coordsFromSquare(item.square);
      const distance = Math.max(Math.abs(coords.file - kingCoords.file), Math.abs(coords.rank - kingCoords.rank));

      if (distance <= 2) {
        score += 20 + pieceValue(item.piece.type) / 35;
      } else if (distance === 3 && ["b", "r", "q"].includes(item.piece.type)) {
        score += 14;
      }
    });

    BEE1_CENTER.forEach(function (square) {
      if (isSquareAttacked(chessGame, square, color)) {
        score += 8;
      }
    });

    return score;
  }

  function getDevelopmentScore(chessGame, color, phase) {
    if (phase !== "opening") {
      return 0;
    }

    const homeRank = color === "w" ? "1" : "8";
    const queenHome = color === "w" ? "d1" : "d8";
    const rooksHome = color === "w" ? ["a1", "h1"] : ["a8", "h8"];
    let score = 0;

    getPieces(chessGame, color).forEach(function (item) {
      if ((item.piece.type === "n" || item.piece.type === "b") && item.square[1] !== homeRank) {
        score += 58;
      }

      if ((item.piece.type === "q" && item.square !== queenHome || item.piece.type === "r" && !rooksHome.includes(item.square)) && !hasCastled(chessGame, color)) {
        score -= 72;
      }
    });

    return score;
  }

  function getOpeningKingStructurePenalty(chessGame, color) {
    if (getPhase(chessGame) !== "opening" || hasCastled(chessGame, color)) {
      return 0;
    }

    let penalty = 0;
    const homeRank = color === "w" ? "2" : "7";
    const loosenedSquares = color === "w" ? ["f3", "g3", "h3", "f4", "g4", "h4"] : ["f6", "g6", "h6", "f5", "g5", "h5"];

    ["f", "g", "h"].forEach(function (file) {
      const homePawn = chessGame.get(file + homeRank);

      if (!homePawn || homePawn.color !== color || homePawn.type !== "p") {
        penalty += file === "g" ? 60 : file === "h" ? 50 : 40;
      }
    });

    loosenedSquares.forEach(function (square) {
      const piece = chessGame.get(square);

      if (piece && piece.color === color && piece.type === "p") {
        penalty += square[0] === "g" ? 42 : 30;
      }
    });

    if (getDevelopedMinorCount(chessGame, color) < 2) {
      ["f", "g", "h"].forEach(function (file) {
        const homePawn = chessGame.get(file + homeRank);

        if (!homePawn || homePawn.color !== color || homePawn.type !== "p") {
          penalty += 35;
        }
      });
    }

    return penalty;
  }

  function getDevelopedMinorCount(chessGame, color) {
    const homeRank = color === "w" ? "1" : "8";

    return getPieces(chessGame, color).filter(function (item) {
      return (item.piece.type === "n" || item.piece.type === "b") && item.square[1] !== homeRank;
    }).length;
  }

  function getCenterControlScore(chessGame, color) {
    let score = 0;

    BEE1_CENTER.forEach(function (square) {
      if (isSquareAttacked(chessGame, square, color)) {
        score += 24;
      }

      const piece = chessGame.get(square);
      if (piece && piece.color === color) {
        score += 32;
      }
    });

    BEE1_EXTENDED_CENTER.forEach(function (square) {
      if (isSquareAttacked(chessGame, square, color)) {
        score += 8;
      }
    });

    return score;
  }

  function getTacticalPatternScore(chessGame, color) {
    const enemy = oppositeColor(color);
    let score = 0;

    getPieces(chessGame, color).forEach(function (item) {
      if (item.piece.type === "k" || item.piece.type === "p") {
        return;
      }

      const attackedHighValue = getPieces(chessGame, enemy).filter(function (target) {
        return target.piece.type !== "k" && pieceValue(target.piece.type) >= 500 && doesPieceAttackSquare(chessGame, item.square, target.square);
      });

      if (attackedHighValue.length) {
        score += attackedHighValue.reduce(function (total, target) {
          return total + pieceValue(target.piece.type) * 0.16;
        }, 0);
      }
    });

    score += getForkScore(chessGame, color);
    score += getPinSkewerScore(chessGame, color);

    return score;
  }

  function getForkScore(chessGame, color) {
    const enemy = oppositeColor(color);
    let score = 0;

    getPieces(chessGame, color).forEach(function (item) {
      const attacked = getPieces(chessGame, enemy).filter(function (target) {
        return target.piece.type !== "k" && pieceValue(target.piece.type) >= 300 && doesPieceAttackSquare(chessGame, item.square, target.square);
      });

      if (attacked.length >= 2) {
        score += 100 + attacked.reduce(function (total, target) {
          return total + pieceValue(target.piece.type) * 0.08;
        }, 0);
      }
    });

    return score;
  }

  function getPinSkewerScore(chessGame, color) {
    const enemy = oppositeColor(color);
    let score = 0;
    const directionsByPiece = {
      b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
      r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
      q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
    };

    getPieces(chessGame, color).forEach(function (item) {
      const directions = directionsByPiece[item.piece.type];

      if (!directions) {
        return;
      }

      const from = coordsFromSquare(item.square);

      directions.forEach(function (direction) {
        let file = from.file + direction[0];
        let rank = from.rank + direction[1];
        const line = [];

        while (isInsideBoard(file, rank)) {
          const square = squareFromCoords(file, rank);
          const piece = chessGame.get(square);

          if (piece) {
            line.push(piece);
          }

          if (line.length >= 2) {
            break;
          }

          file += direction[0];
          rank += direction[1];
        }

        if (line.length >= 2 && line[0].color === enemy && line[1].color === enemy) {
          if (line[1].type === "k") {
            score += 120 + pieceValue(line[0].type) * 0.12;
          } else if (pieceValue(line[1].type) > pieceValue(line[0].type)) {
            score += 80 + (pieceValue(line[1].type) - pieceValue(line[0].type)) * 0.08;
          }
        }
      });
    });

    return score;
  }

  function getMobilityScore(chessGame, color) {
    if (chessGame.turn() !== color) {
      return 0;
    }

    return Math.min(80, chessGame.moves().length * 3);
  }

  function evaluatePosition(chessGame, botColor) {
    const phase = getPhase(chessGame);
    const enemy = oppositeColor(botColor);
    const material = getMaterialBalance(chessGame, botColor);
    const punishMultiplier = material >= BEE1_CRUSHING_PUNISH_THRESHOLD ? 1.45
      : material >= BEE1_STRONG_PUNISH_THRESHOLD ? 1.25
        : material >= BEE1_PUNISH_THRESHOLD ? 1.12
          : 1;
    let score = material;

    score -= getHangingPenaltyForColor(chessGame, botColor);
    score += getHangingPressureAgainst(chessGame, enemy);
    score += getKingSafetyScore(chessGame, botColor, phase);
    score -= getKingSafetyScore(chessGame, enemy, phase) * 0.85;
    score -= getOpeningKingStructurePenalty(chessGame, botColor);
    score += getOpeningKingStructurePenalty(chessGame, enemy) * 0.55;
    score += getDevelopmentScore(chessGame, botColor, phase);
    score -= getDevelopmentScore(chessGame, enemy, phase) * 0.75;
    score += getCenterControlScore(chessGame, botColor);
    score -= getCenterControlScore(chessGame, enemy) * 0.65;
    score += getMobilityScore(chessGame, botColor);
    score -= getMobilityScore(chessGame, enemy) * 0.45;
    score += getTacticalPatternScore(chessGame, botColor);
    score -= getTacticalPatternScore(chessGame, enemy) * 0.72;

    if (phase !== "endgame" || material > BEE1_PUNISH_THRESHOLD) {
      score += getKingPressureScore(chessGame, botColor) * punishMultiplier;
      score -= getKingPressureScore(chessGame, enemy) * 0.55;
    }

    if (phase === "endgame" && material > BEE1_PUNISH_THRESHOLD) {
      score += getEndgameConversionScore(chessGame, botColor);
    }

    return score;
  }

  function getEndgameConversionScore(chessGame, botColor) {
    const enemy = oppositeColor(botColor);
    const ownKing = getKingSquare(chessGame, botColor);
    const enemyKing = getKingSquare(chessGame, enemy);

    if (!ownKing || !enemyKing) {
      return 0;
    }

    const own = coordsFromSquare(ownKing);
    const target = coordsFromSquare(enemyKing);
    const distance = Math.max(Math.abs(own.file - target.file), Math.abs(own.rank - target.rank));
    let score = (7 - distance) * 18;

    getPieces(chessGame, botColor).forEach(function (item) {
      if (item.piece.type === "p") {
        const rank = Number(item.square[1]);
        score += botColor === "w" ? rank * 8 : (9 - rank) * 8;
      }
    });

    return score;
  }

  function getMoveOrderingScore(chessGame, move, botColor) {
    let score = 0;
    const killerList = killerMoves[chessGame.history().length] || [];

    if (killerList.includes(getMoveKey(move))) {
      score += 3600;
    }

    if (isMateMove(move)) {
      score += BEE1_CHECKMATE_SCORE;
    }

    if (isCheckMove(move)) {
      score += getUnsoundCheckPenalty(chessGame, move, botColor) ? 450 : 900;
    }

    if (move.captured) {
      const captureDelta = pieceValue(move.captured) - pieceValue(move.piece);
      score += 12000 + pieceValue(move.captured) * 12 - pieceValue(move.piece) + Math.max(0, captureDelta) * 6;
      score += getHangingEnemyPieceBonus(chessGame, move, botColor) * 5;
    }

    if (isPromotionMove(move)) {
      score += 9000 + pieceValue(move.promotion || "q");
    }

    chessGame.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const enemy = oppositeColor(botColor);
    const attackedQueenOrRook = getPieces(chessGame, enemy).some(function (item) {
      return (item.piece.type === "q" || item.piece.type === "r") && isSquareAttacked(chessGame, item.square, botColor);
    });

    if (attackedQueenOrRook) {
      score += 1400;
    }

    chessGame.undo();

    score += getOpeningMoveBonus(chessGame, move, botColor) * 8;
    score -= getOpeningMovePenalty(chessGame, move, botColor) * 10;
    score -= Math.max(0, getOpeningCenterStabilityPenalty(chessGame, move, botColor)) * 18;
    score += getMaterialFirstScore(chessGame, move, botColor) * 8;
    score += getSafePrincipleScore(chessGame, move, botColor) * 4;
    score -= getMacroSafetyPenalty(chessGame, move, botColor) * 12;
    score -= getUnsoundCheckPenalty(chessGame, move, botColor) * 8;

    if ((getPhase(chessGame) === "opening" || isEarlyGame(chessGame)) && (move.piece === "r" || move.piece === "q") && !move.captured && !isCheckMove(move) && !isMateMove(move)) {
      const ownPawnOnTargetFile = getPieces(chessGame, botColor).some(function (item) {
        return item.piece.type === "p" && item.square[0] === move.to[0];
      });

      if (move.piece === "q" || ownPawnOnTargetFile) {
        score -= 50000;
      }
    }

    if (!move.captured && !isCheckMove(move)) {
      const targetPiece = chessGame.get(move.to);

      if (targetPiece && isSquareAttacked(chessGame, move.to, oppositeColor(botColor)) && !isPieceDefended(chessGame, move.to, botColor)) {
        score -= pieceValue(targetPiece.type) * 8;
      }
    }

    return score;
  }

  function orderMoves(chessGame, moves, botColor) {
    return moves.map(function (move) {
      return {
        move: move,
        score: getMoveOrderingScore(chessGame, move, botColor)
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    }).map(function (item) {
      return item.move;
    });
  }

  function rememberKillerMove(chessGame, move) {
    if (!isQuietMove(move)) {
      return;
    }

    const ply = chessGame.history().length;
    const key = getMoveKey(move);
    const current = killerMoves[ply] || [];

    if (!current.includes(key)) {
      current.unshift(key);
    }

    killerMoves[ply] = current.slice(0, 2);
  }

  function quiescence(alpha, beta, botColor, depth) {
    nodeCounter++;

    if (isSearchLimited()) {
      nodeLimitReached = true;
      return evaluatePosition(getContext().game, botColor);
    }

    const game = getContext().game;
    const maximizing = game.turn() === botColor;
    const standPat = evaluatePosition(game, botColor);

    if (depth <= 0 || game.game_over()) {
      return standPat;
    }

    if (maximizing) {
      if (standPat >= beta) {
        return beta;
      }

      if (alpha < standPat) {
        alpha = standPat;
      }

      const tacticalMoves = orderMoves(game, game.moves({ verbose: true }).filter(function (move) {
        if (isSpeculativeSacrifice(game, move, botColor)) {
          return false;
        }

        if (isCaptureMove(move)) {
          return getStaticExchangeScore(game, move, botColor) >= -80 || pieceValue(move.captured) >= 500;
        }

        return isCheckMove(move) && getUnsoundCheckPenalty(game, move, botColor) === 0;
      }), botColor).slice(0, BEE1_QUIESCENCE_MOVE_CAP);

      for (let index = 0; index < tacticalMoves.length; index++) {
        const move = tacticalMoves[index];

        game.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q"
        });

        const score = quiescence(alpha, beta, botColor, depth - 1);
        game.undo();

        if (nodeLimitReached) {
          return score;
        }

        if (score >= beta) {
          return beta;
        }

        if (score > alpha) {
          alpha = score;
        }
      }

      return alpha;
    }

    if (standPat <= alpha) {
      return alpha;
    }

    if (beta > standPat) {
      beta = standPat;
    }

    const tacticalMoves = orderMoves(game, game.moves({ verbose: true }).filter(function (move) {
      if (isSpeculativeSacrifice(game, move, botColor)) {
        return false;
      }

      if (isCaptureMove(move)) {
        return getStaticExchangeScore(game, move, botColor) >= -80 || pieceValue(move.captured) >= 500;
      }

      return isCheckMove(move) && getUnsoundCheckPenalty(game, move, botColor) === 0;
    }), botColor).slice(0, BEE1_QUIESCENCE_MOVE_CAP);

    for (let index = 0; index < tacticalMoves.length; index++) {
      const move = tacticalMoves[index];

      game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      const score = quiescence(alpha, beta, botColor, depth - 1);
      game.undo();

      if (nodeLimitReached) {
        return score;
      }

      if (score <= alpha) {
        return alpha;
      }

      if (score < beta) {
        beta = score;
      }
    }

    return beta;
  }

  function alphaBeta(depth, alpha, beta, maximizing, botColor) {
    const game = getContext().game;
    nodeCounter++;

    if (isSearchLimited()) {
      nodeLimitReached = true;
      return evaluatePosition(game, botColor);
    }

    if (game.game_over()) {
      if (game.in_checkmate && game.in_checkmate()) {
        return game.turn() === botColor ? -BEE1_CHECKMATE_SCORE - depth : BEE1_CHECKMATE_SCORE + depth;
      }

      return 0;
    }

    if (depth <= 0) {
      return quiescence(alpha, beta, botColor, BEE1_MAX_QUIESCENCE_DEPTH);
    }

    const moves = orderMoves(game, game.moves({ verbose: true }), botColor);

    if (maximizing) {
      let value = -BEE1_INFINITY;

      for (let index = 0; index < moves.length; index++) {
        const move = moves[index];

        game.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q"
        });

        value = Math.max(value, alphaBeta(depth - 1, alpha, beta, false, botColor));
        game.undo();

        if (nodeLimitReached) {
          return value;
        }

        alpha = Math.max(alpha, value);

        if (alpha >= beta) {
          rememberKillerMove(game, move);
          break;
        }
      }

      return value;
    }

    let value = BEE1_INFINITY;

    for (let index = 0; index < moves.length; index++) {
      const move = moves[index];

      game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      value = Math.min(value, alphaBeta(depth - 1, alpha, beta, true, botColor));
      game.undo();

      if (nodeLimitReached) {
        return value;
      }

      beta = Math.min(beta, value);

      if (alpha >= beta) {
        rememberKillerMove(game, move);
        break;
      }
    }

    return value;
  }

  function getSearchDepth(phase, materialBalance) {
    if (phase === "opening") {
      return BEE1_OPENING_DEPTH;
    }

    if (phase === "endgame" && materialBalance <= BEE1_PUNISH_THRESHOLD) {
      return BEE1_WEAK_ENDGAME_DEPTH;
    }

    return BEE1_BASE_DEPTH;
  }

  function isTacticalPosition(chessGame, botColor) {
    const moves = chessGame.moves({ verbose: true });

    if (moves.some(function (move) {
      return isCaptureMove(move) || isCheckMove(move);
    })) {
      return true;
    }

    const enemy = oppositeColor(botColor);
    const highValueHanging = getPieces(chessGame, botColor).concat(getPieces(chessGame, enemy)).some(function (item) {
      return (item.piece.type === "q" || item.piece.type === "r") && isSquareAttacked(chessGame, item.square, oppositeColor(item.piece.color));
    });

    if (highValueHanging) {
      return true;
    }

    return getKingPressureScore(chessGame, botColor) >= 120 || getKingPressureScore(chessGame, enemy) >= 120;
  }

  function getDynamicSearchDepth(chessGame, phase, materialBalance, botColor) {
    const baseDepth = getSearchDepth(phase, materialBalance);

    if (isEarlyGame(chessGame)) {
      return Math.min(baseDepth, BEE1_OPENING_DEPTH);
    }

    if (phase === "middlegame" && !isTacticalPosition(chessGame, botColor)) {
      return Math.min(baseDepth, 2);
    }

    return baseDepth;
  }

  function getRootMoveAdjustment(chessGame, move, botColor, phase, materialBalance) {
    let adjustment = 0;
    const weaknessDelta = getMoveWeaknessDelta(chessGame, move, botColor);
    const ownWeaknessReduction = weaknessDelta.ownBefore - weaknessDelta.ownAfter;
    const opponentWeaknessIncrease = weaknessDelta.opponentAfter - weaknessDelta.opponentBefore;

    adjustment += getOpeningMoveBonus(chessGame, move, botColor);
    adjustment -= getOpeningMovePenalty(chessGame, move, botColor);
    adjustment += getSafePrincipleScore(chessGame, move, botColor);
    adjustment += getMaterialFirstScore(chessGame, move, botColor);
    adjustment -= getMacroSafetyPenalty(chessGame, move, botColor);
    adjustment += evaluateMaterialSafety(chessGame, botColor) * 0.08;
    adjustment += evaluateMoveIntent(chessGame, move, botColor, phase, weaknessDelta) * 0.45;
    adjustment += weaknessDelta.score * 0.72;

    const emergency = detectMaterialEmergency(chessGame, botColor);
    const gate = lowerLevelGate(chessGame, move, botColor, phase, weaknessDelta, emergency);

    if (gate.rejected) {
      return -BEE1_CHECKMATE_SCORE / 2;
    }

    adjustment -= gate.penalty;

    if (weaknessDelta.ownBefore >= 260) {
      if (ownWeaknessReduction > 0) {
        adjustment += ownWeaknessReduction * 0.95 + 120;
      } else if (!move.captured && !isCheckMove(move)) {
        adjustment -= Math.min(620, weaknessDelta.ownBefore * 0.32);
      }
    }

    if (weaknessDelta.ownAfter > weaknessDelta.ownBefore + 120 && !move.captured && !isMateMove(move)) {
      adjustment -= Math.min(900, weaknessDelta.ownAfter - weaknessDelta.ownBefore);
    }

    if (opponentWeaknessIncrease > 0 && weaknessDelta.ownAfter <= weaknessDelta.ownBefore + 120) {
      adjustment += opponentWeaknessIncrease * (move.captured ? 0.36 : 0.48);
    }

    adjustment -= getHeavyPieceSanityPenalty(chessGame, move, botColor, phase, weaknessDelta);

    if (phase !== "endgame" && materialBalance >= BEE1_PUNISH_THRESHOLD) {
      if (isCheckMove(move)) {
        adjustment += getUnsoundCheckPenalty(chessGame, move, botColor) ? 0 : materialBalance >= BEE1_STRONG_PUNISH_THRESHOLD ? 35 : 20;
      }

      if (move.captured) {
        adjustment += pieceValue(move.captured) * (materialBalance >= BEE1_STRONG_PUNISH_THRESHOLD ? 0.45 : 0.3);
      }
    }

    const recoveryUrgency = getMaterialRecoveryUrgency(chessGame, botColor);

    if (move.captured) {
      adjustment += getHangingEnemyPieceBonus(chessGame, move, botColor);

      if (recoveryUrgency >= 250 && isSafeCapture(chessGame, move, botColor)) {
        adjustment += pieceValue(move.captured) * 0.9 + 220;
      }
    } else if (recoveryUrgency >= 250 && !isCheckMove(move)) {
      adjustment -= 160;
    }

    adjustment -= getUnsoundCheckPenalty(chessGame, move, botColor);

    if (phase === "endgame" && materialBalance <= BEE1_PUNISH_THRESHOLD) {
      adjustment += (Math.random() - 0.5) * 70;
    } else {
      adjustment += (Math.random() - 0.5) * 8;
    }

    return adjustment;
  }

  function evaluateBee1Move(move) {
    const game = getContext().game;
    const botColor = game.turn();
    const phase = getPhase(game);
    const materialBalance = getMaterialBalance(game, botColor);
    const depth = Math.max(1, getDynamicSearchDepth(game, phase, materialBalance, botColor) - 1);

    resetSearchBudget();

    if (isMateMove(move)) {
      return BEE1_CHECKMATE_SCORE;
    }

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const score = alphaBeta(depth, -BEE1_INFINITY, BEE1_INFINITY, false, botColor);
    game.undo();

    return score + getRootMoveAdjustment(game, move, botColor, phase, materialBalance);
  }

  function chooseFromTop(scoredMoves, phase, materialBalance) {
    let topCount = 1;

    if (phase === "endgame" && materialBalance <= BEE1_PUNISH_THRESHOLD) {
      topCount = Math.min(6, scoredMoves.length);
    } else if (phase === "endgame") {
      topCount = Math.min(2, scoredMoves.length);
    } else {
      topCount = Math.min(2, scoredMoves.filter(function (item) {
        return item.score >= scoredMoves[0].score - 45;
      }).length || 1);
    }

    return scoredMoves[Math.floor(Math.random() * topCount)].move;
  }

  function isVerifiedOpeningTacticMove(move, score, bestScore) {
    return isMateMove(move) || isCheckMove(move) || move.captured && pieceValue(move.captured) >= 300 || score >= bestScore - 20 && isCaptureMove(move);
  }

  function enrichMoveCandidate(chessGame, item, botColor, phase, emergency) {
    const weaknessDelta = getMoveWeaknessDelta(chessGame, item.move, botColor);
    const gate = lowerLevelGate(chessGame, item.move, botColor, phase, weaknessDelta, emergency);
    const intentScore = evaluateMoveIntent(chessGame, item.move, botColor, phase, weaknessDelta);
    const intentLabel = classifyMoveIntent(chessGame, item.move, botColor);

    return {
      move: item.move,
      score: item.score - gate.penalty + intentScore * 0.35 + (intentLabel.isUseful ? 0 : -900),
      gate: gate,
      weaknessDelta: weaknessDelta,
      intent: intentScore,
      intentLabel: intentLabel
    };
  }

  function chooseBestNonRejectedMove(enrichedMoves) {
    const nonRejected = enrichedMoves.filter(function (item) {
      return !item.gate.rejected;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (nonRejected.length) {
      return nonRejected[0];
    }

    return enrichedMoves.slice().sort(function (a, b) {
      const aSeverity = a.gate.severity || a.gate.penalty || 0;
      const bSeverity = b.gate.severity || b.gate.penalty || 0;
      return aSeverity - bSeverity || b.score - a.score;
    })[0] || null;
  }

  function debugCandidateSummary(label, chessGame, enrichedMoves, selectedItem, emergency) {
    debugLog(label, {
      totalLegalMoves: chessGame.moves({ verbose: true }).length,
      activeMovesCount: enrichedMoves.length,
      rejectedCount: enrichedMoves.filter(function (item) {
        return item.gate.rejected;
      }).length,
      nonRejectedCount: enrichedMoves.filter(function (item) {
        return !item.gate.rejected;
      }).length,
      selectedMove: selectedItem && selectedItem.move.san,
      selectedGate: selectedItem && selectedItem.gate,
      materialEmergency: emergency && emergency.hasEmergency ? emergency.items[0].reason + "@" + emergency.items[0].square : "none"
    });
  }

  function finalizeRootMove(chessGame, selectedItem, enrichedMoves, emergency) {
    if (!selectedItem) {
      return null;
    }

    if (selectedItem.gate.rejected) {
      const replacement = chooseBestNonRejectedMove(enrichedMoves);

      if (replacement && !replacement.gate.rejected) {
        debugCandidateSummary("root assertion replaced rejected", chessGame, enrichedMoves, replacement, emergency);
        return replacement.move;
      }
    }

    debugCandidateSummary("root selected", chessGame, enrichedMoves, selectedItem, emergency);
    return selectedItem.move;
  }

  function chooseMoveByLayerPriority(chessGame, scoredMoves, botColor, phase, materialBalance) {
    if (!scoredMoves.length) {
      return null;
    }

    const emergency = detectMaterialEmergency(chessGame, botColor);
    const allEnriched = scoredMoves.map(function (item) {
      return enrichMoveCandidate(chessGame, item, botColor, phase, emergency);
    });
    const enriched = allEnriched.filter(function (item) {
      return !item.gate.rejected;
    });

    if (emergency.hasEmergency) {
      const emergencyResponses = allEnriched.filter(function (item) {
        return handlesMaterialEmergency(chessGame, item.move, botColor, emergency);
      });

      if (emergencyResponses.length) {
        const selectedEmergency = chooseBestNonRejectedMove(emergencyResponses);
        debugLog("top candidates", emergencyResponses.slice(0, 5).map(function (item) {
          return {
            san: item.move.san,
            score: Math.round(item.score),
            rejected: item.gate.rejected,
          reason: item.gate.rejectReason || item.gate.reason,
          level1Reason: getLevel1EmergencyReason(chessGame, item.move, botColor),
          staticExchangeScore: item.move.captured ? getStaticExchangeScore(chessGame, item.move, botColor) : null,
          safeDestination: isSquareSafeAfterMove(chessGame, item.move, botColor),
          primaryIntent: item.intentLabel.primaryIntent,
          materialEmergency: emergency.items[0].reason + "@" + emergency.items[0].square,
          handlesEmergency: true
          };
        }));

        return finalizeRootMove(chessGame, selectedEmergency, emergencyResponses, emergency);
      }

      const emergencyPieceMoves = allEnriched.filter(function (item) {
        return item.move.from === emergency.items[0].square;
      });

      if (emergencyPieceMoves.length) {
        const selectedEmergencyPieceMove = chooseBestNonRejectedMove(emergencyPieceMoves);
        return finalizeRootMove(chessGame, selectedEmergencyPieceMove, emergencyPieceMoves, emergency);
      }
    }

    if (!enriched.length) {
      const selectedFallback = chooseBestNonRejectedMove(allEnriched);

      debugLog("top candidates", allEnriched.slice(0, 5).map(function (item) {
        return {
          san: item.move.san,
          score: Math.round(item.score),
          rejected: item.gate.rejected,
          reason: item.gate.rejectReason || item.gate.reason,
          level1Reason: getLevel1EmergencyReason(chessGame, item.move, botColor),
          staticExchangeScore: item.move.captured ? getStaticExchangeScore(chessGame, item.move, botColor) : null,
          safeDestination: isSquareSafeAfterMove(chessGame, item.move, botColor),
          primaryIntent: item.intentLabel.primaryIntent,
          materialEmergency: emergency.hasEmergency ? emergency.items[0].reason + "@" + emergency.items[0].square : "none",
          handlesEmergency: handlesMaterialEmergency(chessGame, item.move, botColor, emergency)
        };
      }));

      return finalizeRootMove(chessGame, selectedFallback, allEnriched, emergency);
    }

    const safeCaptures = enriched.filter(function (item) {
      return item.move.captured && isSafeCapture(chessGame, item.move, botColor) && pieceValue(item.move.captured) >= 300;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (safeCaptures.length && safeCaptures[0].score >= enriched[0].score - 180) {
      return finalizeRootMove(chessGame, chooseBestNonRejectedMove(safeCaptures), allEnriched, emergency);
    }

    const meaningfulMoves = enriched.filter(function (item) {
      return item.intentLabel.isUseful || item.intent >= 90 || item.move.captured || isCastlingMove(item.move) || isDevelopingMove(item.move, botColor);
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (meaningfulMoves.length) {
      const selectedMeaningful = chooseBestNonRejectedMove(meaningfulMoves);
      debugLog("top candidates", meaningfulMoves.slice(0, 5).map(function (item) {
        return {
          san: item.move.san,
          score: Math.round(item.score),
          rejected: item.gate.rejected,
          reason: item.gate.rejectReason || item.gate.reason,
          level1Reason: getLevel1EmergencyReason(chessGame, item.move, botColor),
          staticExchangeScore: item.move.captured ? getStaticExchangeScore(chessGame, item.move, botColor) : null,
          safeDestination: isSquareSafeAfterMove(chessGame, item.move, botColor),
          primaryIntent: item.intentLabel.primaryIntent,
          materialEmergency: emergency.hasEmergency ? emergency.items[0].reason + "@" + emergency.items[0].square : "none",
          handlesEmergency: handlesMaterialEmergency(chessGame, item.move, botColor, emergency)
        };
      }));

      return finalizeRootMove(chessGame, selectedMeaningful, allEnriched, emergency);
    }

    enriched.sort(function (a, b) {
      return b.score - a.score;
    });
    const selected = chooseBestNonRejectedMove(enriched);

    debugLog("top candidates", enriched.slice(0, 5).map(function (item) {
      return {
        san: item.move.san,
        score: Math.round(item.score),
        rejected: item.gate.rejected,
        reason: item.gate.rejectReason || item.gate.reason,
        level1Reason: getLevel1EmergencyReason(chessGame, item.move, botColor),
        staticExchangeScore: item.move.captured ? getStaticExchangeScore(chessGame, item.move, botColor) : null,
        safeDestination: isSquareSafeAfterMove(chessGame, item.move, botColor),
        primaryIntent: item.intentLabel.primaryIntent,
        materialEmergency: emergency.hasEmergency ? emergency.items[0].reason + "@" + emergency.items[0].square : "none",
        handlesEmergency: handlesMaterialEmergency(chessGame, item.move, botColor, emergency)
      };
    }));

    return finalizeRootMove(chessGame, selected, allEnriched, emergency);
  }

  function chooseBee1BotMove() {
    const game = getContext().game;
    const moves = game.moves({ verbose: true });

    if (!moves.length) {
      return null;
    }

    const phase = getPhase(game);
    const botColor = game.turn();
    const materialBalance = getMaterialBalance(game, botColor);
    const materialEmergency = detectMaterialEmergency(game, botColor);
    const emergencyMoves = materialEmergency.hasEmergency ? moves.filter(function (move) {
      return handlesMaterialEmergency(game, move, botColor, materialEmergency);
    }) : [];
    const activeMoves = materialEmergency.hasEmergency && emergencyMoves.length ? emergencyMoves : moves;

    if (materialEmergency.hasEmergency) {
      debugLog("material emergency lock", {
        square: materialEmergency.items[0] && materialEmergency.items[0].square,
        reason: materialEmergency.items[0] && materialEmergency.items[0].reason,
        validMoves: emergencyMoves.map(function (move) {
          return move.san;
        })
      });
    }

    const mateMove = activeMoves.find(isMateMove);

    if (mateMove) {
      const mateEmergency = detectMaterialEmergency(game, botColor);
      const mateEnriched = [enrichMoveCandidate(game, {
        move: mateMove,
        score: BEE1_CHECKMATE_SCORE
      }, botColor, phase, mateEmergency)];
      const selectedMate = chooseBestNonRejectedMove(mateEnriched);
      debugLog("emergency selected", materialEmergency.hasEmergency && selectedMate ? selectedMate.move.san : "");
      return finalizeRootMove(game, selectedMate, mateEnriched, mateEmergency);
    }

    if (game.in_check && game.in_check()) {
      const checkEmergency = detectMaterialEmergency(game, botColor);
      const checkResponses = activeMoves.map(function (move) {
        return {
          move: move,
          score: evaluateCheckResponse(game, move, botColor)
        };
      }).map(function (item) {
        return enrichMoveCandidate(game, item, botColor, phase, checkEmergency);
      });
      const selectedCheckResponse = chooseBestNonRejectedMove(checkResponses);

      checkResponses.sort(function (a, b) {
        return b.score - a.score;
      });

      debugLog("check responses", checkResponses.slice(0, 5).map(function (item) {
        return {
          san: item.move.san,
          score: Math.round(item.score),
          rejected: item.gate.rejected,
          reason: item.gate.rejectReason || item.gate.reason,
          level1Reason: getLevel1EmergencyReason(game, item.move, botColor),
          staticExchangeScore: item.move.captured ? getStaticExchangeScore(game, item.move, botColor) : null,
          safeDestination: isSquareSafeAfterMove(game, item.move, botColor),
          primaryIntent: item.intentLabel.primaryIntent,
          materialEmergency: checkEmergency.hasEmergency ? checkEmergency.items[0].reason + "@" + checkEmergency.items[0].square : "none",
          handlesEmergency: handlesMaterialEmergency(game, item.move, botColor, checkEmergency)
        };
      }));

      debugLog("emergency selected", materialEmergency.hasEmergency && selectedCheckResponse ? selectedCheckResponse.move.san : "");
      return finalizeRootMove(game, selectedCheckResponse, checkResponses, checkEmergency);
    }

    const recoveryMove = chooseMaterialRecoveryMove(game, activeMoves, botColor);

    if (recoveryMove && handlesMaterialEmergency(game, recoveryMove, botColor, materialEmergency)) {
      debugLog("recovery candidate", recoveryMove.san);
    }

    const bookMove = phase === "opening" || isEarlyGame(game) ? chooseOpeningBookMove(game, activeMoves, botColor) : null;

    if (bookMove && handlesMaterialEmergency(game, bookMove, botColor, materialEmergency)) {
      debugLog("book", bookMove.san);
    }

    const depth = getDynamicSearchDepth(game, phase, materialBalance, botColor);
    const searchableMoves = phase === "opening" || isEarlyGame(game) ? activeMoves.filter(function (move) {
      if (isSpeculativeSacrifice(game, move, botColor)) {
        return false;
      }

      return !isOpeningPawnStormMove(move, botColor) || isMateMove(move) || isCheckMove(move) && getUnsoundCheckPenalty(game, move, botColor) === 0 || move.captured && pieceValue(move.captured) >= 300 && isSafeCapture(game, move, botColor);
    }) : activeMoves;
    const orderedMoves = orderMoves(game, searchableMoves.length ? searchableMoves : activeMoves, botColor);
    const scoredMoves = [];
    let alpha = -BEE1_INFINITY;

    resetSearchBudget();

    const rootMoveLimit = materialEmergency.hasEmergency && emergencyMoves.length ? activeMoves.length
      : isEarlyGame(game) ? 8
      : phase === "endgame" && materialBalance <= BEE1_PUNISH_THRESHOLD ? 18
        : phase === "middlegame" && isTacticalPosition(game, botColor) ? 16
          : 14;

    for (let index = 0; index < orderedMoves.length && index < rootMoveLimit; index++) {
      const move = orderedMoves[index];

      game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      const searchScore = alphaBeta(depth - 1, alpha, BEE1_INFINITY, false, botColor);
      game.undo();

      const score = searchScore + getRootMoveAdjustment(game, move, botColor, phase, materialBalance);
      scoredMoves.push({
        move: move,
        score: score
      });

      if (score > alpha) {
        alpha = score;
      }

      if (nodeLimitReached) {
        break;
      }
    }

    const scoredMoveKeys = scoredMoves.reduce(function (keys, item) {
      keys[getMoveKey(item.move)] = true;
      return keys;
    }, {});

    activeMoves.forEach(function (move) {
      if (scoredMoveKeys[getMoveKey(move)]) {
        return;
      }

      scoredMoves.push({
        move: move,
        score: 0
      });
    });

    scoredMoves.sort(function (a, b) {
      return b.score - a.score;
    });

    const macroSafeMoves = scoredMoves.filter(function (item) {
      return !isSpeculativeSacrifice(game, item.move, botColor);
    });

    if (macroSafeMoves.length) {
      scoredMoves.length = 0;
      macroSafeMoves.forEach(function (item) {
        scoredMoves.push(item);
      });
    }

    if (phase === "opening") {
      const bestScore = scoredMoves[0] ? scoredMoves[0].score : -BEE1_INFINITY;
      const filtered = scoredMoves.filter(function (item) {
        return !isOpeningPawnStormMove(item.move, botColor) || isVerifiedOpeningTacticMove(item.move, item.score, bestScore);
      });

      if (filtered.length) {
        scoredMoves.length = 0;
        filtered.forEach(function (item) {
          scoredMoves.push(item);
        });
      }
    }

    debugLog("choice", {
      phase: phase,
      depth: depth,
      materialBalance: materialBalance,
      nodes: nodeCounter,
      best: scoredMoves[0] && scoredMoves[0].move.san
    });

    const chosenMove = chooseMoveByLayerPriority(game, scoredMoves, botColor, phase, materialBalance);
    debugLog("emergency selected", materialEmergency.hasEmergency && chosenMove ? chosenMove.san : "");

    return chosenMove;
  }

  window.chooseBee1BotMove = chooseBee1BotMove;
  window.evaluateBee1Move = evaluateBee1Move;
  window.detectBee1Phase = detectBee1Phase;
})();
