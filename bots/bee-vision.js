(function (root) {
  "use strict";

  const PIECE_VALUES = Object.freeze({
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0
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

  function canUseCache(game, cache) {
    if (!cache || !cache.fen || !game || typeof game.fen !== "function") {
      return false;
    }

    return game.fen() === cache.fen;
  }

  function getCachedValue(game, cache, mapName, key, compute) {
    if (!canUseCache(game, cache) || !cache[mapName] || typeof cache[mapName].get !== "function") {
      return compute();
    }

    const fullKey = cache.fen + "|" + key;
    if (cache[mapName].has(fullKey)) {
      if (cache.stats) {
        cache.stats.hits++;
      }
      return cache[mapName].get(fullKey);
    }

    if (cache.stats) {
      cache.stats.misses++;
    }
    const value = compute();
    cache[mapName].set(fullKey, value);
    return value;
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
    return getCachedValue(game, cache, "knightAttackers", ["knight", square, attackerColor].join("|"), function () {
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
    return getCachedValue(game, cache, "pawnAttackers", ["pawn", square, attackerColor].join("|"), function () {
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
    return getCachedValue(game, cache, "lineAttackers", ["line", square, attackerColor].join("|"), function () {
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
    return getCachedValue(game, cache, "kingAttackers", ["king", square, attackerColor].join("|"), function () {
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
    return getCachedValue(game, cache, "squareAttackers", ["attackers", square, attackerColor].join("|"), function () {
      return sortVisionUnits([].concat(
        getPawnAttackersToSquare(game, square, attackerColor, cache),
        getKnightAttackersToSquare(game, square, attackerColor, cache),
        getLineAttackersToSquare(game, square, attackerColor, cache),
        getKingAttackersToSquare(game, square, attackerColor, cache)
      ));
    });
  }

  function getSquareDefenders(game, square, defenderColor, cache) {
    return getCachedValue(game, cache, "squareDefenders", ["defenders", square, defenderColor].join("|"), function () {
      return getSquareAttackers(game, square, defenderColor, cache);
    });
  }

  function getAttackersToSquare(game, square, color, cache) {
    return getSquareAttackers(game, square, color, cache);
  }

  function getCheapestAttackerToSquare(game, square, color, cache) {
    const attackers = getAttackersToSquare(game, square, color, cache);
    return attackers.length ? attackers[0] : null;
  }

  function buildBoardVisionMap(game, botColor, cache) {
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

  root.BeeVision = {
    PIECE_VALUES: PIECE_VALUES,
    oppositeColor: oppositeColor,
    getPieceValue: getPieceValue,
    coordsFromSquare: coordsFromSquare,
    squareFromCoords: squareFromCoords,
    boardArraySquare: boardArraySquare,
    getPieceAt: getPieceAt,
    findKingSquare: findKingSquare,
    isPathClear: isPathClear,
    doesPieceAttackSquare: doesPieceAttackSquare,
    doesColorAttackSquare: doesColorAttackSquare,
    canUseCache: canUseCache,
    sortVisionUnits: sortVisionUnits,
    makeVisionUnit: makeVisionUnit,
    getKnightAttackersToSquare: getKnightAttackersToSquare,
    getPawnAttackersToSquare: getPawnAttackersToSquare,
    getLineAttackersToSquare: getLineAttackersToSquare,
    getKingAttackersToSquare: getKingAttackersToSquare,
    getSquareAttackers: getSquareAttackers,
    getSquareDefenders: getSquareDefenders,
    getAttackersToSquare: getAttackersToSquare,
    getCheapestAttackerToSquare: getCheapestAttackerToSquare,
    buildBoardVisionMap: buildBoardVisionMap
  };
})(typeof self !== "undefined" ? self : window);
