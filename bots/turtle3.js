(function () {
  "use strict";

  const DEBUG_TURTLE3_BOT = false;

  const TURTLE3_CHECKMATE_SCORE = 100000;
  const TURTLE3_ESCAPE_CHECK_BONUS = 650;
  const TURTLE3_CHECK_BONUS = 95;
  const TURTLE3_MATE_THREAT_BONUS = 260;
  const TURTLE3_CAPTURE_HANGING_BONUS = 145;
  const TURTLE3_PROFITABLE_TRADE_BONUS = 95;
  const TURTLE3_QUEEN_BLUNDER_PENALTY = 1150;
  const TURTLE3_ROOK_BLUNDER_PENALTY = 660;
  const TURTLE3_MINOR_BLUNDER_PENALTY = 420;
  const TURTLE3_OPENING_DEVELOPMENT_BONUS = 58;
  const TURTLE3_CENTER_CONTROL_BONUS = 24;
  const TURTLE3_CASTLING_BONUS = 230;
  const TURTLE3_REPEATED_PIECE_PENALTY = 85;
  const TURTLE3_EARLY_QUEEN_PENALTY = 95;
  const TURTLE3_EARLY_ROOK_PENALTY = 85;
  const TURTLE3_TEMPO_PRESSURE_BONUS = 70;
  const TURTLE3_ENDGAME_KING_ACTIVITY_BONUS = 38;
  const TURTLE3_RANDOM_NOISE_MAX = 16;
  const TURTLE3_SAVE_QUEEN_BONUS = 760;
  const TURTLE3_SAVE_ROOK_BONUS = 460;
  const TURTLE3_SAVE_MINOR_BONUS = 250;
  const TURTLE3_DANGER_SCORE_WINDOW = 14;
  const TURTLE3_OPENING_STABILITY_BONUS = 42;
  const TURTLE3_OPENING_BACKWARD_MOVE_PENALTY = 120;
  const TURTLE3_OPENING_RETURN_HOME_PENALTY = 320;
  const TURTLE3_OPENING_BISHOP_RETREAT_HOME_PENALTY = 260;
  const TURTLE3_OPENING_RANDOM_WANDER_PENALTY = 90;
  const TURTLE3_OPENING_UNDEVELOPMENT_PENALTY = 185;
  const TURTLE3_OPENING_MINOR_DEVELOPMENT_BONUS = 120;
  const TURTLE3_OPENING_SAFE_QUEEN_DEVELOPMENT_BONUS = 55;
  const TURTLE3_OPENING_CASTLING_BONUS = 115;
  const TURTLE3_OPENING_ROOK_ACTIVATION_BONUS = 52;
  const TURTLE3_OPENING_CENTER_CONTROL_BONUS = 44;
  const TURTLE3_OPENING_REPEATED_PIECE_PENALTY = 125;
  const TURTLE3_OPENING_EARLY_QUEEN_PENALTY = 150;
  const TURTLE3_OPENING_BLOCK_DEVELOPMENT_PENALTY = 95;
  const TURTLE3_OPENING_EXTRA_PAWN_MOVE_PENALTY = 42;
  const TURTLE3_OPENING_KNIGHT_RIM_PENALTY = 95;
  const TURTLE3_OPENING_PREMATURE_PAWN_BREAK_PENALTY = 78;
  const TURTLE3_EARLY_QUEEN_PRESSURE_BONUS = 110;
  const TURTLE3_SCHOLAR_DEFENSE_BONUS = 220;
  const TURTLE3_SLOW_OPENING_PRESSURE_BONUS = 85;
  const TURTLE3_PREMATURE_QUEEN_TRADE_PENALTY = 85;
  const TURTLE3_WINNING_ENDGAME_TRADE_BONUS = 70;
  const TURTLE3_WINNING_ENDGAME_PASSED_PAWN_BONUS = 58;
  const TURTLE3_WINNING_ENDGAME_KING_ACTIVITY_BONUS = 44;
  const TURTLE3_WIN_QUEEN_BONUS = 960;
  const TURTLE3_WIN_ROOK_BONUS = 640;
  const TURTLE3_WIN_MINOR_BONUS = 290;
  const TURTLE3_SAFE_CAPTURE_BONUS = 125;
  const TURTLE3_RETURN_HOME_EMERGENCY_PENALTY = 140;

  function getContext() {
    if (!window.Turtle3BotContext) {
      throw new Error("Turtle 3 bot context is not ready.");
    }

    return window.Turtle3BotContext;
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

  function isInsideBoard(file, rank) {
    return file >= 0 && file < 8 && rank >= 1 && rank <= 8;
  }

  function squareFromCoords(file, rank) {
    return "abcdefgh"[file] + rank;
  }

  function moveFlagIncludes(move, flag) {
    return typeof move.flags === "string" && move.flags.indexOf(flag) !== -1;
  }

  function getKingSquare(chessGame, color) {
    const rows = chessGame.board();

    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        const piece = rows[row][col];

        if (piece && piece.type === "k" && piece.color === color) {
          return boardArraySquare(row, col);
        }
      }
    }

    return null;
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
    const fromCoords = coordsFromSquare(from);
    const targetCoords = coordsFromSquare(targetSquare);
    const fileDelta = targetCoords.file - fromCoords.file;
    const rankDelta = targetCoords.rank - fromCoords.rank;
    const absFile = Math.abs(fileDelta);
    const absRank = Math.abs(rankDelta);

    if (!piece) {
      return false;
    }

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
      const diagonal = absFile === absRank;
      const straight = fileDelta === 0 || rankDelta === 0;
      return (diagonal || straight) && isPathClear(chessGame, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    return false;
  }

  function isSquareAttacked(chessGame, square, byColor) {
    const rows = chessGame.board();

    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        const piece = rows[row][col];
        const from = boardArraySquare(row, col);

        if (piece && piece.color === byColor && from !== square && doesPieceAttackSquare(chessGame, from, square)) {
          return true;
        }
      }
    }

    return false;
  }

  function getAttackersOfSquare(chessGame, square, byColor) {
    const rows = chessGame.board();
    const attackers = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        const from = boardArraySquare(rowIndex, colIndex);

        if (piece && piece.color === byColor && from !== square && doesPieceAttackSquare(chessGame, from, square)) {
          attackers.push({
            square: from,
            piece: piece
          });
        }
      });
    });

    return attackers;
  }

  function isPieceHanging(chessGame, square, color) {
    const ctx = getContext();
    return !isSquareAttacked(chessGame, square, color) && isSquareAttacked(chessGame, square, ctx.oppositeColor(color));
  }

  function findPieces(chessGame, color, types) {
    const rows = chessGame.board();
    const pieces = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (piece && piece.color === color && types.includes(piece.type)) {
          pieces.push({
            square: boardArraySquare(rowIndex, colIndex),
            piece: piece
          });
        }
      });
    });

    return pieces;
  }

  function findHangingPieces(chessGame, color, types) {
    return findPieces(chessGame, color, types).filter(function (item) {
      return isPieceHanging(chessGame, item.square, color);
    });
  }

  function findThreatenedPieces(chessGame, color, types) {
    const ctx = getContext();

    return findPieces(chessGame, color, types).map(function (item) {
      return {
        square: item.square,
        piece: item.piece,
        attackers: getAttackersOfSquare(chessGame, item.square, ctx.oppositeColor(color))
      };
    }).filter(function (item) {
      return item.attackers.length;
    });
  }

  function getThreatProfile(chessGame, item, color) {
    const ctx = getContext();
    const attackers = item.attackers || getAttackersOfSquare(chessGame, item.square, ctx.oppositeColor(color));
    const defenders = getAttackersOfSquare(chessGame, item.square, color);
    const pieceValue = ctx.pieceValues[item.piece.type] || 0;
    const weakestAttackerValue = attackers.length ? Math.min.apply(null, attackers.map(function (attacker) {
      return ctx.pieceValues[attacker.piece.type] || 0;
    })) : Infinity;
    const weakestDefenderValue = defenders.length ? Math.min.apply(null, defenders.map(function (defender) {
      return ctx.pieceValues[defender.piece.type] || 0;
    })) : Infinity;
    const attackerCount = attackers.length;
    const defenderCount = defenders.length;
    const hanging = attackerCount > 0 && defenderCount === 0;
    const underDefended = attackerCount > defenderCount;
    const badTrade = attackerCount > 0 && weakestAttackerValue < pieceValue && defenderCount <= attackerCount;
    const actuallyInDanger = hanging || underDefended || badTrade;

    return {
      attackers: attackers,
      defenders: defenders,
      attackersCount: attackerCount,
      defendersCount: defenderCount,
      attackerCount: attackerCount,
      defenderCount: defenderCount,
      pieceValue: pieceValue,
      weakestAttackerValue: weakestAttackerValue,
      weakestDefenderValue: weakestDefenderValue,
      cheapestAttackerValue: weakestAttackerValue,
      outnumbered: underDefended,
      isHanging: hanging,
      isUnderDefended: underDefended,
      isBadTrade: badTrade,
      isActuallyInDanger: actuallyInDanger,
      badTrade: badTrade,
      hanging: hanging,
      mustReact: actuallyInDanger
    };
  }

  function blunderPenaltyForPiece(pieceType) {
    if (pieceType === "q") {
      return TURTLE3_QUEEN_BLUNDER_PENALTY;
    }

    if (pieceType === "r") {
      return TURTLE3_ROOK_BLUNDER_PENALTY;
    }

    if (pieceType === "b" || pieceType === "n") {
      return TURTLE3_MINOR_BLUNDER_PENALTY;
    }

    return 0;
  }

  function saveBonusForPiece(pieceType) {
    if (pieceType === "q") {
      return TURTLE3_SAVE_QUEEN_BONUS;
    }

    if (pieceType === "r") {
      return TURTLE3_SAVE_ROOK_BONUS;
    }

    if (pieceType === "b" || pieceType === "n") {
      return TURTLE3_SAVE_MINOR_BONUS;
    }

    return 0;
  }

  function isSeriousThreat(chessGame, item, color) {
    const profile = getThreatProfile(chessGame, item, color);

    if (item.piece.type === "q" || item.piece.type === "r") {
      return profile.isActuallyInDanger;
    }

    if (item.piece.type === "b" || item.piece.type === "n") {
      return profile.isActuallyInDanger;
    }

    return profile.isUnderDefended || profile.isHanging;
  }

  function findImportantPieceDangers(chessGame, color) {
    return findThreatenedPieces(chessGame, color, ["q", "r", "b", "n"]).filter(function (item) {
      return isSeriousThreat(chessGame, item, color);
    });
  }

  function isBackwardOpeningRetreat(move, movingPiece, color) {
    const fromRank = Number(move.from[1]);
    const toRank = Number(move.to[1]);
    const towardHome = color === "w" ? toRank < fromRank : toRank > fromRank;
    const homeRank = color === "w" ? 1 : 8;

    if (move.captured || movingPiece.type === "k" || movingPiece.type === "q") {
      return false;
    }

    if (toRank === homeRank && fromRank !== homeRank) {
      return true;
    }

    return (movingPiece.type === "n" || movingPiece.type === "b") && towardHome && !isOpeningHomeMinor(move.from, movingPiece);
  }
  function isOpeningHomeMinor(square, piece) {
    const homeRank = piece.color === "w" ? "1" : "8";
    return (piece.type === "n" || piece.type === "b") && square[1] === homeRank;
  }

  function countDevelopedMinorPieces(chessGame, color) {
    const homeRank = color === "w" ? "1" : "8";

    return ["b", "c", "f", "g"].reduce(function (count, file) {
      const piece = chessGame.get(file + homeRank);
      return count + (!piece || piece.color !== color || piece.type !== "n" && piece.type !== "b" ? 1 : 0);
    }, 0);
  }

  function hasCastled(chessGame, color) {
    const kingHome = color === "w" ? "e1" : "e8";
    const kingSide = color === "w" ? "g1" : "g8";
    const queenSide = color === "w" ? "c1" : "c8";
    const kingHomePiece = chessGame.get(kingHome);
    const castledKing = chessGame.get(kingSide) || chessGame.get(queenSide);

    return (!kingHomePiece || kingHomePiece.type !== "k" || kingHomePiece.color !== color) &&
      Boolean(castledKing && castledKing.type === "k" && castledKing.color === color);
  }

  function materialSummary(chessGame) {
    const ctx = getContext();
    const rows = chessGame.board();
    let pieceCount = 0;
    let nonPawnMaterial = 0;
    let queens = 0;

    rows.forEach(function (row) {
      row.forEach(function (piece) {
        if (!piece) {
          return;
        }

        pieceCount += 1;
        if (piece.type === "q") {
          queens += 1;
        }

        if (piece.type !== "p" && piece.type !== "k") {
          nonPawnMaterial += ctx.pieceValues[piece.type] || 0;
        }
      });
    });

    return {
      pieceCount: pieceCount,
      nonPawnMaterial: nonPawnMaterial,
      queens: queens
    };
  }

  function getTurtle3MaterialBalance(chessGame, color) {
    const ctx = getContext();
    const opponentColor = ctx.oppositeColor(color);
    const rows = chessGame.board();
    let own = 0;
    let opponent = 0;

    rows.forEach(function (row) {
      row.forEach(function (piece) {
        if (!piece || piece.type === "k") {
          return;
        }

        if (piece.color === color) {
          own += ctx.pieceValues[piece.type] || 0;
        } else if (piece.color === opponentColor) {
          opponent += ctx.pieceValues[piece.type] || 0;
        }
      });
    });

    return own - opponent;
  }

  function isTurtle3WinningEndgame(chessGame, color, phase) {
    return phase === "endgame" && getTurtle3MaterialBalance(chessGame, color) >= 3;
  }

  function evaluateTurtle3EndgamePlan(chessGame, move, color) {
    const movingPiece = chessGame.get(move.from);
    const materialBalance = getTurtle3MaterialBalance(chessGame, color);
    let score = 0;

    if (!movingPiece) {
      return 0;
    }

    if (materialBalance >= 3 && move.captured && (move.piece === "p" || move.piece === "k" || move.piece === "r" || move.piece === "q")) {
      score += TURTLE3_WINNING_ENDGAME_TRADE_BONUS;
    }

    if (materialBalance >= 5 && movingPiece.type === "p") {
      const advance = color === "w" ? Number(move.to[1]) - Number(move.from[1]) : Number(move.from[1]) - Number(move.to[1]);
      score += Math.max(0, advance) * TURTLE3_WINNING_ENDGAME_PASSED_PAWN_BONUS;
    }

    if (movingPiece.type === "k") {
      score += materialBalance >= 3 ? TURTLE3_WINNING_ENDGAME_KING_ACTIVITY_BONUS : Math.round(TURTLE3_WINNING_ENDGAME_KING_ACTIVITY_BONUS * 0.35);
    }

    return score;
  }

  function detectTurtle3Phase() {
    const ctx = getContext();
    const game = ctx.game;
    const fullmoveNumber = Number(game.fen().split(" ")[5]) || 1;
    const summary = materialSummary(game);
    const side = game.turn();
    const developedMinors = countDevelopedMinorPieces(game, side);

    if (summary.queens === 0 || summary.nonPawnMaterial <= 18 || summary.pieceCount <= 12) {
      return "endgame";
    }

    if (fullmoveNumber <= 12 && summary.pieceCount >= 24 && (developedMinors < 3 || !hasCastled(game, side))) {
      return "opening";
    }

    return "middlegame";
  }

  function centerBonus(square) {
    if (["d4", "e4", "d5", "e5"].includes(square)) {
      return TURTLE3_CENTER_CONTROL_BONUS;
    }

    if (["c3", "d3", "e3", "f3", "c4", "f4", "c5", "f5", "c6", "d6", "e6", "f6"].includes(square)) {
      return Math.round(TURTLE3_CENTER_CONTROL_BONUS * 0.45);
    }

    return 0;
  }

  function countOpenCenterFiles(chessGame) {
    const centralPawns = ["d2", "e2", "d7", "e7"];

    return centralPawns.reduce(function (count, square) {
      return count + (chessGame.get(square) ? 0 : 1);
    }, 0);
  }

  function getHomeQueenSquare(color) {
    return color === "w" ? "d1" : "d8";
  }

  function getOpponentQueenInfo(chessGame, color) {
    const ctx = getContext();
    const opponentColor = ctx.oppositeColor(color);
    const queens = findPieces(chessGame, opponentColor, ["q"]);
    const queen = queens[0] || null;
    const history = chessGame.history({ verbose: true });
    const queenMoves = history.filter(function (move) {
      return move.color === opponentColor && move.piece === "q";
    }).length;

    return {
      color: opponentColor,
      queen: queen,
      queenMoves: queenMoves,
      developedEarly: Boolean(queen && queen.square !== getHomeQueenSquare(opponentColor) && queenMoves > 0)
    };
  }

  function getMinorDevelopmentCount(chessGame, color) {
    return countDevelopedMinorPieces(chessGame, color);
  }

  function doesColorControlSquare(chessGame, color, square) {
    return getAttackersOfSquare(chessGame, square, color).length > 0;
  }

  function detectScholarMateThreat(chessGame, color) {
    const ctx = getContext();
    const opponentColor = ctx.oppositeColor(color);
    const targetSquare = color === "w" ? "f2" : "f7";
    const queenInfo = getOpponentQueenInfo(chessGame, color);
    const queen = queenInfo.queen;
    const bishops = findPieces(chessGame, opponentColor, ["b"]);

    if (!queen || !doesPieceAttackSquare(chessGame, queen.square, targetSquare)) {
      return false;
    }

    return bishops.some(function (bishop) {
      return doesPieceAttackSquare(chessGame, bishop.square, targetSquare);
    });
  }

  function isEarlyQueenPressureMove(move, botColor) {
    const ctx = getContext();
    const game = ctx.game;
    const movingPiece = game.get(move.from);
    const queenInfo = getOpponentQueenInfo(game, botColor);

    if (!queenInfo.developedEarly || !queenInfo.queen || !movingPiece || movingPiece.type === "q") {
      return false;
    }

    return applyMoveForScore(move, function () {
      return isSquareAttacked(game, queenInfo.queen.square, botColor);
    });
  }

  function detectSlowOpeningOpponent(chessGame, color) {
    const ctx = getContext();
    const opponentColor = ctx.oppositeColor(color);
    const history = chessGame.history({ verbose: true });
    const fullmoveNumber = Number(chessGame.fen().split(" ")[5]) || 1;
    const opponentMinorDevelopment = getMinorDevelopmentCount(chessGame, opponentColor);
    const botMinorDevelopment = getMinorDevelopmentCount(chessGame, color);
    const opponentQueenInfo = getOpponentQueenInfo(chessGame, color);
    const samePieceRepeats = history.filter(function (move, index) {
      return index > 1 &&
        move.color === opponentColor &&
        history[index - 2] &&
        history[index - 2].color === opponentColor &&
        history[index - 2].piece === move.piece &&
        move.piece !== "p";
    }).length;

    if (fullmoveNumber <= 3 || botMinorDevelopment < 2) {
      return false;
    }

    return opponentQueenInfo.developedEarly || opponentMinorDevelopment < 2 || samePieceRepeats > 0;
  }

  function detectTurtle3OpeningDanger(chessGame, color) {
    return detectScholarMateThreat(chessGame, color) || findImportantPieceDangers(chessGame, color).length > 0;
  }

  function getTurtle3OpeningProfile(chessGame, color) {
    const history = chessGame.history({ verbose: true });
    const ownHistory = history.filter(function (move) {
      return move.color === color;
    });
    const pawnMoves = ownHistory.filter(function (move) {
      return move.piece === "p";
    }).length;
    const queenMoves = ownHistory.filter(function (move) {
      return move.piece === "q";
    }).length;

    return {
      fullmoveNumber: Number(chessGame.fen().split(" ")[5]) || 1,
      minorDevelopmentCount: getMinorDevelopmentCount(chessGame, color),
      castled: hasCastled(chessGame, color),
      pawnMoves: pawnMoves,
      queenMoves: queenMoves,
      openCenterFiles: countOpenCenterFiles(chessGame),
      history: ownHistory
    };
  }

  function getTurtle3MovedPieceCount(chessGame, color, move) {
    const history = chessGame.history({ verbose: true });

    return history.filter(function (item) {
      return item.color === color && item.piece === move.piece && item.to === move.from;
    }).length;
  }

  function isMoveReturningHome(move, color) {
    const homeSquares = color === "w" ?
      { n: ["b1", "g1"], b: ["c1", "f1"], r: ["a1", "h1"] } :
      { n: ["b8", "g8"], b: ["c8", "f8"], r: ["a8", "h8"] };

    return Boolean(homeSquares[move.piece] && homeSquares[move.piece].includes(move.to));
  }

  function hasOpeningEmergencyException(positionInfo) {
    return Boolean(
      positionInfo.botWasInCheck ||
      positionInfo.scholarDangerBefore ||
      positionInfo.importantDangersBefore.length ||
      positionInfo.targetValue >= 5 ||
      (positionInfo.targetWasHanging && positionInfo.targetValue >= 3)
    );
  }

  function hasReturnHomeEmergencyException(positionInfo) {
    return Boolean(
      positionInfo.botWasInCheck ||
      positionInfo.scholarDangerBefore ||
      positionInfo.importantDangersBefore.some(function (item) {
        return item.piece.type === "q" || item.piece.type === "r";
      }) ||
      positionInfo.targetValue >= 5 ||
      (positionInfo.targetWasHanging && positionInfo.targetValue >= 5)
    );
  }

  function isRandomWanderMove(chessGame, move, color, positionInfo) {
    const movingPiece = chessGame.get(move.from);
    const movedCount = getTurtle3MovedPieceCount(chessGame, color, move);

    if (!movingPiece || movedCount === 0 || move.captured || doesMoveCastle(move) || positionInfo.importantDangersBefore.length || positionInfo.scholarDangerBefore) {
      return false;
    }

    if (doesMoveDevelopMinor(chessGame, move, color) || doesMoveControlCenter(chessGame, move, color) || isEarlyQueenPressureMove(move, color)) {
      return false;
    }

    return movingPiece.type === "n" || movingPiece.type === "b" || movingPiece.type === "q";
  }

  function doesMoveDevelopMinor(chessGame, move, color) {
    const movingPiece = chessGame.get(move.from);

    if (!movingPiece || (movingPiece.type !== "n" && movingPiece.type !== "b")) {
      return false;
    }

    if (!isOpeningHomeMinor(move.from, movingPiece)) {
      return false;
    }

    if (movingPiece.type === "n") {
      return color === "w" ? ["f3", "c3", "d2"].includes(move.to) : ["f6", "c6", "d7"].includes(move.to);
    }

    return color === "w" ? ["c4", "b5", "e2", "g2"].includes(move.to) : ["c5", "b4", "e7", "g7", "e6"].includes(move.to);
  }

  function doesMoveCastle(move) {
    return moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q");
  }

  function doesMoveActivateRook(chessGame, move, color, profile) {
    const movingPiece = chessGame.get(move.from);

    if (!movingPiece || movingPiece.type !== "r" || !profile.castled) {
      return false;
    }

    return color === "w" ? ["e1", "d1"].includes(move.to) : ["e8", "d8"].includes(move.to);
  }

  function doesMoveControlCenter(chessGame, move, color) {
    if (centerBonus(move.to) > 0) {
      return true;
    }

    return applyMoveForScore(move, function () {
      return ["d4", "e4", "d5", "e5"].some(function (square) {
        return doesColorControlSquare(chessGame, color, square);
      });
    });
  }

  function doesMoveDevelopQueenSafely(chessGame, move, color, profile) {
    if (move.piece !== "q" || profile.minorDevelopmentCount < 2) {
      return false;
    }

    return applyMoveForScore(move, function () {
      const queen = chessGame.get(move.to);

      if (!queen || queen.color !== color || queen.type !== "q") {
        return false;
      }

      return !isSquareAttacked(chessGame, move.to, color === "w" ? "b" : "w");
    });
  }

  function blocksHomeBishop(chessGame, color, bishopSquare) {
    const bishop = chessGame.get(bishopSquare);

    if (!bishop || bishop.color !== color || bishop.type !== "b") {
      return false;
    }

    const targets = bishopSquare === "c1" ? ["d2", "e3", "f4", "g5", "h6"] :
      bishopSquare === "f1" ? ["e2", "d3", "c4", "b5", "a6"] :
      bishopSquare === "c8" ? ["d7", "e6", "f5", "g4", "h3"] :
      ["e7", "d6", "c5", "b4", "a3"];

    return targets.every(function (square) {
      return Boolean(chessGame.get(square));
    });
  }

  function doesMoveBlockDevelopment(chessGame, move, color) {
    const movingPiece = chessGame.get(move.from);

    if (!movingPiece) {
      return false;
    }

    return applyMoveForScore(move, function () {
      const homeKnightB1 = chessGame.get(color === "w" ? "b1" : "b8");
      const homeKnightG1 = chessGame.get(color === "w" ? "g1" : "g8");

      if (blocksHomeBishop(chessGame, color, color === "w" ? "c1" : "c8")) {
        return true;
      }

      if (blocksHomeBishop(chessGame, color, color === "w" ? "f1" : "f8")) {
        return true;
      }

      if (movingPiece.type === "q" && ((homeKnightB1 && homeKnightB1.color === color && move.to === (color === "w" ? "c2" : "c7")) ||
        (homeKnightG1 && homeKnightG1.color === color && move.to === (color === "w" ? "f2" : "f7")))) {
        return true;
      }

      return false;
    });
  }

  function isUnnecessaryPawnMove(chessGame, move, color, profile) {
    if (move.piece !== "p") {
      return false;
    }

    if (["d", "e"].includes(move.from[0])) {
      return false;
    }

    if (isEarlyQueenPressureMove(move, color) || centerBonus(move.to) > 0) {
      return false;
    }

    if (profile.minorDevelopmentCount < 2) {
      return true;
    }

    return !applyMoveForScore(move, function () {
      return ["d4", "e4", "d5", "e5"].some(function (square) {
        return doesColorControlSquare(chessGame, color, square);
      });
    });
  }

  function isRepeatedPieceMoveAllowed(chessGame, move, color, positionInfo) {
    const movingPiece = chessGame.get(move.from);

    if (!movingPiece || move.captured || doesMoveCastle(move)) {
      return true;
    }

    if (positionInfo.botWasInCheck || positionInfo.importantDangersBefore.length || positionInfo.scholarDangerBefore) {
      return true;
    }

    if (positionInfo.targetWasHanging || (positionInfo.targetValue || 0) > (positionInfo.movingValue || 0)) {
      return true;
    }

    return false;
  }

  function getPostMoveThreatProfile(chessGame, move, color) {
    return applyMoveForScore(move, function () {
      const movedPieceAfter = chessGame.get(move.to);

      if (!movedPieceAfter || movedPieceAfter.color !== color) {
        return null;
      }

      return getThreatProfile(chessGame, {
        square: move.to,
        piece: movedPieceAfter
      }, color);
    });
  }

  function hasReasonableNonHomeEscape(chessGame, move, color) {
    if (!["n", "b"].includes(move.piece)) {
      return false;
    }

    const alternatives = chessGame.moves({
      square: move.from,
      verbose: true
    }).filter(function (candidate) {
      return candidate.to !== move.to && !isMoveReturningHome(candidate, color);
    });

    return alternatives.some(function (candidate) {
      return applyMoveForScore(candidate, function () {
        const movedPieceAfter = chessGame.get(candidate.to);

        if (!movedPieceAfter || movedPieceAfter.color !== color) {
          return false;
        }

        return !getThreatProfile(chessGame, {
          square: candidate.to,
          piece: movedPieceAfter
        }, color).isActuallyInDanger;
      });
    });
  }

  function tacticalCaptureBonus(move, movingValue, targetValue, targetWasHanging, postMoveThreatProfile) {
    if (!move.captured) {
      return 0;
    }

    let bonus = 0;

    if (targetValue >= 9) {
      bonus += TURTLE3_WIN_QUEEN_BONUS;
    } else if (targetValue >= 5) {
      bonus += TURTLE3_WIN_ROOK_BONUS;
    } else if (targetValue >= 3) {
      bonus += TURTLE3_WIN_MINOR_BONUS;
    } else {
      bonus += targetValue * 26;
    }

    if (targetWasHanging || !postMoveThreatProfile || !postMoveThreatProfile.isActuallyInDanger) {
      bonus += TURTLE3_SAFE_CAPTURE_BONUS;
    }

    if (targetValue > movingValue) {
      bonus += (targetValue - movingValue) * 30;
    }

    if (postMoveThreatProfile && postMoveThreatProfile.isActuallyInDanger && targetValue <= movingValue) {
      bonus -= 90 + (movingValue - targetValue) * 24;
    }

    return bonus;
  }

  function isWinningMaterialTactic(chessGame, move, botColor, opponentColor) {
    const ctx = getContext();
    const movingValue = ctx.pieceValues[move.piece] || 0;
    const targetValue = ctx.pieceValues[move.captured] || 0;
    const targetWasHanging = Boolean(move.captured && isPieceHanging(chessGame, move.to, opponentColor));
    const postMoveThreatProfile = getPostMoveThreatProfile(chessGame, move, botColor);
    const bonus = tacticalCaptureBonus(move, movingValue, targetValue, targetWasHanging, postMoveThreatProfile);

    return move.captured && bonus >= TURTLE3_WIN_MINOR_BONUS + TURTLE3_SAFE_CAPTURE_BONUS;
  }

  function evaluateTurtle3OpeningRules(chessGame, move, positionInfo) {
    const profile = getTurtle3OpeningProfile(chessGame, positionInfo.botColor);
    const movingPiece = chessGame.get(move.from);
    const emergencyException = hasOpeningEmergencyException(positionInfo);
    const returnHomeEmergencyException = hasReturnHomeEmergencyException(positionInfo);
    const movedPieceCount = getTurtle3MovedPieceCount(chessGame, positionInfo.botColor, move);
    const returnHome = isMoveReturningHome(move, positionInfo.botColor);
    const reasons = [];
    let score = 0;

    if (!movingPiece) {
      return {
        score: 0,
        reasons: reasons
      };
    }

    if (doesMoveDevelopMinor(chessGame, move, positionInfo.botColor)) {
      score += TURTLE3_OPENING_MINOR_DEVELOPMENT_BONUS;
      reasons.push("develop-minor");
    }

    if (doesMoveControlCenter(chessGame, move, positionInfo.botColor)) {
      score += TURTLE3_OPENING_CENTER_CONTROL_BONUS;
      reasons.push("control-center");
    }

    if (doesMoveCastle(move)) {
      score += TURTLE3_OPENING_CASTLING_BONUS;
      reasons.push("castle");
    }

    if (doesMoveActivateRook(chessGame, move, positionInfo.botColor, profile)) {
      score += TURTLE3_OPENING_ROOK_ACTIVATION_BONUS;
      reasons.push("activate-rook");
    }

    if (doesMoveDevelopQueenSafely(chessGame, move, positionInfo.botColor, profile)) {
      score += TURTLE3_OPENING_SAFE_QUEEN_DEVELOPMENT_BONUS;
      reasons.push("safe-queen");
    }

    if (move.piece === "q" && !doesMoveDevelopQueenSafely(chessGame, move, positionInfo.botColor, profile)) {
      score -= TURTLE3_OPENING_EARLY_QUEEN_PENALTY;
      reasons.push("early-queen");
    }

    if (doesMoveBlockDevelopment(chessGame, move, positionInfo.botColor)) {
      score -= TURTLE3_OPENING_BLOCK_DEVELOPMENT_PENALTY;
      reasons.push("block-development");
    }

    if (move.piece === "n" && [0, 7].includes(coordsFromSquare(move.to).file)) {
      score -= TURTLE3_OPENING_KNIGHT_RIM_PENALTY;
      reasons.push("knight-rim");
    }

    if (move.piece === "p" && isUnnecessaryPawnMove(chessGame, move, positionInfo.botColor, profile)) {
      score -= TURTLE3_OPENING_EXTRA_PAWN_MOVE_PENALTY;
      reasons.push("extra-pawn");
    }

    if (move.piece === "p" && !["d", "e", "c"].includes(move.from[0]) && profile.minorDevelopmentCount < 2) {
      score -= TURTLE3_OPENING_PREMATURE_PAWN_BREAK_PENALTY;
      reasons.push("premature-pawn-break");
    }

    if (movedPieceCount > 0 && !isRepeatedPieceMoveAllowed(chessGame, move, positionInfo.botColor, positionInfo)) {
      score -= TURTLE3_OPENING_REPEATED_PIECE_PENALTY;
      reasons.push("repeat-piece");
    }

    if (movedPieceCount > 0 && returnHome) {
      score -= TURTLE3_OPENING_RETURN_HOME_PENALTY;
      reasons.push("return-home");

      if (!returnHomeEmergencyException) {
        score -= TURTLE3_RETURN_HOME_EMERGENCY_PENALTY;
        reasons.push("return-home-hard");
      }

      if (hasReasonableNonHomeEscape(chessGame, move, positionInfo.botColor)) {
        score -= TURTLE3_RETURN_HOME_EMERGENCY_PENALTY;
        reasons.push("return-home-alt-exists");
      }
    }

    if (movedPieceCount > 0 && move.piece === "b" && returnHome) {
      score -= TURTLE3_OPENING_BISHOP_RETREAT_HOME_PENALTY;
      reasons.push("bishop-home");
    }

    if (!positionInfo.importantDangersBefore.length && isRandomWanderMove(chessGame, move, positionInfo.botColor, positionInfo)) {
      score -= TURTLE3_OPENING_RANDOM_WANDER_PENALTY;
      reasons.push("wander");
    }

    if (!emergencyException && movedPieceCount > 0 && !doesMoveDevelopMinor(chessGame, move, positionInfo.botColor) && !doesMoveControlCenter(chessGame, move, positionInfo.botColor) && !doesMoveCastle(move) && positionInfo.stableThreatsBefore.length === 0) {
      score -= TURTLE3_OPENING_UNDEVELOPMENT_PENALTY;
      reasons.push("undevelopment");
    }

    if (!positionInfo.importantDangersBefore.length && !positionInfo.scholarDangerBefore && isBackwardOpeningRetreat(move, movingPiece, positionInfo.botColor)) {
      score -= TURTLE3_OPENING_BACKWARD_MOVE_PENALTY;
      reasons.push("backward-retreat");
    }

    if (!positionInfo.importantDangersBefore.length && positionInfo.stableThreatsBefore.length && positionInfo.stableThreatsBefore.some(function (item) { return move.from !== item.square; }) && (doesMoveDevelopMinor(chessGame, move, positionInfo.botColor) || doesMoveCastle(move) || doesMoveControlCenter(chessGame, move, positionInfo.botColor))) {
      score += TURTLE3_OPENING_STABILITY_BONUS;
      reasons.push("opening-stability");
    }

    return {
      score: score,
      reasons: reasons
    };
  }

  function kingActivityBonus(square, color) {
    const coords = coordsFromSquare(square);
    const centerDistance = Math.abs(coords.file - 3.5) + Math.abs(coords.rank - 4.5);
    const advance = color === "w" ? coords.rank - 1 : 8 - coords.rank;

    return Math.max(0, TURTLE3_ENDGAME_KING_ACTIVITY_BONUS - centerDistance * 7) + Math.max(0, advance * 2);
  }

  function applyMoveForScore(move, callback) {
    const ctx = getContext();
    const game = ctx.game;
    const appliedMove = game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    if (!appliedMove) {
      return -Infinity;
    }

    try {
      return callback(appliedMove);
    } finally {
      game.undo();
    }
  }

  function sideHasMateInOne(chessGame) {
    const moves = chessGame.moves({ verbose: true });

    for (let i = 0; i < moves.length; i++) {
      chessGame.move({
        from: moves[i].from,
        to: moves[i].to,
        promotion: moves[i].promotion || "q"
      });

      const isMate = chessGame.in_checkmate();
      chessGame.undo();

      if (isMate) {
        return true;
      }
    }

    return false;
  }

  function createsMateThreat(chessGame, botColor) {
    if (typeof Chess === "undefined") {
      return false;
    }

    const parts = chessGame.fen().split(" ");
    parts[1] = botColor;

    try {
      const threatGame = new Chess(parts.join(" "));
      return sideHasMateInOne(threatGame);
    } catch (error) {
      return false;
    }
  }

  function getTurtle3MoveIntent(move) {
    const ctx = getContext();
    const game = ctx.game;
    const movingPiece = game.get(move.from);
    const phase = detectTurtle3Phase();

    if (!movingPiece) {
      return "quiet";
    }

    if (move.captured) {
      return "capture";
    }

    if (moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q")) {
      return "castle";
    }

    if (phase === "opening" && isOpeningHomeMinor(move.from, movingPiece)) {
      return "develop";
    }

    return applyMoveForScore(move, function () {
      const botColor = movingPiece.color;
      const opponentColor = ctx.oppositeColor(botColor);
      const opponentThreats = findThreatenedPieces(game, opponentColor, ["q", "r", "b", "n"]).filter(function (item) {
        return isPieceHanging(game, item.square, opponentColor) || item.attackers.some(function (attacker) {
          return (ctx.pieceValues[attacker.piece.type] || 0) <= (ctx.pieceValues[item.piece.type] || 0);
        });
      });

      if (game.in_checkmate()) {
        return "mate";
      }

      if (createsMateThreat(game, botColor)) {
        return "mate-threat";
      }

      if (game.in_check()) {
        return "check";
      }

      if (opponentThreats.length) {
        return "threat-capture";
      }

      return "improve";
    });
  }

  function scoreTurtle3Intent(move) {
    const ctx = getContext();
    const game = ctx.game;
    const movingPiece = game.get(move.from);
    const intent = getTurtle3MoveIntent(move);
    const botColor = movingPiece ? movingPiece.color : game.turn();

    if (intent === "mate-threat") {
      return TURTLE3_MATE_THREAT_BONUS;
    }

    if (intent === "threat-capture") {
      return TURTLE3_TEMPO_PRESSURE_BONUS;
    }

    if (intent === "check") {
      return TURTLE3_CHECK_BONUS;
    }

    if (intent === "develop") {
      return TURTLE3_OPENING_DEVELOPMENT_BONUS;
    }

    if (intent === "castle") {
      return TURTLE3_CASTLING_BONUS;
    }

    if (intent === "develop" && isEarlyQueenPressureMove(move, botColor)) {
      return TURTLE3_OPENING_DEVELOPMENT_BONUS + TURTLE3_EARLY_QUEEN_PRESSURE_BONUS;
    }

    return 0;
  }

  function evaluateTurtle3Move(move) {
    const ctx = getContext();
    const game = ctx.game;
    const pieceValues = ctx.pieceValues;
    const movingPiece = game.get(move.from);

    if (!movingPiece) {
      return -Infinity;
    }

    const phase = detectTurtle3Phase();
    const botColor = movingPiece.color;
    const opponentColor = ctx.oppositeColor(botColor);
    const botWasInCheck = game.in_check();
    const movingValue = pieceValues[movingPiece.type] || 0;
    const targetValue = pieceValues[move.captured] || 0;
    const targetWasHanging = move.captured ? isPieceHanging(game, move.to, opponentColor) : false;
    const postMoveThreatProfile = getPostMoveThreatProfile(game, move, botColor);
    const threatenedPiecesBefore = findThreatenedPieces(game, botColor, ["q", "r", "b", "n"]);
    const importantDangersBefore = findImportantPieceDangers(game, botColor);
    const stableThreatsBefore = threatenedPiecesBefore.filter(function (item) {
      return !isSeriousThreat(game, item, botColor);
    });
    const hangingPiecesBefore = findHangingPieces(game, botColor, ["q", "r", "b", "n"]);
    const scholarDangerBefore = detectScholarMateThreat(game, botColor);
    const slowOpponentOpening = phase === "opening" && detectSlowOpeningOpponent(game, botColor);
    const opponentQueenInfo = getOpponentQueenInfo(game, botColor);
    const botMinorDevelopment = getMinorDevelopmentCount(game, botColor);
    const openCenterFiles = countOpenCenterFiles(game);
    const materialBalance = getTurtle3MaterialBalance(game, botColor);
    const winningEndgame = isTurtle3WinningEndgame(game, botColor, phase);
    const lastBotMove = ctx.getLastBotMove();
    const positionInfo = {
      botColor: botColor,
      opponentColor: opponentColor,
      botWasInCheck: botWasInCheck,
      movingValue: movingValue,
      targetValue: targetValue,
      targetWasHanging: targetWasHanging,
      threatenedPiecesBefore: threatenedPiecesBefore,
      importantDangersBefore: importantDangersBefore,
      stableThreatsBefore: stableThreatsBefore,
      hangingPiecesBefore: hangingPiecesBefore,
      scholarDangerBefore: scholarDangerBefore
    };
    let score = centerBonus(move.to);

    if (move.captured) {
      score += targetValue * 38;
      score += tacticalCaptureBonus(move, movingValue, targetValue, targetWasHanging, postMoveThreatProfile);
    }

    if (targetWasHanging) {
      score += TURTLE3_CAPTURE_HANGING_BONUS + targetValue * 20;
    }

    if (move.captured && targetValue > movingValue) {
      score += TURTLE3_PROFITABLE_TRADE_BONUS + (targetValue - movingValue) * 26;
    }

    if (move.captured && targetValue < movingValue && postMoveThreatProfile && postMoveThreatProfile.isActuallyInDanger) {
      score -= 55 + (movingValue - targetValue) * 24;
    }

    score += scoreTurtle3Intent(move);

    if (phase === "opening" && isEarlyQueenPressureMove(move, botColor)) {
      score += TURTLE3_EARLY_QUEEN_PRESSURE_BONUS;

      if (isOpeningHomeMinor(move.from, movingPiece) || movingPiece.type === "p") {
        score += TURTLE3_TEMPO_PRESSURE_BONUS;
      }
    }

    if (phase === "opening") {
      const openingRules = evaluateTurtle3OpeningRules(game, move, positionInfo);

      score += openingRules.score;

      if (!importantDangersBefore.length && isOpeningHomeMinor(move.from, movingPiece)) {
        score += TURTLE3_OPENING_DEVELOPMENT_BONUS;
      }

      if (!importantDangersBefore.length && stableThreatsBefore.some(function (item) { return move.from !== item.square; }) && (isOpeningHomeMinor(move.from, movingPiece) || moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q") || centerBonus(move.to) > 0)) {
        score += TURTLE3_OPENING_STABILITY_BONUS;
      }

      if (!importantDangersBefore.length && (moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q"))) {
        score += TURTLE3_CASTLING_BONUS + (openCenterFiles >= 2 ? 45 : 0);
      }

      if (movingPiece.type === "q" && !move.captured && !game.in_check()) {
        score -= TURTLE3_EARLY_QUEEN_PENALTY;
      }

      if (movingPiece.type === "r" && move.from[1] === (botColor === "w" ? "1" : "8") && !move.captured) {
        score -= TURTLE3_EARLY_ROOK_PENALTY;
      }

      if (!importantDangersBefore.length && !hasCastled(game, botColor) && !(moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q"))) {
        if (openCenterFiles >= 2 && botMinorDevelopment >= 2 && Number(game.fen().split(" ")[5]) >= 6) {
          score -= 65;
        } else if (openCenterFiles >= 1 && botMinorDevelopment >= 3 && Number(game.fen().split(" ")[5]) >= 8) {
          score -= 35;
        }
      }

      if (lastBotMove && lastBotMove.piece === movingPiece.type && lastBotMove.to === move.from && !move.captured) {
        score -= TURTLE3_REPEATED_PIECE_PENALTY;
      }

      if (!importantDangersBefore.length && isBackwardOpeningRetreat(move, movingPiece, botColor)) {
        score -= TURTLE3_OPENING_BACKWARD_MOVE_PENALTY;
      }

      if (scholarDangerBefore) {
        score += applyMoveForScore(move, function () {
          return detectScholarMateThreat(game, botColor) ? 0 : TURTLE3_SCHOLAR_DEFENSE_BONUS;
        });
      }

      if (slowOpponentOpening) {
        if (centerBonus(move.to) > 0) {
          score += TURTLE3_SLOW_OPENING_PRESSURE_BONUS;
        }

        if (isEarlyQueenPressureMove(move, botColor)) {
          score += TURTLE3_SLOW_OPENING_PRESSURE_BONUS;
        }
      }

      if (opponentQueenInfo.developedEarly && opponentQueenInfo.queenMoves >= 2 && isEarlyQueenPressureMove(move, botColor)) {
        score += TURTLE3_TEMPO_PRESSURE_BONUS;
      }

      if (movingPiece.type === "q" && move.captured === "q" && !targetWasHanging && !importantDangersBefore.length && !botWasInCheck) {
        score -= TURTLE3_PREMATURE_QUEEN_TRADE_PENALTY;
      }
    } else if (phase === "middlegame") {
      if (game.in_check()) {
        score += TURTLE3_CHECK_BONUS / 2;
      }

      if (["n", "b"].includes(move.piece) && isMoveReturningHome(move, botColor) && !hasReturnHomeEmergencyException(positionInfo) && hasReasonableNonHomeEscape(game, move, botColor)) {
        score -= TURTLE3_OPENING_RETURN_HOME_PENALTY + TURTLE3_RETURN_HOME_EMERGENCY_PENALTY;
      }
    } else {
      score += evaluateTurtle3EndgamePlan(game, move, botColor);

      if (movingPiece.type === "k") {
        score += kingActivityBonus(move.to, botColor);
      }

      if (winningEndgame && move.captured && targetValue > 0 && targetValue <= movingValue) {
        score += TURTLE3_WINNING_ENDGAME_TRADE_BONUS;
      }

      if (!winningEndgame && materialBalance <= 2 && move.piece === "q" && move.captured && targetValue === 0) {
        score -= 20;
      }
    }

    importantDangersBefore.forEach(function (threat) {
      const movesThreatenedPiece = move.from === threat.square;
      const capturesAttacker = threat.attackers.some(function (attacker) {
        return move.to === attacker.square;
      });
      const saveValue = Math.max(saveBonusForPiece(threat.piece.type), blunderPenaltyForPiece(threat.piece.type) * 0.65);

      if (movesThreatenedPiece) {
        score += saveValue;
      }

      if (capturesAttacker) {
        score += saveValue + 45;
      }
    });

    score += applyMoveForScore(move, function () {
      const importantDangersAfter = findImportantPieceDangers(game, botColor);
      const hangingPiecesAfter = findHangingPieces(game, botColor, ["q", "r", "b", "n"]);
      const opponentMateInOne = sideHasMateInOne(game);
      let afterScore = 0;

      if (game.in_checkmate()) {
        return TURTLE3_CHECKMATE_SCORE;
      }

      if (botWasInCheck) {
        afterScore += TURTLE3_ESCAPE_CHECK_BONUS;
      }

      if (game.in_check()) {
        afterScore += TURTLE3_CHECK_BONUS;
      }

      if (opponentMateInOne && !game.in_checkmate()) {
        afterScore -= TURTLE3_CHECKMATE_SCORE / 2;
      }

      if (postMoveThreatProfile && postMoveThreatProfile.isActuallyInDanger) {
        afterScore -= blunderPenaltyForPiece(movingPiece.type) || movingValue * 16;
      }

      hangingPiecesAfter.forEach(function (item) {
        afterScore -= blunderPenaltyForPiece(item.piece.type);
      });

      importantDangersAfter.forEach(function (threat) {
        afterScore -= blunderPenaltyForPiece(threat.piece.type);
      });

      hangingPiecesBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);

        if (!pieceStillThere || pieceStillThere.color !== botColor || pieceStillThere.type !== threat.piece.type || !isPieceHanging(game, threat.square, botColor)) {
          afterScore += Math.max(saveBonusForPiece(threat.piece.type), blunderPenaltyForPiece(threat.piece.type) * 0.65);
        }
      });

      importantDangersBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);
        const threatStillThere = findImportantPieceDangers(game, botColor).some(function (item) {
          return item.square === threat.square && item.piece.type === threat.piece.type;
        });

        if (!pieceStillThere || pieceStillThere.color !== botColor || pieceStillThere.type !== threat.piece.type || !threatStillThere) {
          afterScore += Math.max(saveBonusForPiece(threat.piece.type), blunderPenaltyForPiece(threat.piece.type) * 0.7);
        }
      });

      return afterScore;
    });

    return score;
  }

  function chooseFromScored(scoredMoves, phase, materialBalance) {
    const bestScore = scoredMoves[0].score;
    const winningEndgame = phase === "endgame" && materialBalance >= 3;
    const equalEndgame = phase === "endgame" && materialBalance < 3;
    const poolSize = phase === "opening" ? 5 : winningEndgame ? 2 : 4;
    const scoreWindow = phase === "opening" ? 46 : phase === "middlegame" ? 28 : winningEndgame ? 12 : 30;
    const noiseMax = phase === "opening" ? TURTLE3_RANDOM_NOISE_MAX + 10 : winningEndgame ? 2 : equalEndgame ? 10 : TURTLE3_RANDOM_NOISE_MAX;
    const candidates = scoredMoves.slice(0, poolSize).filter(function (item) {
      return item.score >= bestScore - scoreWindow;
    });
    const noisyCandidates = candidates.map(function (item) {
      return {
        move: item.move,
        score: item.score + Math.random() * noiseMax
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    return noisyCandidates[0].move;
  }

  function normalizeSan(san) {
    return san.replace(/[+#]?[?!]*$/g, "");
  }

  function openingBookSans(history) {
    const key = history.map(normalizeSan).join(" ");
    const book = {
      "": ["e4"],
      "e4": ["e5"],
      "e4 e5": ["Nf3"],
      "e4 e5 Nf3": ["Nc6"],
      "e4 e5 Nf3 Nc6": ["Bc4"],
      "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6"],
      "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "Nf6"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5": ["O-O", "d3", "c3"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6": ["O-O", "d3"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O": ["Nf6", "O-O"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6 O-O": ["Bc5", "Be7"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6": ["d3", "c3", "Re1"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 d3": ["Nf6", "Be7"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6 d3": ["Bc5", "Be7"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 c3": ["Nf6", "d6"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6 c3": ["Bc5", "Be7"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d3": ["O-O", "d6", "Re8"],
      "e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 c3": ["O-O", "d6"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6 O-O Bc5 d3": ["O-O", "d6"],
      "e4 e5 Nf3 Nc6 Bc4 Nf6 O-O Bc5 c3": ["O-O", "d6"]
    };

    return book[key] || [];
  }

  function isLightBookMove(move, movingPiece, color) {
    const homeRank = color === "w" ? "1" : "8";
    const target = move.to;

    if (moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q")) {
      return true;
    }

    if (movingPiece.type === "n") {
      const goodKnightTargets = color === "w" ? ["f3", "c3", "d2"] : ["f6", "c6", "d7"];
      return isOpeningHomeMinor(move.from, movingPiece) && goodKnightTargets.includes(target);
    }

    if (movingPiece.type === "b") {
      const goodBishopTargets = color === "w" ? ["c4", "b5", "e2", "g2"] : ["c5", "b4", "e7", "g7", "e6"];
      return isOpeningHomeMinor(move.from, movingPiece) && goodBishopTargets.includes(target);
    }

    if (movingPiece.type === "p") {
      const goodPawnTargets = color === "w" ? ["e4", "d3", "c3", "d4"] : ["e5", "d6", "c6", "d5"];
      return goodPawnTargets.includes(target);
    }

    if (movingPiece.type === "r") {
      const goodRookTargets = color === "w" ? ["e1"] : ["e8"];
      return move.from[1] === homeRank && goodRookTargets.includes(target);
    }

    return false;
  }

  function getTurtle3OpeningBookMoves(scoredMoves) {
    const ctx = getContext();
    const game = ctx.game;
    const botColor = game.turn();
    const opponentColor = ctx.oppositeColor(botColor);
    const history = game.history();
    const directBookSans = openingBookSans(history);
    const lastBotMove = ctx.getLastBotMove();
    const threatenedPiecesBefore = findThreatenedPieces(game, botColor, ["q", "r", "b", "n"]);
    const importantDangersBefore = findImportantPieceDangers(game, botColor);
    const stableThreatsBefore = threatenedPiecesBefore.filter(function (item) {
      return !isSeriousThreat(game, item, botColor);
    });
    const hangingPiecesBefore = findHangingPieces(game, botColor, ["q", "r", "b", "n"]);
    const scholarDangerBefore = detectScholarMateThreat(game, botColor);
    const directCandidates = scoredMoves.filter(function (item) {
      return directBookSans.includes(normalizeSan(item.move.san));
    });

    if (directCandidates.length) {
      return directCandidates.filter(function (item) {
        const move = item.move;
        const positionInfo = {
          botColor: botColor,
          opponentColor: opponentColor,
          botWasInCheck: game.in_check(),
          movingValue: ctx.pieceValues[move.piece] || 0,
          targetValue: ctx.pieceValues[move.captured] || 0,
          targetWasHanging: Boolean(move.captured && isPieceHanging(game, move.to, opponentColor)),
          threatenedPiecesBefore: threatenedPiecesBefore,
          importantDangersBefore: importantDangersBefore,
          stableThreatsBefore: stableThreatsBefore,
          hangingPiecesBefore: hangingPiecesBefore,
          scholarDangerBefore: scholarDangerBefore
        };
        const openingRules = evaluateTurtle3OpeningRules(game, move, positionInfo);

        if (openingRules.score <= -90) {
          return false;
        }

        return applyMoveForScore(item.move, function () {
          return !detectTurtle3OpeningDanger(game, game.turn()) && !findImportantPieceDangers(game, game.turn()).length;
        });
      }).filter(function (item) {
        return item.score >= scoredMoves[0].score - 260;
      }).slice(0, 5);
    }

    const candidates = scoredMoves.filter(function (item) {
      const movingPiece = game.get(item.move.from);
      const positionInfo = {
        botColor: botColor,
        opponentColor: opponentColor,
        botWasInCheck: game.in_check(),
        movingValue: ctx.pieceValues[item.move.piece] || 0,
        targetValue: ctx.pieceValues[item.move.captured] || 0,
        targetWasHanging: Boolean(item.move.captured && isPieceHanging(game, item.move.to, opponentColor)),
        threatenedPiecesBefore: threatenedPiecesBefore,
        importantDangersBefore: importantDangersBefore,
        stableThreatsBefore: stableThreatsBefore,
        hangingPiecesBefore: hangingPiecesBefore,
        scholarDangerBefore: scholarDangerBefore
      };
      const openingRules = evaluateTurtle3OpeningRules(game, item.move, positionInfo);

      if (!movingPiece || movingPiece.type === "q" || openingRules.score <= -90) {
        return false;
      }

      if (lastBotMove && lastBotMove.piece === movingPiece.type && lastBotMove.to === item.move.from && !item.move.captured) {
        return false;
      }

      return isLightBookMove(item.move, movingPiece, game.turn());
    });

    return candidates.filter(function (item) {
      return applyMoveForScore(item.move, function () {
        return !detectTurtle3OpeningDanger(game, game.turn()) && !findImportantPieceDangers(game, game.turn()).length;
      });
    }).filter(function (item) {
      return item.score >= scoredMoves[0].score - 85;
    }).slice(0, 5);
  }

  function chooseTurtle3OpeningBookMove(scoredMoves) {
    const ctx = getContext();
    const game = ctx.game;
    const botColor = game.turn();

    if (detectTurtle3OpeningDanger(game, botColor) || findImportantPieceDangers(game, botColor).length) {
      return null;
    }

    const candidates = getTurtle3OpeningBookMoves(scoredMoves);

    if (!candidates.length) {
      return null;
    }

    return candidates[Math.floor(Math.random() * candidates.length)].move;
  }

  function chooseTurtle3BotMove() {
    const ctx = getContext();
    const game = ctx.game;
    const moves = game.moves({ verbose: true });

    if (!moves.length) {
      return null;
    }

    const phase = detectTurtle3Phase();
    const materialBalance = getTurtle3MaterialBalance(game, game.turn());
    const scoredMoves = moves.map(function (move) {
      return {
        move: move,
        score: evaluateTurtle3Move(move),
        intent: getTurtle3MoveIntent(move)
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (DEBUG_TURTLE3_BOT) {
      console.log("Turtle 3 phase", phase);
      console.log("Turtle 3 candidates", scoredMoves.slice(0, 6).map(function (item) {
        return item.move.san + " " + item.score + " " + item.intent;
      }));
    }

    if (scoredMoves[0].score >= TURTLE3_CHECKMATE_SCORE) {
      return scoredMoves[0].move;
    }

    if (game.in_check()) {
      return scoredMoves[0].move;
    }

    const botColor = game.turn();
    const opponentColor = ctx.oppositeColor(botColor);
    const importantPieceDangers = findImportantPieceDangers(game, botColor);
    const openingDanger = phase === "opening" && detectTurtle3OpeningDanger(game, botColor);
    const tacticalMaterialMoves = scoredMoves.filter(function (item) {
      return isWinningMaterialTactic(game, item.move, botColor, opponentColor);
    });

    if (tacticalMaterialMoves.length) {
      return tacticalMaterialMoves[0].move;
    }

    if (importantPieceDangers.length || openingDanger) {
      const close = scoredMoves.filter(function (item) {
        return item.score >= scoredMoves[0].score - TURTLE3_DANGER_SCORE_WINDOW;
      }).slice(0, 2);

      return close[Math.floor(Math.random() * close.length)].move;
    }

    if (phase === "opening") {
      const bookMove = chooseTurtle3OpeningBookMove(scoredMoves);

      if (bookMove) {
        return bookMove;
      }
    }

    return chooseFromScored(scoredMoves, phase, materialBalance);
  }

  window.chooseTurtle3BotMove = chooseTurtle3BotMove;
  window.evaluateTurtle3Move = evaluateTurtle3Move;
  window.detectTurtle3Phase = detectTurtle3Phase;
  window.getTurtle3MoveIntent = getTurtle3MoveIntent;
  window.scoreTurtle3Intent = scoreTurtle3Intent;
})();
