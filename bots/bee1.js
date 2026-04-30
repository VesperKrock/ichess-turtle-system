(function () {
  "use strict";

  const DEBUG_BEE1_BOT = false;

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
  };

  const CENTER = ["d4", "e4", "d5", "e5"];
  const EXTENDED_CENTER = ["c3", "d3", "e3", "f3", "c4", "f4", "c5", "d6", "e6", "f6"];
  const OPENING_CENTER_PAWNS = ["e5", "d5", "c5", "e6", "d6"];
  const EARLY_KNIGHT_SQUARES = {
    w: ["e5", "g5", "d5", "a4"],
    b: ["e4", "g4", "d4", "a5"]
  };

  const WEAKNESS_TYPES = {
    KING_WEAKNESS: "KING_WEAKNESS",
    UNDEFENDED_PIECE: "UNDEFENDED_PIECE",
    LOW_VALUE_ATTACKS_HIGH_VALUE: "LOW_VALUE_ATTACKS_HIGH_VALUE",
    ATTACKERS_MORE_THAN_DEFENDERS: "ATTACKERS_MORE_THAN_DEFENDERS",
    ATTACKERS_EQUAL_DEFENDERS: "ATTACKERS_EQUAL_DEFENDERS",
    HANGING_MAJOR_PIECE: "HANGING_MAJOR_PIECE",
    HANGING_MINOR_PIECE: "HANGING_MINOR_PIECE",
    POTENTIAL_WEAKNESS: "POTENTIAL_WEAKNESS"
  };

  const OPENING_BOOK = {
    "": ["e4", "d4", "Nf3"],
    e4: ["e5", "d5", "c5", "e6"],
    d4: ["d5", "Nf6", "e6"],
    "e4 d5 exd5": ["Qxd5", "Nf6", "e6"],
    "e4 e5": ["Nf3", "Nc3"],
    "e4 e5 Nf3": ["Nc6", "Nf6"],
    "e4 e5 Nf3 Nc6": ["Bc4", "Bb5", "d4"],
    "e4 e5 Nf3 Nc6 Bc4": ["Bc5", "Nf6", "Be7"],
    "e4 e5 Nf3 Nc6 Bc4 Bc5": ["c3", "d3", "O-O"],
    "e4 e5 Nf3 Nc6 Bb5": ["a6", "Nf6", "d6"],
    "e4 Nc6 d4 Nf6 e5": ["Nd5", "Ng8", "d6"],
    h3: ["e5", "d5"],
    a3: ["e5", "d5"],
    f3: ["d5", "e5"],
    a4: ["e5", "d5"]
  };

  function getContext() {
    if (!window.Bee1BotContext || !window.Bee1BotContext.game) {
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

  function getPieceValue(pieceOrType) {
    if (!pieceOrType) {
      return 0;
    }

    return PIECE_VALUES[typeof pieceOrType === "string" ? pieceOrType : pieceOrType.type] || 0;
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

  function getPieces(game, color) {
    const pieces = [];

    game.board().forEach(function (row, rowIndex) {
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

  function getKingSquare(game, color) {
    const king = getPieces(game, color).find(function (item) {
      return item.piece.type === "k";
    });

    return king ? king.square : null;
  }

  function getMaterial(game, color) {
    return getPieces(game, color).reduce(function (total, item) {
      return total + getPieceValue(item.piece);
    }, 0);
  }

  function getMaterialBalance(game, color) {
    return getMaterial(game, color) - getMaterial(game, oppositeColor(color));
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

  function getAttackersOfSquare(game, square, byColor) {
    return getPieces(game, byColor).filter(function (item) {
      return doesPieceAttackSquare(game, item.square, square);
    });
  }

  function getDefendersOfSquare(game, square, color) {
    return getAttackersOfSquare(game, square, color).filter(function (item) {
      return item.square !== square;
    });
  }

  function isSquareAttackedByColor(game, square, color) {
    return getAttackersOfSquare(game, square, color).length > 0;
  }

  function isMateMove(move) {
    return typeof move.san === "string" && move.san.indexOf("#") !== -1;
  }

  function isCheckMove(move) {
    return typeof move.san === "string" && move.san.indexOf("+") !== -1;
  }

  function isCastlingMove(move) {
    return typeof move.flags === "string" && (move.flags.indexOf("k") !== -1 || move.flags.indexOf("q") !== -1);
  }

  function isDevelopingMove(move, color) {
    const homeRank = color === "w" ? "1" : "8";
    return (move.piece === "n" || move.piece === "b") && move.from[1] === homeRank;
  }

  function hasCastled(game, color) {
    const kingSquare = getKingSquare(game, color);
    return color === "w" ? kingSquare === "g1" || kingSquare === "c1" : kingSquare === "g8" || kingSquare === "c8";
  }

  function detectGamePhase(game) {
    const historyLength = game.history().length;
    const totalMaterial = getMaterial(game, "w") + getMaterial(game, "b");
    const queens = getPieces(game).filter(function (item) {
      return item.piece.type === "q";
    }).length;

    if (historyLength < 18 && totalMaterial > 6000) {
      return "opening";
    }

    if (totalMaterial <= 3900 || historyLength >= 54 && queens < 2) {
      return "endgame";
    }

    return "middlegame";
  }

  function detectBee1Phase(gameArg) {
    return detectGamePhase(gameArg || getContext().game);
  }

  function isEarlyGameForDiscipline(game) {
    return game.history().length < 24 && getMaterial(game, "w") + getMaterial(game, "b") > 5600;
  }

  function getHistoryKey(game) {
    return game.history().join(" ");
  }

  function addWeakness(weaknesses, square, piece, weaknessType, priority, attackers, defenders, severity) {
    const attackerValues = attackers.map(function (attacker) {
      return getPieceValue(attacker.piece);
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
      pieceValue: getPieceValue(piece),
      severity: severity
    });
  }

  function createWeaknessMap(game, color) {
    const enemy = oppositeColor(color);
    const weaknesses = [];
    const kingSquare = getKingSquare(game, color);

    if (kingSquare) {
      const kingAttackers = getAttackersOfSquare(game, kingSquare, enemy);
      let kingSeverity = kingAttackers.length * 260;
      const kingCoords = coordsFromSquare(kingSquare);

      [-1, 0, 1].forEach(function (fileOffset) {
        [-1, 0, 1].forEach(function (rankOffset) {
          if (fileOffset === 0 && rankOffset === 0) {
            return;
          }

          const file = kingCoords.file + fileOffset;
          const rank = kingCoords.rank + rankOffset;

          if (isInsideBoard(file, rank) && isSquareAttackedByColor(game, squareFromCoords(file, rank), enemy)) {
            kingSeverity += 34;
          }
        });
      });

      if (kingSeverity > 0) {
        addWeakness(weaknesses, kingSquare, { color: color, type: "k" }, WEAKNESS_TYPES.KING_WEAKNESS, 1, kingAttackers, getDefendersOfSquare(game, kingSquare, color), kingSeverity);
      }
    }

    getPieces(game, color).forEach(function (item) {
      if (item.piece.type === "k") {
        return;
      }

      const attackers = getAttackersOfSquare(game, item.square, enemy);
      const defenders = getDefendersOfSquare(game, item.square, color);
      const value = getPieceValue(item.piece);
      const weakestAttackerValue = attackers.length ? Math.min.apply(null, attackers.map(function (attacker) {
        return getPieceValue(attacker.piece);
      })) : 0;

      if (!defenders.length) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.UNDEFENDED_PIECE, value >= 500 ? 2 : 4, attackers, defenders, attackers.length ? value * 0.95 + 120 : value * 0.12);
      }

      if (attackers.length && !defenders.length && value >= 500) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.HANGING_MAJOR_PIECE, 2, attackers, defenders, value * 1.25 + 240);
      }

      if (attackers.length && !defenders.length && value >= 300 && value < 500) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.HANGING_MINOR_PIECE, 3, attackers, defenders, value * 1.05 + 160);
      }

      if (attackers.length && weakestAttackerValue > 0 && weakestAttackerValue < value) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.LOW_VALUE_ATTACKS_HIGH_VALUE, value >= 500 ? 2 : 3, attackers, defenders, value - weakestAttackerValue + 120);
      }

      if (attackers.length > defenders.length) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.ATTACKERS_MORE_THAN_DEFENDERS, value >= 500 ? 2 : 3, value ? attackers : [], defenders, value * 0.72 + (attackers.length - defenders.length) * 85);
      } else if (attackers.length && attackers.length === defenders.length) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.ATTACKERS_EQUAL_DEFENDERS, 6, attackers, defenders, value * 0.18 + 35);
      } else if (!attackers.length && !defenders.length && value >= 300) {
        addWeakness(weaknesses, item.square, item.piece, WEAKNESS_TYPES.POTENTIAL_WEAKNESS, 7, attackers, defenders, value * 0.08);
      }
    });

    return weaknesses.sort(function (a, b) {
      return b.severity - a.severity || a.priority - b.priority;
    });
  }

  function evaluateOwnWeakness(game, color) {
    return createWeaknessMap(game, color).reduce(function (total, weakness) {
      return total + weakness.severity;
    }, 0);
  }

  function evaluateOpponentWeakness(game, color) {
    return createWeaknessMap(game, oppositeColor(color)).reduce(function (total, weakness) {
      return total + weakness.severity * (weakness.pieceValue >= 300 ? 0.55 : 0.18);
    }, 0);
  }

  function getStaticExchangeScore(game, move, color) {
    if (!move.captured) {
      return 0;
    }

    const movingValue = getPieceValue(move.piece);
    const capturedValue = getPieceValue(move.captured);
    let score = capturedValue;

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = game.get(move.to);
    const attackers = getAttackersOfSquare(game, move.to, oppositeColor(color));
    const defenders = getDefendersOfSquare(game, move.to, color);

    if (movedPiece && attackers.length) {
      const cheapestAttacker = Math.min.apply(null, attackers.map(function (attacker) {
        return getPieceValue(attacker.piece);
      }));
      const defendedDiscount = defenders.length ? Math.min(movingValue * 0.35, getPieceValue(defenders[0].piece) * 0.25) : 0;
      score -= movingValue - defendedDiscount;

      if (cheapestAttacker <= movingValue) {
        score -= Math.min(120, movingValue - cheapestAttacker);
      }
    }

    game.undo();

    return score;
  }

  function isSafeDestinationAfterMove(game, move, color) {
    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = game.get(move.to);

    if (!movedPiece || movedPiece.color !== color || movedPiece.type === "k") {
      game.undo();
      return true;
    }

    const attackers = getAttackersOfSquare(game, move.to, oppositeColor(color));
    const defenders = getDefendersOfSquare(game, move.to, color);
    const movedValue = getPieceValue(movedPiece);
    const unsafe = attackers.length > defenders.length || attackers.some(function (attacker) {
      return getPieceValue(attacker.piece) + 80 < movedValue;
    });

    game.undo();
    return !unsafe;
  }

  function isBadExchange(game, move, color) {
    return move.captured && getStaticExchangeScore(game, move, color) < -40;
  }

  function isSafeCapture(game, move, color) {
    return Boolean(move.captured) && getStaticExchangeScore(game, move, color) >= -20 && isSafeDestinationAfterMove(game, move, color);
  }

  function getSafeMaterialCapturePriority(game, move, color) {
    if (!move.captured || !isSafeCapture(game, move, color)) {
      return 0;
    }

    const capturedValue = getPieceValue(move.captured);
    const movingValue = getPieceValue(move.piece);
    const targetDefenders = getDefendersOfSquare(game, move.to, oppositeColor(color)).length;
    const staticExchangeScore = getStaticExchangeScore(game, move, color);
    let priority = capturedValue * 10 + staticExchangeScore * 2;

    if (!targetDefenders) {
      priority += capturedValue >= 300 ? capturedValue * 7 : capturedValue * 2;
    }

    if (capturedValue >= 900) {
      priority += 12000;
    } else if (capturedValue >= 500) {
      priority += 6500;
    } else if (capturedValue >= 300) {
      priority += 3600;
    }

    if (capturedValue > movingValue) {
      priority += capturedValue - movingValue;
    }

    return priority;
  }

  function isPieceHanging(game, square) {
    const piece = game.get(square);

    if (!piece || piece.type === "k") {
      return false;
    }

    return getAttackersOfSquare(game, square, oppositeColor(piece.color)).length > 0 && getDefendersOfSquare(game, square, piece.color).length === 0;
  }

  function doesMoveLoseMaterial(game, move, color) {
    if (isMateMove(move)) {
      return false;
    }

    if (isBadExchange(game, move, color)) {
      return true;
    }

    const beforeMaterial = getMaterialBalance(game, color);
    const beforeOwnWeakness = evaluateOwnWeakness(game, color);

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const afterMaterial = getMaterialBalance(game, color);
    const afterOwnWeakness = evaluateOwnWeakness(game, color);
    const movedPiece = game.get(move.to);
    const movedValue = movedPiece ? getPieceValue(movedPiece) : 0;
    const unsafeMovedPiece = movedPiece && movedPiece.color === color && movedValue >= 300 && !isSafeDestinationAfterAlreadyMoved(game, move.to, color);
    game.undo();

    return afterMaterial < beforeMaterial - 80 || afterOwnWeakness > beforeOwnWeakness + 420 || unsafeMovedPiece;
  }

  function isSafeDestinationAfterAlreadyMoved(game, square, color) {
    const piece = game.get(square);

    if (!piece || piece.color !== color || piece.type === "k") {
      return true;
    }

    const attackers = getAttackersOfSquare(game, square, oppositeColor(color));
    const defenders = getDefendersOfSquare(game, square, color);
    const value = getPieceValue(piece);

    return !(attackers.length > defenders.length || attackers.some(function (attacker) {
      return getPieceValue(attacker.piece) + 80 < value;
    }));
  }

  function isKickableByPawnAfterMove(game, move, color) {
    if (!["n", "b", "r", "q"].includes(move.piece) || isMateMove(move)) {
      return false;
    }

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const movedPiece = game.get(move.to);
    const kickable = movedPiece && movedPiece.color === color && getAttackersOfSquare(game, move.to, oppositeColor(color)).some(function (attacker) {
      return attacker.piece.type === "p" && getPieceValue(attacker.piece) + 80 < getPieceValue(movedPiece);
    });

    game.undo();
    return Boolean(kickable);
  }

  function isEarlyKnightOccupation(game, move, color) {
    if (detectGamePhase(game) !== "opening" || move.piece !== "n" || move.captured || isMateMove(move)) {
      return false;
    }

    return EARLY_KNIGHT_SQUARES[color].includes(move.to);
  }

  function detectMaterialEmergency(game, color) {
    const items = createWeaknessMap(game, color).filter(function (weakness) {
      if (weakness.pieceValue < 300) {
        return false;
      }

      if (weakness.weaknessType === WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === WEAKNESS_TYPES.HANGING_MINOR_PIECE) {
        return true;
      }

      if (weakness.weakestAttackerValue && weakness.weakestAttackerValue + 80 < weakness.pieceValue) {
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
      } else if (weakness.weaknessType === WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === WEAKNESS_TYPES.HANGING_MINOR_PIECE) {
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

  function handlesMaterialEmergency(game, move, color, emergencyInfo) {
    if (!emergencyInfo || !emergencyInfo.hasEmergency || !emergencyInfo.items.length) {
      return true;
    }

    const emergency = emergencyInfo.items[0];
    const movedEmergencyPiece = move.from === emergency.square;
    const capturedAttacker = emergency.attackers.some(function (attacker) {
      return attacker.square === move.to;
    });

    if (movedEmergencyPiece && !isSafeDestinationAfterMove(game, move, color)) {
      return false;
    }

    if (move.captured && (isBadExchange(game, move, color) || !isSafeDestinationAfterMove(game, move, color))) {
      return false;
    }

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const sameSquarePiece = game.get(emergency.square);
    const emergencyStillExists = sameSquarePiece && sameSquarePiece.color === color && sameSquarePiece.type === emergency.piece.type && createWeaknessMap(game, color).some(function (weakness) {
      return weakness.square === emergency.square && (weakness.weakestAttackerValue && weakness.weakestAttackerValue + 80 < weakness.pieceValue || weakness.attackerCount > weakness.defenderCount || weakness.weaknessType === WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === WEAKNESS_TYPES.HANGING_MINOR_PIECE);
    });
    game.undo();

    if (movedEmergencyPiece) {
      return true;
    }

    if (capturedAttacker && !emergencyStillExists) {
      return true;
    }

    return !emergencyStillExists;
  }

  function isInCheck(game) {
    return Boolean(game.in_check && game.in_check());
  }

  function detectMateThreat(game, color) {
    if (game.turn() !== color) {
      return false;
    }

    return game.moves({ verbose: true }).some(isMateMove);
  }

  function moveAllowsImmediateMate(game, move, color) {
    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const allowsMate = detectMateThreat(game, oppositeColor(color));
    game.undo();
    return allowsMate;
  }

  function evaluateCheckResponse(game, move, color) {
    let score = 0;

    if (isMateMove(move)) {
      return 100000;
    }

    if (move.captured && isSafeCapture(game, move, color)) {
      score += 1000 + getPieceValue(move.captured);
    }

    if (move.piece === "k" && isSafeDestinationAfterMove(game, move, color)) {
      score += 500;
    }

    if (!doesMoveLoseMaterial(game, move, color)) {
      score += 250;
    }

    return score;
  }

  function hasCenterPawnResponse(game, color) {
    return game.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === color && pastMove.piece === "p" && ["e5", "d5", "c5", "e6", "d6", "c6"].includes(pastMove.to);
    });
  }

  function opponentHasAdvancedCenter(game, color) {
    return getPieces(game, oppositeColor(color)).some(function (item) {
      return item.piece.type === "p" && CENTER.includes(item.square);
    });
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
    return CENTER.includes(move.to) || EXTENDED_CENTER.includes(move.to);
  }

  function controlsCenterAfterMove(game, move) {
    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
    const controlsCenter = CENTER.some(function (square) {
      return doesPieceAttackSquare(game, move.to, square);
    });
    game.undo();
    return controlsCenter;
  }

  function justPlayedE4(game, color) {
    const history = game.history({ verbose: true });
    const lastMove = history[history.length - 1];

    return Boolean(lastMove && lastMove.color === oppositeColor(color) && lastMove.piece === "p" && lastMove.to === "e4");
  }

  function hasPlayedOpeningCenterPawn(game, color) {
    return game.history({ verbose: true }).some(function (pastMove) {
      return pastMove.color === color && pastMove.piece === "p" && (pastMove.to === "e5" || pastMove.to === "d5");
    });
  }

  function isWithinFirstTwoBotMoves(game, color) {
    return game.history({ verbose: true }).filter(function (pastMove) {
      return pastMove.color === color;
    }).length < 2;
  }

  function isInitialKnightMove(move, color) {
    return move.piece === "n" && (color === "w" ? move.from[1] === "1" : move.from[1] === "8");
  }

  function isMovingAttackedPiece(game, move, color) {
    return getAttackersOfSquare(game, move.from, oppositeColor(color)).length > 0;
  }

  function defendsAttackedPieceAfterMove(game, move, color) {
    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
    const defendsAttackedPiece = getPieces(game, color).some(function (item) {
      return item.square !== move.to
        && getAttackersOfSquare(game, item.square, oppositeColor(color)).length
        && doesPieceAttackSquare(game, move.to, item.square);
    });
    game.undo();
    return defendsAttackedPiece;
  }

  function hasSimpleOpeningReason(game, move, color) {
    return Boolean(move.captured || isCheckMove(move) || isMovingAttackedPiece(game, move, color) || defendsAttackedPieceAfterMove(game, move, color) || controlsCenterAfterMove(game, move));
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

  function isEarlyItalianCentralBreak(game, move, color) {
    return color === "b"
      && move.from === "d7"
      && move.to === "d5"
      && whiteOpenedWithE4(game)
      && (hasPiece(game, "e5", "p", "b") || hasPlayedMove(game, "b", "e7", "e5"))
      && (hasPiece(game, "c6", "n", "b") || hasPlayedMove(game, "b", "b8", "c6"))
      && (hasPiece(game, "c5", "b", "b") || hasPlayedMove(game, "b", "f8", "c5"))
      && !hasPlayedNf6(game)
      && !isBlackCastled(game);
  }

  function evaluateOpeningPrinciples(game, move, color) {
    if (!isOpeningPhase(game)) {
      return 0;
    }

    let score = 0;

    if (CENTER.includes(move.to)) {
      score += 60;
    }

    if (move.piece === "n") {
      if (isInitialKnightMove(move, color)) {
        score += 35;
      }

      if (["c3", "f3", "c6", "f6"].includes(move.to)) {
        score += 50;
      }

      if (move.to[0] === "a" || move.to[0] === "h") {
        score -= 320;
      }

      if (!hasSimpleOpeningReason(game, move, color) && !isInitialKnightMove(move, color)) {
        score -= 350;
      }

      if (isOffRepertoireKnightJump(move) && !move.captured && !isCheckMove(move) && !defendsAttackedPieceAfterMove(game, move, color)) {
        score -= 380;
      }

      if (move.to === "f6" && justPlayedE4(game, color) && !hasPlayedOpeningCenterPawn(game, color) && isWithinFirstTwoBotMoves(game, color)) {
        score -= 420;
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

    if (hasMovedPieceFromSquare(game, color, move.from)) {
      score -= hasSimpleOpeningReason(game, move, color) ? 0 : 300;
    }

    if (move.piece === "q" && game.history().length < 8) {
      score -= 380;
    }

    if (isEarlyItalianCentralBreak(game, move, color) && !hasSimpleOpeningReason(game, move, color)) {
      score -= 380;
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

  function chooseStrictIchessOpeningMove(game, color, candidateMoves) {
    if (!isOpeningPhase(game) || !candidateMoves.length) {
      return null;
    }

    if (color === "w") {
      return chooseFirstAvailable(candidateMoves, [
        { from: "e2", to: "e4" },
        { from: "g1", to: "f3" },
        { from: "f1", to: "c4" },
        { from: "b1", to: "c3" },
        { from: "e1", to: "g1" },
        { from: "d2", to: "d3" }
      ]);
    }

    if (color !== "b" || !whiteOpenedWithE4(game)) {
      return null;
    }

    const blackHasE5 = hasPiece(game, "e5", "p", "b") || hasPlayedMove(game, "b", "e7", "e5");
    const blackHasNc6 = hasPiece(game, "c6", "n", "b") || hasPlayedMove(game, "b", "b8", "c6");
    const blackHasBc5 = hasPiece(game, "c5", "b", "b") || hasPlayedMove(game, "b", "f8", "c5");

    if (!blackHasE5) {
      return findMove(candidateMoves, "e7", "e5");
    }

    if (!blackHasNc6) {
      return findMove(candidateMoves, "b8", "c6");
    }

    if (!blackHasBc5) {
      return findMove(candidateMoves, "f8", "c5");
    }

    return chooseFirstAvailable(candidateMoves, [
      { from: "g8", to: "f6" },
      { from: "d7", to: "d6" },
      { from: "e8", to: "g8" },
      { from: "c8", to: "e6" }
    ]);
  }

  function detectImmediateThreat(game, color) {
    return createWeaknessMap(game, color).filter(function (weakness) {
      return weakness.pieceValue >= 300 && (weakness.weaknessType === WEAKNESS_TYPES.HANGING_MAJOR_PIECE || weakness.weaknessType === WEAKNESS_TYPES.HANGING_MINOR_PIECE || weakness.weakestAttackerValue && weakness.weakestAttackerValue < weakness.pieceValue);
    });
  }

  function detectDelayedThreat(game, move, color) {
    if (doesMoveLoseMaterial(game, move, color)) {
      return 0;
    }

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });

    const score = Math.min(420, evaluateOpponentWeakness(game, color) * 0.18);
    game.undo();
    return score;
  }

  function classifyMoveIntent(game, move, color) {
    const phase = detectGamePhase(game);
    const secondaryIntents = [];
    let primaryIntent = "NO_PURPOSE";
    let explanation = "No clear purpose.";

    if (isMateMove(move)) {
      return {
        primaryIntent: "CHECKMATE",
        secondaryIntents: [],
        isUseful: true,
        explanation: "Immediate checkmate."
      };
    }

    if (isInCheck(game)) {
      primaryIntent = "ESCAPE_CHECK";
      explanation = "Legal check response.";
    }

    if (move.captured && isSafeCapture(game, move, color)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "WIN_MATERIAL";
        explanation = "Safe capture.";
      } else {
        secondaryIntents.push("WIN_MATERIAL");
      }
    }

    const emergency = detectMaterialEmergency(game, color);
    if (emergency.hasEmergency && handlesMaterialEmergency(game, move, color, emergency)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "FIX_OWN_WEAKNESS";
        explanation = "Handles material emergency.";
      } else {
        secondaryIntents.push("FIX_OWN_WEAKNESS");
      }
      secondaryIntents.push("DEFEND_PIECE");
    }

    if (isCastlingMove(move)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "CASTLE";
        explanation = "King safety.";
      } else {
        secondaryIntents.push("CASTLE");
      }
    } else if (isDevelopingMove(move, color)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "DEVELOP";
        explanation = "Develops a minor piece.";
      } else {
        secondaryIntents.push("DEVELOP");
      }
    }

    if (move.piece === "p" && (CENTER.includes(move.to) || OPENING_CENTER_PAWNS.includes(move.to))) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "CONTROL_CENTER";
        explanation = "Controls the center.";
      } else {
        secondaryIntents.push("CONTROL_CENTER");
      }
    }

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
    const newWeaknessPressure = evaluateOpponentWeakness(game, color);
    game.undo();

    if (newWeaknessPressure >= 250 && !doesMoveLoseMaterial(game, move, color)) {
      if (primaryIntent === "NO_PURPOSE") {
        primaryIntent = "ATTACK_WEAKNESS";
        explanation = "Targets a weakness safely.";
      } else {
        secondaryIntents.push("ATTACK_WEAKNESS");
      }
    }

    if (detectDelayedThreat(game, move, color) >= 160) {
      secondaryIntents.push("CREATE_DELAYED_THREAT");
    }

    if (primaryIntent === "NO_PURPOSE" && phase !== "opening" && move.piece !== "q" && move.piece !== "r" && isSafeDestinationAfterMove(game, move, color)) {
      primaryIntent = "IMPROVE_WORST_PIECE";
      explanation = "Quiet improvement.";
    }

    return {
      primaryIntent: primaryIntent,
      secondaryIntents: secondaryIntents.filter(function (intent, index, list) {
        return intent !== primaryIntent && list.indexOf(intent) === index;
      }),
      isUseful: primaryIntent !== "NO_PURPOSE",
      explanation: explanation
    };
  }

  function getLevel1RejectReason(game, move, color) {
    if (isMateMove(move)) {
      return "";
    }

    if (isBadExchange(game, move, color)) {
      return "FORCED_LOSING_EXCHANGE";
    }

    if (move.captured && !isSafeCapture(game, move, color)) {
      return "UNSAFE_CAPTURE";
    }

    if (doesMoveLoseMaterial(game, move, color)) {
      return "HIGH_VALUE_PIECE_UNSAFE_DESTINATION";
    }

    if (isEarlyGameForDiscipline(game) && isEarlyKnightOccupation(game, move, color)) {
      return "EARLY_KNIGHT_OCCUPATION_UNSTABLE";
    }

    if (isEarlyGameForDiscipline(game) && isKickableByPawnAfterMove(game, move, color)) {
      return "PIECE_MOVES_TO_KICKABLE_SQUARE";
    }

    return "";
  }

  function lowerLevelGate(game, move, color, emergency) {
    const result = {
      rejected: false,
      rejectReason: "",
      severity: 0,
      penalty: 0
    };

    if (isMateMove(move)) {
      return result;
    }

    if (emergency && emergency.hasEmergency && !handlesMaterialEmergency(game, move, color, emergency)) {
      result.rejected = true;
      result.rejectReason = "IGNORE_MATERIAL_EMERGENCY";
      result.severity = 9000 + emergency.maxSeverity;
      result.penalty = result.severity;
      return result;
    }

    const level1Reason = getLevel1RejectReason(game, move, color);
    if (level1Reason) {
      result.rejected = true;
      result.rejectReason = level1Reason;
      result.severity = 7600;
      result.penalty = 7600;
      return result;
    }

    if (moveAllowsImmediateMate(game, move, color)) {
      result.rejected = true;
      result.rejectReason = "LEVEL_2_ALLOWS_MATE";
      result.severity = 9000;
      result.penalty = 9000;
      return result;
    }

    const intent = classifyMoveIntent(game, move, color);
    if (!intent.isUseful) {
      result.penalty += 700;
    }

    return result;
  }

  function evaluatePositionLight(game, color) {
    const material = getMaterialBalance(game, color);
    const ownWeakness = evaluateOwnWeakness(game, color);
    const opponentWeakness = evaluateOpponentWeakness(game, color);
    const phase = detectGamePhase(game);
    let score = material - ownWeakness * 0.28 + opponentWeakness * 0.18;

    if (phase !== "endgame") {
      score += hasCastled(game, color) ? 90 : -80;
      score -= hasCastled(game, oppositeColor(color)) ? 40 : 0;
    }

    return score;
  }

  function scoreMove(game, move, color) {
    const phase = detectGamePhase(game);
    const before = evaluatePositionLight(game, color);
    let score = 0;

    if (isMateMove(move)) {
      return 100000;
    }

    if (move.captured) {
      score += isSafeCapture(game, move, color) ? getPieceValue(move.captured) * 2 + getSafeMaterialCapturePriority(game, move, color) : -1400;
      score += getStaticExchangeScore(game, move, color);
    }

    if (isOpeningPhase(game)) {
      const openingScore = evaluateOpeningPrinciples(game, move, color);
      score += openingScore > 0 ? openingScore * 0.6 : openingScore;
    }

    const intent = classifyMoveIntent(game, move, color);
    if (intent.isUseful) {
      score += 240;
    } else {
      score -= 900;
    }

    game.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
    const after = evaluatePositionLight(game, color);
    game.undo();

    score += after - before;

    if (phase === "endgame" && getMaterialBalance(game, color) <= 180) {
      score += (Math.random() - 0.5) * 90;
    } else {
      score += (Math.random() - 0.5) * 4;
    }

    return score;
  }

  function enrichMoveCandidate(game, move, color, forcedEmergency) {
    const emergency = forcedEmergency || detectMaterialEmergency(game, color);
    const gate = lowerLevelGate(game, move, color, emergency);
    const intent = classifyMoveIntent(game, move, color);
    const staticExchangeScore = move.captured ? getStaticExchangeScore(game, move, color) : null;
    const safeDestination = isSafeDestinationAfterMove(game, move, color);
    const level1Reason = getLevel1RejectReason(game, move, color);
    const score = gate.rejected ? -gate.severity : scoreMove(game, move, color) - gate.penalty;

    return {
      move: move,
      score: score,
      gate: gate,
      intent: intent,
      emergency: emergency,
      level1Reason: level1Reason,
      staticExchangeScore: staticExchangeScore,
      safeDestination: safeDestination
    };
  }

  function chooseBestNonRejectedMove(enrichedMoves) {
    const nonRejected = enrichedMoves.filter(function (item) {
      return !item.gate.rejected;
    });

    if (nonRejected.length) {
      const useful = nonRejected.filter(function (item) {
        return item.intent.isUseful;
      });
      const pool = useful.length ? useful : nonRejected;
      return pool.sort(function (a, b) {
        return b.score - a.score;
      })[0];
    }

    return enrichedMoves.slice().sort(function (a, b) {
      return (a.gate.severity || a.gate.penalty || 0) - (b.gate.severity || b.gate.penalty || 0) || b.score - a.score;
    })[0] || null;
  }

  function debugCandidates(label, game, enrichedMoves, selected) {
    debugLog(label, {
      totalLegalMoves: game.moves({ verbose: true }).length,
      activeMovesCount: enrichedMoves.length,
      rejectedCount: enrichedMoves.filter(function (item) {
        return item.gate.rejected;
      }).length,
      nonRejectedCount: enrichedMoves.filter(function (item) {
        return !item.gate.rejected;
      }).length,
      selectedMove: selected && selected.move.san,
      selectedGate: selected && selected.gate,
      top: enrichedMoves.slice().sort(function (a, b) {
        return b.score - a.score;
      }).slice(0, 5).map(function (item) {
        return {
          san: item.move.san,
          score: Math.round(item.score),
          rejected: item.gate.rejected,
          rejectReason: item.gate.rejectReason,
          severity: item.gate.severity,
          primaryIntent: item.intent.primaryIntent,
          level1Reason: item.level1Reason,
          materialEmergency: item.emergency.hasEmergency ? item.emergency.items[0].reason + "@" + item.emergency.items[0].square : "none",
          safeDestination: item.safeDestination,
          staticExchangeScore: item.staticExchangeScore
        };
      })
    });
  }

  function finalizeRootMove(game, enrichedMoves) {
    const selected = chooseBestNonRejectedMove(enrichedMoves);
    debugCandidates("root", game, enrichedMoves, selected);
    return selected ? selected.move : null;
  }

  function chooseOpeningBookMove(game, moves, color, emergency) {
    const preferred = OPENING_BOOK[getHistoryKey(game)];

    if (!preferred) {
      return null;
    }

    for (let index = 0; index < preferred.length; index++) {
      const move = moves.find(function (candidate) {
        return candidate.san === preferred[index];
      });

      if (!move) {
        continue;
      }

      const enriched = enrichMoveCandidate(game, move, color, emergency);
      if (!enriched.gate.rejected) {
        return enriched;
      }
    }

    return null;
  }

  function chooseMoveByLayerPriority(game, moves, color) {
    const emergency = detectMaterialEmergency(game, color);
    let activeMoves = moves;

    if (emergency.hasEmergency) {
      const emergencyMoves = moves.filter(function (move) {
        return handlesMaterialEmergency(game, move, color, emergency);
      });

      if (emergencyMoves.length) {
        activeMoves = emergencyMoves;
      } else {
        activeMoves = moves.filter(function (move) {
          return move.from === emergency.items[0].square;
        });

        if (!activeMoves.length) {
          activeMoves = moves;
        }
      }
    }

    let enrichedMoves = activeMoves.map(function (move) {
      return enrichMoveCandidate(game, move, color, emergency);
    });

    const mateMoves = enrichedMoves.filter(function (item) {
      return isMateMove(item.move) && !item.gate.rejected;
    });
    if (mateMoves.length) {
      return finalizeRootMove(game, mateMoves);
    }

    if (isInCheck(game)) {
      enrichedMoves = enrichedMoves.map(function (item) {
        item.score += evaluateCheckResponse(game, item.move, color);
        return item;
      });
      return finalizeRootMove(game, enrichedMoves);
    }

    const safeOpeningMoves = enrichedMoves.filter(function (item) {
      return !item.gate.rejected;
    }).map(function (item) {
      return item.move;
    });
    const strictOpeningMove = !emergency.hasEmergency ? chooseStrictIchessOpeningMove(game, color, safeOpeningMoves) : null;

    if (strictOpeningMove) {
      debugCandidates("strict-opening", game, enrichedMoves, { move: strictOpeningMove, gate: { rejected: false } });
      return strictOpeningMove;
    }

    const safeCaptures = enrichedMoves.filter(function (item) {
      return !item.gate.rejected && item.move.captured && isSafeCapture(game, item.move, color) && getPieceValue(item.move.captured) >= 300;
    });
    if (safeCaptures.length) {
      safeCaptures.forEach(function (item) {
        item.score += getSafeMaterialCapturePriority(game, item.move, color);
      });
      return finalizeRootMove(game, safeCaptures);
    }

    const bookMove = chooseOpeningBookMove(game, activeMoves, color, emergency);
    if (bookMove && !emergency.hasEmergency) {
      debugCandidates("opening-book", game, [bookMove].concat(enrichedMoves), bookMove);
      return bookMove.move;
    }

    const usefulMoves = enrichedMoves.filter(function (item) {
      return !item.gate.rejected && item.intent.isUseful;
    });

    if (usefulMoves.length) {
      return finalizeRootMove(game, usefulMoves);
    }

    return finalizeRootMove(game, enrichedMoves);
  }

  function chooseBee1BotMove() {
    const game = getContext().game;
    const moves = game.moves({ verbose: true });

    if (!moves.length) {
      return null;
    }

    return chooseMoveByLayerPriority(game, moves, game.turn());
  }

  function evaluateBee1Move(move) {
    const game = getContext().game;

    if (!move) {
      return -100000;
    }

    return enrichMoveCandidate(game, move, game.turn()).score;
  }

  window.chooseBee1BotMove = chooseBee1BotMove;
  window.evaluateBee1Move = evaluateBee1Move;
  window.detectBee1Phase = detectBee1Phase;
})();
