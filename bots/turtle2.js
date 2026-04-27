(function () {
  "use strict";

  const DEBUG_TURTLE2_BOT = false;

  const TURTLE2_CHECKMATE_SCORE = 100000;
  const TURTLE2_CHECK_BONUS = 70;
  const TURTLE2_ESCAPE_CHECK_BONUS = 500;
  const TURTLE2_CAPTURE_HANGING_BONUS = 120;
  const TURTLE2_PROFITABLE_TRADE_BONUS = 85;
  const TURTLE2_QUEEN_BLUNDER_PENALTY = 1100;
  const TURTLE2_ROOK_BLUNDER_PENALTY = 620;
  const TURTLE2_BISHOP_BLUNDER_PENALTY = 240;
  const TURTLE2_KNIGHT_BLUNDER_PENALTY = 240;
  const TURTLE2_MINOR_PIECE_UNDER_ATTACK_PENALTY = 95;
  const TURTLE2_MINOR_PIECE_SAVE_BONUS = 125;
  const TURTLE2_QUEEN_SAVE_BONUS = 760;
  const TURTLE2_ROOK_SAVE_BONUS = 430;
  const TURTLE2_CASTLING_BONUS = 150;
  const TURTLE2_EN_PASSANT_BONUS = 55;
  const TURTLE2_RANDOM_NOISE_MAX = 12;
  const TURTLE2_OPENING_RANDOMNESS = 34;
  const TURTLE2_TOP_MOVE_POOL_SIZE = 5;

  function getContext() {
    if (!window.Turtle2BotContext) {
      throw new Error("Turtle 2 bot context is not ready.");
    }

    return window.Turtle2BotContext;
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

  function isSquareAttacked(chessGame, square, byColor) {
    const target = coordsFromSquare(square);
    const pawnDirection = byColor === "w" ? 1 : -1;

    for (let i = 0; i < 2; i++) {
      const file = target.file + (i === 0 ? -1 : 1);
      const rank = target.rank - pawnDirection;

      if (isInsideBoard(file, rank)) {
        const piece = chessGame.get(squareFromCoords(file, rank));

        if (piece && piece.color === byColor && piece.type === "p") {
          return true;
        }
      }
    }

    const knightOffsets = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
    for (let i = 0; i < knightOffsets.length; i++) {
      const file = target.file + knightOffsets[i][0];
      const rank = target.rank + knightOffsets[i][1];

      if (isInsideBoard(file, rank)) {
        const piece = chessGame.get(squareFromCoords(file, rank));

        if (piece && piece.color === byColor && piece.type === "n") {
          return true;
        }
      }
    }

    const kingOffsets = [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]];
    for (let i = 0; i < kingOffsets.length; i++) {
      const file = target.file + kingOffsets[i][0];
      const rank = target.rank + kingOffsets[i][1];

      if (isInsideBoard(file, rank)) {
        const piece = chessGame.get(squareFromCoords(file, rank));

        if (piece && piece.color === byColor && piece.type === "k") {
          return true;
        }
      }
    }

    const sliderLines = [
      { offsets: [[1, 0], [-1, 0], [0, 1], [0, -1]], pieces: ["r", "q"] },
      { offsets: [[1, 1], [1, -1], [-1, 1], [-1, -1]], pieces: ["b", "q"] }
    ];

    for (let line = 0; line < sliderLines.length; line++) {
      for (let i = 0; i < sliderLines[line].offsets.length; i++) {
        let file = target.file + sliderLines[line].offsets[i][0];
        let rank = target.rank + sliderLines[line].offsets[i][1];

        while (isInsideBoard(file, rank)) {
          const piece = chessGame.get(squareFromCoords(file, rank));

          if (piece) {
            if (piece.color === byColor && sliderLines[line].pieces.includes(piece.type)) {
              return true;
            }

            break;
          }

          file += sliderLines[line].offsets[i][0];
          rank += sliderLines[line].offsets[i][1];
        }
      }
    }

    return false;
  }

  function isPieceHanging(chessGame, square, color) {
    const ctx = getContext();
    const opponentColor = ctx.oppositeColor(color);
    return !isSquareAttacked(chessGame, square, color) && isSquareAttacked(chessGame, square, opponentColor);
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
      const isDiagonal = absFile === absRank;
      const isStraight = fileDelta === 0 || rankDelta === 0;
      return (isDiagonal || isStraight) && isPathClear(chessGame, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    return false;
  }

  function getAttackersOfSquare(chessGame, square, byColor) {
    const rows = chessGame.board();
    const attackers = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        const from = boardArraySquare(rowIndex, colIndex);

        if (!piece || piece.color !== byColor || from === square) {
          return;
        }

        if (doesPieceAttackSquare(chessGame, from, square)) {
          attackers.push({
            square: from,
            piece: piece
          });
        }
      });
    });

    return attackers;
  }

  function findHangingPieces(chessGame, color, types) {
    const rows = chessGame.board();
    const hangingPieces = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== color || !types.includes(piece.type)) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        if (isPieceHanging(chessGame, square, color)) {
          hangingPieces.push({
            square: square,
            piece: piece,
            attackers: getAttackersOfSquare(chessGame, square, getContext().oppositeColor(color))
          });
        }
      });
    });

    return hangingPieces;
  }

  function findThreatenedPieces(chessGame, color, types) {
    const ctx = getContext();
    const rows = chessGame.board();
    const threatenedPieces = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== color || !types.includes(piece.type)) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const attackers = getAttackersOfSquare(chessGame, square, ctx.oppositeColor(color));

        if (attackers.length) {
          threatenedPieces.push({
            square: square,
            piece: piece,
            attackers: attackers
          });
        }
      });
    });

    return threatenedPieces;
  }

  function isSeriousThreat(chessGame, threat) {
    const ctx = getContext();
    const pieceValues = ctx.pieceValues;
    const threatenedValue = pieceValues[threat.piece.type] || 0;

    return threat.attackers.some(function (attacker) {
      const attackerValue = pieceValues[attacker.piece.type] || 0;
      return attacker.piece.type === "p" || attackerValue <= threatenedValue;
    }) || isPieceHanging(chessGame, threat.square, threat.piece.color);
  }

  function isOpeningPhase(chessGame) {
    const historyLength = chessGame.history().length;
    const fullmoveNumber = Number(chessGame.fen().split(" ")[5]) || 1;
    return historyLength <= 12 || fullmoveNumber <= 6;
  }

  function blunderPenaltyForPiece(pieceType) {
    if (pieceType === "q") {
      return TURTLE2_QUEEN_BLUNDER_PENALTY;
    }

    if (pieceType === "r") {
      return TURTLE2_ROOK_BLUNDER_PENALTY;
    }

    if (pieceType === "b") {
      return TURTLE2_BISHOP_BLUNDER_PENALTY;
    }

    if (pieceType === "n") {
      return TURTLE2_KNIGHT_BLUNDER_PENALTY;
    }

    return 0;
  }

  function saveBonusForPiece(pieceType) {
    if (pieceType === "q") {
      return TURTLE2_QUEEN_SAVE_BONUS;
    }

    if (pieceType === "r") {
      return TURTLE2_ROOK_SAVE_BONUS;
    }

    if (pieceType === "b" || pieceType === "n") {
      return TURTLE2_MINOR_PIECE_SAVE_BONUS;
    }

    return 0;
  }

  function countDevelopedMinorPieces(chessGame, color) {
    const homeRank = color === "w" ? "1" : "8";

    return ["b", "c", "f", "g"].reduce(function (count, file) {
      const piece = chessGame.get(file + homeRank);
      return count + (!piece || piece.color !== color || piece.type !== "n" && piece.type !== "b" ? 1 : 0);
    }, 0);
  }

  function centerBonus(square) {
    if (["d4", "e4", "d5", "e5"].includes(square)) {
      return 12;
    }

    if (["c3", "d3", "e3", "f3", "c4", "f4", "c5", "f5", "c6", "d6", "e6", "f6"].includes(square)) {
      return 5;
    }

    return 0;
  }

  function moveFlagIncludes(move, flag) {
    return typeof move.flags === "string" && move.flags.indexOf(flag) !== -1;
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

  function evaluateTurtle2Move(move) {
    const ctx = getContext();
    const game = ctx.game;
    const pieceValues = ctx.pieceValues;
    const movingPiece = game.get(move.from);

    if (!movingPiece) {
      return -Infinity;
    }

    const botColor = movingPiece.color;
    const opponentColor = ctx.oppositeColor(botColor);
    const botWasInCheck = game.in_check();
    const movingValue = pieceValues[movingPiece.type] || 0;
    const targetValue = pieceValues[move.captured] || 0;
    const targetWasHanging = move.captured ? isPieceHanging(game, move.to, opponentColor) : false;
    const hangingMajorPiecesBefore = findHangingPieces(game, botColor, ["q", "r"]);
    const threatenedMajorPiecesBefore = findThreatenedPieces(game, botColor, ["q", "r"]);
    const seriousMajorThreatsBefore = threatenedMajorPiecesBefore.filter(function (threat) {
      return !isPieceHanging(game, threat.square, botColor) && isSeriousThreat(game, threat);
    });
    const hangingMinorPiecesBefore = findHangingPieces(game, botColor, ["b", "n"]);
    const threatenedMinorPiecesBefore = findThreatenedPieces(game, botColor, ["b", "n"]);
    const seriousMinorThreatsBefore = threatenedMinorPiecesBefore.filter(function (threat) {
      return isSeriousThreat(game, threat);
    });
    let score = centerBonus(move.to);

    if (move.captured) {
      score += targetValue * 35;
    }

    if (targetWasHanging) {
      score += TURTLE2_CAPTURE_HANGING_BONUS + targetValue * 18;
    }

    if (move.captured && targetValue > movingValue) {
      score += TURTLE2_PROFITABLE_TRADE_BONUS + (targetValue - movingValue) * 24;
    }

    if (move.captured && targetValue < movingValue && isSquareAttacked(game, move.to, opponentColor)) {
      score -= 45 + (movingValue - targetValue) * 20;
    }

    if (moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q")) {
      score += TURTLE2_CASTLING_BONUS;
    }

    if (moveFlagIncludes(move, "e")) {
      score += TURTLE2_EN_PASSANT_BONUS;
    }

    if ((movingPiece.type === "n" || movingPiece.type === "b") && move.from[1] === (botColor === "w" ? "1" : "8")) {
      score += 28;
    }

    if (movingPiece.type === "q" && !move.captured && countDevelopedMinorPieces(game, botColor) < 2) {
      score -= 28;
    }

    hangingMajorPiecesBefore.forEach(function (threat) {
      const movesThreatenedPiece = move.from === threat.square;
      const capturesAttacker = threat.attackers.some(function (attacker) {
        return move.to === attacker.square;
      });
      const saveBonus = saveBonusForPiece(threat.piece.type);

      if (movesThreatenedPiece) {
        score += saveBonus;
      }

      if (capturesAttacker) {
        score += saveBonus + 55;
      }
    });

    seriousMajorThreatsBefore.forEach(function (threat) {
      const movesThreatenedPiece = move.from === threat.square;
      const capturesAttacker = threat.attackers.some(function (attacker) {
        return move.to === attacker.square;
      });
      const saveBonus = saveBonusForPiece(threat.piece.type);

      if (movesThreatenedPiece) {
        score += saveBonus;
      }

      if (capturesAttacker) {
        score += saveBonus + 55;
      }
    });

    hangingMinorPiecesBefore.forEach(function (threat) {
      const movesThreatenedPiece = move.from === threat.square;
      const capturesAttacker = threat.attackers.some(function (attacker) {
        return move.to === attacker.square;
      });

      if (movesThreatenedPiece) {
        score += TURTLE2_MINOR_PIECE_SAVE_BONUS;
      }

      if (capturesAttacker) {
        score += TURTLE2_MINOR_PIECE_SAVE_BONUS + 25;
      }
    });

    threatenedMinorPiecesBefore.forEach(function (threat) {
      const movesThreatenedPiece = move.from === threat.square;
      const capturesAttacker = threat.attackers.some(function (attacker) {
        return move.to === attacker.square;
      });

      if (movesThreatenedPiece) {
        score += isSeriousThreat(game, threat) ? TURTLE2_MINOR_PIECE_SAVE_BONUS : TURTLE2_MINOR_PIECE_SAVE_BONUS / 2;
      }

      if (capturesAttacker) {
        score += isSeriousThreat(game, threat) ? TURTLE2_MINOR_PIECE_SAVE_BONUS : TURTLE2_MINOR_PIECE_SAVE_BONUS / 2;
      }
    });

    score += applyMoveForScore(move, function () {
      const opponentKing = getKingSquare(game, opponentColor);
      const hangingMajorPiecesAfter = findHangingPieces(game, botColor, ["q", "r"]);
      const threatenedMajorPiecesAfter = findThreatenedPieces(game, botColor, ["q", "r"]);
      const hangingMinorPiecesAfter = findHangingPieces(game, botColor, ["b", "n"]);
      const threatenedMinorPiecesAfter = findThreatenedPieces(game, botColor, ["b", "n"]);
      let afterScore = 0;

      if (game.in_checkmate()) {
        return TURTLE2_CHECKMATE_SCORE;
      }

      if (botWasInCheck) {
        afterScore += TURTLE2_ESCAPE_CHECK_BONUS;
      }

      if (game.in_check()) {
        afterScore += TURTLE2_CHECK_BONUS;
      }

      if (isSquareAttacked(game, move.to, opponentColor)) {
        const movedPiecePenalty = blunderPenaltyForPiece(movingPiece.type);
        afterScore -= movedPiecePenalty || movingValue * 18;
      }

      hangingMajorPiecesAfter.forEach(function (item) {
        afterScore -= blunderPenaltyForPiece(item.piece.type);
      });

      threatenedMajorPiecesAfter.forEach(function (item) {
        if (!isPieceHanging(game, item.square, botColor) && isSeriousThreat(game, item)) {
          afterScore -= blunderPenaltyForPiece(item.piece.type) * 0.75;
        }
      });

      hangingMinorPiecesAfter.forEach(function (item) {
        afterScore -= blunderPenaltyForPiece(item.piece.type);
      });

      threatenedMinorPiecesAfter.forEach(function (item) {
        if (isSeriousThreat(game, item)) {
          afterScore -= TURTLE2_MINOR_PIECE_UNDER_ATTACK_PENALTY;
        }
      });

      hangingMajorPiecesBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);

        if (!pieceStillThere || pieceStillThere.color !== botColor || pieceStillThere.type !== threat.piece.type || !isPieceHanging(game, threat.square, botColor)) {
          afterScore += saveBonusForPiece(threat.piece.type);
        }
      });

      seriousMajorThreatsBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);

        if (!pieceStillThere || pieceStillThere.color !== botColor || pieceStillThere.type !== threat.piece.type || !isSeriousThreat(game, threat)) {
          afterScore += saveBonusForPiece(threat.piece.type);
        }
      });

      hangingMinorPiecesBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);

        if (!pieceStillThere || pieceStillThere.color !== botColor || pieceStillThere.type !== threat.piece.type || !isPieceHanging(game, threat.square, botColor)) {
          afterScore += TURTLE2_MINOR_PIECE_SAVE_BONUS;
        }
      });

      threatenedMinorPiecesBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);

        if (pieceStillThere && pieceStillThere.color === botColor && pieceStillThere.type === threat.piece.type && !isSquareAttacked(game, threat.square, opponentColor)) {
          afterScore += TURTLE2_MINOR_PIECE_SAVE_BONUS / 2;
        }
      });

      seriousMinorThreatsBefore.forEach(function (threat) {
        const pieceStillThere = game.get(threat.square);

        if (!pieceStillThere || pieceStillThere.color !== botColor || pieceStillThere.type !== threat.piece.type || !isSeriousThreat(game, threat)) {
          afterScore += TURTLE2_MINOR_PIECE_SAVE_BONUS;
        }
      });

      if (opponentKing) {
        afterScore += Math.max(0, 4 - Math.abs(coordsFromSquare(move.to).file - coordsFromSquare(opponentKing).file)) * 2;
      }

      return afterScore;
    });

    return score;
  }

  function chooseTurtle2BotMove() {
    const ctx = getContext();
    const game = ctx.game;
    const moves = game.moves({ verbose: true });

    if (!moves.length) {
      return null;
    }

    const scoredMoves = moves.map(function (move) {
      return {
        move: move,
        score: evaluateTurtle2Move(move)
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (DEBUG_TURTLE2_BOT) {
      console.log("Turtle 2 candidates", scoredMoves.slice(0, 6).map(function (item) {
        return item.move.san + ": " + item.score;
      }));
    }

    if (scoredMoves[0].score >= TURTLE2_CHECKMATE_SCORE) {
      return scoredMoves[0].move;
    }

    if (game.in_check()) {
      return scoredMoves[0].move;
    }

    const botColor = game.turn();
    const opponentColor = ctx.oppositeColor(botColor);
    const urgentMajorPieces = findHangingPieces(game, botColor, ["q", "r"]).concat(
      findThreatenedPieces(game, botColor, ["q", "r"]).filter(function (threat) {
        return isSeriousThreat(game, threat);
      })
    );
    const urgentMinorPieces = findHangingPieces(game, botColor, ["b", "n"]);
    const seriousMinorThreats = findThreatenedPieces(game, botColor, ["b", "n"]).filter(function (threat) {
      return isSeriousThreat(game, threat);
    });
    const freeMajorCapture = moves.some(function (move) {
      return move.captured && (move.captured === "q" || move.captured === "r") && isPieceHanging(game, move.to, opponentColor);
    });

    if (urgentMajorPieces.length || freeMajorCapture) {
      return scoredMoves[0].move;
    }

    if (urgentMinorPieces.length || seriousMinorThreats.length) {
      return scoredMoves[0].move;
    }

    const bestScore = scoredMoves[0].score;
    const openingPhase = isOpeningPhase(game);
    const poolSize = openingPhase ? TURTLE2_TOP_MOVE_POOL_SIZE : 3;
    const scoreWindow = openingPhase ? 55 : 18;
    const noiseMax = openingPhase ? TURTLE2_OPENING_RANDOMNESS : TURTLE2_RANDOM_NOISE_MAX;
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

  window.chooseTurtle2BotMove = chooseTurtle2BotMove;
  window.evaluateTurtle2Move = evaluateTurtle2Move;
})();
