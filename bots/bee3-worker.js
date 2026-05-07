self.window = self;

importScripts("../chess.js", "bee-vision.js", "bee3.js");

self.postMessage({
  type: "bee3WorkerLoaded",
  worker: true,
  hasChess: typeof Chess !== "undefined",
  hasBeeVision: Boolean(self.BeeVision && typeof self.BeeVision.getSquareAttackers === "function"),
  hasBee3: Boolean(self.Bee3Bot && typeof self.Bee3Bot.chooseBee3Move === "function")
});

function serializeBee3Move(move) {
  if (!move) {
    return null;
  }

  return {
    from: move.from || null,
    to: move.to || null,
    promotion: move.promotion || null,
    san: move.san || null,
    piece: move.piece || null,
    captured: move.captured || null
  };
}

self.onmessage = function (event) {
  const data = event && event.data ? event.data : {};
  if (data.type !== "chooseBee3Move") {
    return;
  }

  const startedAt = Date.now();
  try {
    if (typeof Chess === "undefined") {
      throw new Error("Chess is not loaded in Bee 3 worker.");
    }

    if (!self.Bee3Bot || typeof self.Bee3Bot.chooseBee3Move !== "function") {
      throw new Error("Bee 3 is not loaded in worker.");
    }

    const game = new Chess(data.fen);
    const result = typeof self.Bee3Bot.selectBee3MoveWithTrace === "function" ?
      self.Bee3Bot.selectBee3MoveWithTrace(game, data.botColor) :
      null;
    const move = result && result.move ? result.move : self.Bee3Bot.chooseBee3Move(game, data.botColor);
    self.postMessage({
      type: "bee3MoveResult",
      requestId: data.requestId,
      move: serializeBee3Move(move),
      elapsedMs: Date.now() - startedAt,
      source: result && result.source ? result.source : "WORKER_CHOOSE_BEE3_MOVE",
      worker: true,
      error: null
    });
  } catch (error) {
    self.postMessage({
      type: "bee3MoveResult",
      requestId: data.requestId,
      move: null,
      elapsedMs: Date.now() - startedAt,
      source: "WORKER_ERROR",
      worker: true,
      error: String(error && error.stack || error)
    });
  }
};
