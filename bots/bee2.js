(function () {
  "use strict";

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
  };

  const ADVANTAGE_STATES = {
    BALANCED: "BALANCED",
    SLIGHTLY_AHEAD: "SLIGHTLY_AHEAD",
    MODERATELY_AHEAD: "MODERATELY_AHEAD",
    CLEARLY_AHEAD: "CLEARLY_AHEAD",
    WINNING_AHEAD: "WINNING_AHEAD",
    BEHIND: "BEHIND"
  };

  const ENABLE_BEE2_FINAL_TACTICAL_SCORING = false;

  function oppositeColor(color) {
    return color === "w" ? "b" : "w";
  }

  function getPieceValue(piece) {
    return piece ? PIECE_VALUES[piece.type] || 0 : 0;
  }

  function getMaterialForColor(game, color) {
    return game.board().reduce(function (total, row) {
      return total + row.reduce(function (rowTotal, piece) {
        if (!piece || piece.color !== color) {
          return rowTotal;
        }

        return rowTotal + getPieceValue(piece);
      }, 0);
    }, 0);
  }

  function getMaterialBalance(game, botColor) {
    return getMaterialForColor(game, botColor) - getMaterialForColor(game, oppositeColor(botColor));
  }

  function countNonKingNonPawnPieces(game, color) {
    return game.board().reduce(function (total, row) {
      return total + row.reduce(function (rowTotal, piece) {
        if (!piece || piece.type === "k" || piece.type === "p") {
          return rowTotal;
        }

        if (color && piece.color !== color) {
          return rowTotal;
        }

        return rowTotal + 1;
      }, 0);
    }, 0);
  }

  function detectEndgame(game) {
    return countNonKingNonPawnPieces(game) <= 6;
  }

  function boardArraySquare(row, col) {
    return "abcdefgh"[col] + (8 - row);
  }

  function coordsFromSquare(square) {
    return {
      file: "abcdefgh".indexOf(square[0]),
      rank: Number(square[1]) - 1
    };
  }

  function squareFromCoords(file, rank) {
    return "abcdefgh"[file] + (rank + 1);
  }

  function isInsideBoard(file, rank) {
    return file >= 0 && file < 8 && rank >= 0 && rank < 8;
  }

  function findKingSquare(game, color) {
    let kingSquare = null;

    game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        if (piece && piece.type === "k" && piece.color === color) {
          kingSquare = boardArraySquare(rowIndex, colIndex);
          return true;
        }

        return false;
      });
    });

    return kingSquare;
  }

  function getDistance(squareA, squareB) {
    if (!squareA || !squareB) {
      return 0;
    }

    const coordsA = coordsFromSquare(squareA);
    const coordsB = coordsFromSquare(squareB);

    return Math.abs(coordsA.file - coordsB.file) + Math.abs(coordsA.rank - coordsB.rank);
  }

  function isPathClear(game, fromCoords, toCoords, fileStep, rankStep) {
    let file = fromCoords.file + fileStep;
    let rank = fromCoords.rank + rankStep;

    while (file !== toCoords.file || rank !== toCoords.rank) {
      if (game.get(squareFromCoords(file, rank))) {
        return false;
      }

      file += fileStep;
      rank += rankStep;
    }

    return true;
  }

  function doesPieceAttackSquare(game, from, targetSquare) {
    const piece = game.get(from);

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
      return absFile === absRank && isPathClear(game, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "r") {
      return (fileDelta === 0 || rankDelta === 0) && isPathClear(game, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "q") {
      const straight = fileDelta === 0 || rankDelta === 0;
      const diagonal = absFile === absRank;
      return (straight || diagonal) && isPathClear(game, fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    return false;
  }

  function getAdjacentSquares(square) {
    if (!square) {
      return [];
    }

    const coords = coordsFromSquare(square);
    const squares = [];

    for (let fileDelta = -1; fileDelta <= 1; fileDelta++) {
      for (let rankDelta = -1; rankDelta <= 1; rankDelta++) {
        if (fileDelta === 0 && rankDelta === 0) {
          continue;
        }

        const file = coords.file + fileDelta;
        const rank = coords.rank + rankDelta;

        if (isInsideBoard(file, rank)) {
          squares.push(squareFromCoords(file, rank));
        }
      }
    }

    return squares;
  }

  function getEdgeDistance(square) {
    const coords = coordsFromSquare(square);
    return Math.min(coords.file, coords.rank, 7 - coords.file, 7 - coords.rank);
  }

  function getCornerDistance(square) {
    return Math.min(
      getDistance(square, "a1"),
      getDistance(square, "a8"),
      getDistance(square, "h1"),
      getDistance(square, "h8")
    );
  }

  function hasOpponentPawnAhead(game, file, rank, color) {
    const opponentColor = oppositeColor(color);
    const direction = color === "w" ? 1 : -1;
    let currentRank = rank + direction;

    while (isInsideBoard(file, currentRank)) {
      const piece = game.get(squareFromCoords(file, currentRank));

      if (piece && piece.type === "p" && piece.color === opponentColor) {
        return true;
      }

      currentRank += direction;
    }

    return false;
  }

  function detectPassedPawns(game, color) {
    const passedPawns = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.type !== "p" || piece.color !== color) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const coords = coordsFromSquare(square);
        const filesToCheck = [coords.file - 1, coords.file, coords.file + 1].filter(function (file) {
          return isInsideBoard(file, coords.rank);
        });
        const blockedByOpponentPawn = filesToCheck.some(function (file) {
          return hasOpponentPawnAhead(game, file, coords.rank, color);
        });

        if (!blockedByOpponentPawn) {
          passedPawns.push({
            square: square,
            color: color,
            rank: coords.rank,
            file: coords.file,
            promotionDistance: color === "w" ? 7 - coords.rank : coords.rank
          });
        }
      });
    });

    return passedPawns;
  }

  function getCenterDistance(square) {
    return Math.min(
      getDistance(square, "d4"),
      getDistance(square, "e4"),
      getDistance(square, "d5"),
      getDistance(square, "e5")
    );
  }

  function evaluateKingCentralization(game, move, botColor) {
    if (!move || move.piece !== "k" || !detectEndgame(game)) {
      return 0;
    }

    const beforeDistance = getCenterDistance(move.from);
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    const afterDistance = getCenterDistance(move.to);
    let score = 0;

    if (afterDistance < beforeDistance) {
      score += 120;
    } else if (afterDistance <= 2) {
      score += 40;
    }

    game.undo();
    return score;
  }

  function hasPieceType(game, color, pieceType) {
    return game.board().some(function (row) {
      return row.some(function (piece) {
        return Boolean(piece && piece.color === color && piece.type === pieceType);
      });
    });
  }

  function isSquareAttackedByColor(game, square, color) {
    return game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        return Boolean(piece && piece.color === color && doesPieceAttackSquare(game, boardArraySquare(rowIndex, colIndex), square));
      });
    });
  }

  function getKingZoneSquares(square) {
    if (!square) {
      return [];
    }

    const kingCoords = coordsFromSquare(square);
    const squares = [];

    for (let file = kingCoords.file - 2; file <= kingCoords.file + 2; file++) {
      for (let rank = kingCoords.rank - 2; rank <= kingCoords.rank + 2; rank++) {
        if (isInsideBoard(file, rank) && Math.abs(file - kingCoords.file) + Math.abs(rank - kingCoords.rank) <= 2) {
          squares.push(squareFromCoords(file, rank));
        }
      }
    }

    return squares;
  }

  function getLineInfoBetween(game, fromSquare, toSquare) {
    const fromCoords = coordsFromSquare(fromSquare);
    const toCoords = coordsFromSquare(toSquare);
    const fileDelta = toCoords.file - fromCoords.file;
    const rankDelta = toCoords.rank - fromCoords.rank;

    if (!(fileDelta === 0 || rankDelta === 0 || Math.abs(fileDelta) === Math.abs(rankDelta))) {
      return null;
    }

    const fileStep = Math.sign(fileDelta);
    const rankStep = Math.sign(rankDelta);
    const blockers = [];
    let file = fromCoords.file + fileStep;
    let rank = fromCoords.rank + rankStep;

    while (file !== toCoords.file || rank !== toCoords.rank) {
      const square = squareFromCoords(file, rank);
      const piece = game.get(square);

      if (piece) {
        blockers.push({
          square: square,
          piece: piece
        });
      }

      file += fileStep;
      rank += rankStep;
    }

    return {
      blockers: blockers,
      fileDelta: fileDelta,
      rankDelta: rankDelta
    };
  }

  function isSliderAlignedWithKing(game, fromSquare, kingSquare, pieceType) {
    const lineInfo = getLineInfoBetween(game, fromSquare, kingSquare);

    if (!lineInfo) {
      return false;
    }

    const straight = lineInfo.fileDelta === 0 || lineInfo.rankDelta === 0;
    const diagonal = Math.abs(lineInfo.fileDelta) === Math.abs(lineInfo.rankDelta);

    return (pieceType === "r" && straight) || (pieceType === "b" && diagonal) || pieceType === "q";
  }

  function countPawnShieldGaps(game, botColor, kingSquare) {
    const shieldSquares = botColor === "w" && kingSquare === "g1"
      ? ["f2", "g2", "h2"]
      : botColor === "b" && kingSquare === "g8"
        ? ["f7", "g7", "h7"]
        : [];

    return shieldSquares.filter(function (square) {
      const piece = game.get(square);
      return !piece || piece.color !== botColor || piece.type !== "p";
    }).length;
  }

  function evaluateKingDanger(game, botColor) {
    const kingSquare = findKingSquare(game, botColor);

    if (!kingSquare) {
      return 999;
    }

    const opponentColor = oppositeColor(botColor);
    const kingZone = getKingZoneSquares(kingSquare);
    let danger = 0;
    let nearbyAttackers = 0;
    let queenNear = false;
    let knightNear = false;

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== opponentColor) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const nearKingZone = kingZone.some(function (zoneSquare) {
          return getDistance(square, zoneSquare) <= 1;
        });

        if (piece.type === "q" && nearKingZone) {
          danger += 250;
          queenNear = true;
          nearbyAttackers++;
        }

        if (piece.type === "n" && nearKingZone) {
          danger += 180;
          knightNear = true;
          nearbyAttackers++;
        }

        if ((piece.type === "b" || piece.type === "r" || piece.type === "q") && kingZone.some(function (zoneSquare) {
          return doesPieceAttackSquare(game, square, zoneSquare);
        })) {
          danger += 120;
          nearbyAttackers++;
        }

        if (piece.type === "q" || piece.type === "r" || piece.type === "b") {
          const lineInfo = getLineInfoBetween(game, square, kingSquare);

          if (lineInfo && isSliderAlignedWithKing(game, square, kingSquare, piece.type)) {
            if (lineInfo.blockers.length === 0) {
              danger += 300;
            } else if (lineInfo.blockers.length === 1) {
              danger += 150;
            }
          }
        }
      });
    });

    if (nearbyAttackers >= 2) {
      danger += 200;
    }

    if (queenNear && knightNear) {
      danger += 300;
    }

    if (countPawnShieldGaps(game, botColor, kingSquare) > 0) {
      danger += 150;
    }

    return danger;
  }

  function evaluateKingSafetyInEndgame(game, move, botColor) {
    if (!move || move.piece !== "k") {
      return {
        safe: true,
        risk: 0
      };
    }

    const appliedMove = playMove(game, move);
    let risk = 0;

    if (!appliedMove) {
      return {
        safe: false,
        risk: 999
      };
    }

    const opponentColor = oppositeColor(botColor);
    const botKingSquare = findKingSquare(game, botColor);

    if (!botKingSquare || isSquareAttackedByColor(game, botKingSquare, opponentColor)) {
      risk += 999;
    }

    if (hasPieceType(game, opponentColor, "q")) {
      risk += 120;
    }

    if (hasPieceType(game, opponentColor, "r")) {
      risk += 80;
    }

    game.undo();

    return {
      safe: risk < 999,
      risk: risk
    };
  }

  function getForwardSquare(square, color) {
    const coords = coordsFromSquare(square);
    const nextRank = coords.rank + (color === "w" ? 1 : -1);

    if (!isInsideBoard(coords.file, nextRank)) {
      return null;
    }

    return squareFromCoords(coords.file, nextRank);
  }

  function findPassedPawn(passedPawns, square) {
    return (passedPawns || []).find(function (pawn) {
      return pawn.square === square;
    }) || null;
  }

  function getMostAdvancedPassedPawn(passedPawns) {
    return (passedPawns || []).slice().sort(function (a, b) {
      return a.promotionDistance - b.promotionDistance;
    })[0] || null;
  }

  function canOpponentCaptureSquare(game, square) {
    return game.moves({ verbose: true }).some(function (reply) {
      return reply.to === square && Boolean(reply.captured);
    });
  }

  function evaluatePassedPawnPush(game, move, botColor, context) {
    if (!context || !context.isEndgame || !move || move.piece !== "p") {
      return 0;
    }

    const passedPawn = findPassedPawn(context.botPassedPawns, move.from);

    if (!passedPawn) {
      return 0;
    }

    const beforeDistance = passedPawn.promotionDistance;
    const afterCoords = coordsFromSquare(move.to);
    const afterDistance = botColor === "w" ? 7 - afterCoords.rank : afterCoords.rank;
    const appliedMove = playMove(game, move);
    let score = 0;

    if (!appliedMove) {
      return 0;
    }

    if (afterDistance < beforeDistance) {
      score += 120;
    }

    const botKingSquare = findKingSquare(game, botColor);
    const pawnCanBeCaptured = canOpponentCaptureSquare(game, move.to);

    if (botKingSquare && getDistance(botKingSquare, move.to) <= 2) {
      score += 80;
    } else {
      score -= 80;
    }

    if (pawnCanBeCaptured) {
      score -= 300;
    } else {
      score += 100;
    }

    game.undo();
    return score;
  }

  function evaluatePromotionSupport(game, move, botColor, context) {
    if (!context || !context.isEndgame || !move) {
      return 0;
    }

    const mainPawn = getMostAdvancedPassedPawn(context.botPassedPawns);

    if (!mainPawn) {
      return 0;
    }

    const frontSquare = getForwardSquare(mainPawn.square, botColor);
    const beforeKingSquare = findKingSquare(game, botColor);
    const beforeKingDistance = beforeKingSquare ? getDistance(beforeKingSquare, mainPawn.square) : 99;
    const appliedMove = playMove(game, move);
    let score = 0;

    if (!appliedMove) {
      return 0;
    }

    const afterKingSquare = findKingSquare(game, botColor);
    const movedPiece = game.get(move.to);

    if (move.piece === "k" && afterKingSquare && getDistance(afterKingSquare, mainPawn.square) < beforeKingDistance) {
      score += 100;
    }

    if (movedPiece && (movedPiece.type === "r" || movedPiece.type === "q") && frontSquare && doesPieceAttackSquare(game, move.to, frontSquare)) {
      score += 120;
    }

    if (frontSquare && (move.to === frontSquare || doesPieceAttackSquare(game, move.to, frontSquare))) {
      score += 80;
    }

    game.undo();
    return score;
  }

  function evaluateOpponentPromotionThreat(game, botColor, context) {
    if (!context || !context.isEndgame || !context.opponentPassedPawns || !context.opponentPassedPawns.length) {
      return 0;
    }

    const closestPawn = getMostAdvancedPassedPawn(context.opponentPassedPawns);

    if (!closestPawn) {
      return 0;
    }

    if (closestPawn.promotionDistance <= 1) {
      return 600;
    }

    if (closestPawn.promotionDistance === 2) {
      return 450;
    }

    if (closestPawn.promotionDistance === 3) {
      return 300;
    }

    return 120;
  }

  function evaluateStopOpponentPassedPawn(game, move, botColor, context) {
    if (!context || !context.isEndgame || !move || !context.opponentPassedPawns || !context.opponentPassedPawns.length) {
      return 0;
    }

    const opponentColor = oppositeColor(botColor);
    let score = 0;

    context.opponentPassedPawns.forEach(function (pawn) {
      const frontSquare = getForwardSquare(pawn.square, opponentColor);

      if (frontSquare && move.to === frontSquare) {
        score += 150;
      }

      if (move.captured === "p" && move.to === pawn.square) {
        score += 200;
      }

      if (move.piece === "k" && (getDistance(move.to, pawn.square) <= 2 || frontSquare && getDistance(move.to, frontSquare) <= 2)) {
        score += 120;
      }
    });

    return score;
  }

  function evaluatePieceCoordinationEndgame(game, move, botColor, context) {
    if (!context || !context.isEndgame || !move) {
      return 0;
    }

    const mainPawn = getMostAdvancedPassedPawn(context.botPassedPawns);

    if (!mainPawn) {
      return 0;
    }

    const beforeDistance = getDistance(move.from, mainPawn.square);
    const frontSquare = getForwardSquare(mainPawn.square, botColor);
    const appliedMove = playMove(game, move);
    let score = 0;

    if (!appliedMove) {
      return 0;
    }

    const botKingSquare = findKingSquare(game, botColor);
    const movedPiece = game.get(move.to);
    const afterDistance = getDistance(move.to, mainPawn.square);

    if (botKingSquare && getDistance(botKingSquare, mainPawn.square) <= 2) {
      score += 100;
    }

    if (movedPiece && (movedPiece.type === "r" || movedPiece.type === "q") && (doesPieceAttackSquare(game, move.to, mainPawn.square) || frontSquare && doesPieceAttackSquare(game, move.to, frontSquare))) {
      score += 100;
    }

    if (afterDistance <= 3) {
      score += 60;
    }

    if ((move.piece === "r" || move.piece === "q") && afterDistance > beforeDistance) {
      score -= 80;
    }

    game.undo();
    return score;
  }

  function evaluateCutOffEnemyKing(game, move, botColor) {
    if (!move || (move.piece !== "r" && move.piece !== "q")) {
      return 0;
    }

    const opponentColor = oppositeColor(botColor);
    const enemyKingBefore = findKingSquare(game, opponentColor);
    const mainPawnBefore = getMostAdvancedPassedPawn(detectPassedPawns(game, botColor));
    const enemyKingDistanceBefore = mainPawnBefore && enemyKingBefore ? getDistance(enemyKingBefore, mainPawnBefore.square) : null;
    const appliedMove = playMove(game, move);
    let score = 0;

    if (!appliedMove) {
      return 0;
    }

    const enemyKingAfter = findKingSquare(game, opponentColor) || enemyKingBefore;
    const movedPiece = game.get(move.to);
    const mainPawnAfter = getMostAdvancedPassedPawn(detectPassedPawns(game, botColor));

    if (enemyKingAfter && movedPiece && (movedPiece.type === "r" || movedPiece.type === "q")) {
      const kingCoords = coordsFromSquare(enemyKingAfter);
      const pieceCoords = coordsFromSquare(move.to);

      if (kingCoords.file === pieceCoords.file || kingCoords.rank === pieceCoords.rank) {
        score += 120;
      }

      if (mainPawnAfter) {
        const frontSquare = getForwardSquare(mainPawnAfter.square, botColor);

        if (enemyKingDistanceBefore !== null && getDistance(enemyKingAfter, mainPawnAfter.square) > enemyKingDistanceBefore) {
          score += 100;
        }

        if (frontSquare && (move.to === frontSquare || doesPieceAttackSquare(game, move.to, frontSquare))) {
          score += 80;
        }
      }
    }

    game.undo();
    return score;
  }

  function playMove(game, move) {
    return game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
  }

  function getLastVerboseMove(game) {
    if (!game || typeof game.history !== "function") {
      return null;
    }

    try {
      const verboseHistory = game.history({ verbose: true });
      return verboseHistory.length ? verboseHistory[verboseHistory.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  function isOpeningPhase(game) {
    return game.history().length < 12;
  }

  function hasMovedPieceFromSquare(game, color, fromSquare) {
    return game.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === color && pastMove.from === fromSquare;
    });
  }

  function affectsCenter(move) {
    return ["d4", "e4", "d5", "e5", "c3", "d3", "e3", "f3", "c4", "f4", "c5", "d6", "e6", "f6"].includes(move.to);
  }

  function controlsCenterAfterMove(game, move) {
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    const controlsCenter = ["d4", "e4", "d5", "e5"].some(function (square) {
      return doesPieceAttackSquare(game, move.to, square);
    });
    game.undo();
    return controlsCenter;
  }

  function justPlayedE4(game, botColor) {
    const history = game.history({ verbose: true });
    const lastMove = history[history.length - 1];

    return Boolean(lastMove && lastMove.color === oppositeColor(botColor) && lastMove.piece === "p" && lastMove.to === "e4");
  }

  function hasPlayedOpeningCenterPawn(game, botColor) {
    return game.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === botColor && pastMove.piece === "p" && (pastMove.to === "e5" || pastMove.to === "d5");
    });
  }

  function isWithinFirstTwoBotMoves(game, botColor) {
    return game.history({ verbose: true }).filter(function (pastMove) {
      return pastMove.color === botColor;
    }).length < 2;
  }

  function isInitialKnightMove(move, botColor) {
    return move.piece === "n" && (botColor === "w" ? move.from[1] === "1" : move.from[1] === "8");
  }

  function isMovingAttackedPiece(game, move, botColor) {
    return getAttackersOfSquare(game, move.from, oppositeColor(botColor)).length > 0;
  }

  function defendsAttackedPieceAfterMove(game, move, botColor) {
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    const defendsAttackedPiece = game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        const square = boardArraySquare(rowIndex, colIndex);

        return piece && piece.color === botColor
          && square !== move.to
          && getAttackersOfSquare(game, square, oppositeColor(botColor)).length
          && doesPieceAttackSquare(game, move.to, square);
      });
    });
    game.undo();
    return defendsAttackedPiece;
  }

  function hasSimpleOpeningReason(game, move, botColor) {
    return Boolean(move.captured || isCheckMove(move) || isMovingAttackedPiece(game, move, botColor) || defendsAttackedPieceAfterMove(game, move, botColor) || controlsCenterAfterMove(game, move));
  }

  function isOffRepertoireKnightJump(move) {
    return move.piece === "n" && ["b4", "b5", "g4", "g5", "a3", "h3", "a5", "h5", "c5"].includes(move.to);
  }

  function hasPlayedNf6(game) {
    return hasPiece(game, "f6", "n", "b") || hasPlayedMove(game, "b", "g8", "f6");
  }

  function isBlackCastled(game) {
    return hasPiece(game, "g8", "k", "b") || hasPlayedMove(game, "b", "e8", "g8");
  }

  function isEarlyItalianCentralBreak(game, move, botColor) {
    return botColor === "b"
      && move.from === "d7"
      && move.to === "d5"
      && whiteOpenedWithE4(game)
      && (hasPiece(game, "e5", "p", "b") || hasPlayedMove(game, "b", "e7", "e5"))
      && (hasPiece(game, "c6", "n", "b") || hasPlayedMove(game, "b", "b8", "c6"))
      && (hasPiece(game, "c5", "b", "b") || hasPlayedMove(game, "b", "f8", "c5"))
      && !hasPlayedNf6(game)
      && !isBlackCastled(game);
  }

  function isRuyLopezPosition(game, botColor) {
    return botColor === "b"
      && hasPiece(game, "e4", "p", "w")
      && hasPiece(game, "e5", "p", "b")
      && hasPiece(game, "f3", "n", "w")
      && hasPiece(game, "c6", "n", "b")
      && hasPiece(game, "b5", "b", "w");
  }

  function isNormalRuyLopezKnightPressure(game, square, piece, botColor) {
    return botColor === "b"
      && square === "c6"
      && piece
      && piece.type === "n"
      && (isRuyLopezPosition(game, botColor) || isRuyLopezBa4Continuation(game, botColor))
      && hasPiece(game, "d7", "p", "b");
  }

  function isRuyLopezBa4Continuation(game, botColor) {
    return botColor === "b"
      && hasPiece(game, "e4", "p", "w")
      && hasPiece(game, "e5", "p", "b")
      && hasPiece(game, "f3", "n", "w")
      && hasPiece(game, "c6", "n", "b")
      && hasPiece(game, "a4", "b", "w")
      && hasPlayedMove(game, "b", "a7", "a6");
  }

  function hasUndevelopedMinorPiece(game, botColor) {
    return botColor === "w"
      ? Boolean(hasPiece(game, "b1", "n", "w") || hasPiece(game, "g1", "n", "w") || hasPiece(game, "c1", "b", "w") || hasPiece(game, "f1", "b", "w"))
      : Boolean(hasPiece(game, "b8", "n", "b") || hasPiece(game, "g8", "n", "b") || hasPiece(game, "c8", "b", "b") || hasPiece(game, "f8", "b", "b"));
  }

  function hasUndevelopedBackRankBishop(game, botColor) {
    return botColor === "w"
      ? Boolean(hasPiece(game, "c1", "b", "w") || hasPiece(game, "f1", "b", "w"))
      : Boolean(hasPiece(game, "c8", "b", "b") || hasPiece(game, "f8", "b", "b"));
  }

  function isOpeningDevelopmentPhase(game, botColor) {
    return isOpeningPhase(game) || hasUndevelopedMinorPiece(game, botColor);
  }

  function hasPawnOnFile(game, color, file) {
    return game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        return piece && piece.color === color && piece.type === "p" && boardArraySquare(rowIndex, colIndex)[0] === file;
      });
    });
  }

  function isFileOpenOrSemiOpenForRook(game, move, botColor) {
    return !hasPawnOnFile(game, botColor, move.to[0]);
  }

  function isEarlyRookMoveWithoutOpenFile(game, move, botColor) {
    if (!isOpeningDevelopmentPhase(game, botColor) || !move || move.piece !== "r" || move.captured || isCheckMove(move)) {
      return false;
    }

    const materialEmergencies = detectMaterialEmergencyFallback(game, botColor);

    if (materialEmergencies.length && handlesMaterialEmergencyFallback(move, materialEmergencies[0])) {
      return false;
    }

    return hasUndevelopedMinorPiece(game, botColor) && !isFileOpenOrSemiOpenForRook(game, move, botColor);
  }

  function isItalianStructure(game, botColor) {
    return botColor === "b"
      && hasPiece(game, "e4", "p", "w")
      && hasPiece(game, "e5", "p", "b")
      && hasPiece(game, "f3", "n", "w")
      && hasPiece(game, "c6", "n", "b");
  }

  function isBe3AttackingBishopC5(game, botColor) {
    return isItalianStructure(game, botColor)
      && hasPiece(game, "e3", "b", "w")
      && hasPiece(game, "c5", "b", "b");
  }

  function isItalianBishopRetreatedToB6(game, botColor) {
    return isItalianStructure(game, botColor)
      && hasPiece(game, "e3", "b", "w")
      && hasPiece(game, "b6", "b", "b");
  }

  function isRepeatKnightMoveWithoutNeed(game, move, botColor) {
    return move.piece === "n"
      && !isInitialKnightMove(move, botColor)
      && hasMovedPieceFromSquare(game, botColor, move.from)
      && hasUndevelopedMinorPiece(game, botColor)
      && !move.captured
      && !isCheckMove(move)
      && !isMovingAttackedPiece(game, move, botColor)
      && !defendsAttackedPieceAfterMove(game, move, botColor);
  }

  function evaluateOpeningPrinciples(game, move, botColor) {
    if (!isOpeningDevelopmentPhase(game, botColor)) {
      return 0;
    }

    let score = 0;

    if (["e4", "d4", "e5", "d5"].includes(move.to)) {
      score += 60;
    }

    if (move.piece === "n") {
      if (isInitialKnightMove(move, botColor)) {
        score += 35;
      }

      if (["c3", "f3", "c6", "f6"].includes(move.to)) {
        score += 50;
      }

      if (move.to[0] === "a" || move.to[0] === "h") {
        score -= 320;
      }

      if (!hasSimpleOpeningReason(game, move, botColor) && !isInitialKnightMove(move, botColor)) {
        score -= 350;
      }

      if (isOffRepertoireKnightJump(move) && !move.captured && !isCheckMove(move) && !defendsAttackedPieceAfterMove(game, move, botColor)) {
        score -= 380;
      }

      if (isRepeatKnightMoveWithoutNeed(game, move, botColor)) {
        score -= 500;
      }

      if ((botColor === "b" && ["b8", "g8"].includes(move.to)) || (botColor === "w" && ["b1", "g1"].includes(move.to))) {
        score -= 220;
      }

      if (move.to === "f6" && justPlayedE4(game, botColor) && !hasPlayedOpeningCenterPawn(game, botColor) && isWithinFirstTwoBotMoves(game, botColor)) {
        score -= 420;
      }

      if (isRuyLopezPosition(game, botColor) && move.from === "c6" && ["d4", "e7", "b4", "a5", "h5"].includes(move.to)) {
        score -= move.to === "e7" ? 800 : 700;
      }
    }

    if (move.piece === "b" && ["c4", "b5", "f4", "c5"].includes(move.to)) {
      score += 45;
    }

    if (isCastlingMove(move)) {
      score += 80;
    }

    if (move.piece === "p" && (move.from[0] === "e" || move.from[0] === "d") && Math.abs(Number(move.to[1]) - Number(move.from[1])) === 2) {
      score += 50;
    }

    if (hasMovedPieceFromSquare(game, botColor, move.from)) {
      score -= hasSimpleOpeningReason(game, move, botColor) ? 0 : 300;
    }

    if (move.piece === "q" && game.history().length < 8) {
      score -= 380;
    }

    if (isEarlyItalianCentralBreak(game, move, botColor) && !hasSimpleOpeningReason(game, move, botColor)) {
      score -= 380;
    }

    if (isBe3AttackingBishopC5(game, botColor) && move.from === "c5" && move.to === "d6" && hasPiece(game, "c8", "b", "b")) {
      score -= 220;
    }

    if (isEarlyRookMoveWithoutOpenFile(game, move, botColor)) {
      score -= 700;
    }

    if (!affectsCenter(move)) {
      score -= 50;
    }

    return score;
  }

  function findMove(candidateMoves, from, to) {
    return candidateMoves.find(function (move) {
      return move.from === from && move.to === to;
    }) || null;
  }

  function hasPiece(game, square, type, color) {
    const piece = game.get(square);

    return Boolean(piece && piece.type === type && piece.color === color);
  }

  function hasPlayedMove(game, color, from, to) {
    return game.history({ verbose: true }).some(function (move) {
      return move.color === color && move.from === from && move.to === to;
    });
  }

  function whiteOpenedWithE4(game) {
    const firstMove = game.history({ verbose: true })[0];

    return Boolean(firstMove && firstMove.color === "w" && firstMove.piece === "p" && firstMove.from === "e2" && firstMove.to === "e4");
  }

  function chooseFirstAvailable(candidateMoves, preferredMoves) {
    for (let index = 0; index < preferredMoves.length; index++) {
      const move = findMove(candidateMoves, preferredMoves[index].from, preferredMoves[index].to);

      if (move) {
        return move;
      }
    }

    return null;
  }

  function chooseStrictIchessOpeningMove(game, botColor, candidateMoves) {
    if ((!isOpeningPhase(game) && !hasUndevelopedMinorPiece(game, botColor)) || !candidateMoves.length) {
      return null;
    }

    if (botColor === "w") {
      return chooseFirstAvailable(candidateMoves, [
        { from: "e2", to: "e4" },
        { from: "g1", to: "f3" },
        { from: "f1", to: "c4" },
        { from: "b1", to: "c3" },
        { from: "e1", to: "g1" },
        { from: "d2", to: "d3" }
      ]);
    }

    if (botColor !== "b" || !whiteOpenedWithE4(game)) {
      return null;
    }

    const blackHasE5 = hasPiece(game, "e5", "p", "b") || hasPlayedMove(game, "b", "e7", "e5");
    const blackHasNc6 = hasPiece(game, "c6", "n", "b") || hasPlayedMove(game, "b", "b8", "c6");
    const blackHasBc5 = hasPiece(game, "c5", "b", "b") || hasPlayedMove(game, "b", "f8", "c5");

    if (isBe3AttackingBishopC5(game, botColor)) {
      return chooseFirstAvailable(candidateMoves, [
        { from: "c5", to: "e3" },
        { from: "c5", to: "b6" },
        { from: "c5", to: "e7" }
      ]);
    }

    if (isItalianBishopRetreatedToB6(game, botColor)) {
      return chooseFirstAvailable(candidateMoves, [
        { from: "b6", to: "e3" },
        { from: "b6", to: "a5" },
        { from: "d7", to: "d6" },
        { from: "c8", to: "e6" },
        { from: "c8", to: "g4" },
        { from: "c8", to: "d7" },
        { from: "h7", to: "h6" },
        { from: "f8", to: "e8" }
      ]);
    }

    if (isRuyLopezPosition(game, botColor)) {
      return chooseFirstAvailable(candidateMoves, [
        { from: "a7", to: "a6" },
        { from: "g8", to: "f6" },
        { from: "d7", to: "d6" },
        { from: "f8", to: "c5" },
        { from: "f8", to: "e7" },
        { from: "e8", to: "g8" }
      ]);
    }

    if (isRuyLopezBa4Continuation(game, botColor)) {
      return chooseFirstAvailable(candidateMoves, [
        { from: "g8", to: "f6" },
        { from: "d7", to: "d6" },
        { from: "f8", to: "e7" },
        { from: "b7", to: "b5" },
        { from: "f8", to: "c5" }
      ]);
    }

    if (!blackHasE5) {
      return findMove(candidateMoves, "e7", "e5");
    }

    if (!blackHasNc6) {
      return findMove(candidateMoves, "b8", "c6");
    }

    if (!blackHasBc5) {
      return findMove(candidateMoves, "f8", "c5");
    }

    if (hasUndevelopedBackRankBishop(game, botColor) && hasPlayedNf6(game) && isBlackCastled(game)) {
      const bishopMove = chooseFirstAvailable(candidateMoves, [
        { from: "c8", to: "e6" },
        { from: "c8", to: "g4" },
        { from: "c8", to: "d7" },
        { from: "f8", to: "c5" },
        { from: "f8", to: "e7" },
        { from: "f8", to: "b4" }
      ]);

      if (bishopMove) {
        return bishopMove;
      }
    }

    return chooseFirstAvailable(candidateMoves, [
      { from: "g8", to: "f6" },
      { from: "d7", to: "d6" },
      { from: "e8", to: "g8" },
      { from: "c8", to: "e6" }
    ]);
  }

  function isGameCheck(game) {
    if (typeof game.in_check === "function") {
      return game.in_check();
    }

    if (typeof game.isCheck === "function") {
      return game.isCheck();
    }

    return false;
  }

  function isGameCheckmate(game) {
    if (typeof game.in_checkmate === "function") {
      return game.in_checkmate();
    }

    if (typeof game.isCheckmate === "function") {
      return game.isCheckmate();
    }

    return false;
  }

  function isCheckMove(move) {
    return Boolean(move && typeof move.san === "string" && move.san.indexOf("+") !== -1);
  }

  function isPromotionMove(move) {
    return Boolean(move && (move.promotion || typeof move.flags === "string" && move.flags.indexOf("p") !== -1));
  }

  function isCastlingMove(move) {
    return Boolean(move && typeof move.flags === "string" && (move.flags.indexOf("k") !== -1 || move.flags.indexOf("q") !== -1));
  }

  function isDevelopingMinorMove(move, botColor) {
    if (!move || (move.piece !== "n" && move.piece !== "b")) {
      return false;
    }

    return botColor === "w" ? move.from[1] === "1" : move.from[1] === "8";
  }

  function isCenterPawnMove(move) {
    return Boolean(move && move.piece === "p" && (move.to === "d4" || move.to === "e4" || move.to === "d5" || move.to === "e5"));
  }

  function getAttackersOfSquare(game, square, color) {
    const attackers = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        const from = boardArraySquare(rowIndex, colIndex);

        if (piece && piece.color === color && doesPieceAttackSquare(game, from, square)) {
          attackers.push({
            square: from,
            piece: piece,
            value: getPieceValue(piece)
          });
        }
      });
    });

    return attackers;
  }

  function isBotKingAttacked(game, botColor) {
    const kingSquare = findKingSquare(game, botColor);

    return !kingSquare || isSquareAttackedByColor(game, kingSquare, oppositeColor(botColor));
  }

  function isMoveNearEnemyKingWhenWinning(game, move, botColor) {
    const context = buildBee2Context(game, botColor);

    if (context.advantageState !== ADVANTAGE_STATES.WINNING_AHEAD) {
      return false;
    }

    const enemyKing = findKingSquare(game, oppositeColor(botColor));

    return Boolean(enemyKing && getDistance(move.to, enemyKing) <= 3);
  }

  function hasBasicMoveIntent(game, move, botColor) {
    return Boolean(move.captured
      || isCheckMove(move)
      || isPromotionMove(move)
      || isDevelopingMinorMove(move, botColor)
      || isCastlingMove(move)
      || isCenterPawnMove(move)
      || move.piece === "k" && detectEndgame(game)
      || isMoveNearEnemyKingWhenWinning(game, move, botColor));
  }

  function callsPublicBee1Reject(game, move, botColor) {
    if (window.Bee1Bot && typeof window.Bee1Bot.rejectMoveIfViolatesLowerLevels === "function") {
      return window.Bee1Bot.rejectMoveIfViolatesLowerLevels(game, move, botColor);
    }

    if (window.BotLevels && typeof window.BotLevels.rejectMoveIfViolatesLowerLevels === "function") {
      return window.BotLevels.rejectMoveIfViolatesLowerLevels(game, move, botColor);
    }

    if (window.BeeBot && typeof window.BeeBot.rejectMoveIfViolatesLowerLevels === "function") {
      return window.BeeBot.rejectMoveIfViolatesLowerLevels(game, move, botColor);
    }

    return null;
  }

  function isSlidingPiece(piece) {
    return Boolean(piece && (piece.type === "b" || piece.type === "r" || piece.type === "q"));
  }

  function isSquareBetween(attackerSquare, targetSquare, blockSquare) {
    const attackerCoords = coordsFromSquare(attackerSquare);
    const targetCoords = coordsFromSquare(targetSquare);
    const blockCoords = coordsFromSquare(blockSquare);
    const fileDelta = targetCoords.file - attackerCoords.file;
    const rankDelta = targetCoords.rank - attackerCoords.rank;
    const fileStep = Math.sign(fileDelta);
    const rankStep = Math.sign(rankDelta);

    if (!(fileDelta === 0 || rankDelta === 0 || Math.abs(fileDelta) === Math.abs(rankDelta))) {
      return false;
    }

    let file = attackerCoords.file + fileStep;
    let rank = attackerCoords.rank + rankStep;

    while (file !== targetCoords.file || rank !== targetCoords.rank) {
      if (file === blockCoords.file && rank === blockCoords.rank) {
        return true;
      }

      file += fileStep;
      rank += rankStep;
    }

    return false;
  }

  function detectMaterialEmergencyFallback(game, botColor) {
    const opponentColor = oppositeColor(botColor);
    const emergencies = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || piece.type === "k") {
          return;
        }

        const pieceValue = getPieceValue(piece);

        if (pieceValue < PIECE_VALUES.n) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        if (isNormalRuyLopezKnightPressure(game, square, piece, botColor)) {
          return;
        }

        const attackers = getAttackersOfSquare(game, square, opponentColor);

        if (attackers.length) {
          emergencies.push({
            square: square,
            piece: piece,
            pieceValue: pieceValue,
            attackers: attackers
          });
        }
      });
    });

    return emergencies.sort(function (a, b) {
      return b.pieceValue - a.pieceValue || b.attackers.length - a.attackers.length;
    });
  }

  function handlesMaterialEmergencyFallback(move, emergency) {
    if (!emergency) {
      return true;
    }

    if (move.from === emergency.square) {
      return true;
    }

    return emergency.attackers.some(function (attacker) {
      if (move.to === attacker.square && Boolean(move.captured)) {
        return true;
      }

      return isSlidingPiece(attacker.piece) && isSquareBetween(attacker.square, emergency.square, move.to);
    });
  }

  function isDirectRecaptureCandidate(game, move, botColor) {
    const lastMove = getLastVerboseMove(game);

    if (!lastMove || lastMove.color !== oppositeColor(botColor) || !lastMove.captured || !move || !move.captured || move.to !== lastMove.to) {
      return false;
    }

    const targetPiece = game.get(lastMove.to);

    if (!targetPiece || targetPiece.color !== oppositeColor(botColor)) {
      return false;
    }

    return (PIECE_VALUES[lastMove.captured] || 0) >= PIECE_VALUES.n || (PIECE_VALUES[targetPiece.type] || 0) >= PIECE_VALUES.n;
  }

  function rejectMoveIfViolatesLowerLevels(game, move, botColor) {
    const publicBee1Reject = callsPublicBee1Reject(game, move, botColor);

    if (publicBee1Reject === true) {
      return true;
    }

    if (move.captured && captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return true;
    }

    const materialEmergencies = detectMaterialEmergencyFallback(game, botColor);

    if (materialEmergencies.length && !isDirectRecaptureCandidate(game, move, botColor) && !handlesMaterialEmergencyFallback(move, materialEmergencies[0])) {
      return true;
    }

    const movingPieceValue = PIECE_VALUES[move.piece] || 0;
    const capturedValue = PIECE_VALUES[move.captured] || 0;
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return true;
    }

    const opponentColor = oppositeColor(botColor);
    const attackers = getAttackersOfSquare(game, move.to, opponentColor);
    const cheaperAttackers = attackers.filter(function (attacker) {
      return attacker.value < movingPieceValue;
    });
    let reject = false;

    if (isBotKingAttacked(game, botColor)) {
      reject = true;
    }

    if (!reject && move.captured && capturedValue < movingPieceValue && cheaperAttackers.length) {
      reject = true;
    }

    if (!reject && movingPieceValue >= PIECE_VALUES.n && cheaperAttackers.length) {
      reject = true;
    }

    game.undo();

    if (reject) {
      return true;
    }

    return false;
  }

  function getBee2CandidateMoves(game, botColor) {
    if (game.turn && game.turn() !== botColor) {
      return [];
    }

    const legalMoves = game.moves({ verbose: true });
    const safeMoves = legalMoves.filter(function (move) {
      return !rejectMoveIfViolatesLowerLevels(game, move, botColor);
    });

    if (chooseStrictIchessOpeningMove(game, botColor, safeMoves)) {
      return safeMoves;
    }

    if (chooseImportantPawnDefenseMove(game, botColor, safeMoves)) {
      return safeMoves;
    }

    if (chooseUnitStewardshipMove(game, botColor, safeMoves)) {
      return safeMoves;
    }

    const purposefulMoves = safeMoves.filter(function (move) {
      return hasBasicMoveIntent(game, move, botColor);
    });

    if (purposefulMoves.length) {
      return purposefulMoves;
    }

    if (safeMoves.length) {
      return safeMoves;
    }

    return [];
  }

  function findImmediateMateMove(game, candidateMoves) {
    for (let index = 0; index < candidateMoves.length; index++) {
      const move = candidateMoves[index];
      const appliedMove = playMove(game, move);

      if (!appliedMove) {
        continue;
      }

      const isMate = isGameCheckmate(game);
      game.undo();

      if (isMate) {
        return move;
      }
    }

    return null;
  }

  function getCheckingPieces(game, botColor) {
    const kingSquare = findKingSquare(game, botColor);

    if (!kingSquare) {
      return [];
    }

    return getAttackersOfSquare(game, kingSquare, oppositeColor(botColor));
  }

  function classifyCheckResponse(game, move, botColor, checkingPieces) {
    if (!move) {
      return "OTHER";
    }

    if (move.captured && checkingPieces.some(function (checker) {
      return checker.square === move.to;
    })) {
      return "CAPTURE_CHECKER";
    }

    if (move.piece === "k") {
      return "KING_MOVE";
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return "OTHER";
    }

    const resolvesCheck = !isBotKingAttacked(game, botColor);
    game.undo();
    return resolvesCheck ? "BLOCK_CHECK" : "OTHER";
  }

  function evaluateCheckResponseMaterialSafety(game, move, botColor) {
    const checkingPieces = getCheckingPieces(game, botColor);
    const responseType = classifyCheckResponse(game, move, botColor, checkingPieces);
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return -999999;
    }

    if (isBotKingAttacked(game, botColor)) {
      game.undo();
      return -999999;
    }

    const movedPiece = game.get(move.to);

    if (!movedPiece || movedPiece.color !== botColor) {
      game.undo();
      return 0;
    }

    const attackers = getAttackersOfSquare(game, move.to, oppositeColor(botColor));
    const defenders = getAttackersOfSquare(game, move.to, botColor).filter(function (defender) {
      return defender.square !== move.to;
    });
    const movedPieceValue = getPieceValue(movedPiece);
    const minAttackerValue = attackers.length ? Math.min.apply(null, attackers.map(function (attacker) {
      return attacker.value;
    })) : null;
    let score = attackers.length ? 0 : 200;

    if (minAttackerValue !== null) {
      if (minAttackerValue < movedPieceValue) {
        score -= 900;
      }

      if (movedPieceValue >= PIECE_VALUES.n && minAttackerValue <= PIECE_VALUES.p) {
        score -= 1000;
      }

      if (movedPieceValue >= PIECE_VALUES.r && minAttackerValue < movedPieceValue) {
        score -= 1500;
      }

      if (movedPieceValue >= PIECE_VALUES.q && minAttackerValue < movedPieceValue) {
        score -= 2500;
      }

      if (minAttackerValue === movedPieceValue) {
        score -= defenders.length ? 100 : 900;
      }

      if (defenders.length === 0 && movedPieceValue >= PIECE_VALUES.n) {
        score -= 600;
      }
    }

    if (responseType === "CAPTURE_CHECKER") {
      score += 1000;
    }

    game.undo();
    return score;
  }

  function chooseBestCheckResponse(game, botColor, candidateMoves) {
    if (!isGameCheck(game)) {
      return null;
    }

    const checkingPieces = getCheckingPieces(game, botColor);
    const scoredResponses = candidateMoves.map(function (move) {
      const responseType = classifyCheckResponse(game, move, botColor, checkingPieces);
      const materialSafetyScore = evaluateCheckResponseMaterialSafety(game, move, botColor);
      let score = materialSafetyScore;

      if (materialSafetyScore <= -999999) {
        return null;
      }

      if (responseType === "CAPTURE_CHECKER") {
        score += 3000;
      } else if (responseType === "BLOCK_CHECK") {
        score += 1500;
      } else if (responseType === "KING_MOVE") {
        score += 1000;
      }

      if (responseType === "BLOCK_CHECK" && materialSafetyScore <= -900) {
        score -= 1500;
      }

      if (move.piece === "k" && hasMajorPieceHangingAfterMove(game, botColor)) {
        score -= 2000;
      }

      if (move.captured) {
        score += scoreSafeCaptureMove(game, move, botColor) || 0;
      }

      return {
        move: move,
        responseType: responseType,
        materialSafetyScore: materialSafetyScore,
        score: score
      };
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score;
    });

    if (!scoredResponses.length) {
      return null;
    }

    const saferResponses = scoredResponses.filter(function (item) {
      return !(item.responseType === "BLOCK_CHECK" && item.materialSafetyScore <= -900);
    });

    return (saferResponses.length ? saferResponses[0] : scoredResponses[0]).move;
  }

  function getCheapestCaptureToSquare(game, square) {
    const captures = game.moves({ verbose: true }).filter(function (move) {
      return move.to === square && Boolean(move.captured);
    }).sort(function (a, b) {
      return (PIECE_VALUES[a.piece] || 0) - (PIECE_VALUES[b.piece] || 0);
    });

    return captures.length ? captures[0] : null;
  }

  function evaluateCaptureSequenceLite(game, move, botColor) {
    if (!move || !move.captured) {
      return 0;
    }

    const beforeBalance = getMaterialBalance(game, botColor);
    const targetSquare = move.to;
    const appliedMoves = [];
    let currentMove = move;
    let netScore = 0;

    for (let depth = 0; depth < 6 && currentMove; depth++) {
      const appliedMove = playMove(game, currentMove);

      if (!appliedMove) {
        break;
      }

      appliedMoves.push(appliedMove);
      currentMove = getCheapestCaptureToSquare(game, targetSquare);
    }

    netScore = getMaterialBalance(game, botColor) - beforeBalance;

    while (appliedMoves.length) {
      game.undo();
      appliedMoves.pop();
    }

    return netScore;
  }

  function captureSequenceLosesMaterialClearly(game, move, botColor) {
    if (!move || !move.captured) {
      return false;
    }

    const netScore = evaluateCaptureSequenceLite(game, move, botColor);

    if (netScore < -100) {
      return true;
    }

    return move.piece !== "p" && move.captured === "p" && netScore < 0;
  }

  function scoreSafeCaptureMove(game, move, botColor) {
    if (!move || !move.captured || rejectMoveIfViolatesLowerLevels(game, move, botColor)) {
      return null;
    }

    if (captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return null;
    }

    const capturedValue = PIECE_VALUES[move.captured] || 0;
    const movingValue = PIECE_VALUES[move.piece] || 0;
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return null;
    }

    const recaptureLikely = getAttackersOfSquare(game, move.to, oppositeColor(botColor)).length > 0;
    const materialScore = recaptureLikely ? capturedValue - movingValue : capturedValue;
    game.undo();

    if (capturedValue >= PIECE_VALUES.n && materialScore >= 0) {
      return capturedValue * 10 + materialScore;
    }

    if (materialScore >= PIECE_VALUES.p) {
      return materialScore;
    }

    return null;
  }

  function captureLosesMaterialClearly(game, move, botColor) {
    if (!move || !move.captured || rejectMoveIfViolatesLowerLevels(game, move, botColor)) {
      return true;
    }

    if (captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return true;
    }

    const capturedValue = PIECE_VALUES[move.captured] || 0;
    const movingValue = PIECE_VALUES[move.piece] || 0;
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return true;
    }

    const clearlyLoses = getAttackersOfSquare(game, move.to, oppositeColor(botColor)).some(function (attacker) {
      return attacker.value < movingValue && capturedValue < movingValue;
    });
    game.undo();
    return clearlyLoses;
  }

  function findDirectRecaptureMove(game, botColor, candidateMoves) {
    const lastMove = getLastVerboseMove(game);

    if (!lastMove || lastMove.color !== oppositeColor(botColor) || !lastMove.captured) {
      return null;
    }

    const targetSquare = lastMove.to;
    const targetPiece = game.get(targetSquare);

    if (!targetPiece || targetPiece.color !== oppositeColor(botColor)) {
      return null;
    }

    const lostValue = PIECE_VALUES[lastMove.captured] || 0;
    const targetValue = PIECE_VALUES[targetPiece.type] || 0;

    if (lostValue < PIECE_VALUES.n && targetValue < PIECE_VALUES.n) {
      return null;
    }

    const recaptures = candidateMoves.map(function (move) {
      if (!move.captured || move.to !== targetSquare || captureLosesMaterialClearly(game, move, botColor)) {
        return null;
      }

      let score = targetValue * 3 - (PIECE_VALUES[move.piece] || 0) * 0.2;

      if (lastMove.captured === "q") {
        score += 2000;
      } else if (lastMove.captured === "r") {
        score += 1200;
      } else if (lastMove.captured === "b" || lastMove.captured === "n") {
        score += 800;
      } else if (lastMove.captured === "p") {
        score += 100;
      }

      if (botColor === "b" && lastMove.from === "b5" && lastMove.to === "c6" && move.from === "d7" && move.to === "c6") {
        score += 120;
      }

      return {
        move: move,
        score: score
      };
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score;
    });

    return recaptures.length ? recaptures[0].move : null;
  }

  function hasMajorPieceHangingAfterMove(game, botColor) {
    return game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || (piece.type !== "q" && piece.type !== "r")) {
          return false;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const pieceValue = getPieceValue(piece);

        return getAttackersOfSquare(game, square, oppositeColor(botColor)).some(function (attacker) {
          return attacker.value < pieceValue;
        });
      });
    });
  }

  function isHighValueFreeCapture(game, move, botColor) {
    if (!move || !move.captured || (PIECE_VALUES[move.captured] || 0) < PIECE_VALUES.n || rejectMoveIfViolatesLowerLevels(game, move, botColor)) {
      return false;
    }

    if (scoreSafeCaptureMove(game, move, botColor) === null) {
      return false;
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    const unsafe = isGameCheckmate(game) || hasMajorPieceHangingAfterMove(game, botColor);
    game.undo();
    return !unsafe;
  }

  function opponentHasImmediateMateMove(game, botColor) {
    if (game.turn && game.turn() !== oppositeColor(botColor)) {
      return false;
    }

    const opponentMoves = game.moves({ verbose: true });

    return opponentMoves.some(function (move) {
      const appliedMove = playMove(game, move);

      if (!appliedMove) {
        return false;
      }

      const givesMate = isGameCheckmate(game);
      game.undo();
      return givesMate;
    });
  }

  function hasUrgentMateOrCheckThreat(game, botColor) {
    return isGameCheck(game) || opponentHasImmediateMateMove(game, botColor) || evaluateKingDanger(game, botColor) >= 900;
  }

  function blocksLineAttackToKing(game, move, botColor) {
    const kingSquare = findKingSquare(game, botColor);

    if (!kingSquare) {
      return false;
    }

    return game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        if (!piece || piece.color !== oppositeColor(botColor) || (piece.type !== "b" && piece.type !== "r" && piece.type !== "q")) {
          return false;
        }

        const attackerSquare = boardArraySquare(rowIndex, colIndex);
        return isSliderAlignedWithKing(game, attackerSquare, kingSquare, piece.type) && isSquareBetween(attackerSquare, kingSquare, move.to);
      });
    });
  }

  function attacksDangerousPieceAfterPawnMove(game, move, botColor) {
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    const attacksDangerousPiece = game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        const square = boardArraySquare(rowIndex, colIndex);
        return piece && piece.color === oppositeColor(botColor) && (piece.type === "q" || piece.type === "n") && doesPieceAttackSquare(game, move.to, square);
      });
    });
    game.undo();
    return attacksDangerousPiece;
  }

  function attacksDangerousPieceAfterMove(game, move, botColor) {
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    const kingSquare = findKingSquare(game, botColor);
    const kingZone = kingSquare ? getKingZoneSquares(kingSquare) : [];
    const attacksDangerousPiece = game.board().some(function (row, rowIndex) {
      return row.some(function (piece, colIndex) {
        const square = boardArraySquare(rowIndex, colIndex);
        return piece && piece.color === oppositeColor(botColor)
          && (piece.type === "q" || piece.type === "n")
          && kingZone.some(function (zoneSquare) {
            return getDistance(square, zoneSquare) <= 1;
          })
          && doesPieceAttackSquare(game, move.to, square);
      });
    });
    game.undo();
    return attacksDangerousPiece;
  }

  function isKingSidePawnWeakeningMove(game, move, botColor) {
    const kingSquare = findKingSquare(game, botColor);

    if (!kingSquare || (botColor === "w" && kingSquare !== "g1") || (botColor === "b" && kingSquare !== "g8")) {
      return false;
    }

    if (!move || move.piece !== "p" || !["f", "g", "h"].includes(move.from[0]) || move.captured || isHighValueFreeCapture(game, move, botColor)) {
      return false;
    }

    if (attacksDangerousPieceAfterPawnMove(game, move, botColor)) {
      return false;
    }

    return true;
  }

  function evaluateKingSidePawnDiscipline(game, move, botColor) {
    let score = 0;

    if (isKingSidePawnWeakeningMove(game, move, botColor)) {
      score -= 350;
    }

    if (move && move.piece === "p" && ["f", "g", "h"].includes(move.from[0]) && attacksDangerousPieceAfterPawnMove(game, move, botColor)) {
      score += 120;
    }

    return score;
  }

  function evaluateMoveReducesKingDanger(game, move, botColor) {
    const dangerBefore = evaluateKingDanger(game, botColor);
    const capturedPiece = move && move.captured ? game.get(move.to) : null;
    const capturedAttackedKingZone = capturedPiece && (capturedPiece.type === "q" || capturedPiece.type === "n" || capturedPiece.type === "b")
      && getKingZoneSquares(findKingSquare(game, botColor)).some(function (square) {
        return doesPieceAttackSquare(game, move.to, square);
      });
    const blocksLine = blocksLineAttackToKing(game, move, botColor);
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    const dangerAfter = evaluateKingDanger(game, botColor);
    let score = 0;

    if (dangerAfter < dangerBefore) {
      score += (dangerBefore - dangerAfter) * 2;
    }

    if (move.piece === "q" && move.captured === "q" && dangerBefore >= 300) {
      score += 500;
    }

    if (capturedAttackedKingZone) {
      score += 400;
    }

    if (attacksDangerousPieceAfterMove(game, move, botColor)) {
      score += 250;
    }

    if (blocksLine) {
      score += 220;
    }

    game.undo();
    return score;
  }

  function findBestSafeCapture(game, botColor, candidateMoves) {
    const safeCaptures = candidateMoves.map(function (move) {
      return {
        move: move,
        score: scoreSafeCaptureMove(game, move, botColor)
      };
    }).filter(function (item) {
      return item.score !== null;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    return safeCaptures.length ? safeCaptures[0].move : null;
  }

  function findImmediateMaterialRecoveryMove(game, botColor, candidateMoves) {
    const bestCapture = findBestSafeCapture(game, botColor, candidateMoves);

    if (!bestCapture) {
      return null;
    }

    const capturedValue = PIECE_VALUES[bestCapture.captured] || 0;

    return capturedValue >= PIECE_VALUES.n ? bestCapture : null;
  }

  function isImportantPawnSquare(square, botColor, kingSquare) {
    const file = square[0];
    const centralFile = ["c", "d", "e", "f"].includes(file);
    const structureSquares = botColor === "b"
      ? ["e6", "d6", "c5", "f7", "f6"]
      : ["e3", "e4", "d3", "d4", "c4", "f2", "f3"];
    const kingSideShield = kingSquare === (botColor === "w" ? "g1" : "g8") && ["f", "g", "h"].includes(file);
    const queenSideShield = kingSquare === (botColor === "w" ? "c1" : "c8") && ["a", "b", "c"].includes(file);

    return centralFile || structureSquares.includes(square) || kingSideShield || queenSideShield;
  }

  function hasAdjacentFriendlyPawn(game, square, botColor) {
    const coords = coordsFromSquare(square);

    return [coords.file - 1, coords.file + 1].some(function (file) {
      if (!isInsideBoard(file, coords.rank)) {
        return false;
      }

      for (let rank = 0; rank < 8; rank++) {
        const piece = game.get(squareFromCoords(file, rank));

        if (piece && piece.color === botColor && piece.type === "p") {
          return true;
        }
      }

      return false;
    });
  }

  function getImportantPawnImportance(game, square, botColor, kingSquare) {
    const file = square[0];
    let importance = 0;

    if (["d", "e"].includes(file)) {
      importance += 300;
    } else if (["c", "f"].includes(file)) {
      importance += 180;
    }

    if ((botColor === "b" && ["e6", "d6", "c5", "f7", "f6"].includes(square))
      || (botColor === "w" && ["e3", "e4", "d3", "d4", "c4", "f2", "f3"].includes(square))) {
      importance += 250;
    }

    if (!hasAdjacentFriendlyPawn(game, square, botColor) && ["c", "d", "e", "f"].includes(file)) {
      importance += 180;
    }

    if ((kingSquare === "g1" || kingSquare === "g8") && ["f", "g", "h"].includes(file)) {
      importance += 220;
    }

    if ((kingSquare === "c1" || kingSquare === "c8") && ["a", "b", "c"].includes(file)) {
      importance += 220;
    }

    return importance;
  }

  function detectImportantPawnUnderAttack(game, botColor) {
    const kingSquare = findKingSquare(game, botColor);
    const opponentColor = oppositeColor(botColor);
    const emergencies = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || piece.type !== "p") {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        if (!isImportantPawnSquare(square, botColor, kingSquare)) {
          return;
        }

        const attackers = getAttackersOfSquare(game, square, opponentColor);
        const defenders = getAttackersOfSquare(game, square, botColor);

        if (!attackers.length || defenders.length >= attackers.length) {
          return;
        }

        emergencies.push({
          square: square,
          pawn: piece,
          importance: getImportantPawnImportance(game, square, botColor, kingSquare),
          attackers: attackers,
          defenders: defenders,
          minAttackerValue: Math.min.apply(null, attackers.map(function (attacker) {
            return attacker.value;
          }))
        });
      });
    });

    return emergencies.sort(function (a, b) {
      return b.importance - a.importance || b.attackers.length - a.attackers.length;
    });
  }

  function moveProtectsImportantPawn(game, move, botColor, pawnEmergency) {
    if (!move || !pawnEmergency) {
      return false;
    }

    const capturesAttacker = move.captured && pawnEmergency.attackers.some(function (attacker) {
      return attacker.square === move.to;
    }) && !captureLosesMaterialClearly(game, move, botColor);

    if (capturesAttacker) {
      return true;
    }

    if (isKingSidePawnWeakeningMove(game, move, botColor)) {
      return false;
    }

    const defendersBefore = getAttackersOfSquare(game, pawnEmergency.square, botColor).length;
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    let pawnSquare = pawnEmergency.square;
    const originalPawn = game.get(pawnEmergency.square);

    if ((!originalPawn || originalPawn.color !== botColor || originalPawn.type !== "p") && move.from === pawnEmergency.square) {
      pawnSquare = move.to;
    }

    const pawnAfter = game.get(pawnSquare);
    const protects = pawnAfter && pawnAfter.color === botColor && pawnAfter.type === "p"
      && (doesPieceAttackSquare(game, move.to, pawnSquare)
        || getAttackersOfSquare(game, pawnSquare, botColor).length > defendersBefore
        || getAttackersOfSquare(game, pawnSquare, oppositeColor(botColor)).length === 0);

    game.undo();
    return Boolean(protects);
  }

  function scoreImportantPawnDefenseMove(game, move, botColor, pawnEmergency) {
    if (!moveProtectsImportantPawn(game, move, botColor, pawnEmergency)) {
      return null;
    }

    let score = pawnEmergency.importance;

    if (move.captured && pawnEmergency.attackers.some(function (attacker) {
      return attacker.square === move.to;
    })) {
      score += 500;
    }

    if (move.piece === "q" || move.piece === "r" || move.piece === "b" || move.piece === "n") {
      score += 400;
    }

    if (!isKingSidePawnWeakeningMove(game, move, botColor)) {
      score += 300;
    }

    if ((move.piece === "q" && ["d7", "e7", "d2", "e2"].includes(move.to))
      || (move.piece === "r" && ["e8", "d8", "e1", "d1"].includes(move.to))) {
      score += 250;
    }

    if (move.piece === "q" && ((botColor === "b" && pawnEmergency.square === "e6" && move.to === "d7")
      || (botColor === "w" && pawnEmergency.square === "e3" && move.to === "d2"))) {
      score += 120;
    }

    if (isKingSidePawnWeakeningMove(game, move, botColor)) {
      score -= 350;
    }

    return score;
  }

  function chooseImportantPawnDefenseMove(game, botColor, candidateMoves) {
    const emergencies = detectImportantPawnUnderAttack(game, botColor);

    if (!emergencies.length) {
      return null;
    }

    const scoredMoves = [];

    emergencies.forEach(function (emergency) {
      candidateMoves.forEach(function (move) {
        const score = scoreImportantPawnDefenseMove(game, move, botColor, emergency);

        if (score !== null && score > 0) {
          scoredMoves.push({
            move: move,
            score: score
          });
        }
      });
    });

    scoredMoves.sort(function (a, b) {
      return b.score - a.score;
    });

    return scoredMoves.length ? scoredMoves[0].move : null;
  }

  function isPathClearForVirtualPiece(game, from, targetSquare, ignoreSquares) {
    const fromCoords = coordsFromSquare(from);
    const targetCoords = coordsFromSquare(targetSquare);
    const fileDelta = targetCoords.file - fromCoords.file;
    const rankDelta = targetCoords.rank - fromCoords.rank;
    const fileStep = Math.sign(fileDelta);
    const rankStep = Math.sign(rankDelta);
    let file = fromCoords.file + fileStep;
    let rank = fromCoords.rank + rankStep;

    while (file !== targetCoords.file || rank !== targetCoords.rank) {
      const square = squareFromCoords(file, rank);

      if (!ignoreSquares.includes(square) && game.get(square)) {
        return false;
      }

      file += fileStep;
      rank += rankStep;
    }

    return true;
  }

  function doesVirtualPieceAttackSquare(game, piece, from, targetSquare, ignoreSquares) {
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
      return absFile === absRank && isPathClearForVirtualPiece(game, from, targetSquare, ignoreSquares);
    }

    if (piece.type === "r") {
      return (fileDelta === 0 || rankDelta === 0) && isPathClearForVirtualPiece(game, from, targetSquare, ignoreSquares);
    }

    if (piece.type === "q") {
      return (fileDelta === 0 || rankDelta === 0 || absFile === absRank) && isPathClearForVirtualPiece(game, from, targetSquare, ignoreSquares);
    }

    return false;
  }

  function evaluateCaptureTacticRiskOnUnit(game, unitSquare, attackerSquare, botColor) {
    const attackerPiece = game.get(attackerSquare);

    if (!attackerPiece || attackerPiece.color !== oppositeColor(botColor) || !doesPieceAttackSquare(game, attackerSquare, unitSquare)) {
      return 0;
    }

    const ignoreSquares = [attackerSquare, unitSquare];
    const kingSquare = findKingSquare(game, botColor);
    const kingZone = kingSquare ? getKingZoneSquares(kingSquare) : [];
    let tacticRisk = 0;
    let attacksKingZone = false;
    let attacksQueen = false;
    let rookTargets = 0;

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor) {
          return;
        }

        const targetSquare = boardArraySquare(rowIndex, colIndex);

        if (targetSquare === unitSquare) {
          return;
        }

        if (piece.type === "q" && doesVirtualPieceAttackSquare(game, attackerPiece, unitSquare, targetSquare, ignoreSquares)) {
          attacksQueen = true;
          tacticRisk += 900;
        }

        if (piece.type === "r" && doesVirtualPieceAttackSquare(game, attackerPiece, unitSquare, targetSquare, ignoreSquares)) {
          rookTargets++;
          tacticRisk += 500;
        }
      });
    });

    attacksKingZone = kingZone.some(function (square) {
      return doesVirtualPieceAttackSquare(game, attackerPiece, unitSquare, square, ignoreSquares);
    });

    if (attacksKingZone) {
      tacticRisk += 700;
    }

    if (attacksKingZone && attacksQueen) {
      tacticRisk += 600;
    }

    if (attacksQueen && rookTargets) {
      tacticRisk += 500;
    }

    if (rookTargets >= 2) {
      tacticRisk += 500;
    }

    return tacticRisk;
  }

  function getUnitSeverity(game, square, piece, attackers, defenders, botColor) {
    const pieceValue = PIECE_VALUES[piece.type] || 0;
    const minAttackerValue = Math.min.apply(null, attackers.map(function (attacker) {
      return attacker.value;
    }));
    const minDefenderValue = defenders.length ? Math.min.apply(null, defenders.map(function (defender) {
      return defender.value;
    })) : null;
    const kingSquare = findKingSquare(game, botColor);
    const importantPawn = piece.type === "p" && isImportantPawnSquare(square, botColor, kingSquare);
    const tacticRisk = Math.max.apply(null, attackers.map(function (attacker) {
      return evaluateCaptureTacticRiskOnUnit(game, square, attacker.square, botColor);
    }).concat([0]));
    let severity = 0;

    if (piece.type === "q") {
      severity += 1400;
    } else if (piece.type === "r") {
      severity += 900;
    } else if (piece.type === "b" || piece.type === "n") {
      severity += 620;
    } else if (piece.type === "p") {
      severity += importantPawn ? 260 : 90;
    }

    if (!defenders.length) {
      severity += piece.type === "p" ? 80 : 300;
    }

    if (minAttackerValue < pieceValue) {
      severity += piece.type === "p" ? 120 : 450;
    }

    if (attackers.length > defenders.length) {
      severity += piece.type === "p" ? 60 : 180;
    }

    severity += tacticRisk;

    return {
      minAttackerValue: minAttackerValue,
      minDefenderValue: minDefenderValue,
      tacticRisk: tacticRisk,
      severity: severity
    };
  }

  function detectUnderdefendedUnits(game, botColor) {
    const emergencies = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || piece.type === "k") {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        if (isNormalRuyLopezKnightPressure(game, square, piece, botColor)) {
          return;
        }

        const attackers = getAttackersOfSquare(game, square, oppositeColor(botColor));

        if (!attackers.length) {
          return;
        }

        const defenders = getAttackersOfSquare(game, square, botColor);
        const pieceValue = PIECE_VALUES[piece.type] || 0;
        const risk = getUnitSeverity(game, square, piece, attackers, defenders, botColor);
        const underdefended = !defenders.length || risk.minAttackerValue < pieceValue || attackers.length > defenders.length;

        if (!underdefended) {
          return;
        }

        if (piece.type === "p" && risk.severity < 170) {
          return;
        }

        emergencies.push({
          square: square,
          piece: piece,
          pieceValue: pieceValue,
          attackers: attackers,
          defenders: defenders,
          minAttackerValue: risk.minAttackerValue,
          minDefenderValue: risk.minDefenderValue,
          isPawn: piece.type === "p",
          isHighValue: pieceValue >= PIECE_VALUES.r,
          tacticRisk: risk.tacticRisk,
          severity: risk.severity
        });
      });
    });

    return emergencies.sort(function (a, b) {
      return b.severity - a.severity;
    });
  }

  function moveHandlesUnderdefendedUnit(game, move, botColor, emergency) {
    if (!move || !emergency || isKingSidePawnWeakeningMove(game, move, botColor)) {
      return false;
    }

    if (isRuyLopezPosition(game, botColor) && move.from === "c6" && ["d4", "e7", "b4", "a5", "h5"].includes(move.to)) {
      return false;
    }

    if (move.from === emergency.square) {
      const appliedMove = playMove(game, move);

      if (!appliedMove) {
        return false;
      }

      const safeDestination = getAttackersOfSquare(game, move.to, oppositeColor(botColor)).every(function (attacker) {
        return attacker.value >= emergency.pieceValue;
      });
      game.undo();
      return safeDestination;
    }

    if (move.captured && emergency.attackers.some(function (attacker) {
      return attacker.square === move.to;
    }) && !captureLosesMaterialClearly(game, move, botColor)) {
      return true;
    }

    if (emergency.attackers.some(function (attacker) {
      return isSlidingPiece(attacker.piece) && isSquareBetween(attacker.square, emergency.square, move.to);
    })) {
      return true;
    }

    const defendersBefore = emergency.defenders.length;
    const attackersBefore = emergency.attackers.length;
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return false;
    }

    let unitSquare = emergency.square;
    const unitOnOriginalSquare = game.get(unitSquare);

    if ((!unitOnOriginalSquare || unitOnOriginalSquare.color !== botColor) && move.from === emergency.square) {
      unitSquare = move.to;
    }

    const unitAfter = game.get(unitSquare);
    const defendersAfter = unitAfter && unitAfter.color === botColor
      ? getAttackersOfSquare(game, unitSquare, botColor).length
      : 0;
    const attackersAfter = unitAfter && unitAfter.color === botColor
      ? getAttackersOfSquare(game, unitSquare, oppositeColor(botColor)).length
      : 0;
    const handles = unitAfter && unitAfter.color === botColor
      && (doesPieceAttackSquare(game, move.to, unitSquare)
        || defendersAfter > defendersBefore
        || attackersAfter < attackersBefore
        || defendersAfter >= attackersAfter);

    game.undo();
    return Boolean(handles);
  }

  function scoreUnitStewardshipMove(game, move, botColor, emergency) {
    if (!moveHandlesUnderdefendedUnit(game, move, botColor, emergency)) {
      return null;
    }

    let score = Math.min(900, Math.max(120, emergency.severity));

    if (move.captured && emergency.attackers.some(function (attacker) {
      return attacker.square === move.to;
    })) {
      score += 700;
    }

    if (move.from === emergency.square) {
      score += 500;
    }

    if (emergency.attackers.some(function (attacker) {
      return isSlidingPiece(attacker.piece) && isSquareBetween(attacker.square, emergency.square, move.to);
    })) {
      score += 300;
    }

    if (emergency.isPawn && emergency.tacticRisk >= 500) {
      score += 600;
    } else if (emergency.isPawn) {
      score += 120;
    } else {
      score += 350;
    }

    if (emergency.square === "e6" && botColor === "b") {
      if (move.piece === "q" && move.to === "d7") {
        score += 500;
      } else if (move.piece === "q" && move.to === "e7") {
        score += 420;
      } else if (move.piece === "r" && move.to === "e8") {
        score += 380;
      } else if (move.piece === "q" && move.to === "e8") {
        score -= 180;
      }
    }

    return score;
  }

  function chooseUnitStewardshipMove(game, botColor, candidateMoves) {
    const emergencies = detectUnderdefendedUnits(game, botColor);

    if (!emergencies.length) {
      return null;
    }

    const scoredMoves = [];

    emergencies.forEach(function (emergency) {
      candidateMoves.forEach(function (move) {
        const score = scoreUnitStewardshipMove(game, move, botColor, emergency);

        if (score !== null && score > 0) {
          scoredMoves.push({
            move: move,
            score: score
          });
        }
      });
    });

    scoredMoves.sort(function (a, b) {
      return b.score - a.score;
    });

    return scoredMoves.length ? scoredMoves[0].move : null;
  }

  function getValuableTargetsAttackedByPiece(game, fromSquare, botColor) {
    const targets = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color === botColor) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        if (!doesPieceAttackSquare(game, fromSquare, square)) {
          return;
        }

        const defenders = getAttackersOfSquare(game, square, piece.color);
        const value = getPieceValue(piece);

        if (piece.type === "k" || piece.type === "q" || piece.type === "r" || ((piece.type === "b" || piece.type === "n") && !defenders.length)) {
          targets.push({
            square: square,
            piece: piece,
            value: value,
            defenders: defenders
          });
        }
      });
    });

    return targets;
  }

  function detectForkMove(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    const targets = getValuableTargetsAttackedByPiece(game, move.to, botColor);
    const attacksKing = targets.some(function (target) {
      return target.piece.type === "k";
    });
    const attacksQueen = targets.some(function (target) {
      return target.piece.type === "q";
    });
    const attacksRook = targets.some(function (target) {
      return target.piece.type === "r";
    });
    const pieceTargets = targets.filter(function (target) {
      return target.piece.type !== "k";
    }).length;
    let score = 0;

    if (attacksKing && attacksQueen) {
      score += 900;
    } else if (attacksKing && attacksRook) {
      score += 600;
    } else if (attacksQueen && attacksRook) {
      score += 500;
    } else if (pieceTargets >= 2) {
      score += 250;
    }

    game.undo();
    return score;
  }

  function getLineTargetsFromSlider(game, fromSquare, botColor) {
    const piece = game.get(fromSquare);

    if (!piece || piece.color !== botColor || !isSlidingPiece(piece)) {
      return [];
    }

    const directions = piece.type === "b"
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      : piece.type === "r"
        ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
        : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const start = coordsFromSquare(fromSquare);
    const lines = [];

    directions.forEach(function (direction) {
      let file = start.file + direction[0];
      let rank = start.rank + direction[1];
      const seen = [];

      while (isInsideBoard(file, rank)) {
        const square = squareFromCoords(file, rank);
        const targetPiece = game.get(square);

        if (targetPiece) {
          seen.push({
            square: square,
            piece: targetPiece
          });

          if (seen.length >= 2) {
            break;
          }
        }

        file += direction[0];
        rank += direction[1];
      }

      if (seen.length) {
        lines.push(seen);
      }
    });

    return lines;
  }

  function detectPinMove(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    let score = 0;

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || !isSlidingPiece(piece)) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        getLineTargetsFromSlider(game, square, botColor).forEach(function (line) {
          if (line.length < 2 || line[0].piece.color === botColor || line[1].piece.color === botColor) {
            return;
          }

          if (line[1].piece.type === "k") {
            score += 400;
          } else if (line[1].piece.type === "q") {
            score += 250;
          } else if (line[1].piece.type === "r") {
            score += 180;
          }
        });
      });
    });

    game.undo();
    return score;
  }

  function detectSkewerMove(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    let score = 0;

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || !isSlidingPiece(piece)) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        getLineTargetsFromSlider(game, square, botColor).forEach(function (line) {
          if (line.length < 2 || line[0].piece.color === botColor || line[1].piece.color === botColor) {
            return;
          }

          if (line[0].piece.type === "k" && (line[1].piece.type === "q" || line[1].piece.type === "r")) {
            score += 500;
          } else if ((line[0].piece.type === "q" || line[0].piece.type === "r") && getPieceValue(line[1].piece) >= PIECE_VALUES.n) {
            score += 250;
          }
        });
      });
    });

    game.undo();
    return score;
  }

  function countSliderAttacksOnValuables(game, botColor) {
    let score = 0;

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== botColor || !isSlidingPiece(piece)) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);

        getValuableTargetsAttackedByPiece(game, square, botColor).forEach(function (target) {
          if (target.piece.type === "k") {
            score += 500;
          } else if (target.piece.type === "q") {
            score += 450;
          } else if (target.piece.type === "r") {
            score += 300;
          }
        });
      });
    });

    return score;
  }

  function detectDiscoveredAttackMove(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    const beforeScore = countSliderAttacksOnValuables(game, botColor);
    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    const afterScore = countSliderAttacksOnValuables(game, botColor);
    game.undo();
    return Math.max(0, afterScore - beforeScore);
  }

  function getTacticalPunisherScore(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    return Math.max(0, detectForkMove(game, move, botColor))
      + Math.max(0, detectPinMove(game, move, botColor))
      + Math.max(0, detectSkewerMove(game, move, botColor))
      + Math.max(0, detectDiscoveredAttackMove(game, move, botColor));
  }

  function detectOpponentHangingPieces(game, botColor) {
    const opponentColor = oppositeColor(botColor);
    const hangingPieces = [];

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== opponentColor || piece.type === "k") {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const attackers = getAttackersOfSquare(game, square, botColor);
        const defenders = getAttackersOfSquare(game, square, opponentColor);

        if (!attackers.length) {
          return;
        }

        const minAttackerValue = Math.min.apply(null, attackers.map(function (attacker) {
          return attacker.value;
        }));
        const minDefenderValue = defenders.length ? Math.min.apply(null, defenders.map(function (defender) {
          return defender.value;
        })) : 9999;

        if (!defenders.length || attackers.length > defenders.length || minAttackerValue <= minDefenderValue) {
          hangingPieces.push({
            square: square,
            piece: piece,
            value: getPieceValue(piece),
            attackers: attackers,
            defenders: defenders
          });
        }
      });
    });

    return hangingPieces.sort(function (a, b) {
      return b.value - a.value;
    });
  }

  function evaluateAttackHangingPieceMove(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    const hangingBefore = detectOpponentHangingPieces(game, botColor);
    const capturedHanging = move.captured && hangingBefore.find(function (target) {
      return target.square === move.to;
    });
    let score = 0;

    if (capturedHanging && !captureLosesMaterialClearly(game, move, botColor)) {
      score += capturedHanging.value * 2;
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return score;
    }

    detectOpponentHangingPieces(game, botColor).forEach(function (target) {
      if (target.value >= PIECE_VALUES.q) {
        score += 700;
      } else if (target.value >= PIECE_VALUES.r) {
        score += 400;
      } else if (target.value >= PIECE_VALUES.n) {
        score += 200;
      }
    });

    game.undo();
    return score;
  }

  function detectOverloadedDefenderMove(game, move, botColor) {
    if (!move || rejectMoveIfViolatesLowerLevels(game, move, botColor) || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return -9999;
    }

    const appliedMove = playMove(game, move);

    if (!appliedMove) {
      return 0;
    }

    const opponentColor = oppositeColor(botColor);
    let score = 0;

    game.board().forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== opponentColor) {
          return;
        }

        const square = boardArraySquare(rowIndex, colIndex);
        const defendedValuables = getAttackersOfSquare(game, square, opponentColor).filter(function (defender) {
          const defendedPiece = game.get(defender.square);
          return defendedPiece && defendedPiece.color === opponentColor && getPieceValue(defendedPiece) >= PIECE_VALUES.r;
        });

        if (defendedValuables.length && doesPieceAttackSquare(game, move.to, square)) {
          score += getPieceValue(piece) >= PIECE_VALUES.r ? 500 : 250;
        }
      });
    });

    game.undo();
    return score;
  }

  function isOpenOrSemiOpenFileForColor(game, fileIndex, color) {
    let friendlyPawn = false;

    for (let rank = 0; rank < 8; rank++) {
      const piece = game.get(squareFromCoords(fileIndex, rank));

      if (piece && piece.type === "p" && piece.color === color) {
        friendlyPawn = true;
      }
    }

    return !friendlyPawn;
  }

  function evaluateImproveWorstPiece(game, move, botColor) {
    if (!move || move.captured || isCheckMove(move) || rejectMoveIfViolatesLowerLevels(game, move, botColor)) {
      return 0;
    }

    let score = 0;

    if (isDevelopingMinorMove(move, botColor)) {
      score += 120;
    }

    if (move.piece === "n" && ["c3", "d4", "e4", "f3", "c6", "d5", "e5", "f6"].includes(move.to)) {
      score += 100;
    }

    if (move.piece === "r" && isOpenOrSemiOpenFileForColor(game, coordsFromSquare(move.to).file, botColor)) {
      score += 120;
    }

    if ((move.piece === "b" || move.piece === "r" || move.piece === "q") && countSliderAttacksOnValuables(game, botColor) < (function () {
      const appliedMove = playMove(game, move);

      if (!appliedMove) {
        return countSliderAttacksOnValuables(game, botColor);
      }

      const after = countSliderAttacksOnValuables(game, botColor);
      game.undo();
      return after;
    })()) {
      score += 90;
    }

    if (hasMovedPieceFromSquare(game, botColor, move.from) && !hasSimpleOpeningReason(game, move, botColor)) {
      score -= 120;
    }

    if ((move.piece === "q" || move.piece === "r") && !isOpenOrSemiOpenFileForColor(game, coordsFromSquare(move.to).file, botColor) && !affectsCenter(move)) {
      score -= 80;
    }

    return Math.max(-180, Math.min(180, score));
  }

  function evaluateBee2Move(game, move, botColor, context) {
    if (rejectMoveIfViolatesLowerLevels(game, move, botColor)) {
      return -999999;
    }

    const bee2Context = context || buildBee2Context(game, botColor);
    const kingDanger = evaluateKingDanger(game, botColor);
    const urgentKingThreat = hasUrgentMateOrCheckThreat(game, botColor);
    const highValueCapture = isHighValueFreeCapture(game, move, botColor);
    const dangerReductionScore = evaluateMoveReducesKingDanger(game, move, botColor);
    const unitEmergencies = detectUnderdefendedUnits(game, botColor);
    const handledUnitEmergency = unitEmergencies.find(function (emergency) {
      return moveHandlesUnderdefendedUnit(game, move, botColor, emergency);
    });
    const pawnEmergencies = detectImportantPawnUnderAttack(game, botColor);
    const protectsImportantPawn = pawnEmergencies.some(function (emergency) {
      return moveProtectsImportantPawn(game, move, botColor, emergency);
    });
    const openingPhase = isOpeningDevelopmentPhase(game, botColor);
    const openingScore = openingPhase ? evaluateOpeningPrinciples(game, move, botColor) : 0;
    const pressureScore = getWinningPressureScore(game, move, botColor, bee2Context.advantageState);
    let score = getSimplificationScore(game, move, botColor, bee2Context.advantageState)
      + (openingPhase && openingScore < 0 ? Math.min(pressureScore, 80) : pressureScore);

    if ((isRuyLopezPosition(game, botColor) || isRuyLopezBa4Continuation(game, botColor)) && move.from === "c6" && ["d4", "e7", "b4", "a5", "h5"].includes(move.to)) {
      return -999999;
    }

    if (ENABLE_BEE2_FINAL_TACTICAL_SCORING) {
      score += getTacticalPunisherScore(game, move, botColor);
      score += evaluateAttackHangingPieceMove(game, move, botColor);
      score += detectOverloadedDefenderMove(game, move, botColor);
      score += evaluateImproveWorstPiece(game, move, botColor);
    }

    if (highValueCapture && !urgentKingThreat) {
      score += 700;
    }

    if (move.captured && captureSequenceLosesMaterialClearly(game, move, botColor)) {
      score -= 2000;
    }

    score += dangerReductionScore;

    if (!highValueCapture) {
      score += evaluateKingSidePawnDiscipline(game, move, botColor);
    }

    if (kingDanger >= 500 && !highValueCapture) {
      score += dangerReductionScore;
    }

    if (handledUnitEmergency) {
      score += Math.min(600, Math.max(200, handledUnitEmergency.severity));
    } else if (unitEmergencies.length && !highValueCapture) {
      const topEmergency = unitEmergencies[0];

      score -= Math.min(1000, Math.max(400, topEmergency.severity));

      if (topEmergency.isPawn && topEmergency.tacticRisk >= 500) {
        score -= 800;
      }

      if (!move.captured && !isCheckMove(move)) {
        score -= 300;
      }
    }

    if (protectsImportantPawn) {
      score += 250;
    } else if (pawnEmergencies.length && !highValueCapture) {
      score -= 300;

      if (move.piece === "p" && ["f", "g", "h"].includes(move.from[0])) {
        score -= 300;
      }
    }

    if (openingPhase) {
      score += openingScore < 0 ? openingScore * 1.2 : openingScore;
    }

    if (bee2Context.isEndgame) {
      score += evaluatePassedPawnPush(game, move, botColor, bee2Context)
        + evaluatePromotionSupport(game, move, botColor, bee2Context)
        + evaluateStopOpponentPassedPawn(game, move, botColor, bee2Context)
        + evaluatePieceCoordinationEndgame(game, move, botColor, bee2Context)
        + evaluateCutOffEnemyKing(game, move, botColor)
        + evaluateKingCentralization(game, move, botColor);

      if (move.piece === "k") {
        const kingSafety = evaluateKingSafetyInEndgame(game, move, botColor);

        if (!kingSafety.safe) {
          return -999999;
        }

        score -= kingSafety.risk;
      }
    }

    return score;
  }

  function chooseBee1FallbackMove() {
    if (typeof window.chooseBee1BotMove === "function") {
      return window.chooseBee1BotMove();
    }

    if (window.Bee1Bot && typeof window.Bee1Bot.chooseMove === "function") {
      return window.Bee1Bot.chooseMove();
    }

    return null;
  }

  function chooseBee2Move(game, botColor) {
    const context = buildBee2Context(game, botColor);
    const candidateMoves = getBee2CandidateMoves(game, botColor);

    if (!candidateMoves.length) {
      return null;
    }

    const checkResponseMove = chooseBestCheckResponse(game, botColor, candidateMoves);

    if (checkResponseMove) {
      return checkResponseMove;
    }

    const immediateMateMove = findImmediateMateMove(game, candidateMoves);

    if (immediateMateMove) {
      return immediateMateMove;
    }

    const directRecaptureMove = findDirectRecaptureMove(game, botColor, candidateMoves);

    if (directRecaptureMove) {
      return directRecaptureMove;
    }

    const recoveryMove = findImmediateMaterialRecoveryMove(game, botColor, candidateMoves);

    if (recoveryMove) {
      return recoveryMove;
    }

    if (isRuyLopezPosition(game, botColor) || isRuyLopezBa4Continuation(game, botColor)) {
      const strictRuyMove = chooseStrictIchessOpeningMove(game, botColor, candidateMoves);

      if (strictRuyMove) {
        return strictRuyMove;
      }
    }

    const unitStewardshipMove = chooseUnitStewardshipMove(game, botColor, candidateMoves);

    if (unitStewardshipMove) {
      return unitStewardshipMove;
    }

    const pawnDefenseMove = chooseImportantPawnDefenseMove(game, botColor, candidateMoves);

    if (pawnDefenseMove) {
      return pawnDefenseMove;
    }

    const openingMove = chooseStrictIchessOpeningMove(game, botColor, candidateMoves);

    if (openingMove) {
      return openingMove;
    }

    const advantageMove = chooseAdvantageConversionMove(game, botColor, candidateMoves, context);

    if (advantageMove) {
      return advantageMove;
    }

    if (context.isEndgame) {
      const endgameMove = chooseEndgamePlanMove(game, botColor, candidateMoves, context);

      if (endgameMove) {
        return endgameMove;
      }
    }

    const allScoredMoves = candidateMoves.map(function (move) {
      return {
        move: move,
        score: evaluateBee2Move(game, move, botColor, context)
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
    const scoredMoves = allScoredMoves.filter(function (item) {
      return item.score > 0;
    });

    if (scoredMoves.length) {
      return scoredMoves[0].move;
    }

    if (allScoredMoves.length && allScoredMoves[0].score > -500) {
      return allScoredMoves[0].move;
    }

    const bee1Move = chooseBee1FallbackMove();

    if (bee1Move) {
      return bee1Move;
    }

    return null;
  }

  function classifyMaterialAdvantage(game, botColor) {
    const materialBalance = getMaterialBalance(game, botColor);

    if (materialBalance < -100) {
      return ADVANTAGE_STATES.BEHIND;
    }

    if (materialBalance <= 100) {
      return ADVANTAGE_STATES.BALANCED;
    }

    if (materialBalance <= 299) {
      return ADVANTAGE_STATES.SLIGHTLY_AHEAD;
    }

    if (materialBalance <= 499) {
      return ADVANTAGE_STATES.MODERATELY_AHEAD;
    }

    if (materialBalance <= 899) {
      return ADVANTAGE_STATES.CLEARLY_AHEAD;
    }

    return ADVANTAGE_STATES.WINNING_AHEAD;
  }

  function shouldSimplify(game, botColor, advantageState) {
    return advantageState === ADVANTAGE_STATES.MODERATELY_AHEAD
      || advantageState === ADVANTAGE_STATES.CLEARLY_AHEAD
      || advantageState === ADVANTAGE_STATES.WINNING_AHEAD;
  }

  function shouldSeekMate(game, botColor, advantageState) {
    return advantageState === ADVANTAGE_STATES.WINNING_AHEAD;
  }

  function identifyTradeMove(game, move, botColor) {
    if (!move || !move.captured) {
      return {
        isTrade: false
      };
    }

    const capturedValue = PIECE_VALUES[move.captured] || 0;
    const appliedMove = playMove(game, move);
    let recaptureLikely = false;

    if (appliedMove) {
      recaptureLikely = game.moves({ verbose: true }).some(function (reply) {
        return reply.to === move.to && Boolean(reply.captured);
      });
      game.undo();
    }

    return {
      isTrade: true,
      capturedValue: capturedValue,
      recaptureLikely: recaptureLikely
    };
  }

  function getProjectedBalanceAfterTrade(game, move, botColor, tradeInfo) {
    const movingValue = PIECE_VALUES[move.piece] || 0;
    return getMaterialBalance(game, botColor) + tradeInfo.capturedValue - (tradeInfo.recaptureLikely ? movingValue : 0);
  }

  function evaluateTradeWhenAhead(game, move, botColor, advantageState) {
    const tradeInfo = identifyTradeMove(game, move, botColor);

    if (!tradeInfo.isTrade || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return 0;
    }

    const movingValue = PIECE_VALUES[move.piece] || 0;
    const projectedBalance = getProjectedBalanceAfterTrade(game, move, botColor, tradeInfo);
    let score = 0;

    if (tradeInfo.recaptureLikely && move.piece === "q" && move.captured === "q") {
      score += 800;
    } else if (move.captured === "q") {
      score += 350;
    }

    if (tradeInfo.recaptureLikely && move.piece === "r" && move.captured === "r") {
      score += 500;
    } else if (move.captured === "r") {
      score += 220;
    }

    if (tradeInfo.recaptureLikely && (move.captured === "q" || move.captured === "r")) {
      score += 300;
    }

    if (evaluateKingDanger(game, botColor) >= 500 && tradeInfo.capturedValue <= PIECE_VALUES.p) {
      score -= 300;
    }

    if (tradeInfo.recaptureLikely && movingValue >= 500 && tradeInfo.capturedValue >= 500) {
      score += 180;
    }

    if (projectedBalance > 100) {
      score += Math.min(260, projectedBalance * 0.12);
    } else {
      score -= 900;
    }

    if (tradeInfo.capturedValue === PIECE_VALUES.p && tradeInfo.recaptureLikely) {
      score -= 180;
    }

    if (projectedBalance < getMaterialBalance(game, botColor) - 120) {
      score -= 700;
    }

    return score;
  }

  function evaluateTradeWhenBehind(game, move, botColor, advantageState) {
    const tradeInfo = identifyTradeMove(game, move, botColor);

    if (!tradeInfo.isTrade || captureSequenceLosesMaterialClearly(game, move, botColor)) {
      return 0;
    }

    const movingValue = PIECE_VALUES[move.piece] || 0;
    const beforeBalance = getMaterialBalance(game, botColor);
    const projectedBalance = getProjectedBalanceAfterTrade(game, move, botColor, tradeInfo);
    let score = 0;

    if (tradeInfo.recaptureLikely && move.piece === "q" && move.captured === "q") {
      score -= 800;
    }

    if (tradeInfo.recaptureLikely && move.piece === "r" && move.captured === "r") {
      score -= 500;
    }

    if (projectedBalance > beforeBalance) {
      score += Math.min(500, (projectedBalance - beforeBalance) * 1.2);
    }

    if (!tradeInfo.recaptureLikely && tradeInfo.capturedValue > movingValue) {
      score += 260;
    }

    return score;
  }

  function getSimplificationScore(game, move, botColor, advantageState) {
    const tradeInfo = identifyTradeMove(game, move, botColor);

    if (!tradeInfo.isTrade) {
      return 0;
    }

    if (advantageState === ADVANTAGE_STATES.MODERATELY_AHEAD
      || advantageState === ADVANTAGE_STATES.CLEARLY_AHEAD
      || advantageState === ADVANTAGE_STATES.WINNING_AHEAD) {
      return evaluateTradeWhenAhead(game, move, botColor, advantageState);
    }

    if (advantageState === ADVANTAGE_STATES.BEHIND) {
      return evaluateTradeWhenBehind(game, move, botColor, advantageState);
    }

    return 0;
  }

  function evaluateKingPressureWhenWinning(game, move, botColor) {
    const opponentColor = oppositeColor(botColor);
    const enemyKingBefore = findKingSquare(game, opponentColor);
    const movingPiece = game.get(move.from);

    if (!enemyKingBefore || !movingPiece) {
      return 0;
    }

    const distanceBefore = getDistance(move.from, enemyKingBefore);
    const edgeDistanceBefore = getEdgeDistance(enemyKingBefore);
    const cornerDistanceBefore = getCornerDistance(enemyKingBefore);
    const appliedMove = playMove(game, move);
    let score = 0;

    if (!appliedMove) {
      return 0;
    }

    const enemyKingAfter = findKingSquare(game, opponentColor) || enemyKingBefore;
    const distanceAfter = getDistance(move.to, enemyKingAfter);
    const edgeDistanceAfter = getEdgeDistance(enemyKingAfter);
    const cornerDistanceAfter = getCornerDistance(enemyKingAfter);
    const controlledKingSquares = getAdjacentSquares(enemyKingAfter).filter(function (square) {
      return doesPieceAttackSquare(game, move.to, square);
    }).length;

    if (typeof move.san === "string" && (move.san.indexOf("+") !== -1 || move.san.indexOf("#") !== -1)) {
      score += 300;
    }

    if (distanceAfter < distanceBefore) {
      if (movingPiece.type === "q" || movingPiece.type === "r") {
        score += 120;
      } else if (movingPiece.type === "b" || movingPiece.type === "n") {
        score += 80;
      }
    }

    if (controlledKingSquares > 0) {
      score += controlledKingSquares * (movingPiece.type === "q" || movingPiece.type === "r" ? 45 : 30);
    }

    if (edgeDistanceAfter < edgeDistanceBefore) {
      score += 100;
    }

    if (cornerDistanceAfter < cornerDistanceBefore) {
      score += 150;
    }

    if ((movingPiece.type === "q" || movingPiece.type === "r") && controlledKingSquares >= 2) {
      score += 90;
    }

    if (move.captured === "p" && score < 120) {
      score -= 80;
    }

    if ((movingPiece.type === "q" || movingPiece.type === "r") && distanceAfter > distanceBefore) {
      score -= 80;
    }

    game.undo();
    return score;
  }

  function getWinningPressureScore(game, move, botColor, advantageState) {
    if (advantageState !== ADVANTAGE_STATES.WINNING_AHEAD) {
      return 0;
    }

    return evaluateKingPressureWhenWinning(game, move, botColor);
  }

  function chooseAdvantageConversionMove(game, botColor, candidateMoves, context) {
    const bee2Context = context || buildBee2Context(game, botColor);

    if (!candidateMoves || !candidateMoves.length) {
      return null;
    }

    if (bee2Context.advantageState === ADVANTAGE_STATES.WINNING_AHEAD) {
      const pressureMoves = candidateMoves.map(function (move) {
        return {
          move: move,
          score: getWinningPressureScore(game, move, botColor, bee2Context.advantageState)
        };
      }).filter(function (item) {
        return item.score > 0;
      }).sort(function (a, b) {
        return b.score - a.score;
      });

      if (pressureMoves.length) {
        return pressureMoves[0].move;
      }
    }

    if (!shouldSimplify(game, botColor, bee2Context.advantageState)) {
      return null;
    }

    const scoredMoves = candidateMoves.map(function (move) {
      return {
        move: move,
        score: getSimplificationScore(game, move, botColor, bee2Context.advantageState)
      };
    }).filter(function (item) {
      return item.score > 0;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    return scoredMoves.length ? scoredMoves[0].move : null;
  }

  function chooseEndgamePlanMove(game, botColor, candidateMoves, context) {
    const bee2Context = context || buildBee2Context(game, botColor);

    if (!bee2Context.isEndgame || !candidateMoves || !candidateMoves.length) {
      return null;
    }

    const opponentPromotionThreat = evaluateOpponentPromotionThreat(game, botColor, bee2Context);
    const scoredMoves = candidateMoves.map(function (move) {
      const stopScore = evaluateStopOpponentPassedPawn(game, move, botColor, bee2Context);
      let score = evaluatePassedPawnPush(game, move, botColor, bee2Context)
        + evaluatePromotionSupport(game, move, botColor, bee2Context)
        + stopScore
        + evaluatePieceCoordinationEndgame(game, move, botColor, bee2Context)
        + evaluateCutOffEnemyKing(game, move, botColor)
        + evaluateKingCentralization(game, move, botColor);

      if (move.piece === "k") {
        const kingSafety = evaluateKingSafetyInEndgame(game, move, botColor);

        if (!kingSafety.safe) {
          score -= kingSafety.risk;
        }
      }

      if (opponentPromotionThreat >= 300 && stopScore <= 0) {
        score -= Math.min(300, opponentPromotionThreat * 0.5);
      }

      return {
        move: move,
        score: score
      };
    }).filter(function (item) {
      return item.score > 0;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    return scoredMoves.length ? scoredMoves[0].move : null;
  }

  function buildBee2Context(game, botColor) {
    const materialBalance = getMaterialBalance(game, botColor);
    const advantageState = classifyMaterialAdvantage(game, botColor);
    const opponentColor = oppositeColor(botColor);

    return {
      materialBalance: materialBalance,
      advantageState: advantageState,
      isEndgame: detectEndgame(game),
      botPassedPawns: detectPassedPawns(game, botColor),
      opponentPassedPawns: detectPassedPawns(game, opponentColor)
    };
  }

  window.Bee2Bot = {
    ADVANTAGE_STATES: ADVANTAGE_STATES,
    ENABLE_BEE2_FINAL_TACTICAL_SCORING: ENABLE_BEE2_FINAL_TACTICAL_SCORING,
    getMaterialBalance: getMaterialBalance,
    countNonKingNonPawnPieces: countNonKingNonPawnPieces,
    detectEndgame: detectEndgame,
    detectPassedPawns: detectPassedPawns,
    isOpeningPhase: isOpeningPhase,
    getLastVerboseMove: getLastVerboseMove,
    evaluateOpeningPrinciples: evaluateOpeningPrinciples,
    chooseStrictIchessOpeningMove: chooseStrictIchessOpeningMove,
    classifyMaterialAdvantage: classifyMaterialAdvantage,
    shouldSimplify: shouldSimplify,
    shouldSeekMate: shouldSeekMate,
    findKingSquare: findKingSquare,
    getDistance: getDistance,
    identifyTradeMove: identifyTradeMove,
    evaluateTradeWhenAhead: evaluateTradeWhenAhead,
    evaluateTradeWhenBehind: evaluateTradeWhenBehind,
    getSimplificationScore: getSimplificationScore,
    evaluateKingPressureWhenWinning: evaluateKingPressureWhenWinning,
    getWinningPressureScore: getWinningPressureScore,
    evaluateKingCentralization: evaluateKingCentralization,
    evaluateKingSafetyInEndgame: evaluateKingSafetyInEndgame,
    evaluatePassedPawnPush: evaluatePassedPawnPush,
    evaluatePromotionSupport: evaluatePromotionSupport,
    evaluateOpponentPromotionThreat: evaluateOpponentPromotionThreat,
    evaluateStopOpponentPassedPawn: evaluateStopOpponentPassedPawn,
    evaluatePieceCoordinationEndgame: evaluatePieceCoordinationEndgame,
    evaluateCutOffEnemyKing: evaluateCutOffEnemyKing,
    detectUnderdefendedUnits: detectUnderdefendedUnits,
    evaluateCaptureTacticRiskOnUnit: evaluateCaptureTacticRiskOnUnit,
    moveHandlesUnderdefendedUnit: moveHandlesUnderdefendedUnit,
    chooseUnitStewardshipMove: chooseUnitStewardshipMove,
    detectForkMove: detectForkMove,
    detectPinMove: detectPinMove,
    detectSkewerMove: detectSkewerMove,
    detectDiscoveredAttackMove: detectDiscoveredAttackMove,
    getTacticalPunisherScore: getTacticalPunisherScore,
    detectOpponentHangingPieces: detectOpponentHangingPieces,
    evaluateAttackHangingPieceMove: evaluateAttackHangingPieceMove,
    detectOverloadedDefenderMove: detectOverloadedDefenderMove,
    evaluateImproveWorstPiece: evaluateImproveWorstPiece,
    detectImportantPawnUnderAttack: detectImportantPawnUnderAttack,
    moveProtectsImportantPawn: moveProtectsImportantPawn,
    chooseImportantPawnDefenseMove: chooseImportantPawnDefenseMove,
    isGameCheck: isGameCheck,
    isGameCheckmate: isGameCheckmate,
    rejectMoveIfViolatesLowerLevels: rejectMoveIfViolatesLowerLevels,
    getBee2CandidateMoves: getBee2CandidateMoves,
    getCheckingPieces: getCheckingPieces,
    classifyCheckResponse: classifyCheckResponse,
    evaluateCheckResponseMaterialSafety: evaluateCheckResponseMaterialSafety,
    chooseBestCheckResponse: chooseBestCheckResponse,
    getCheapestCaptureToSquare: getCheapestCaptureToSquare,
    evaluateCaptureSequenceLite: evaluateCaptureSequenceLite,
    captureSequenceLosesMaterialClearly: captureSequenceLosesMaterialClearly,
    findDirectRecaptureMove: findDirectRecaptureMove,
    evaluateKingDanger: evaluateKingDanger,
    evaluateMoveReducesKingDanger: evaluateMoveReducesKingDanger,
    isKingSidePawnWeakeningMove: isKingSidePawnWeakeningMove,
    evaluateKingSidePawnDiscipline: evaluateKingSidePawnDiscipline,
    isHighValueFreeCapture: isHighValueFreeCapture,
    hasUrgentMateOrCheckThreat: hasUrgentMateOrCheckThreat,
    opponentHasImmediateMateMove: opponentHasImmediateMateMove,
    findBestSafeCapture: findBestSafeCapture,
    findImmediateMaterialRecoveryMove: findImmediateMaterialRecoveryMove,
    evaluateBee2Move: evaluateBee2Move,
    chooseBee2Move: chooseBee2Move,
    chooseAdvantageConversionMove: chooseAdvantageConversionMove,
    chooseEndgamePlanMove: chooseEndgamePlanMove,
    buildBee2Context: buildBee2Context
  };
})();
