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
    const ctx = getContext();
    const value = ctx.pieceValues[item.piece.type] || 0;

    if (item.piece.type === "q" || item.piece.type === "r") {
      return item.attackers.length > 0;
    }

    if (item.piece.type === "b" || item.piece.type === "n") {
      if (isPieceHanging(chessGame, item.square, color)) {
        return true;
      }

      return item.attackers.some(function (attacker) {
        return (ctx.pieceValues[attacker.piece.type] || 0) <= value || attacker.piece.type === "p";
      });
    }

    return false;
  }

  function findImportantPieceDangers(chessGame, color) {
    return findThreatenedPieces(chessGame, color, ["q", "r", "b", "n"]).filter(function (item) {
      return isSeriousThreat(chessGame, item, color);
    });
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
    const intent = getTurtle3MoveIntent(move);

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
    const threatenedPiecesBefore = findThreatenedPieces(game, botColor, ["q", "r", "b", "n"]);
    const importantDangersBefore = findImportantPieceDangers(game, botColor);
    const hangingPiecesBefore = findHangingPieces(game, botColor, ["q", "r", "b", "n"]);
    const lastBotMove = ctx.getLastBotMove();
    let score = centerBonus(move.to);

    if (move.captured) {
      score += targetValue * 38;
    }

    if (targetWasHanging) {
      score += TURTLE3_CAPTURE_HANGING_BONUS + targetValue * 20;
    }

    if (move.captured && targetValue > movingValue) {
      score += TURTLE3_PROFITABLE_TRADE_BONUS + (targetValue - movingValue) * 26;
    }

    if (move.captured && targetValue < movingValue && isSquareAttacked(game, move.to, opponentColor)) {
      score -= 55 + (movingValue - targetValue) * 24;
    }

    score += scoreTurtle3Intent(move);

    if (phase === "opening") {
      if (!importantDangersBefore.length && isOpeningHomeMinor(move.from, movingPiece)) {
        score += TURTLE3_OPENING_DEVELOPMENT_BONUS;
      }

      if (!importantDangersBefore.length && (moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q"))) {
        score += TURTLE3_CASTLING_BONUS;
      }

      if (movingPiece.type === "q" && !move.captured && !game.in_check()) {
        score -= TURTLE3_EARLY_QUEEN_PENALTY;
      }

      if (movingPiece.type === "r" && move.from[1] === (botColor === "w" ? "1" : "8") && !move.captured) {
        score -= TURTLE3_EARLY_ROOK_PENALTY;
      }

      if (!importantDangersBefore.length && !hasCastled(game, botColor) && Number(game.fen().split(" ")[5]) >= 8 && !(moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q"))) {
        score -= 45;
      }

      if (lastBotMove && lastBotMove.piece === movingPiece.type && lastBotMove.to === move.from && !move.captured) {
        score -= TURTLE3_REPEATED_PIECE_PENALTY;
      }
    } else if (phase === "middlegame") {
      if (game.in_check()) {
        score += TURTLE3_CHECK_BONUS / 2;
      }
    } else if (movingPiece.type === "k") {
      score += kingActivityBonus(move.to, botColor);
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

      if (isSquareAttacked(game, move.to, opponentColor)) {
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

  function chooseFromScored(scoredMoves, phase) {
    const bestScore = scoredMoves[0].score;
    const poolSize = phase === "opening" ? 5 : 4;
    const scoreWindow = phase === "opening" ? 46 : phase === "middlegame" ? 28 : 38;
    const noiseMax = phase === "opening" ? TURTLE3_RANDOM_NOISE_MAX + 10 : TURTLE3_RANDOM_NOISE_MAX;
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
      "": ["e4", "d4", "c4", "Nf3"],
      "e4": ["e5", "c5", "e6", "d6"],
      "d4": ["d5", "Nf6"],
      "c4": ["e5", "Nf6", "c5"],
      "Nf3": ["d5", "Nf6"],
      "e4 e5": ["Nf3", "Nc3", "Bc4"],
      "e4 c5": ["Nf3", "Nc3"],
      "e4 e6": ["d4", "Nc3"],
      "e4 d6": ["d4", "Nf3"],
      "d4 d5": ["c4", "Nf3", "Nc3"],
      "d4 Nf6": ["c4", "Nf3"],
      "Nf3 d5": ["d4", "g3"],
      "c4 e5": ["Nc3", "Nf3"]
    };

    return book[key] || [];
  }

  function isLightBookMove(move, movingPiece, color) {
    const homeRank = color === "w" ? "1" : "8";

    if (moveFlagIncludes(move, "k") || moveFlagIncludes(move, "q")) {
      return true;
    }

    if (movingPiece.type === "n") {
      const targetFile = coordsFromSquare(move.to).file;
      return isOpeningHomeMinor(move.from, movingPiece) && targetFile > 0 && targetFile < 7;
    }

    if (isOpeningHomeMinor(move.from, movingPiece)) {
      return true;
    }

    if (movingPiece.type === "p" && ["c", "d", "e"].includes(move.from[0]) && Math.abs(Number(move.to[1]) - Number(move.from[1])) <= 2) {
      return true;
    }

    if (movingPiece.type === "b" && move.from[1] === homeRank && ["c4", "b5", "e2", "g5", "c5", "b4", "e7", "g4", "f5"].includes(move.to)) {
      return true;
    }

    return false;
  }

  function getTurtle3OpeningBookMoves(scoredMoves) {
    const ctx = getContext();
    const game = ctx.game;
    const history = game.history();
    const directBookSans = openingBookSans(history);
    const lastBotMove = ctx.getLastBotMove();
    const directCandidates = scoredMoves.filter(function (item) {
      return directBookSans.includes(normalizeSan(item.move.san));
    });

    if (directCandidates.length) {
      return directCandidates.filter(function (item) {
        return applyMoveForScore(item.move, function () {
          return !findImportantPieceDangers(game, game.turn()).length;
        });
      }).filter(function (item) {
        return item.score >= scoredMoves[0].score - 260;
      }).slice(0, 5);
    }

    const candidates = scoredMoves.filter(function (item) {
      const movingPiece = game.get(item.move.from);

      if (!movingPiece || movingPiece.type === "q") {
        return false;
      }

      if (lastBotMove && lastBotMove.piece === movingPiece.type && lastBotMove.to === item.move.from && !item.move.captured) {
        return false;
      }

      return isLightBookMove(item.move, movingPiece, game.turn());
    });

    return candidates.filter(function (item) {
      return applyMoveForScore(item.move, function () {
        return !findImportantPieceDangers(game, game.turn()).length;
      });
    }).filter(function (item) {
      return item.score >= scoredMoves[0].score - 85;
    }).slice(0, 5);
  }

  function chooseTurtle3OpeningBookMove(scoredMoves) {
    const ctx = getContext();
    const game = ctx.game;
    const botColor = game.turn();

    if (findImportantPieceDangers(game, botColor).length) {
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
    const freeImportantCapture = moves.some(function (move) {
      return move.captured &&
        ["q", "r", "b", "n"].includes(move.captured) &&
        isPieceHanging(game, move.to, opponentColor);
    });

    if (importantPieceDangers.length || freeImportantCapture) {
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

    return chooseFromScored(scoredMoves, phase);
  }

  window.chooseTurtle3BotMove = chooseTurtle3BotMove;
  window.evaluateTurtle3Move = evaluateTurtle3Move;
  window.detectTurtle3Phase = detectTurtle3Phase;
  window.getTurtle3MoveIntent = getTurtle3MoveIntent;
  window.scoreTurtle3Intent = scoreTurtle3Intent;
})();
