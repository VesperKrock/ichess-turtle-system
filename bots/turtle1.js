(function () {
  "use strict";

  const KING_CAPTURE_SCORE = 10000;
  const KING_DANGER_PENALTY = 5000;
  const QUEEN_BLUNDER_PENALTY = 900;
  const ROOK_BLUNDER_PENALTY = 420;
  const FREE_CAPTURE_BONUS = 130;
  const PROFITABLE_TRADE_BONUS = 90;
  const DEVELOPMENT_BONUS = 30;
  const REPEATED_PIECE_PENALTY = 35;
  const EARLY_ROOK_MOVE_PENALTY = 55;
  const EARLY_QUEEN_MOVE_PENALTY = 45;
  const DEBUG_TURTLE_BOT = false;

  function getContext() {
    if (!window.Turtle1BotContext) {
      throw new Error("Turtle 1 bot context is not ready.");
    }

    return window.Turtle1BotContext;
  }

  function boardArraySquare(row, col) {
    return "abcdefgh"[col] + (8 - row);
  }

  function isSquareAttackedBasic(square, byColor) {
    const ctx = getContext();
    return ctx.getAllTurtlePseudoMoves(byColor).some(function (move) {
      return move.to === square;
    });
  }

  function isKingUnderBasicThreat(color) {
    const ctx = getContext();
    const kingSquare = ctx.getKingSquare(color);
    return Boolean(kingSquare && isSquareAttackedBasic(kingSquare, ctx.oppositeColor(color)));
  }

  function applyTemporaryMove(move, callback) {
    const ctx = getContext();
    const game = ctx.game;
    const movingPiece = game.get(move.from);
    const capturedPiece = game.get(move.to);
    const fenBefore = game.fen();

    if (!movingPiece) {
      return null;
    }

    game.remove(move.from);

    if (capturedPiece) {
      game.remove(move.to);
    }

    game.put({ type: move.promotion || movingPiece.type, color: movingPiece.color }, move.to);

    try {
      return callback(movingPiece, capturedPiece);
    } finally {
      game.load(fenBefore);
    }
  }

  function doesMoveExposeKingToCapture(move, color) {
    const ctx = getContext();
    const result = applyTemporaryMove(move, function (movingPiece) {
      const kingSquare = movingPiece.type === "k" ? move.to : ctx.getKingSquare(color);
      return !kingSquare || isSquareAttackedBasic(kingSquare, ctx.oppositeColor(color));
    });

    return result === null ? true : result;
  }

  function findKingDefenseMoves(color) {
    const ctx = getContext();
    return ctx.getAllTurtlePseudoMoves(color).filter(function (move) {
      return !doesMoveExposeKingToCapture(move, color);
    });
  }

  function getKingSafetyScore(color) {
    const ctx = getContext();
    const kingSquare = ctx.getKingSquare(color);

    if (!kingSquare) {
      return -KING_DANGER_PENALTY;
    }

    let score = isSquareAttackedBasic(kingSquare, ctx.oppositeColor(color)) ? -KING_DANGER_PENALTY : 0;
    const kingMoves = ctx.getTurtlePseudoMovesFrom(kingSquare).filter(function (move) {
      return !doesMoveExposeKingToCapture(move, color);
    });

    score += Math.min(kingMoves.length, 4) * 12;
    return score;
  }

  function getAttackersOfSquare(square, byColor) {
    const ctx = getContext();
    return ctx.getAllTurtlePseudoMoves(byColor).filter(function (move) {
      return move.to === square;
    });
  }

  function findHighValuePiecesUnderAttack(color) {
    const ctx = getContext();
    const rows = ctx.game.board();
    const piecesUnderAttack = [];

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== color || piece.type !== "q" && piece.type !== "r" && piece.type !== "k") {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const attackers = getAttackersOfSquare(square, ctx.oppositeColor(color));

        if (attackers.length) {
          piecesUnderAttack.push({
            square: square,
            piece: piece,
            attackers: attackers
          });
        }
      });
    });

    return piecesUnderAttack;
  }

  function debugTurtleCandidates(label, scoredMoves) {
    if (!DEBUG_TURTLE_BOT) {
      return;
    }

    console.log(label, scoredMoves.slice(0, 5).map(function (item) {
      return item.move.from + "-" + item.move.to + ": " + item.score;
    }));
  }

  function getKingSafetyScoreAfterMove(move, color) {
    const result = applyTemporaryMove(move, function () {
      return getKingSafetyScore(color);
    });

    return result === null ? -KING_DANGER_PENALTY : result;
  }

  function moveLooksSafe(move) {
    const ctx = getContext();
    const result = applyTemporaryMove(move, function (movingPiece) {
      return !isSquareAttackedBasic(move.to, ctx.oppositeColor(movingPiece.color));
    });

    return result === null ? false : result;
  }

  function countDevelopedMinorPieces(color) {
    const ctx = getContext();
    const homeRank = color === "w" ? "1" : "8";

    return ["b", "c", "f", "g"].reduce(function (count, file) {
      const piece = ctx.game.get(file + homeRank);
      return count + (!piece || piece.color !== color || piece.type !== "n" && piece.type !== "b" ? 1 : 0);
    }, 0);
  }

  function isBackRankRookMove(move, piece) {
    const homeRank = piece.color === "w" ? "1" : "8";
    return piece.type === "r" && move.from[1] === homeRank && move.to[1] === homeRank;
  }

  function centerBonus(square) {
    if (["d4", "e4", "d5", "e5"].includes(square)) {
      return 8;
    }

    if (["c3", "d3", "e3", "f3", "c4", "f4", "c5", "f5", "c6", "d6", "e6", "f6"].includes(square)) {
      return 4;
    }

    return 0;
  }

  function scoreTurtle1PromotionTestMove(move) {
    const ctx = getContext();
    const game = ctx.game;
    const pieceValues = ctx.pieceValues;
    const attacker = game.get(move.from);

    if (!attacker) {
      return -KING_DANGER_PENALTY;
    }

    const targetValue = pieceValues[move.captured] || 0;
    const attackerValue = pieceValues[attacker.type] || 0;
    const opponentColor = ctx.oppositeColor(attacker.color);
    const targetDefended = move.captured ? isSquareAttackedBasic(move.to, opponentColor) : false;
    const safeAfterMove = moveLooksSafe(move);
    const minorPiecesDeveloped = countDevelopedMinorPieces(attacker.color);
    const exposesKing = doesMoveExposeKingToCapture(move, attacker.color);
    const kingInDanger = isKingUnderBasicThreat(attacker.color);
    const kingSafetyAfter = getKingSafetyScoreAfterMove(move, attacker.color);
    const highValueThreats = findHighValuePiecesUnderAttack(attacker.color);
    const lastBotMove = ctx.getLastBotMove();
    let score = centerBonus(move.to);

    if (move.captured === "k") {
      return KING_CAPTURE_SCORE;
    }

    if (exposesKing) {
      score -= KING_DANGER_PENALTY;
    }

    if (kingInDanger && !exposesKing) {
      score += 600;
    }

    score += kingSafetyAfter;

    highValueThreats.forEach(function (threat) {
      const threatenedValue = pieceValues[threat.piece.type] || 0;
      const isMovingThreatenedPiece = move.from === threat.square;
      const capturesAttacker = threat.attackers.some(function (attackerMove) {
        return move.to === attackerMove.from;
      });

      if (isMovingThreatenedPiece && safeAfterMove) {
        score += 70 + threatenedValue * 20;
      }

      if (capturesAttacker && safeAfterMove) {
        score += 90 + threatenedValue * 16;
      }

      if (!isMovingThreatenedPiece && !capturesAttacker && threat.piece.type === "q") {
        score -= 80;
      }
    });

    if (move.captured && (!targetDefended || safeAfterMove)) {
      score += FREE_CAPTURE_BONUS + targetValue * 22;
    }

    if (move.captured && targetValue >= pieceValues.r && (!targetDefended || safeAfterMove)) {
      score += 260 + targetValue * 25;
    }

    if (move.captured && targetValue > attackerValue) {
      score += PROFITABLE_TRADE_BONUS + (targetValue - attackerValue) * 18;
    }

    if (move.captured && targetDefended && !safeAfterMove) {
      score -= 70 + attackerValue * 18;
    }

    if (attacker.type === "n" || attacker.type === "b") {
      const homeRank = attacker.color === "w" ? "1" : "8";

      if (move.from[1] === homeRank) {
        score += DEVELOPMENT_BONUS;
      }
    }

    if (attacker.type === "q" && !move.captured && minorPiecesDeveloped < 2) {
      score -= EARLY_QUEEN_MOVE_PENALTY;
    }

    if (isBackRankRookMove(move, attacker) && !move.captured) {
      score -= EARLY_ROOK_MOVE_PENALTY;
    }

    if (!safeAfterMove) {
      score -= 25 + attackerValue * 8;
    }

    if (attacker.type === "q" && !safeAfterMove) {
      score -= QUEEN_BLUNDER_PENALTY;
    }

    if (attacker.type === "r" && !safeAfterMove) {
      score -= ROOK_BLUNDER_PENALTY;
    }

    if (attacker.type === "k" && !safeAfterMove) {
      score -= KING_DANGER_PENALTY;
    }

    if (lastBotMove && lastBotMove.piece === attacker.type && lastBotMove.to === move.from && !move.captured) {
      score -= REPEATED_PIECE_PENALTY;
    }

    if (lastBotMove && lastBotMove.from === move.to && lastBotMove.to === move.from) {
      score -= REPEATED_PIECE_PENALTY * 2;
    }

    return score;
  }

  function chooseTurtle1NewbornBotMove() {
    const ctx = getContext();
    const game = ctx.game;
    const moves = ctx.getAllTurtlePseudoMoves(game.turn());

    if (!moves.length) {
      return null;
    }

    const kingCapture = moves.find(function (move) {
      return move.captured === "k";
    });

    if (kingCapture) {
      return kingCapture;
    }

    if (isKingUnderBasicThreat(game.turn())) {
      const defenseMoves = findKingDefenseMoves(game.turn());

      if (defenseMoves.length) {
        return defenseMoves.map(function (move) {
          return {
            move: move,
            score: scoreTurtle1PromotionTestMove(move)
          };
        }).sort(function (a, b) {
          return b.score - a.score;
        })[0].move;
      }
    }

    const scoredMoves = moves.map(function (move) {
      const piece = game.get(move.from);
      const targetValue = ctx.pieceValues[move.captured] || 0;
      const safe = moveLooksSafe(move);
      const exposesKing = doesMoveExposeKingToCapture(move, piece.color);
      let score = centerBonus(move.to);

      if (move.captured && safe) {
        score += FREE_CAPTURE_BONUS + targetValue * 15;
      } else if (move.captured) {
        score += targetValue * 8;
      }

      if (exposesKing) {
        score -= KING_DANGER_PENALTY / 2;
      }

      if (piece.type === "q" && !safe) {
        score -= QUEEN_BLUNDER_PENALTY / 2;
      }

      if (piece.type === "r" && !safe) {
        score -= ROOK_BLUNDER_PENALTY / 2;
      }

      if ((piece.type === "n" || piece.type === "b") && move.from[1] === (piece.color === "w" ? "1" : "8")) {
        score += DEVELOPMENT_BONUS;
      }

      return {
        move: move,
        score: score
      };
    });

    scoredMoves.sort(function (a, b) {
      return b.score - a.score;
    });

    debugTurtleCandidates("Turtle newborn candidates", scoredMoves);
    return scoredMoves[0].move;
  }

  function chooseTurtle1PromotionTestBotMove() {
    const ctx = getContext();
    const game = ctx.game;
    const moves = ctx.getAllTurtlePseudoMoves(game.turn());

    if (!moves.length) {
      return null;
    }

    const kingCapture = moves.find(function (move) {
      return move.captured === "k";
    });

    if (kingCapture) {
      return kingCapture;
    }

    if (isKingUnderBasicThreat(game.turn())) {
      const defenseMoves = findKingDefenseMoves(game.turn());

      if (defenseMoves.length) {
        const scoredDefenseMoves = defenseMoves.map(function (move) {
          return {
            move: move,
            score: scoreTurtle1PromotionTestMove(move)
          };
        }).sort(function (a, b) {
          return b.score - a.score;
        });

        debugTurtleCandidates("Turtle promotion defense candidates", scoredDefenseMoves);
        return scoredDefenseMoves[0].move;
      }
    }

    const scoredMoves = moves.map(function (move) {
      return {
        move: move,
        score: scoreTurtle1PromotionTestMove(move)
      };
    });

    scoredMoves.sort(function (a, b) {
      return b.score - a.score;
    });

    debugTurtleCandidates("Turtle promotion candidates", scoredMoves);
    const bestScore = scoredMoves[0].score;

    const mustTake = scoredMoves.find(function (item) {
      return item.move.captured && (ctx.pieceValues[item.move.captured] || 0) >= ctx.pieceValues.r && item.score >= 300;
    });

    if (mustTake) {
      return mustTake.move;
    }

    if (bestScore >= 220) {
      return scoredMoves[0].move;
    }

    const candidates = scoredMoves.slice(0, 2).filter(function (item) {
      return item.score >= bestScore - 12;
    });

    return candidates[Math.floor(Math.random() * candidates.length)].move;
  }

  function chooseTurtle1StandardBotMove() {
    return chooseTurtle1PromotionTestBotMove();
  }

  function chooseTurtle1BotMove(kind) {
    return kind === "newborn" ? chooseTurtle1NewbornBotMove() : chooseTurtle1PromotionTestBotMove();
  }

  window.isSquareAttackedBasic = isSquareAttackedBasic;
  window.isKingUnderBasicThreat = isKingUnderBasicThreat;
  window.getKingSafetyScore = getKingSafetyScore;
  window.doesMoveExposeKingToCapture = doesMoveExposeKingToCapture;
  window.findKingDefenseMoves = findKingDefenseMoves;
  window.scoreTurtle1PromotionTestMove = scoreTurtle1PromotionTestMove;
  window.chooseTurtle1BotMove = chooseTurtle1BotMove;
  window.chooseTurtle1NewbornBotMove = chooseTurtle1NewbornBotMove;
  window.chooseTurtle1PromotionTestBotMove = chooseTurtle1PromotionTestBotMove;
  window.chooseTurtle1StandardBotMove = chooseTurtle1StandardBotMove;
})();
