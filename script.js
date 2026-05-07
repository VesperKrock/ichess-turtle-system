console.log("script.js loaded");

document.addEventListener("DOMContentLoaded", function () {
  if (typeof Chess === "undefined") {
    console.error("chess.js is not loaded. Check the local chess.js file.");
    document.getElementById("status").textContent = "Lỗi: không tải được chess.js";
    return;
  }

  console.log("chess.js loaded");

  const game = new Chess();
  const board = document.getElementById("board");
  const status = document.getElementById("status");
  const appTitle = document.getElementById("appTitle");
  const resetButton = document.getElementById("resetButton");
  const undoButton = document.getElementById("undoButton");
  const redoButton = document.getElementById("redoButton");
  const flipButton = document.getElementById("flipButton");
  const soundButton = document.getElementById("soundButton");
  const legalMovesButton = document.getElementById("legalMovesButton");
  const notationButton = document.getElementById("notationButton");
  const languageButton = document.getElementById("languageButton");
  const themeButton = document.getElementById("themeButton");
  const modeSelect = document.getElementById("modeSelect");
  const playerColorSelect = document.getElementById("playerColorSelect");
  const botDifficultySelect = document.getElementById("botDifficultySelect");
  const controlsPanel = document.querySelector(".controls");
  const applySettingsButton = document.getElementById("applySettingsButton");
  const modeLabel = document.getElementById("modeLabel");
  const playerLabel = document.getElementById("playerLabel");
  const botLabel = document.getElementById("botLabel");
  const botDifficultyGroup = botLabel ? botLabel.closest("label") : null;
  const movesTitle = document.getElementById("movesTitle");
  const copyHistoryButton = document.getElementById("copyHistoryButton");
  const moveHistory = document.getElementById("moveHistory");
  const moveHistoryScroll = document.getElementById("moveHistoryScroll");
  const materialAdvantageLabel = document.getElementById("materialAdvantageLabel");
  const materialAdvantageValue = document.getElementById("materialAdvantageValue");
  const promotionModal = document.getElementById("promotionModal");
  const promotionPicker = document.getElementById("promotionPicker");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const gameOverTitle = document.getElementById("gameOverTitle");
  const gameOverReason = document.getElementById("gameOverReason");
  const newGameOverlayButton = document.getElementById("newGameOverlayButton");
  const reviewGameButton = document.getElementById("reviewGameButton");
  const replayBanner = document.getElementById("replayBanner");
  const replayLabel = document.getElementById("replayLabel");
  const returnToCurrentButton = document.getElementById("returnToCurrentButton");
  const rankCoordinates = document.getElementById("rankCoordinates");
  const fileCoordinates = document.getElementById("fileCoordinates");
  const DEBUG_CLICK_TO_MOVE = false;
  let boardThemeButton = null;
  let boardThemePanel = null;
  let boardThemeTitle = null;
  let boardThemeLabel = null;
  let boardThemeSelect = null;
  let boardThemeAnchor = null;

  let selectedSquare = null;
  let legalMoves = [];
  let lastMove = null;
  let premove = null;
  let premoveSource = null;
  let pointerStart = null;
  let draggedPiece = null;
  let dragFromSquare = null;
  let dragGhostElement = null;
  let isDragging = false;
  let rightClickStart = null;
  let rightClickCanceledDrag = false;
  let suppressNextClick = false;
  let temporaryStatusMessage = null;
  let temporaryStatusTimer = null;
  let pendingPromotion = null;
  let redoStack = [];
  let notationLocale = "EN";
  let legalMovesEnabled = true;
  let turtle3LegalMovesEnabled = false;
  let soundEnabled = true;
  let audioContext = null;
  let boardFlipped = false;
  let currentMode = "local";
  let playerColor = "w";
  let botDifficulty = "random";
  let botTimer = null;
  let isBotThinking = false;
  let botThinkToken = 0;
  let bee3Worker = null;
  let bee3WorkerAvailable = typeof Worker !== "undefined";
  let bee3WorkerFallbackLogged = false;
  let bee3RequestId = 0;
  let pendingBee3RequestId = null;
  let pendingBee3Fen = null;
  let pendingBee3BotColor = null;
  let language = loadLanguage();
  let theme = loadTheme();
  let boardTheme = "classic";
  let turtleGameOver = false;
  let turtleWinner = null;
  let turtleMoveHistory = [];
  let turtleRedoStack = [];
  let undoCount = 0;
  let lastBotMove = null;
  let turtleEndStatusKey = "turtleKingLost";
  let turtleEndStatusParams = {};
  let turtle2LeftKingCount = 0;
  let turtle2WarningHistory = [];
  let turtle2WarningRedoStack = [];
  let turtle2PenaltyGameOver = false;
  let turtle2ActiveWarningKey = null;
  let turtle2WarningKingSquare = null;
  let turtle2PenaltyKingSquare = null;
  let turtle2WarningFlashTimer = null;
  let isReplayMode = false;
  let replayPly = null;
  let replayGame = null;

  const circles = new Set();
  const arrows = new Set();

  const pieces = {
    wp: "♙",
    wr: "♖",
    wn: "♘",
    wb: "♗",
    wq: "♕",
    wk: "♔",
    bp: "♟",
    br: "♜",
    bn: "♞",
    bb: "♝",
    bq: "♛",
    bk: "♚"
  };

  Object.assign(pieces, {
    wp: "\u265f",
    wr: "\u265c",
    wn: "\u265e",
    wb: "\u265d",
    wq: "\u265b",
    wk: "\u265a"
  });

  const promotionOptions = [
    { piece: "q", labelKey: "queen" },
    { piece: "r", labelKey: "rook" },
    { piece: "b", labelKey: "bishop" },
    { piece: "n", labelKey: "knight" }
  ];

  const pieceValues = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };

  const initialMaterialCounts = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1
  };

  const materialPieceOrder = ["q", "r", "b", "n", "p"];
  const materialSymbols = {
    w: {
      p: "♙",
      n: "♘",
      b: "♗",
      r: "♖",
      q: "♕"
    },
    b: {
      p: "♟",
      n: "♞",
      b: "♝",
      r: "♜",
      q: "♛"
    }
  };

  const BOARD_THEME_STORAGE_KEY = "ichessBoardTheme";
  const BOARD_THEMES = {
    classic: {
      boardLight: "#eed7ad",
      boardDark: "#b88761",
      pieceWhite: "#f0ece2",
      pieceBlack: "#172033",
      pieceOutline: "rgba(0, 0, 0, 0.82)",
      whitePieceStroke: "rgba(0, 0, 0, 0.9)",
      blackPieceStroke: "rgba(255, 255, 255, 0.12)",
      whitePieceShadow: "0 1px 0 rgba(0, 0, 0, 0.62), 0 1px 1px rgba(0, 0, 0, 0.35)",
      blackPieceShadow: "0 1px 0 rgba(255, 255, 255, 0.08), 0 1px 1px rgba(0, 0, 0, 0.28)",
      selectedSquare: "#d89a1e",
      legalMove: "rgba(217, 138, 38, 0.64)",
      legalCapture: "rgba(185, 28, 28, 0.78)",
      lastMove: "rgba(216, 154, 30, 0.72)",
      annotationColor: "rgba(87, 200, 77, 0.84)",
      analysisArrow: "#57c84d",
      analysisCircle: "#57c84d"
    },
    ocean: {
      boardLight: "#cfe2f3",
      boardDark: "#456fd0",
      pieceWhite: "#eef2ec",
      pieceBlack: "#18283e",
      pieceOutline: "rgba(0, 0, 0, 0.8)",
      whitePieceStroke: "rgba(0, 0, 0, 0.9)",
      blackPieceStroke: "rgba(255, 255, 255, 0.14)",
      whitePieceShadow: "0 1px 0 rgba(0, 0, 0, 0.60), 0 1px 1px rgba(0, 0, 0, 0.34)",
      blackPieceShadow: "0 1px 0 rgba(255, 255, 255, 0.09), 0 1px 1px rgba(0, 0, 0, 0.24)",
      selectedSquare: "#25b7c9",
      legalMove: "rgba(39, 191, 209, 0.66)",
      legalCapture: "rgba(190, 18, 60, 0.78)",
      lastMove: "rgba(37, 183, 201, 0.68)",
      annotationColor: "rgba(255, 90, 95, 0.84)",
      analysisArrow: "#ff5a5f",
      analysisCircle: "#ff5a5f"
    },
    forest: {
      boardLight: "#d8f0ab",
      boardDark: "#527d27",
      pieceWhite: "#f0f1e6",
      pieceBlack: "#1b2d3d",
      pieceOutline: "rgba(0, 0, 0, 0.82)",
      whitePieceStroke: "rgba(0, 0, 0, 0.9)",
      blackPieceStroke: "rgba(255, 255, 255, 0.16)",
      whitePieceShadow: "0 1px 0 rgba(0, 0, 0, 0.62), 0 1px 1px rgba(0, 0, 0, 0.35)",
      blackPieceShadow: "0 1px 0 rgba(255, 255, 255, 0.10), 0 1px 1px rgba(0, 0, 0, 0.24)",
      selectedSquare: "#33aa55",
      legalMove: "rgba(49, 182, 91, 0.66)",
      legalCapture: "rgba(185, 28, 28, 0.78)",
      lastMove: "rgba(51, 170, 85, 0.68)",
      annotationColor: "rgba(245, 166, 35, 0.86)",
      analysisArrow: "#f5a623",
      analysisCircle: "#f5a623"
    },
    rose: {
      boardLight: "#efd1dc",
      boardDark: "#a84a65",
      pieceWhite: "#e6d6dc",
      pieceBlack: "#1d2333",
      pieceOutline: "rgba(0, 0, 0, 0.78)",
      whitePieceStroke: "rgba(0, 0, 0, 0.88)",
      blackPieceStroke: "rgba(255, 255, 255, 0.12)",
      whitePieceShadow: "0 1px 0 rgba(0, 0, 0, 0.55), 0 1px 1px rgba(0, 0, 0, 0.28)",
      blackPieceShadow: "0 1px 0 rgba(255, 255, 255, 0.08), 0 1px 1px rgba(0, 0, 0, 0.24)",
      selectedSquare: "#d94c75",
      legalMove: "rgba(219, 82, 122, 0.64)",
      legalCapture: "rgba(159, 18, 57, 0.8)",
      lastMove: "rgba(217, 76, 117, 0.66)",
      annotationColor: "rgba(34, 199, 232, 0.86)",
      analysisArrow: "#22c7e8",
      analysisCircle: "#22c7e8"
    },
    darkWood: {
      boardLight: "#d5b07a",
      boardDark: "#6b452a",
      pieceWhite: "#e7dcc9",
      pieceBlack: "#161616",
      pieceOutline: "rgba(0, 0, 0, 0.88)",
      whitePieceStroke: "rgba(0, 0, 0, 0.9)",
      blackPieceStroke: "rgba(255, 255, 255, 0.10)",
      whitePieceShadow: "0 1px 0 rgba(0, 0, 0, 0.24), 0 0 1px rgba(0, 0, 0, 0.22)",
      blackPieceShadow: "0 1px 0 rgba(255, 255, 255, 0.10), 0 1px 1px rgba(0, 0, 0, 0.18)",
      selectedSquare: "#d08619",
      legalMove: "rgba(213, 138, 27, 0.66)",
      legalCapture: "rgba(153, 27, 27, 0.8)",
      lastMove: "rgba(208, 134, 25, 0.68)",
      annotationColor: "rgba(76, 201, 240, 0.88)",
      analysisArrow: "#4CC9F0",
      analysisCircle: "#4CC9F0"
    }
  };
  boardTheme = loadBoardTheme();

  const translations = {
    vi: {
      appTitle: "Cờ Vua",
      loading: "Đang tải...",
      checkmate: "Chiếu bí",
      check: "Chiếu",
      draw: "Hòa",
      whiteWins: "Trắng thắng",
      blackWins: "Đen thắng",
      stalemate: "Hết nước hợp lệ",
      threefold: "Lặp thế ba lần",
      insufficient: "Không đủ lực chiếu bí",
      newGame: "Chơi ván mới",
      reviewGame: "Xem lại ván đấu",
      backToCurrent: "Trở về hiện tại",
      reviewingMove: "Đang xem lại: nước",
      reviewingPrefix: "Đang xem lại:",
      moveLabel: "nước",
      whiteSide: "Trắng",
      blackSide: "Đen",
      whiteToMove: "Lượt Trắng",
      blackToMove: "Lượt Đen",
      reset: "Chơi lại",
      undo: "Hoàn tác",
      redo: "Làm lại",
      soundOn: "Âm thanh Bật",
      soundOff: "Âm thanh Tắt",
      themeLight: "Giao diện: Sáng",
      themeDark: "Giao diện: Tối",
      flipBoard: "Lật bàn cờ",
      flipBoardWhite: "Lật bàn cờ: Trắng",
      flipBoardBlack: "Lật bàn cờ: Đen",
      moves: "Biên bản trận đấu",
      materialTitle: "Chênh lệch quân",
      materialEqual: "Cân bằng",
      materialWhite: "Trắng +{value}",
      materialBlack: "Đen +{value}",
      materialWhiteBehind: "Trắng -{value}",
      materialBlackBehind: "Đen -{value}",
      mode: "Chế độ",
      player: "Người chơi",
      bot: "Máy",
      applySettings: "Bắt đầu / Áp dụng",
      localMode: "2 người cùng máy",
      botMode: "Người chơi vs Máy",
      turtleNewbornMode: "Turtle 1 - Sơ sinh",
      turtleStandardMode: "Turtle 1 - Thi lên lớp",
      turtle2Mode: "Turtle 2 - Thi lên lớp",
      turtle3Mode: "Turtle 3 - Thi lên lớp",
      white: "Trắng",
      black: "Đen",
      bee1Mode: "Bee 1 - Thi lên lớp",
      bee3Mode: "Bee 3 - Boss cuối",
      bee3Thinking: "Bee 3 đang suy nghĩ...",
      copyMoves: "Copy biên bản",
      copyMovesSuccess: "Đã copy biên bản",
      copyMovesFail: "Không copy được biên bản",
      random: "Random",
      greedy: "Greedy",
      minimax: "Minimax",
      queen: "Hậu",
      rook: "Xe",
      bishop: "Tượng",
      knight: "Mã",
      notation: "Ký hiệu: {locale}",
      legalMovesOn: "Nước hợp lệ: Bật",
      legalMovesOff: "Nước hợp lệ: Tắt",
      languageButton: "Ngôn ngữ: VI",
      invalidPremove: "Nước đi trước chưa hợp lệ",
      turtleKingLost: "Ôi mất Vua rồi :< Lần sau nhớ quan sát trước khi đi nha!",
      turtleKingCapturedByPlayer: "Tuyệt vời! Con đã quan sát tốt và ăn được Vua rồi 🎉",
      turtleKingCapturedNeutral: "{winner} đã ăn được Vua!",
      turtle2LeftKingWarning1: "Ôi, con vừa để Vua của mình vào nguy hiểm rồi!",
      turtle2LeftKingWarning2: "Cẩn thận nhé, Vua của con đang bị đe dọa rồi đó!",
      turtle2LeftKingPenalty: "Con đã bỏ Vua 3 lần. Lần này bot bắt Vua thật rồi!",
      undoCounter: "Con đã hoàn tác {count} lần rồi nhé 👀",
      chessLoadError: "Lỗi: không tải được chess.js"
    },
    en: {
      appTitle: "Chess Game",
      loading: "Loading...",
      checkmate: "Checkmate",
      check: "Check",
      draw: "Draw",
      whiteWins: "White wins",
      blackWins: "Black wins",
      stalemate: "Stalemate",
      threefold: "Threefold repetition",
      insufficient: "Insufficient material",
      newGame: "New game",
      reviewGame: "Review game",
      backToCurrent: "Back to current",
      reviewingMove: "Reviewing move",
      reviewingPrefix: "Reviewing:",
      moveLabel: "move",
      whiteSide: "White",
      blackSide: "Black",
      whiteToMove: "White to move",
      blackToMove: "Black to move",
      reset: "Reset",
      undo: "Undo",
      redo: "Redo",
      soundOn: "Sound On",
      soundOff: "Sound Off",
      themeLight: "Theme: Light",
      themeDark: "Theme: Dark",
      flipBoard: "Flip Board",
      flipBoardWhite: "Flip Board: White",
      flipBoardBlack: "Flip Board: Black",
      moves: "Moves",
      materialTitle: "Material advantage",
      materialEqual: "Equal",
      materialWhite: "White +{value}",
      materialBlack: "Black +{value}",
      materialWhiteBehind: "White -{value}",
      materialBlackBehind: "Black -{value}",
      mode: "Mode",
      player: "Player",
      bot: "Bot",
      applySettings: "Start / Apply Settings",
      localMode: "Local 2 Players",
      botMode: "Player vs Bot",
      turtleNewbornMode: "Turtle 1 - Newborn",
      turtleStandardMode: "Turtle 1 - Promotion Test",
      turtle2Mode: "Turtle 2 - Promotion Test",
      turtle3Mode: "Turtle 3 - Promotion Test",
      white: "White",
      black: "Black",
      bee1Mode: "Bee 1 - Test",
      bee3Mode: "Bee 3 - Final Boss",
      bee3Thinking: "Bee 3 is thinking...",
      copyMoves: "Copy moves",
      copyMovesSuccess: "Moves copied",
      copyMovesFail: "Could not copy moves",
      random: "Random",
      greedy: "Greedy",
      minimax: "Minimax",
      queen: "Queen",
      rook: "Rook",
      bishop: "Bishop",
      knight: "Knight",
      notation: "Notation: {locale}",
      legalMovesOn: "Legal moves: On",
      legalMovesOff: "Legal moves: Off",
      languageButton: "Language: EN",
      invalidPremove: "Invalid premove",
      turtleKingLost: "Oh no, the King was captured :< Remember to observe before moving!",
      turtleKingCapturedByPlayer: "Great job! You observed well and captured the King 🎉",
      turtleKingCapturedNeutral: "{winner} captured the King!",
      turtle2LeftKingWarning1: "Oops, your King is in danger!",
      turtle2LeftKingWarning2: "Be careful, your King is under attack!",
      turtle2LeftKingPenalty: "You left your King 3 times. This time the bot captures it for real!",
      undoCounter: "Undo used {count} time(s) 👀",
      chessLoadError: "Error: chess.js not loaded"
    }
  };

  function loadLanguage() {
    try {
      return localStorage.getItem("chessLanguage") || "vi";
    } catch (error) {
      return "vi";
    }
  }

  function loadTheme() {
    try {
      const savedTheme = localStorage.getItem("chessTheme");

      if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
      }
    } catch (error) {
      // Ignore storage errors and fall back to system preference.
    }

    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function loadBoardTheme() {
    try {
      const savedTheme = localStorage.getItem(BOARD_THEME_STORAGE_KEY);

      if (savedTheme && BOARD_THEMES[savedTheme]) {
        return savedTheme;
      }
    } catch (error) {
      // Ignore storage errors and fall back to classic.
    }

    return "classic";
  }

  function t(key, params) {
    const dictionary = translations[language] || translations.vi;
    let text = dictionary[key] || translations.en[key] || key;
    const values = params || {};

    Object.keys(values).forEach(function (name) {
      text = text.replace("{" + name + "}", values[name]);
    });

    return text;
  }

  function updateSelectOptionText(select, labels) {
    Array.from(select.options).forEach(function (option) {
      if (labels[option.value]) {
        option.textContent = labels[option.value];
      }
    });
  }

  function updateFlipButtonText() {
    flipButton.textContent = boardFlipped ? t("flipBoardBlack") : t("flipBoardWhite");
  }

  function updateBoardThemeUI() {
    if (!boardThemeButton || !boardThemePanel || !boardThemeTitle || !boardThemeLabel || !boardThemeSelect) {
      return;
    }

    const vi = language === "vi";

    boardThemeButton.textContent = vi ? "Bàn cờ" : "Board";
    boardThemeTitle.textContent = vi ? "Giao diện bàn cờ" : "Board Theme";
    boardThemeLabel.textContent = vi ? "Màu bàn" : "Board colors";

    updateSelectOptionText(boardThemeSelect, {
      classic: vi ? "Classic / Cổ điển" : "Classic / Cổ điển",
      ocean: vi ? "Ocean / Đại dương" : "Ocean / Ocean",
      forest: vi ? "Forest / Rừng" : "Forest / Forest",
      rose: vi ? "Rose / Hoa hồng" : "Rose / Rose",
      darkWood: vi ? "Dark Wood / Gỗ tối" : "Dark Wood / Dark Wood"
    });

    boardThemeSelect.value = boardTheme;
  }

  function isLegalMovesLockedOffMode(mode) {
    return mode === "turtle-newborn" || mode === "turtle-standard" || mode === "turtle-2";
  }

  function updateLegalMovesButtonText(mode) {
    const displayMode = mode || currentMode;
    const lockedOff = isLegalMovesLockedOffMode(displayMode);
    const enabled = displayMode === "turtle-3" || displayMode === "bee-1" || displayMode === "bee-2" || displayMode === "bee-3" ? turtle3LegalMovesEnabled : legalMovesEnabled;

    legalMovesButton.disabled = lockedOff;
    legalMovesButton.textContent = t(!lockedOff && enabled ? "legalMovesOn" : "legalMovesOff");
  }

  function updateLanguageUI() {
    document.title = t("appTitle");
    appTitle.textContent = t("appTitle");
    modeLabel.textContent = t("mode");
    playerLabel.textContent = t("player");
    botLabel.textContent = t("bot");
    movesTitle.textContent = t("moves");
    if (copyHistoryButton) {
      copyHistoryButton.textContent = "📋";
      copyHistoryButton.title = t("copyMoves");
      copyHistoryButton.setAttribute("aria-label", t("copyMoves"));
    }
    if (materialAdvantageLabel) {
      materialAdvantageLabel.textContent = t("materialTitle");
    }
    undoButton.textContent = t("undo");
    redoButton.textContent = t("redo");
    resetButton.textContent = t("reset");
    if (newGameOverlayButton) {
      newGameOverlayButton.textContent = t("newGame");
    }
    if (reviewGameButton) {
      reviewGameButton.textContent = t("reviewGame");
    }
    if (returnToCurrentButton) {
      returnToCurrentButton.textContent = t("backToCurrent");
    }
    applySettingsButton.textContent = t("applySettings");
    soundButton.textContent = soundEnabled ? t("soundOn") : t("soundOff");
    themeButton.textContent = theme === "dark" ? t("themeDark") : t("themeLight");
    notationButton.textContent = t("notation", { locale: notationLocale });
    updateLegalMovesButtonText();
    languageButton.textContent = t("languageButton");
    updateFlipButtonText();
    updateBoardThemeUI();

    updateSelectOptionText(modeSelect, {
      local: t("localMode"),
      bot: t("botMode"),
      "turtle-newborn": t("turtleNewbornMode"),
      "turtle-standard": t("turtleStandardMode"),
      "turtle-2": t("turtle2Mode"),
      "turtle-3": t("turtle3Mode"),
      "bee-1": t("bee1Mode"),
      "bee-2": language === "vi" ? "Bee 2 - Thi lên lớp" : "Bee 2 - Test",
      "bee-3": t("bee3Mode")
    });
    updateSelectOptionText(playerColorSelect, {
      w: t("white"),
      b: t("black")
    });
    updateSelectOptionText(botDifficultySelect, {
      random: t("random"),
      greedy: t("greedy"),
      minimax: t("minimax")
    });

    updateStatus();
    updateModeControls();
    updateMaterialAdvantage();
    updateReplayBanner();
    if (gameOverOverlay && !gameOverOverlay.classList.contains("hidden")) {
      const info = getGameOverInfo(game);

      if (info.isGameOver) {
        showGameOverOverlay(info);
      }
    }
    renderMoveHistory();
  }

  function updateModeControls() {
    const mode = modeSelect.value;
    const showBotDifficulty = mode === "bot";

    if (botDifficultyGroup) {
      botDifficultyGroup.style.display = showBotDifficulty ? "" : "none";
    }

    if (mode === "turtle-newborn") {
      botDifficultySelect.value = "greedy";
      botDifficultySelect.disabled = true;
    } else if (mode === "turtle-standard") {
      botDifficultySelect.value = "minimax";
      botDifficultySelect.disabled = true;
    } else if (mode === "turtle-2") {
      botDifficultySelect.value = "minimax";
      botDifficultySelect.disabled = true;
    } else if (mode === "turtle-3") {
      botDifficultySelect.value = "minimax";
      botDifficultySelect.disabled = true;
    } else if (mode === "bee-1" || mode === "bee-2" || mode === "bee-3") {
      botDifficultySelect.value = "minimax";
      botDifficultySelect.disabled = true;
    } else {
      botDifficultySelect.disabled = false;
    }

    updateLegalMovesButtonText(mode);
  }

  function setLanguage(lang) {
    language = lang;

    try {
      localStorage.setItem("chessLanguage", language);
    } catch (error) {
      console.warn("Could not save language preference:", error);
    }

    if (document.documentElement) {
      document.documentElement.lang = language === "vi" ? "vi" : "en";
    }
    updateLanguageUI();
  }

  function applyTheme() {
    document.body.classList.toggle("dark-theme", theme === "dark");
    themeButton.textContent = theme === "dark" ? t("themeDark") : t("themeLight");
  }

  function setTheme(nextTheme) {
    theme = nextTheme;

    try {
      localStorage.setItem("chessTheme", theme);
    } catch (error) {
      console.warn("Could not save theme preference:", error);
    }

    applyTheme();
  }

  function applyBoardTheme(themeKey) {
    const nextTheme = BOARD_THEMES[themeKey] ? themeKey : "classic";
    const themeConfig = BOARD_THEMES[nextTheme];

    boardTheme = nextTheme;
    document.body.style.setProperty("--board-light", themeConfig.boardLight);
    document.body.style.setProperty("--board-dark", themeConfig.boardDark);
    document.body.style.setProperty("--white-piece", themeConfig.pieceWhite);
    document.body.style.setProperty("--black-piece", themeConfig.pieceBlack);
    document.body.style.setProperty("--piece-outline", themeConfig.pieceOutline);
    document.body.style.setProperty("--white-piece-stroke", themeConfig.whitePieceStroke);
    document.body.style.setProperty("--black-piece-stroke", themeConfig.blackPieceStroke);
    document.body.style.setProperty("--white-piece-shadow", themeConfig.whitePieceShadow);
    document.body.style.setProperty("--black-piece-shadow", themeConfig.blackPieceShadow);
    document.body.style.setProperty("--selected-square", themeConfig.selectedSquare);
    document.body.style.setProperty("--legal-move", themeConfig.legalMove);
    document.body.style.setProperty("--legal-capture", themeConfig.legalCapture);
    document.body.style.setProperty("--last-move", themeConfig.lastMove);
    document.body.style.setProperty("--annotation-color", themeConfig.annotationColor);
    document.body.style.setProperty("--analysis-arrow", themeConfig.analysisArrow);
    document.body.style.setProperty("--analysis-circle", themeConfig.analysisCircle);

    try {
      localStorage.setItem(BOARD_THEME_STORAGE_KEY, boardTheme);
    } catch (error) {
      console.warn("Could not save board theme preference:", error);
    }

    updateBoardThemeUI();
    renderBoard();
  }

  function toggleBoardThemePanel() {
    if (!boardThemePanel) {
      return;
    }

    boardThemePanel.classList.toggle("hidden");
  }

  function createBoardThemeControls() {
    if (!controlsPanel || !legalMovesButton) {
      return;
    }

    boardThemeAnchor = document.createElement("div");
    boardThemeAnchor.className = "board-theme-anchor";

    boardThemeButton = document.createElement("button");
    boardThemeButton.id = "boardThemeButton";
    boardThemeButton.type = "button";

    boardThemePanel = document.createElement("div");
    boardThemePanel.id = "boardThemePanel";
    boardThemePanel.className = "board-theme-panel hidden";

    boardThemeTitle = document.createElement("div");
    boardThemeTitle.id = "boardThemeTitle";
    boardThemeTitle.className = "board-theme-title";

    const boardThemeField = document.createElement("label");
    boardThemeField.className = "board-theme-field";

    boardThemeLabel = document.createElement("span");
    boardThemeLabel.id = "boardThemeLabel";

    boardThemeSelect = document.createElement("select");
    boardThemeSelect.id = "boardThemeSelect";

    ["classic", "ocean", "forest", "rose", "darkWood"].forEach(function (themeKey) {
      const option = document.createElement("option");
      option.value = themeKey;
      boardThemeSelect.appendChild(option);
    });

    boardThemeField.appendChild(boardThemeLabel);
    boardThemeField.appendChild(boardThemeSelect);
    boardThemePanel.appendChild(boardThemeTitle);
    boardThemePanel.appendChild(boardThemeField);
    boardThemeAnchor.appendChild(boardThemeButton);
    boardThemeAnchor.appendChild(boardThemePanel);
    controlsPanel.insertBefore(boardThemeAnchor, legalMovesButton);

    boardThemeButton.addEventListener("click", toggleBoardThemePanel);
    boardThemeSelect.addEventListener("change", function () {
      applyBoardTheme(boardThemeSelect.value);
    });

    document.addEventListener("pointerdown", function (event) {
      if (!boardThemePanel || boardThemePanel.classList.contains("hidden")) {
        return;
      }

      if (boardThemeAnchor && !boardThemeAnchor.contains(event.target)) {
        boardThemePanel.classList.add("hidden");
      }
    });

    updateBoardThemeUI();
  }

  function displaySquare(row, col) {
    const files = "abcdefgh";

    if (boardFlipped) {
      return files[7 - col] + (row + 1);
    }

    return files[col] + (8 - row);
  }

  function boardArraySquare(row, col) {
    const files = "abcdefgh";
    return files[col] + (8 - row);
  }

  function squareToDisplay(square) {
    const files = "abcdefgh";
    const fileIndex = files.indexOf(square[0]);
    const rank = Number(square[1]);

    if (boardFlipped) {
      return {
        row: rank - 1,
        col: 7 - fileIndex
      };
    }

    return {
      row: 8 - rank,
      col: fileIndex
    };
  }

  function squareColor(square) {
    const files = "abcdefgh";
    const fileIndex = files.indexOf(square[0]);
    const rank = Number(square[1]);
    return (fileIndex + rank) % 2 === 0 ? "light" : "dark";
  }

  function squareCenter(square) {
    const size = board.clientWidth / 8;
    const position = squareToDisplay(square);

    return {
      x: position.col * size + size / 2,
      y: position.row * size + size / 2
    };
  }

  function squareFromEvent(event) {
    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return null;
    }

    const col = Math.min(7, Math.floor((x / rect.width) * 8));
    const row = Math.min(7, Math.floor((y / rect.height) * 8));
    return displaySquare(row, col);
  }

  function renderCoordinates() {
    const files = boardFlipped ? ["h", "g", "f", "e", "d", "c", "b", "a"] : ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = boardFlipped ? ["1", "2", "3", "4", "5", "6", "7", "8"] : ["8", "7", "6", "5", "4", "3", "2", "1"];

    fileCoordinates.innerHTML = "";
    rankCoordinates.innerHTML = "";

    files.forEach(function (file) {
      const label = document.createElement("span");
      label.textContent = file;
      fileCoordinates.appendChild(label);
    });

    ranks.forEach(function (rank) {
      const label = document.createElement("span");
      label.textContent = rank;
      rankCoordinates.appendChild(label);
    });
  }

  function getSquareElement(square) {
    return board.querySelector('[data-square="' + square + '"]');
  }

  function updateDragGhostPosition(event) {
    if (!dragGhostElement) {
      return;
    }

    dragGhostElement.style.left = event.clientX + "px";
    dragGhostElement.style.top = event.clientY + "px";
  }

  function hideOriginPiece() {
    const originSquare = getSquareElement(dragFromSquare);

    if (originSquare) {
      originSquare.textContent = "";
      originSquare.classList.add("drag-origin");
    }
  }

  function createDragGhost(event) {
    if (!draggedPiece || dragGhostElement) {
      return;
    }

    dragGhostElement = document.createElement("div");
    dragGhostElement.className = "drag-ghost";
    dragGhostElement.classList.add(draggedPiece.color === "w" ? "white-piece" : "black-piece");
    dragGhostElement.textContent = pieces[draggedPiece.color + draggedPiece.type];

    const originSquare = getSquareElement(dragFromSquare);
    dragGhostElement.style.fontSize = originSquare ? window.getComputedStyle(originSquare).fontSize : "46px";

    document.body.appendChild(dragGhostElement);
    updateDragGhostPosition(event);
    hideOriginPiece();
  }

  function removeDragGhost() {
    if (dragGhostElement) {
      dragGhostElement.remove();
    }

    dragGhostElement = null;
  }

  function hasActiveDrag() {
    return Boolean(dragFromSquare || draggedPiece || isDragging);
  }

  function cancelActiveDrag() {
    if (!hasActiveDrag()) {
      return false;
    }

    draggedPiece = null;
    dragFromSquare = null;
    pointerStart = null;
    isDragging = false;
    removeDragGhost();
    renderBoard();
    return true;
  }

  function updateStatus() {
    status.className = "";

    if (temporaryStatusMessage) {
      status.textContent = t(temporaryStatusMessage.key, temporaryStatusMessage.params);
      status.classList.add("warning");
      return;
    }

    if (isBotThinking && isBee3Mode()) {
      status.textContent = t("bee3Thinking");
      status.classList.add("neutral");
      return;
    }

    if (isTurtle1Mode()) {
      if (turtleGameOver) {
        status.textContent = t(turtleEndStatusKey, turtleEndStatusParams);
        status.classList.add("warning");
      } else if (game.turn() === "w") {
        status.textContent = t("whiteToMove");
        status.classList.add("white-turn");
      } else {
        status.textContent = t("blackToMove");
        status.classList.add("black-turn");
      }
      return;
    }

    if (isTurtle2Mode() && turtle2PenaltyGameOver) {
      status.textContent = t("turtle2LeftKingPenalty");
      status.classList.add("danger");
      return;
    }

    if (isTurtle2Mode() && turtle2ActiveWarningKey) {
      status.textContent = t(turtle2ActiveWarningKey);
      status.classList.add(turtle2ActiveWarningKey === "turtle2LeftKingPenalty" ? "danger" : "warning");
      return;
    }

    if (isCheckmatePosition(game)) {
      status.textContent = t("checkmate");
      status.classList.add("danger");
    } else if (isDrawPosition(game)) {
      status.textContent = t("draw");
      status.classList.add("neutral");
    } else if ((typeof game.in_check === "function" && game.in_check() || typeof game.isCheck === "function" && game.isCheck()) && !isTurtle2Mode()) {
      status.textContent = t("check");
      status.classList.add("danger");
    } else if (game.turn() === "w") {
      status.textContent = t("whiteToMove");
      status.classList.add("white-turn");
    } else {
      status.textContent = t("blackToMove");
      status.classList.add("black-turn");
    }
  }

  function showTemporaryStatus(key, params, duration) {
    temporaryStatusMessage = {
      key: key,
      params: params || {}
    };
    updateStatus();

    if (temporaryStatusTimer) {
      clearTimeout(temporaryStatusTimer);
    }

    temporaryStatusTimer = setTimeout(function () {
      temporaryStatusMessage = null;
      temporaryStatusTimer = null;
      updateStatus();
    }, duration || 900);
  }

  function clearTemporaryStatus() {
    temporaryStatusMessage = null;

    if (temporaryStatusTimer) {
      clearTimeout(temporaryStatusTimer);
      temporaryStatusTimer = null;
    }
  }

  function getCurrentMode() {
    return currentMode;
  }

  function isTurtle1Mode() {
    return currentMode === "turtle-newborn" || currentMode === "turtle-standard";
  }

  function isTurtle1NewbornMode() {
    return currentMode === "turtle-newborn";
  }

  function isTurtle1StandardMode() {
    return currentMode === "turtle-standard";
  }

  function isTurtle2Mode() {
    return currentMode === "turtle-2";
  }

  function isTurtle3Mode() {
    return currentMode === "turtle-3";
  }

  function isBee1Mode() {
    return currentMode === "bee-1";
  }

  function isBee2Mode() {
    return currentMode === "bee-2";
  }

  function isBee3Mode() {
    return modeSelect && modeSelect.value === "bee-3" && currentMode === "bee-3";
  }

  function getLearningSettings() {
    const legalMovesLockedOff = isTurtle1Mode() || isTurtle2Mode();
    const showLegalMoves = isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode() ? turtle3LegalMovesEnabled : legalMovesEnabled;

    return {
      allowKingCapture: isTurtle1Mode(),
      showLegalMoves: !legalMovesLockedOff && showLegalMoves,
      useCheckRules: !isTurtle1Mode(),
      premoveEnabled: getCurrentMode() === "local"
    };
  }

  function isBotTurn() {
    const learningOver = isTurtle1Mode() && turtleGameOver;
    const turtle2Over = isTurtle2Mode() && turtle2PenaltyGameOver;
    const standardOver = !isTurtle1Mode() && getGameOverInfo(game).isGameOver;
    return (getCurrentMode() === "bot" || isTurtle1Mode() || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode()) && game.turn() !== playerColor && !learningOver && !turtle2Over && !standardOver && !pendingPromotion;
  }

  function isBotGameMode() {
    return getCurrentMode() === "bot" || isTurtle1Mode() || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode();
  }

  function isCheckmatePosition(chessGame) {
    if (typeof chessGame.isCheckmate === "function") {
      return chessGame.isCheckmate();
    }

    return typeof chessGame.in_checkmate === "function" && chessGame.in_checkmate();
  }

  function isStalematePosition(chessGame) {
    if (typeof chessGame.isStalemate === "function") {
      return chessGame.isStalemate();
    }

    return typeof chessGame.in_stalemate === "function" && chessGame.in_stalemate();
  }

  function isDrawPosition(chessGame) {
    if (typeof chessGame.isDraw === "function") {
      return chessGame.isDraw();
    }

    return typeof chessGame.in_draw === "function" && chessGame.in_draw();
  }

  function isThreefoldPosition(chessGame) {
    if (typeof chessGame.isThreefoldRepetition === "function") {
      return chessGame.isThreefoldRepetition();
    }

    return typeof chessGame.in_threefold_repetition === "function" && chessGame.in_threefold_repetition();
  }

  function isInsufficientMaterialPosition(chessGame) {
    if (typeof chessGame.isInsufficientMaterial === "function") {
      return chessGame.isInsufficientMaterial();
    }

    return typeof chessGame.insufficient_material === "function" && chessGame.insufficient_material();
  }

  function getGameOverInfo(chessGame) {
    if (isCheckmatePosition(chessGame)) {
      const winner = chessGame.turn() === "w" ? "black" : "white";
      return {
        isGameOver: true,
        winner: winner,
        titleKey: winner === "white" ? "whiteWins" : "blackWins",
        reasonKey: "checkmate"
      };
    }

    if (isStalematePosition(chessGame)) {
      return {
        isGameOver: true,
        winner: null,
        titleKey: "draw",
        reasonKey: "stalemate"
      };
    }

    if (isThreefoldPosition(chessGame)) {
      return {
        isGameOver: true,
        winner: null,
        titleKey: "draw",
        reasonKey: "threefold"
      };
    }

    if (isInsufficientMaterialPosition(chessGame)) {
      return {
        isGameOver: true,
        winner: null,
        titleKey: "draw",
        reasonKey: "insufficient"
      };
    }

    if (isDrawPosition(chessGame)) {
      return {
        isGameOver: true,
        winner: null,
        titleKey: "draw",
        reasonKey: "draw"
      };
    }

    return {
      isGameOver: false,
      winner: null,
      titleKey: "",
      reasonKey: ""
    };
  }

  function shouldScheduleBotMove() {
    return !isReplayMode && !getGameOverInfo(game).isGameOver && isBotTurn() && (getCurrentMode() === "bot" || isTurtle1NewbornMode() || isTurtle1StandardMode() || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode());
  }

  function usesPairedBotUndoMode() {
    return getCurrentMode() === "bot" || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode();
  }

  function isLegalBotMoveObject(move) {
    if (!move || !move.from || !move.to) {
      return false;
    }

    return game.moves({ verbose: true }).some(function (candidate) {
      return candidate.from === move.from && candidate.to === move.to && (candidate.promotion || "") === (move.promotion || "");
    });
  }

  function cancelPendingBee3Move() {
    pendingBee3RequestId = null;
    pendingBee3Fen = null;
    pendingBee3BotColor = null;
    bee3RequestId++;

    if (botTimer) {
      clearTimeout(botTimer);
      botTimer = null;
    }

    isBotThinking = false;
    botThinkToken++;
    updateStatus();
  }

  function getBee3Worker() {
    if (!bee3WorkerAvailable || typeof Worker === "undefined") {
      if (!bee3WorkerFallbackLogged) {
        console.warn("Bee 3 using main-thread fallback.", {
          worker: false,
          source: "MAIN_THREAD_FALLBACK",
          reason: typeof Worker === "undefined" ? "Worker API unavailable" : "Worker disabled after error"
        });
        bee3WorkerFallbackLogged = true;
      }
      return null;
    }

    if (bee3Worker) {
      return bee3Worker;
    }

    try {
      bee3Worker = new Worker("bots/bee3-worker.js");
      bee3WorkerFallbackLogged = false;
      console.info("Bee 3 worker created.");
      bee3Worker.onmessage = handleBee3WorkerMessage;
      bee3Worker.onerror = function (error) {
        console.error("Bee 3 worker error:", error);
        console.warn("Bee 3 using main-thread fallback.");
        bee3WorkerAvailable = false;
        pendingBee3RequestId = null;
        pendingBee3Fen = null;
        pendingBee3BotColor = null;
        isBotThinking = false;
        botThinkToken++;
        updateStatus();
      };
      return bee3Worker;
    } catch (error) {
      console.error("Bee 3 worker error:", error);
      console.warn("Bee 3 using main-thread fallback.");
      bee3WorkerAvailable = false;
      return null;
    }
  }

  function getBee3MainThreadMove(chessGame, color) {
    if (window.Bee3Bot && typeof window.Bee3Bot.chooseBee3Move === "function") {
      const move = window.Bee3Bot.chooseBee3Move(chessGame, color);
      if (move) {
        return move;
      }
      console.warn("Bee 3 returned no move.");
      return null;
    }

    console.warn("Bee 3 is not loaded.");
    return null;
  }

  function requestBee3WorkerMove(fen, botColor) {
    const worker = getBee3Worker();
    if (!worker) {
      return false;
    }

    const requestId = ++bee3RequestId;
    pendingBee3RequestId = requestId;
    pendingBee3Fen = fen;
    pendingBee3BotColor = botColor;
    isBotThinking = true;
    updateStatus();
    console.info("Bee 3 worker request:", requestId);

    try {
      worker.postMessage({
        type: "chooseBee3Move",
        requestId: requestId,
        fen: fen,
        botColor: botColor
      });
      return true;
    } catch (error) {
      console.error("Bee 3 worker error:", error);
      console.warn("Bee 3 using main-thread fallback.");
      pendingBee3RequestId = null;
      pendingBee3Fen = null;
      pendingBee3BotColor = null;
      isBotThinking = false;
      updateStatus();
      return false;
    }
  }

  function handleBee3WorkerMessage(event) {
    const data = event && event.data ? event.data : {};
    if (data.type === "bee3WorkerLoaded") {
      console.info("Bee 3 worker loaded", {
        worker: data.worker === true,
        hasChess: data.hasChess === true,
        hasBee3: data.hasBee3 === true
      });
      if (!data.hasChess || !data.hasBee3) {
        console.warn("Bee 3 using main-thread fallback.");
        bee3WorkerAvailable = false;
      }
      return;
    }

    if (data.type !== "bee3MoveResult") {
      return;
    }

    console.info("Bee 3 worker result:", data.requestId, data.elapsedMs, {
      source: data.source,
      worker: data.worker === true
    });

    if (data.requestId !== pendingBee3RequestId) {
      return;
    }

    const requestFen = pendingBee3Fen;
    const requestColor = pendingBee3BotColor;
    pendingBee3RequestId = null;
    pendingBee3Fen = null;
    pendingBee3BotColor = null;

    if (isReplayMode || getGameOverInfo(game).isGameOver || !isBee3Mode() || game.fen() !== requestFen || game.turn() !== requestColor) {
      isBotThinking = false;
      updateStatus();
      return;
    }

    if (data.error) {
      console.error("Bee 3 worker returned an error:", data.error);
      console.warn("Bee 3 using main-thread fallback.", {
        worker: false,
        source: "MAIN_THREAD_FALLBACK"
      });
      const fallbackMove = getBee3MainThreadMove(game, requestColor);
      if (fallbackMove && isLegalBotMoveObject(fallbackMove)) {
        makeMove({
          from: fallbackMove.from,
          to: fallbackMove.to,
          promotion: fallbackMove.promotion || "q"
        }, { skipPremove: true });
        lastBotMove = {
          piece: fallbackMove.piece,
          from: fallbackMove.from,
          to: fallbackMove.to
        };
      }
      isBotThinking = false;
      renderBoard();
      return;
    }

    if (!isLegalBotMoveObject(data.move)) {
      console.warn("Bee 3 worker returned malformed or illegal move.", data.move);
      isBotThinking = false;
      renderBoard();
      return;
    }

    makeMove({
      from: data.move.from,
      to: data.move.to,
      promotion: data.move.promotion || "q"
    }, { skipPremove: true });
    lastBotMove = {
      piece: data.move.piece,
      from: data.move.from,
      to: data.move.to
    };
    isBotThinking = false;
    renderBoard();
  }

  function scheduleBotMove() {
    if (isBotThinking) {
      return;
    }

    if (botTimer) {
      clearTimeout(botTimer);
      botTimer = null;
    }

    if (!shouldScheduleBotMove()) {
      return;
    }

    const scheduledToken = ++botThinkToken;
    botTimer = setTimeout(function () {
      botTimer = null;
      if (scheduledToken !== botThinkToken || !shouldScheduleBotMove() || isBotThinking) {
        return;
      }

      isBotThinking = true;
      setTimeout(function () {
        try {
          if (scheduledToken !== botThinkToken) {
            return;
          }
          makeBotMove();
        } catch (error) {
          console.error("Bot move failed:", error);
        } finally {
          if (!pendingBee3RequestId) {
            isBotThinking = false;
            updateStatus();
          }
        }
      }, 0);
    }, 300);
  }

  function hideGameOverOverlay() {
    if (gameOverOverlay) {
      gameOverOverlay.classList.add("hidden");
    }
  }

  function showGameOverOverlay(info) {
    if (!gameOverOverlay || !gameOverTitle || !gameOverReason) {
      return;
    }

    gameOverTitle.textContent = t(info.titleKey);
    gameOverReason.textContent = t(info.reasonKey);
    gameOverOverlay.classList.remove("hidden");
  }

  function checkAndShowGameOver() {
    if (isReplayMode || isTurtle1Mode() || isTurtle2Mode()) {
      return false;
    }

    const info = getGameOverInfo(game);

    if (!info.isGameOver) {
      hideGameOverOverlay();
      return false;
    }

    if (botTimer) {
      clearTimeout(botTimer);
      botTimer = null;
    }
    pendingBee3RequestId = null;
    pendingBee3Fen = null;
    pendingBee3BotColor = null;
    bee3RequestId++;
    isBotThinking = false;
    botThinkToken++;

    clearSelection();
    clearPremove();
    showGameOverOverlay(info);
    return true;
  }

  function getReplaySourceHistory() {
    return isTurtle1Mode() ? turtleMoveHistory.slice() : game.history({ verbose: true });
  }

  function buildReplayGameToPly(ply) {
    const nextReplayGame = new Chess();
    const sourceHistory = getReplaySourceHistory();
    const safePly = Math.max(0, Math.min(ply, sourceHistory.length));

    for (let index = 0; index < safePly; index++) {
      const move = sourceHistory[index];

      const appliedMove = nextReplayGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      if (!appliedMove) {
        break;
      }
    }

    return nextReplayGame;
  }

  function getDisplayGame() {
    return isReplayMode && replayGame ? replayGame : game;
  }

  function getReplayMoveLabel(ply) {
    const safePly = Math.max(0, Number(ply) || 0);

    if (!safePly) {
      return t("reviewingPrefix") + " " + t("moveLabel") + " 0";
    }

    const moveNumber = Math.ceil(safePly / 2);
    const side = safePly % 2 === 1 ? t("whiteSide") : t("blackSide");

    return t("reviewingPrefix") + " " + t("moveLabel") + " " + moveNumber + " " + side;
  }

  function updateReplayBanner() {
    if (!replayBanner || !replayLabel) {
      return;
    }

    if (!isReplayMode) {
      replayBanner.classList.add("hidden");
      return;
    }

    replayLabel.textContent = getReplayMoveLabel(replayPly);
    replayBanner.classList.remove("hidden");
  }

  function exitReplayMode(skipBotSchedule) {
    isReplayMode = false;
    replayPly = null;
    replayGame = null;
    updateReplayBanner();
    renderBoard();
    if (!skipBotSchedule) {
      scheduleBotMove();
    }
  }

  function enterReplayMode(ply) {
    const historyLength = getReplaySourceHistory().length;

    if (ply >= historyLength) {
      exitReplayMode(true);
      return;
    }

    isReplayMode = true;
    replayPly = Math.max(0, Math.min(ply, historyLength));
    replayGame = buildReplayGameToPly(replayPly);

    if (botTimer) {
      clearTimeout(botTimer);
      botTimer = null;
    }
    pendingBee3RequestId = null;
    pendingBee3Fen = null;
    pendingBee3BotColor = null;
    bee3RequestId++;
    isBotThinking = false;
    botThinkToken++;

    clearSelection();
    clearPremove();
    hidePromotionPicker();
    hideGameOverOverlay();
    updateReplayBanner();
    renderBoard();
  }

  function chooseRandomMove() {
    const moves = game.moves({ verbose: true });

    if (!moves.length) {
      return null;
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  function oppositeColor(color) {
    return color === "w" ? "b" : "w";
  }

  function isInsideBoard(file, rank) {
    return file >= 0 && file < 8 && rank >= 1 && rank <= 8;
  }

  function squareFromCoords(file, rank) {
    return "abcdefgh"[file] + rank;
  }

  function coordsFromSquare(square) {
    return {
      file: "abcdefgh".indexOf(square[0]),
      rank: Number(square[1])
    };
  }

  function findKingSquare(color) {
    const rows = game.board();

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

  function getKingSquare(color) {
    return findKingSquare(color);
  }

  function addTurtleMove(moves, from, to, promotion) {
    const movingPiece = game.get(from);
    const targetPiece = game.get(to);

    if (!movingPiece || targetPiece && targetPiece.color === movingPiece.color) {
      return;
    }

    moves.push({
      from: from,
      to: to,
      piece: movingPiece.type,
      color: movingPiece.color,
      captured: targetPiece ? targetPiece.type : undefined,
      capturedColor: targetPiece ? targetPiece.color : undefined,
      promotion: promotion
    });
  }

  function getTurtlePseudoMovesFrom(from) {
    const piece = game.get(from);

    if (!piece) {
      return [];
    }

    const moves = [];
    const coords = coordsFromSquare(from);
    const direction = piece.color === "w" ? 1 : -1;

    if (piece.type === "p") {
      const oneRank = coords.rank + direction;
      const startRank = piece.color === "w" ? 2 : 7;
      const promotionRank = piece.color === "w" ? 8 : 1;

      if (isInsideBoard(coords.file, oneRank)) {
        const oneSquare = squareFromCoords(coords.file, oneRank);

        if (!game.get(oneSquare)) {
          addTurtleMove(moves, from, oneSquare, oneRank === promotionRank ? "q" : undefined);

          const twoRank = coords.rank + direction * 2;
          const twoSquare = squareFromCoords(coords.file, twoRank);

          if (coords.rank === startRank && isInsideBoard(coords.file, twoRank) && !game.get(twoSquare)) {
            addTurtleMove(moves, from, twoSquare);
          }
        }
      }

      [-1, 1].forEach(function (fileOffset) {
        const targetFile = coords.file + fileOffset;
        const targetRank = coords.rank + direction;

        if (!isInsideBoard(targetFile, targetRank)) {
          return;
        }

        const targetSquare = squareFromCoords(targetFile, targetRank);
        const targetPiece = game.get(targetSquare);

        if (targetPiece && targetPiece.color !== piece.color) {
          addTurtleMove(moves, from, targetSquare, targetRank === promotionRank ? "q" : undefined);
        }
      });

      return moves;
    }

    const leaperOffsets = {
      n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]],
      k: [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]]
    };

    if (leaperOffsets[piece.type]) {
      leaperOffsets[piece.type].forEach(function (offset) {
        const file = coords.file + offset[0];
        const rank = coords.rank + offset[1];

        if (isInsideBoard(file, rank)) {
          addTurtleMove(moves, from, squareFromCoords(file, rank));
        }
      });

      return moves;
    }

    const sliderOffsets = {
      b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
      r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
      q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
    };

    sliderOffsets[piece.type].forEach(function (offset) {
      let file = coords.file + offset[0];
      let rank = coords.rank + offset[1];

      while (isInsideBoard(file, rank)) {
        const targetSquare = squareFromCoords(file, rank);
        const targetPiece = game.get(targetSquare);

        if (targetPiece && targetPiece.color === piece.color) {
          break;
        }

        addTurtleMove(moves, from, targetSquare);

        if (targetPiece) {
          break;
        }

        file += offset[0];
        rank += offset[1];
      }
    });

    return moves;
  }

  function getAllTurtlePseudoMoves(color) {
    const moves = [];
    const rows = game.board();

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (piece && piece.color === color) {
          moves.push.apply(moves, getTurtlePseudoMovesFrom(boardArraySquare(rowIndex, colIndex)));
        }
      });
    });

    return moves;
  }

  window.Turtle1BotContext = {
    game: game,
    pieceValues: pieceValues,
    oppositeColor: oppositeColor,
    getKingSquare: getKingSquare,
    getTurtlePseudoMovesFrom: getTurtlePseudoMovesFrom,
    getAllTurtlePseudoMoves: getAllTurtlePseudoMoves,
    getLastBotMove: function () {
      return lastBotMove;
    }
  };

  window.Turtle2BotContext = {
    game: game,
    pieceValues: pieceValues,
    oppositeColor: oppositeColor,
    getKingSquare: getKingSquare,
    getLastBotMove: function () {
      return lastBotMove;
    }
  };

  window.Turtle3BotContext = {
    game: game,
    pieceValues: pieceValues,
    oppositeColor: oppositeColor,
    getKingSquare: getKingSquare,
    getLastBotMove: function () {
      return lastBotMove;
    }
  };

  window.Bee1BotContext = {
    game: game,
    pieceValues: pieceValues,
    oppositeColor: oppositeColor,
    getKingSquare: getKingSquare,
    getLastBotMove: function () {
      return lastBotMove;
    }
  };

  function isKingCaptureMove(from, to) {
    if (!isTurtle1Mode()) {
      return false;
    }

    const targetPiece = game.get(to);
    return Boolean(targetPiece && targetPiece.type === "k" && getTurtlePseudoMovesFrom(from).some(function (move) {
      return move.to === to;
    }));
  }

  function endByKingCapture(winnerColor) {
    if (!isTurtle1Mode()) {
      return;
    }

    turtleGameOver = true;
    turtleWinner = winnerColor;
    clearPremove();
    clearSelection();

    if (winnerColor === playerColor) {
      turtleEndStatusKey = "turtleKingCapturedByPlayer";
      turtleEndStatusParams = {};
    } else {
      turtleEndStatusKey = "turtleKingLost";
      turtleEndStatusParams = {};
    }

    showTemporaryStatus(turtleEndStatusKey, turtleEndStatusParams, 4000);
  }

  function clearLearningState() {
    turtleGameOver = false;
    turtleWinner = null;
    turtleMoveHistory = [];
    turtleRedoStack = [];
    undoCount = 0;
    lastBotMove = null;
    turtleEndStatusKey = "turtleKingLost";
    turtleEndStatusParams = {};
    turtle2LeftKingCount = 0;
    turtle2WarningHistory = [];
    turtle2WarningRedoStack = [];
    turtle2PenaltyGameOver = false;
    turtle2ActiveWarningKey = null;
    turtle2WarningKingSquare = null;
    turtle2PenaltyKingSquare = null;
    clearTurtle2WarningFlash();
  }

  function chooseGreedyMove() {
    const moves = game.moves({ verbose: true });
    const captures = moves.filter(function (move) {
      return move.captured;
    });

    if (!captures.length) {
      return chooseRandomMove();
    }

    const bestValue = Math.max.apply(null, captures.map(function (move) {
      return pieceValues[move.captured] || 0;
    }));
    const bestMoves = captures.filter(function (move) {
      return (pieceValues[move.captured] || 0) === bestValue;
    });

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function evaluateBoard(chessGame) {
    let score = 0;
    const rows = chessGame.board();

    rows.forEach(function (row) {
      row.forEach(function (piece) {
        if (!piece) {
          return;
        }

        const value = pieceValues[piece.type] || 0;
        score += piece.color === "w" ? value : -value;
      });
    });

    return score;
  }

  function minimax(chessGame, depth, isMaximizing) {
    if (depth === 0 || chessGame.game_over()) {
      return evaluateBoard(chessGame);
    }

    const moves = chessGame.moves({ verbose: true });

    if (isMaximizing) {
      let bestScore = -Infinity;

      moves.forEach(function (move) {
        chessGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q"
        });
        bestScore = Math.max(bestScore, minimax(chessGame, depth - 1, false));
        chessGame.undo();
      });

      return bestScore;
    }

    let bestScore = Infinity;

    moves.forEach(function (move) {
      chessGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });
      bestScore = Math.min(bestScore, minimax(chessGame, depth - 1, true));
      chessGame.undo();
    });

    return bestScore;
  }

  function getBestMove(chessGame) {
    const moves = chessGame.moves({ verbose: true });

    if (!moves.length) {
      return null;
    }

    const botIsWhite = chessGame.turn() === "w";
    let bestScore = botIsWhite ? -Infinity : Infinity;
    let bestMoves = [];

    moves.forEach(function (move) {
      chessGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      const score = minimax(chessGame, 1, !botIsWhite);
      chessGame.undo();

      if (botIsWhite && score > bestScore || !botIsWhite && score < bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    });

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function getBotMove(chessGame, color) {
    const mode = modeSelect.value;

    if (mode === "bee-3") {
      return getBee3MainThreadMove(chessGame, color);
    }

    if (mode === "bee-2") {
      if (window.Bee2Bot && typeof window.Bee2Bot.chooseBee2Move === "function") {
        console.log("Bee2 Context:", window.Bee2Bot.buildBee2Context(chessGame, color));
        const move = window.Bee2Bot.chooseBee2Move(chessGame, color);

        if (move) {
          return move;
        }
      }

      if (typeof window.chooseBee1BotMove === "function") {
        return window.chooseBee1BotMove(chessGame, color);
      }

      return null;
    }

    if (mode === "bee-1") {
      return window.chooseBee1BotMove(chessGame, color);
    }

    let move = chooseRandomMove();

    if (botDifficulty === "greedy") {
      move = chooseGreedyMove();
    } else if (botDifficulty === "minimax") {
      move = getBestMove(chessGame);
    }

    return move;
  }

  function makeBotMove() {
    if (isReplayMode || getGameOverInfo(game).isGameOver) {
      return;
    }

    if (!isBotTurn()) {
      return;
    }

    if (isTurtle1Mode()) {
      const turtleMove = isTurtle1NewbornMode() ? chooseTurtle1NewbornBotMove() : chooseTurtle1StandardBotMove();

      if (!turtleMove) {
        renderBoard();
        return;
      }

      makeTurtleMove({
        from: turtleMove.from,
        to: turtleMove.to,
        promotion: turtleMove.promotion
      });
      lastBotMove = {
        piece: turtleMove.piece,
        from: turtleMove.from,
        to: turtleMove.to
      };
      renderBoard();
      return;
    }

    if (isTurtle2Mode()) {
      const turtle2Move = chooseTurtle2BotMove();

      if (!turtle2Move) {
        renderBoard();
        return;
      }

      makeMove({
        from: turtle2Move.from,
        to: turtle2Move.to,
        promotion: turtle2Move.promotion || "q"
      }, { skipPremove: true });
      lastBotMove = {
        piece: turtle2Move.piece,
        from: turtle2Move.from,
        to: turtle2Move.to
      };
      renderBoard();
      return;
    }

    if (isTurtle3Mode()) {
      const turtle3Move = chooseTurtle3BotMove();

      if (!turtle3Move) {
        renderBoard();
        return;
      }

      makeMove({
        from: turtle3Move.from,
        to: turtle3Move.to,
        promotion: turtle3Move.promotion || "q"
      }, { skipPremove: true });
      lastBotMove = {
        piece: turtle3Move.piece,
        from: turtle3Move.from,
        to: turtle3Move.to
      };
      renderBoard();
      return;
    }

    if (isBee3Mode()) {
      const bee3Fen = game.fen();
      const bee3Color = game.turn();
      if (requestBee3WorkerMove(bee3Fen, bee3Color)) {
        renderBoard();
        return;
      }

      console.info("Bee 3 main-thread fallback request:", {
        worker: false,
        source: "MAIN_THREAD_FALLBACK"
      });
      const bee3Move = getBee3MainThreadMove(game, bee3Color);

      if (!bee3Move) {
        renderBoard();
        return;
      }

      if (!isLegalBotMoveObject(bee3Move)) {
        console.warn("Bee 3 returned malformed or illegal move.", bee3Move);
        renderBoard();
        return;
      }

      makeMove({
        from: bee3Move.from,
        to: bee3Move.to,
        promotion: bee3Move.promotion || "q"
      }, { skipPremove: true });
      lastBotMove = {
        piece: bee3Move.piece,
        from: bee3Move.from,
        to: bee3Move.to
      };
      renderBoard();
      return;
    }

    if (isBee1Mode() || isBee2Mode()) {
      const beeMove = getBotMove(game, game.turn());

      if (!beeMove) {
        renderBoard();
        return;
      }

      if (!beeMove.from || !beeMove.to) {
        console.warn("Bot returned malformed move.", beeMove);
        renderBoard();
        return;
      }

      makeMove({
        from: beeMove.from,
        to: beeMove.to,
        promotion: beeMove.promotion || "q"
      }, { skipPremove: true });
      lastBotMove = {
        piece: beeMove.piece,
        from: beeMove.from,
        to: beeMove.to
      };
      renderBoard();
      return;
    }

    const move = getBotMove(game, game.turn());

    if (!move) {
      renderBoard();
      return;
    }

    makeMove({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    }, { skipPremove: true });
    renderBoard();
  }

  function resetInteractionState() {
    clearTemporaryStatus();
    clearSelection();
    clearAnnotations();
    clearPremove();
    hidePromotionPicker();
    lastMove = null;
    redoStack = [];
    turtle2ActiveWarningKey = null;
    turtle2WarningKingSquare = null;
    turtle2PenaltyKingSquare = null;
    clearTurtle2WarningFlash();
    draggedPiece = null;
    dragFromSquare = null;
    pointerStart = null;
    isDragging = false;
    removeDragGhost();

    if (botTimer) {
      clearTimeout(botTimer);
      botTimer = null;
    }
    isBotThinking = false;
    botThinkToken++;
  }

  function applyGameSettings() {
    cancelPendingBee3Move();
    currentMode = modeSelect.value;
    playerColor = playerColorSelect.value;
    botDifficulty = isTurtle1NewbornMode() ? "greedy" : isTurtle1StandardMode() || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode() ? "turtle-standard" : botDifficultySelect.value;
    if (isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode()) {
      turtle3LegalMovesEnabled = false;
    }

    game.reset();
    exitReplayMode(true);
    hideGameOverOverlay();
    resetInteractionState();
    clearLearningState();

    if ((currentMode === "bot" || isTurtle1Mode() || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode()) && playerColor === "b") {
      boardFlipped = true;
      updateFlipButtonText();
    } else {
      boardFlipped = false;
      updateFlipButtonText();
    }

    updateLegalMovesButtonText();
    renderBoard();
    scheduleBotMove();
  }

  function getLegalMoves(square) {
    return game.moves({
      square: square,
      verbose: true
    });
  }

  function selectSquare(square) {
    selectedSquare = square;
    premoveSource = null;
    legalMoves = getLegalMoves(square);
    if (DEBUG_CLICK_TO_MOVE) {
      console.log("[ClickMove] selectSquare", square, legalMoves);
    }
  }

  function selectPremoveSource(square) {
    selectedSquare = null;
    legalMoves = [];
    premoveSource = square;
  }

  function clearSelection() {
    selectedSquare = null;
    legalMoves = [];
    premoveSource = null;
  }

  function isLegalTarget(square) {
    return legalMoves.some(function (move) {
      return move.to === square;
    });
  }

  function findCheckedKingSquare(chessGame) {
    const boardGame = chessGame || game;

    if (isTurtle1Mode() || isTurtle2Mode() || !isCheckmatePosition(boardGame) && !(typeof boardGame.in_check === "function" && boardGame.in_check()) && !(typeof boardGame.isCheck === "function" && boardGame.isCheck())) {
      return null;
    }

    const checkedColor = boardGame.turn();
    const rows = boardGame.board();

    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        const piece = rows[row][col];

        if (piece && piece.type === "k" && piece.color === checkedColor) {
          return boardArraySquare(row, col);
        }
      }
    }

    return null;
  }

  function highlightCheckedKing(square, squareNameValue, checkedKingSquare) {
    if (squareNameValue === checkedKingSquare) {
      square.classList.add("checked-king");
    }
  }

  function isPremoveSquare(square) {
    return premove && (square === premove.from || square === premove.to);
  }

  function clearPremove() {
    premove = null;
    premoveSource = null;
  }

  function isPromotionMove(from, to) {
    const piece = game.get(from);
    const targetRank = to[1];

    return Boolean(piece && piece.type === "p" && ((piece.color === "w" && targetRank === "8") || (piece.color === "b" && targetRank === "1")));
  }

  function showPromotionPicker(from, to, options) {
    pendingPromotion = {
      from: from,
      to: to
    };

    promotionPicker.innerHTML = "";

    options.forEach(function (option) {
      const piece = game.get(from);
      const button = document.createElement("button");

      button.type = "button";
      button.title = t(option.labelKey);
      button.textContent = pieces[piece.color + option.piece];
      button.addEventListener("click", function () {
        const moveData = {
          from: pendingPromotion.from,
          to: pendingPromotion.to,
          promotion: option.piece
        };

        pendingPromotion = null;
        promotionModal.classList.add("hidden");
        makeMove(moveData);
        renderBoard();
      });

      promotionPicker.appendChild(button);
    });

    promotionModal.classList.remove("hidden");
  }

  function hidePromotionPicker() {
    pendingPromotion = null;
    promotionModal.classList.add("hidden");
    promotionPicker.innerHTML = "";
  }

  function isLegalPremove(from, to, promotion) {
    const piece = game.get(from);

    if (!piece || piece.color === game.turn()) {
      return false;
    }

    try {
      // Validate from current FEN, but switch active color to the premove side.
      const parts = game.fen().split(" ");
      parts[1] = piece.color;
      parts[3] = "-";

      const tempFen = parts.join(" ");
      const tempGame = new Chess(tempFen);
      const move = tempGame.move({
        from: from,
        to: to,
        promotion: promotion || "q"
      });

      return move !== null;
    } catch (error) {
      console.error("isLegalPremove error:", error);
      return false;
    }
  }

  function setPremove(from, to) {
    if (!from || !to || from === to) {
      clearPremove();
      return;
    }

    const piece = game.get(from);

    if (!piece || piece.color === game.turn()) {
      clearPremove();
      return;
    }

    // Promotion premove defaults to Queen for now; it is kept explicit for a future picker.
    const promotion = isPromotionMove(from, to) ? "q" : undefined;

    if (!isLegalPremove(from, to, promotion)) {
      clearPremove();
      showTemporaryStatus("invalidPremove");
      return;
    }

    clearTemporaryStatus();

    premove = {
      from: from,
      to: to,
      color: piece.color,
      promotion: promotion
    };
    premoveSource = null;
  }

  function updateLastMoveFromHistory() {
    const history = game.history({ verbose: true });
    const move = history[history.length - 1];
    lastMove = move ? { from: move.from, to: move.to } : null;
  }

  function clearTurtle2WarningFlash() {
    board.classList.remove("turtle2-king-warning-flash");

    if (turtle2WarningFlashTimer) {
      clearTimeout(turtle2WarningFlashTimer);
      turtle2WarningFlashTimer = null;
    }
  }

  function flashTurtle2Warning() {
    clearTurtle2WarningFlash();
    void board.offsetWidth;
    board.classList.add("turtle2-king-warning-flash");
    turtle2WarningFlashTimer = setTimeout(function () {
      board.classList.remove("turtle2-king-warning-flash");
      turtle2WarningFlashTimer = null;
    }, 650);
  }

  function clearTurtle2WarningVisual() {
    turtle2ActiveWarningKey = null;
    turtle2WarningKingSquare = null;
    turtle2PenaltyKingSquare = null;
    clearTurtle2WarningFlash();
  }

  function isSquareAttackedTurtle2Basic(square, byColor) {
    const target = coordsFromSquare(square);
    const pawnDirection = byColor === "w" ? 1 : -1;
    const pawnRank = target.rank - pawnDirection;

    for (let pawnIndex = 0; pawnIndex < 2; pawnIndex++) {
      const file = target.file + (pawnIndex === 0 ? -1 : 1);

      if (isInsideBoard(file, pawnRank)) {
        const piece = game.get(squareFromCoords(file, pawnRank));

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
        const piece = game.get(squareFromCoords(file, rank));

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
        const piece = game.get(squareFromCoords(file, rank));

        if (piece && piece.color === byColor && piece.type === "k") {
          return true;
        }
      }
    }

    const sliderGroups = [
      { offsets: [[1, 0], [-1, 0], [0, 1], [0, -1]], pieces: ["r", "q"] },
      { offsets: [[1, 1], [1, -1], [-1, 1], [-1, -1]], pieces: ["b", "q"] }
    ];

    for (let groupIndex = 0; groupIndex < sliderGroups.length; groupIndex++) {
      const group = sliderGroups[groupIndex];

      for (let offsetIndex = 0; offsetIndex < group.offsets.length; offsetIndex++) {
        const offset = group.offsets[offsetIndex];
        let file = target.file + offset[0];
        let rank = target.rank + offset[1];

        while (isInsideBoard(file, rank)) {
          const piece = game.get(squareFromCoords(file, rank));

          if (piece) {
            if (piece.color === byColor && group.pieces.includes(piece.type)) {
              return true;
            }

            break;
          }

          file += offset[0];
          rank += offset[1];
        }
      }
    }

    return false;
  }

  function isPathClearTurtle2(fromCoords, toCoords, fileStep, rankStep) {
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

  function isPseudoLegalTurtle2Attempt(from, to) {
    if (!isTurtle2Mode()) {
      return false;
    }

    const piece = game.get(from);
    const targetPiece = game.get(to);

    if (!piece || piece.color !== game.turn() || targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    const fromCoords = coordsFromSquare(from);
    const toCoords = coordsFromSquare(to);
    const fileDelta = toCoords.file - fromCoords.file;
    const rankDelta = toCoords.rank - fromCoords.rank;
    const absFile = Math.abs(fileDelta);
    const absRank = Math.abs(rankDelta);

    if (!isInsideBoard(toCoords.file, toCoords.rank)) {
      return false;
    }

    if (piece.type === "p") {
      const direction = piece.color === "w" ? 1 : -1;
      const startRank = piece.color === "w" ? 2 : 7;

      if (fileDelta === 0 && rankDelta === direction && !targetPiece) {
        return true;
      }

      if (fileDelta === 0 && rankDelta === direction * 2 && fromCoords.rank === startRank && !targetPiece) {
        return !game.get(squareFromCoords(fromCoords.file, fromCoords.rank + direction));
      }

      if (absFile === 1 && rankDelta === direction) {
        if (targetPiece && targetPiece.color !== piece.color) {
          return true;
        }

        const fenParts = game.fen().split(" ");
        return fenParts[3] === to;
      }

      return false;
    }

    if (piece.type === "n") {
      return absFile * absRank === 2;
    }

    if (piece.type === "k") {
      if (absFile <= 1 && absRank <= 1) {
        return true;
      }

      return from === (piece.color === "w" ? "e1" : "e8") && absFile === 2 && rankDelta === 0;
    }

    if (piece.type === "b") {
      return absFile === absRank && isPathClearTurtle2(fromCoords, toCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "r") {
      return (fileDelta === 0 || rankDelta === 0) && isPathClearTurtle2(fromCoords, toCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "q") {
      const isDiagonal = absFile === absRank;
      const isStraight = fileDelta === 0 || rankDelta === 0;
      return (isDiagonal || isStraight) && isPathClearTurtle2(fromCoords, toCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    return false;
  }

  function wouldLeaveKingInDangerTurtle2(from, to, promotion) {
    const movingPiece = game.get(from);
    const targetPiece = game.get(to);
    let enPassantCapture = null;

    if (!movingPiece) {
      return false;
    }

    game.remove(from);

    if (targetPiece) {
      game.remove(to);
    }

    if (movingPiece.type === "p" && !targetPiece && from[0] !== to[0]) {
      const capturedPawnSquare = to[0] + from[1];
      const capturedPawn = game.get(capturedPawnSquare);

      if (capturedPawn && capturedPawn.type === "p" && capturedPawn.color !== movingPiece.color) {
        enPassantCapture = {
          square: capturedPawnSquare,
          piece: game.remove(capturedPawnSquare)
        };
      }
    }

    game.put({ type: promotion || movingPiece.type, color: movingPiece.color }, to);

    const kingSquare = movingPiece.type === "k" ? to : getKingSquare(movingPiece.color);
    const kingInDanger = !kingSquare || isSquareAttackedTurtle2Basic(kingSquare, oppositeColor(movingPiece.color));

    game.remove(to);

    if (targetPiece) {
      game.put(targetPiece, to);
    }

    if (enPassantCapture) {
      game.put(enPassantCapture.piece, enPassantCapture.square);
    }

    game.put(movingPiece, from);
    return kingInDanger;
  }

  function isTurtle2LeftKingAttempt(from, to, promotion) {
    return isTurtle2Mode() && isPseudoLegalTurtle2Attempt(from, to) && wouldLeaveKingInDangerTurtle2(from, to, promotion);
  }

  function getTurtle2PlayerKingSquare() {
    return getKingSquare(playerColor);
  }

  function doesTurtle2PieceAttackSquare(from, targetSquare) {
    const piece = game.get(from);
    const targetCoords = coordsFromSquare(targetSquare);
    const fromCoords = coordsFromSquare(from);
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
      return absFile === absRank && isPathClearTurtle2(fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "r") {
      return (fileDelta === 0 || rankDelta === 0) && isPathClearTurtle2(fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    if (piece.type === "q") {
      const isDiagonal = absFile === absRank;
      const isStraight = fileDelta === 0 || rankDelta === 0;
      return (isDiagonal || isStraight) && isPathClearTurtle2(fromCoords, targetCoords, Math.sign(fileDelta), Math.sign(rankDelta));
    }

    return false;
  }

  function getTurtle2AttackersOfSquare(square, byColor) {
    const attackers = [];
    const rows = game.board();

    rows.forEach(function (row, rowIndex) {
      row.forEach(function (piece, colIndex) {
        if (!piece || piece.color !== byColor) {
          return;
        }

        const from = boardArraySquare(rowIndex, colIndex);

        if (doesTurtle2PieceAttackSquare(from, square)) {
          attackers.push({
            from: from,
            piece: piece
          });
        }
      });
    });

    return attackers.sort(function (a, b) {
      return (pieceValues[a.piece.type] || 0) - (pieceValues[b.piece.type] || 0);
    });
  }

  function applyTurtle2PenaltyAttempt(attempt) {
    if (!attempt || !attempt.from || !attempt.to) {
      return null;
    }

    const movingPiece = game.get(attempt.from);

    if (!movingPiece || movingPiece.color !== playerColor) {
      return null;
    }

    const capturedPiece = game.get(attempt.to);
    game.remove(attempt.from);

    if (capturedPiece) {
      game.remove(attempt.to);
    }

    game.put({ type: attempt.promotion || movingPiece.type, color: movingPiece.color }, attempt.to);

    return {
      from: attempt.from,
      to: attempt.to,
      movingPiece: movingPiece,
      capturedPiece: capturedPiece || null,
      promotion: attempt.promotion
    };
  }

  function undoTurtle2PenaltyAttempt(appliedAttempt) {
    if (!appliedAttempt) {
      return;
    }

    game.remove(appliedAttempt.to);

    if (appliedAttempt.capturedPiece) {
      game.put(appliedAttempt.capturedPiece, appliedAttempt.to);
    }

    game.put(appliedAttempt.movingPiece, appliedAttempt.from);
  }

  function captureTurtle2PlayerKing(square, attempt) {
    const kingSquare = square || getTurtle2PlayerKingSquare();

    if (!kingSquare) {
      return null;
    }

    const appliedAttempt = applyTurtle2PenaltyAttempt(attempt);
    const kingPiece = game.get(kingSquare);

    if (!kingPiece || kingPiece.type !== "k" || kingPiece.color !== playerColor) {
      undoTurtle2PenaltyAttempt(appliedAttempt);
      return null;
    }

    const attackers = getTurtle2AttackersOfSquare(kingSquare, oppositeColor(playerColor));
    const attacker = attackers[0] || null;

    if (attacker) {
      const attackerPiece = game.remove(attacker.from);
      game.remove(kingSquare);
      game.put(attackerPiece, kingSquare);

      return {
        square: kingSquare,
        piece: kingPiece,
        appliedAttempt: appliedAttempt,
        attacker: {
          from: attacker.from,
          piece: attackerPiece
        }
      };
    }

    game.remove(kingSquare);
    return {
      square: kingSquare,
      piece: kingPiece,
      appliedAttempt: appliedAttempt,
      attacker: null
    };
  }

  function restoreTurtle2PlayerKing(capturedKing) {
    if (!capturedKing || !capturedKing.square || !capturedKing.piece) {
      return;
    }

    if (capturedKing.attacker) {
      const penaltyAttacker = game.get(capturedKing.square);

      if (penaltyAttacker && penaltyAttacker.color === capturedKing.attacker.piece.color && penaltyAttacker.type === capturedKing.attacker.piece.type) {
        game.remove(capturedKing.square);
      }

      if (!game.get(capturedKing.attacker.from)) {
        game.put(capturedKing.attacker.piece, capturedKing.attacker.from);
      }
    }

    if (!game.get(capturedKing.square)) {
      game.put(capturedKing.piece, capturedKing.square);
    }

    undoTurtle2PenaltyAttempt(capturedKing.appliedAttempt);
  }

  function turtle2WarningKeyForCount(count) {
    if (count >= 3) {
      return "turtle2LeftKingPenalty";
    }

    return count === 2 ? "turtle2LeftKingWarning2" : "turtle2LeftKingWarning1";
  }

  function applyTurtle2WarningEvent(event, options) {
    const settings = options || {};
    turtle2PenaltyGameOver = event.penaltyAfter;
    turtle2ActiveWarningKey = event.messageKey;
    turtle2WarningKingSquare = event.kingSquare || null;
    turtle2PenaltyKingSquare = null;

    if (event.penaltyAfter) {
      const capturedKing = captureTurtle2PlayerKing(event.kingSquare, event.attempt);
      event.capturedKing = event.capturedKing || capturedKing;
      turtle2PenaltyKingSquare = event.capturedKing ? event.capturedKing.square : event.kingSquare || null;
      turtle2WarningKingSquare = turtle2PenaltyKingSquare;
    }

    if (!settings.skipFlash) {
      flashTurtle2Warning();
    }

    clearSelection();
    clearPremove();
    clearAnnotations();
    updateStatus();
  }

  function undoTurtle2WarningEvent(event) {
    if (event.penaltyAfter) {
      restoreTurtle2PlayerKing(event.capturedKing);
    }

    turtle2PenaltyGameOver = event.penaltyBefore;
    turtle2ActiveWarningKey = null;
    turtle2WarningKingSquare = null;
    turtle2PenaltyKingSquare = null;
    clearTurtle2WarningFlash();
    clearTemporaryStatus();
    clearSelection();
    clearPremove();
    clearAnnotations();
    updateLastMoveFromHistory();
  }

  function triggerTurtle2LeftKingWarning(attempt) {
    if (!isTurtle2Mode()) {
      return false;
    }

    const countBefore = turtle2LeftKingCount;
    const countAfter = countBefore + 1;
    const penaltyAfter = countAfter >= 3;
    const attemptedPiece = attempt && attempt.from ? game.get(attempt.from) : null;
    const kingSquare = attemptedPiece && attemptedPiece.type === "k" ? attempt.to : getTurtle2PlayerKingSquare();
    const event = {
      type: "leftKingWarning",
      countBefore: countBefore,
      countAfter: countAfter,
      fenBefore: game.fen(),
      penaltyBefore: turtle2PenaltyGameOver,
      penaltyAfter: penaltyAfter,
      messageKey: turtle2WarningKeyForCount(countAfter),
      kingSquare: kingSquare,
      attempt: attempt || null,
      capturedKing: null,
      timestamp: Date.now()
    };

    turtle2LeftKingCount = countAfter;
    turtle2WarningHistory.push(event);
    turtle2WarningRedoStack = [];
    redoStack = [];
    applyTurtle2WarningEvent(event);
    playMoveSound("check");
    return true;
  }

  function buildTurtleSan(move, capturedPiece) {
    const pieceLetter = {
      p: "",
      n: "N",
      b: "B",
      r: "R",
      q: "Q",
      k: "K"
    }[move.piece] || "";
    const captureText = capturedPiece ? "x" : "";
    const pawnFile = move.piece === "p" && capturedPiece ? move.from[0] : "";
    const promotionText = move.promotion ? "=" + move.promotion.toUpperCase() : "";
    return pieceLetter + pawnFile + captureText + move.to + promotionText;
  }

  function makeTurtleMove(moveData, options) {
    const settings = options || {};

    if (!isTurtle1Mode()) {
      return false;
    }

    if (turtleGameOver) {
      return false;
    }

    const legalMove = getTurtlePseudoMovesFrom(moveData.from).find(function (move) {
      return move.to === moveData.to;
    });

    if (!legalMove) {
      return false;
    }

    const movingPiece = game.get(moveData.from);
    const capturedPiece = game.get(moveData.to);
    const fenBefore = game.fen();
    const nextColor = oppositeColor(movingPiece.color);
    const promotion = moveData.promotion || legalMove.promotion;

    game.remove(moveData.from);
    if (capturedPiece) {
      game.remove(moveData.to);
    }
    game.put({ type: promotion || movingPiece.type, color: movingPiece.color }, moveData.to);

    const parts = game.fen().split(" ");
    parts[1] = nextColor;
    parts[3] = "-";
    parts[4] = "0";

    if (movingPiece.color === "b") {
      parts[5] = String(Number(parts[5]) + 1);
    }

    game.load(parts.join(" "));

    const historyItem = {
      from: moveData.from,
      to: moveData.to,
      piece: movingPiece.type,
      color: movingPiece.color,
      captured: capturedPiece ? capturedPiece.type : undefined,
      promotion: promotion,
      san: buildTurtleSan({
        from: moveData.from,
        to: moveData.to,
        piece: movingPiece.type,
        promotion: promotion
      }, capturedPiece),
      fenBefore: fenBefore,
      fenAfter: game.fen()
    };

    turtleMoveHistory.push(historyItem);
    if (!settings.keepRedo) {
      turtleRedoStack = [];
    }
    lastMove = {
      from: moveData.from,
      to: moveData.to
    };

    clearSelection();
    clearPremove();
    playMoveSound(capturedPiece && capturedPiece.type === "k" ? "check" : capturedPiece ? "capture" : "move");

    if (capturedPiece && capturedPiece.type === "k") {
      endByKingCapture(movingPiece.color);
    } else if (!settings.skipBotSchedule) {
      scheduleBotMove();
    }

    return true;
  }

  function makeMove(moveData, options) {
    if (DEBUG_CLICK_TO_MOVE) {
      console.log("[ClickMove] makeMove attempt", moveData.from, moveData.to, moveData);
    }

    if (isReplayMode || isBotThinking && !options) {
      return false;
    }

    if (isTurtle1Mode()) {
      return makeTurtleMove(moveData, options);
    }

    if (isTurtle2Mode() && turtle2PenaltyGameOver) {
      return false;
    }

    const settings = options || {};

    if (!moveData.promotion && isPromotionMove(moveData.from, moveData.to)) {
      showPromotionPicker(moveData.from, moveData.to, promotionOptions);
      return false;
    }

    const move = game.move({
      from: moveData.from,
      to: moveData.to,
      promotion: moveData.promotion || "q"
    });

    if (!move) {
      if (!settings.keepRedo && isTurtle2LeftKingAttempt(moveData.from, moveData.to, moveData.promotion || "q")) {
        triggerTurtle2LeftKingWarning({
          from: moveData.from,
          to: moveData.to,
          promotion: moveData.promotion || "q"
        });
      }

      return false;
    }

    clearTemporaryStatus();
    if (isTurtle2Mode() && move.color === playerColor && !settings.keepRedo) {
      clearTurtle2WarningVisual();
    } else {
      clearTurtle2WarningFlash();
    }

    if (!settings.keepRedo) {
      redoStack = [];
      turtle2WarningRedoStack = [];
    }

    lastMove = {
      from: move.from,
      to: move.to
    };

    clearSelection();
    playMoveSound(game.in_check() ? "check" : move.captured ? "capture" : "move");

    if (!settings.skipPremove) {
      tryExecutePremove();
    }

    if (checkAndShowGameOver()) {
      return true;
    }

    if (!settings.skipBotSchedule) {
      scheduleBotMove();
    }

    return true;
  }

  function tryExecutePremove() {
    if (!premove || premove.color !== game.turn()) {
      return;
    }

    const storedPremove = premove;
    clearPremove();

    if (!makeMove(storedPremove, { skipPremove: true })) {
      clearPremove();
    }
  }

  function undoMove() {
    cancelPendingBee3Move();

    if (isReplayMode) {
      exitReplayMode(true);
    }

    hideGameOverOverlay();
    hidePromotionPicker();

    if (isTurtle1Mode()) {
      const undoneGroup = [];
      const undoneTurtleMove = turtleMoveHistory.pop();

      if (!undoneTurtleMove) {
        return;
      }

      undoneGroup.push(undoneTurtleMove);
      game.load(undoneTurtleMove.fenBefore);

      if (isBotGameMode() && game.turn() !== playerColor && turtleMoveHistory.length) {
        const pairedMove = turtleMoveHistory.pop();
        undoneGroup.push(pairedMove);
        game.load(pairedMove.fenBefore);
      }

      turtleRedoStack.push(undoneGroup);
      undoCount += 1;
      turtleGameOver = false;
      turtleWinner = null;
      clearTemporaryStatus();
      showTemporaryStatus("undoCounter", { count: undoCount }, 1400);
      clearSelection();
      clearPremove();
      clearAnnotations();

      const previousMove = turtleMoveHistory[turtleMoveHistory.length - 1];
      lastMove = previousMove ? { from: previousMove.from, to: previousMove.to } : null;
      renderBoard();
      return;
    }

    if (isTurtle2Mode()) {
      const lastWarning = turtle2WarningHistory[turtle2WarningHistory.length - 1];

      if (lastWarning && (game.fen() === lastWarning.fenBefore || turtle2PenaltyGameOver && lastWarning.penaltyAfter)) {
        turtle2WarningHistory.pop();
        turtle2WarningRedoStack.push(lastWarning);
        undoTurtle2WarningEvent(lastWarning);
        renderBoard();
        return;
      }

      const undoneGroup = [];
      const undone = game.undo();

      if (!undone) {
        return;
      }

      undoneGroup.push(undone);

      if (game.turn() !== playerColor && game.history().length) {
        const pairedMove = game.undo();

        if (pairedMove) {
          undoneGroup.push(pairedMove);
        }
      }

      redoStack.push(undoneGroup);
      turtle2ActiveWarningKey = null;
      clearTurtle2WarningFlash();
      clearSelection();
      clearPremove();
      clearAnnotations();
      updateLastMoveFromHistory();
      renderBoard();
      return;
    }

    if (usesPairedBotUndoMode() && !isTurtle2Mode()) {
      const undoneGroup = [];
      const undone = game.undo();

      if (!undone) {
        return;
      }

      undoneGroup.push(undone);

      if (game.turn() !== playerColor && game.history().length) {
        const pairedMove = game.undo();

        if (pairedMove) {
          undoneGroup.push(pairedMove);
        }
      }

      redoStack.push(undoneGroup);
      clearSelection();
      clearPremove();
      clearAnnotations();
      updateLastMoveFromHistory();
      renderBoard();
      return;
    }

    const undone = game.undo();

    if (!undone) {
      return;
    }

    redoStack.push(undone);
    clearSelection();
    clearPremove();
    clearAnnotations();
    updateLastMoveFromHistory();
    renderBoard();
  }

  function redoMove() {
    cancelPendingBee3Move();

    if (isReplayMode) {
      return;
    }

    hidePromotionPicker();

    if (isTurtle1Mode()) {
      const redoItem = turtleRedoStack.pop();

      if (!redoItem) {
        return;
      }

      const moves = Array.isArray(redoItem) ? redoItem.slice().reverse() : [redoItem];
      turtleGameOver = false;
      turtleWinner = null;

      moves.forEach(function (move) {
        game.load(move.fenAfter);
        turtleMoveHistory.push(move);

        if (move.captured === "k") {
          endByKingCapture(move.color);
        }

        lastMove = {
          from: move.from,
          to: move.to
        };
      });
      clearSelection();
      clearPremove();
      clearAnnotations();
      renderBoard();
      return;
    }

    if (isTurtle2Mode()) {
      const warningRedo = turtle2WarningRedoStack[turtle2WarningRedoStack.length - 1];

      if (warningRedo && game.fen() === warningRedo.fenBefore) {
        turtle2WarningRedoStack.pop();
        turtle2WarningHistory.push(warningRedo);
        applyTurtle2WarningEvent(warningRedo);
        renderBoard();
        return;
      }
    }

    const redoItem = redoStack.pop();

    if (!redoItem) {
      return;
    }

    if (Array.isArray(redoItem)) {
      redoItem.slice().reverse().forEach(function (move) {
        makeMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        }, { keepRedo: true, skipPremove: true, skipBotSchedule: true });
      });
      renderBoard();
      return;
    }

    const move = redoItem;

    makeMove({
      from: move.from,
      to: move.to,
      promotion: move.promotion
    }, { keepRedo: true, skipPremove: true, skipBotSchedule: true });
    renderBoard();
  }

  function calculateMaterialAdvantage() {
    const totals = { w: 0, b: 0 };
    const counts = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    const boardState = game.board();

    boardState.forEach(function (row) {
      row.forEach(function (piece) {
        if (piece) {
          totals[piece.color] += pieceValues[piece.type] || 0;
          if (counts[piece.color] && Object.prototype.hasOwnProperty.call(counts[piece.color], piece.type)) {
            counts[piece.color][piece.type] += 1;
          }
        }
      });
    });

    const details = buildMaterialDetails(counts);

    return {
      diff: totals.w - totals.b,
      whiteDetail: details.whiteDetail,
      blackDetail: details.blackDetail
    };
  }

  function buildMaterialDetails(counts) {
    const details = {
      whiteDetail: [],
      blackDetail: []
    };

    materialPieceOrder.forEach(function (pieceType) {
      const capturedByWhite = Math.max(0, initialMaterialCounts[pieceType] - (counts.b[pieceType] || 0));
      const capturedByBlack = Math.max(0, initialMaterialCounts[pieceType] - (counts.w[pieceType] || 0));
      const netCount = capturedByWhite - capturedByBlack;

      if (netCount > 0) {
        for (let count = 0; count < netCount; count += 1) {
          details.whiteDetail.push(materialSymbols.w[pieceType]);
        }
      } else if (netCount < 0) {
        for (let count = 0; count < Math.abs(netCount); count += 1) {
          details.blackDetail.push(materialSymbols.b[pieceType]);
        }
      }
    });

    return {
      whiteDetail: details.whiteDetail.join(""),
      blackDetail: details.blackDetail.join("")
    };
  }

  function appendMaterialLine(text) {
    const line = document.createElement("div");
    line.className = "material-advantage__line";
    line.textContent = text;
    materialAdvantageValue.appendChild(line);
  }

  function appendMaterialRow(sideLabel, scoreText, detailText) {
    const row = document.createElement("div");
    const side = document.createElement("span");
    const score = document.createElement("span");
    const detail = document.createElement("span");

    row.className = "material-detail-row";
    side.className = "material-detail-row__side";
    score.className = "material-detail-row__score";
    detail.className = "material-detail-row__pieces";

    side.textContent = sideLabel;
    score.textContent = scoreText;
    detail.textContent = detailText || "";

    row.appendChild(side);
    row.appendChild(score);
    row.appendChild(detail);
    materialAdvantageValue.appendChild(row);
  }

  function updateMaterialAdvantage() {
    if (!materialAdvantageValue) {
      return;
    }

    const material = calculateMaterialAdvantage();
    const diff = material.diff;
    const whiteDetail = material.whiteDetail;
    const blackDetail = material.blackDetail;
    materialAdvantageValue.innerHTML = "";

    if (diff > 0) {
      appendMaterialRow(t("white"), "+" + diff, whiteDetail);
      if (blackDetail) {
        appendMaterialRow(t("black"), "-" + diff, blackDetail);
      }
    } else if (diff < 0) {
      appendMaterialRow(t("black"), "+" + Math.abs(diff), blackDetail);
      if (whiteDetail) {
        appendMaterialRow(t("white"), String(diff), whiteDetail);
      }
    } else {
      if (whiteDetail || blackDetail) {
        if (whiteDetail) {
          appendMaterialRow(t("white"), "0", whiteDetail);
        }
        if (blackDetail) {
          appendMaterialRow(t("black"), "0", blackDetail);
        }
      } else {
        appendMaterialLine(t("materialEqual"));
      }
    }
  }

  function renderMoveHistory() {
    const history = isTurtle1Mode() ? turtleMoveHistory : game.history({ verbose: true });
    moveHistory.innerHTML = "";

    for (let index = 0; index < history.length; index += 2) {
      const row = document.createElement("div");
      const moveNumber = document.createElement("span");
      const whiteMove = document.createElement("span");
      const blackMove = document.createElement("span");

      row.className = "history-row";
      moveNumber.className = "move-number";
      moveNumber.textContent = Math.floor(index / 2) + 1 + ".";
      whiteMove.className = "move-history-item";
      whiteMove.dataset.ply = String(index + 1);
      whiteMove.textContent = formatMoveSAN(history[index].san, notationLocale);

      if (replayPly === index + 1) {
        whiteMove.classList.add("active");
      }

      whiteMove.addEventListener("click", function () {
        enterReplayMode(index + 1);
      });

      blackMove.className = "move-history-item";

      if (history[index + 1]) {
        blackMove.dataset.ply = String(index + 2);
        blackMove.textContent = formatMoveSAN(history[index + 1].san, notationLocale);

        if (replayPly === index + 2) {
          blackMove.classList.add("active");
        }

        blackMove.addEventListener("click", function () {
          enterReplayMode(index + 2);
        });
      } else {
        blackMove.textContent = "";
      }

      row.appendChild(moveNumber);
      row.appendChild(whiteMove);
      row.appendChild(blackMove);
      moveHistory.appendChild(row);
    }

    if (moveHistoryScroll && !isReplayMode) {
      moveHistoryScroll.scrollTop = moveHistoryScroll.scrollHeight;
    }
  }

  function formatMoveSAN(san, locale) {
    if (locale !== "VI") {
      return san;
    }

    const map = {
      K: "V",
      Q: "H",
      R: "X",
      B: "T",
      N: "M"
    };

    return san.replace(/[KQRBN]/g, function (letter) {
      return map[letter];
    });
  }

  function getCopyMoveLocale() {
    return language === "vi" ? "VI" : "EN";
  }

  function buildMoveHistoryCopyText() {
    const history = isTurtle1Mode() ? turtleMoveHistory : game.history({ verbose: true });
    const locale = getCopyMoveLocale();
    const lines = [];

    for (let index = 0; index < history.length; index += 2) {
      const whiteSan = history[index] && history[index].san ? formatMoveSAN(history[index].san, locale) : "";
      const blackSan = history[index + 1] && history[index + 1].san ? formatMoveSAN(history[index + 1].san, locale) : "";
      const line = Math.floor(index / 2) + 1 + ". " + whiteSan + (blackSan ? " " + blackSan : "");
      lines.push(line.trim());
    }

    return lines.join("\n");
  }

  function copyMoveHistoryToClipboard() {
    const text = buildMoveHistoryCopyText();
    const onSuccess = function () {
      if (copyHistoryButton) {
        copyHistoryButton.textContent = "✓";
        setTimeout(function () {
          copyHistoryButton.textContent = "📋";
        }, 1000);
      }
      showTemporaryStatus("copyMovesSuccess", {}, 1200);
    };
    const onFail = function (error) {
      console.warn("Copy move history failed:", error);
      if (typeof window.prompt === "function") {
        window.prompt(t("copyMoves"), text);
      } else {
        showTemporaryStatus("copyMovesFail", {}, 1400);
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(onSuccess).catch(onFail);
      return;
    }

    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      if (document.execCommand && document.execCommand("copy")) {
        onSuccess();
      } else {
        onFail(new Error("execCommand copy failed"));
      }
      document.body.removeChild(textarea);
    } catch (error) {
      onFail(error);
    }
  }

  function playMoveSound(type) {
    if (!soundEnabled || typeof window.AudioContext === "undefined" && typeof window.webkitAudioContext === "undefined") {
      return;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioContext = audioContext || new AudioCtor();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = {
      move: 420,
      capture: 220,
      check: 660
    };

    oscillator.frequency.value = frequencies[type] || frequencies.move;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.08);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  }

  function flipBoard() {
    boardFlipped = !boardFlipped;
    updateFlipButtonText();
    renderBoard();
  }

  function renderBoard() {
    const displayGame = getDisplayGame();

    board.innerHTML = "";
    renderCoordinates();

    const checkedKingSquare = findCheckedKingSquare(displayGame);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        const name = displaySquare(row, col);
        const piece = displayGame.get(name);

        square.className = "square " + squareColor(name);
        square.dataset.square = name;

        if (piece) {
          square.textContent = pieces[piece.color + piece.type];
          square.classList.add(piece.color === "w" ? "white-piece" : "black-piece");
        }

        if (name === selectedSquare || name === premoveSource) {
          square.classList.add("selected");
        }

        if (!isReplayMode && getLearningSettings().showLegalMoves && isLegalTarget(name)) {
          square.classList.add(piece ? "legal-capture" : "legal-move");
        }

        if (!isReplayMode && lastMove && (name === lastMove.from || name === lastMove.to)) {
          square.classList.add("last-move");
        }

        if (!isReplayMode && isPremoveSquare(name)) {
          square.classList.add("premove");
        }

        if (isTurtle2Mode() && turtle2WarningKingSquare === name && !turtle2PenaltyGameOver) {
          square.classList.add("turtle2-king-warning-square");
        }

        if (isTurtle2Mode() && turtle2PenaltyKingSquare === name && turtle2PenaltyGameOver && !piece) {
          square.classList.add("turtle2-king-captured-square");
        }

        highlightCheckedKing(square, name, checkedKingSquare);

        square.addEventListener("click", function () {
          if (suppressNextClick) {
            if (DEBUG_CLICK_TO_MOVE) {
              console.log("[ClickMove] square click suppressed", name);
            }
            suppressNextClick = false;
            return;
          }

          if (DEBUG_CLICK_TO_MOVE) {
            console.log("[ClickMove] square click", name);
          }
          clearAnnotations();
          handleSquareClick(name);
        });

        board.appendChild(square);
      }
    }

    updateStatus();
    updateMaterialAdvantage();
    renderMoveHistory();
    updateReplayBanner();

    if (!isReplayMode) {
      checkAndShowGameOver();
      drawAnnotations();
    }

    console.log("board rendered");
  }

  function handleSquareClick(square) {
    if (DEBUG_CLICK_TO_MOVE) {
      console.log("[ClickMove] handleSquareClick", square, {
        selectedSquare: selectedSquare,
        isBotTurn: isBotTurn(),
        mode: modeSelect ? modeSelect.value : null
      });
    }

    if (isReplayMode) {
      return;
    }

    const piece = game.get(square);

    if (pendingPromotion || isBotTurn() || turtleGameOver || turtle2PenaltyGameOver) {
      return;
    }

    if (premoveSource) {
      if (getCurrentMode() === "bot" || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode()) {
        clearPremove();
        renderBoard();
        return;
      }

      if (piece && piece.color !== game.turn()) {
        selectPremoveSource(square);
      } else {
        setPremove(premoveSource, square);
      }

      renderBoard();
      return;
    }

    if (!selectedSquare) {
      if (!piece) {
        clearPremove();
        renderBoard();
        return;
      }

      if (piece.color === game.turn()) {
        selectSquare(square);
      } else if (getCurrentMode() === "local") {
        selectPremoveSource(square);
      }

      renderBoard();
      return;
    }

    if (piece && piece.color === game.turn()) {
      if (square === selectedSquare) {
        clearSelection();
      } else {
        selectSquare(square);
      }

      renderBoard();
      return;
    }

    if (isTurtle1Mode()) {
      if (!getTurtlePseudoMovesFrom(selectedSquare).some(function (move) {
        return move.to === square;
      })) {
        clearSelection();
        renderBoard();
        return;
      }

      makeTurtleMove({
        from: selectedSquare,
        to: square
      });
      renderBoard();
      return;
    }

    if (!isLegalTarget(square)) {
      if (isTurtle2LeftKingAttempt(selectedSquare, square, "q")) {
        triggerTurtle2LeftKingWarning({
          from: selectedSquare,
          to: square,
          promotion: "q"
        });
        renderBoard();
        return;
      }

      clearSelection();
      clearPremove();
      renderBoard();
      return;
    }

    makeMove({
      from: selectedSquare,
      to: square
    });
    renderBoard();
  }

  function clearAnnotations() {
    circles.clear();
    arrows.clear();
    drawAnnotations();
  }

  function drawAnnotations() {
    const oldLayer = board.querySelector(".annotation-layer");

    if (oldLayer) {
      oldLayer.remove();
    }

    const squareSize = board.clientWidth / 8;
    const annotationStroke = Math.max(4, Math.min(6, squareSize * 0.065));
    const markerSize = Math.max(16, Math.min(22, squareSize * 0.28));
    const computedBodyStyle = getComputedStyle(document.body);
    const arrowColor = computedBodyStyle.getPropertyValue("--analysis-arrow").trim() || computedBodyStyle.getPropertyValue("--annotation-color").trim() || "#57c84d";
    const circleColor = computedBodyStyle.getPropertyValue("--analysis-circle").trim() || computedBodyStyle.getPropertyValue("--annotation-color").trim() || "#57c84d";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    const markerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");

    svg.classList.add("annotation-layer");
    svg.setAttribute("viewBox", "0 0 " + board.clientWidth + " " + board.clientHeight);

    marker.setAttribute("id", "arrow-head");
    marker.setAttribute("markerWidth", String(markerSize));
    marker.setAttribute("markerHeight", String(markerSize));
    marker.setAttribute("refX", String(markerSize - 2));
    marker.setAttribute("refY", String(markerSize / 2));
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "userSpaceOnUse");

    markerPath.setAttribute("d", "M0,0 L0," + markerSize + " L" + markerSize + "," + markerSize / 2 + " z");
    markerPath.setAttribute("fill", arrowColor);
    markerPath.setAttribute("opacity", "0.84");
    marker.appendChild(markerPath);

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.appendChild(marker);
    svg.appendChild(defs);

    circles.forEach(function (square) {
      const center = squareCenter(square);
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

      circle.setAttribute("cx", center.x);
      circle.setAttribute("cy", center.y);
      circle.setAttribute("r", squareSize * 0.36);
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", circleColor);
      circle.setAttribute("stroke-width", String(annotationStroke));
      circle.setAttribute("opacity", "0.88");
      svg.appendChild(circle);
    });

    arrows.forEach(function (arrowKey) {
      const parts = arrowKey.split("-");
      const from = squareCenter(parts[0]);
      const to = squareCenter(parts[1]);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const endOffset = markerSize * 0.72;
      const endX = to.x - (dx / length) * endOffset;
      const endY = to.y - (dy / length) * endOffset;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", endX);
      line.setAttribute("y2", endY);
      line.setAttribute("stroke", arrowColor);
      line.setAttribute("stroke-width", String(annotationStroke));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.84");
      line.setAttribute("marker-end", "url(#arrow-head)");
      svg.appendChild(line);
    });

    board.appendChild(svg);
  }

  function handleRightClickAnnotation(event) {
    event.preventDefault();
    clearPremove();

    const endSquare = squareFromEvent(event);

    if (!rightClickStart || !endSquare) {
      rightClickStart = null;
      return;
    }

    if (rightClickStart === endSquare) {
      if (circles.has(endSquare)) {
        circles.delete(endSquare);
      } else {
        circles.add(endSquare);
      }
    } else {
      const arrowKey = rightClickStart + "-" + endSquare;

      if (arrows.has(arrowKey)) {
        arrows.delete(arrowKey);
      } else {
        arrows.add(arrowKey);
      }
    }

    rightClickStart = null;
    renderBoard();
  }

  function handleDragAndDrop(event) {
    if (isReplayMode) {
      draggedPiece = null;
      dragFromSquare = null;
      pointerStart = null;
      isDragging = false;
      removeDragGhost();
      return;
    }

    if (!dragFromSquare) {
      return;
    }

    const targetSquare = squareFromEvent(event);

    if (!isDragging) {
      draggedPiece = null;
      dragFromSquare = null;
      pointerStart = null;
      return;
    }

    suppressNextClick = true;

    if (targetSquare) {
      if (draggedPiece.color === game.turn()) {
        makeMove({
          from: dragFromSquare,
          to: targetSquare
        });
      } else if (getCurrentMode() === "local") {
        setPremove(dragFromSquare, targetSquare);
      }
    }

    draggedPiece = null;
    dragFromSquare = null;
    pointerStart = null;
    isDragging = false;
    removeDragGhost();
    renderBoard();
  }

  board.addEventListener("contextmenu", function (event) {
    if (hasActiveDrag()) {
      if (DEBUG_CLICK_TO_MOVE) {
        console.log("[ContextMenu] cancel drag path", {
          targetClass: event.target && event.target.className ? event.target.className : "",
          selectedSquare: selectedSquare
        });
      }
      event.preventDefault();
      rightClickCanceledDrag = cancelActiveDrag();
      return;
    }

    if (DEBUG_CLICK_TO_MOVE) {
      console.log("[ContextMenu] normal path", {
        targetClass: event.target && event.target.className ? event.target.className : "",
        selectedSquare: selectedSquare
      });
    }
    event.preventDefault();
  });

  board.addEventListener("pointerdown", function (event) {
    if (isReplayMode) {
      return;
    }

    const square = squareFromEvent(event);
    if (DEBUG_CLICK_TO_MOVE) {
      console.log("[PointerDown]", {
        button: event.button,
        targetClass: event.target && event.target.className ? event.target.className : "",
        square: square,
        selectedSquare: selectedSquare
      });
    }

    if (event.button === 2) {
      if (isDragging || dragFromSquare || draggedPiece) {
        if (DEBUG_CLICK_TO_MOVE) {
          console.log("[PointerDown] preventDefault right-click cancel", square);
        }
        event.preventDefault();
        rightClickCanceledDrag = cancelActiveDrag();
        rightClickStart = null;
        return;
      }

      if (!square || pendingPromotion || isBotTurn() || turtleGameOver) {
        return;
      }

      event.preventDefault();
      clearPremove();
      rightClickStart = square;
      return;
    }

    if (!square || pendingPromotion || isBotTurn() || turtleGameOver) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    clearAnnotations();

    const piece = game.get(square);

    if (!piece) {
      clearPremove();
      return;
    }

    if ((getCurrentMode() === "bot" || isTurtle1Mode() || isTurtle2Mode() || isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode()) && piece.color !== playerColor) {
      return;
    }

    pointerStart = {
      x: event.clientX,
      y: event.clientY
    };
    draggedPiece = piece;
    dragFromSquare = square;
    isDragging = false;

  });

  board.addEventListener("pointermove", function (event) {
    if (isReplayMode) {
      return;
    }

    if (!dragFromSquare || !pointerStart) {
      return;
    }

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;

    if (!isDragging && Math.sqrt(dx * dx + dy * dy) > 6) {
      isDragging = true;
      if (board.setPointerCapture) {
        if (DEBUG_CLICK_TO_MOVE) {
          console.log("[PointerMove] setPointerCapture", {
            square: dragFromSquare,
            pointerId: event.pointerId
          });
        }
        board.setPointerCapture(event.pointerId);
      }
      createDragGhost(event);
    }

    if (isDragging) {
      if (DEBUG_CLICK_TO_MOVE) {
        console.log("[PointerMove] preventDefault dragging", {
          from: dragFromSquare
        });
      }
      event.preventDefault();
      updateDragGhostPosition(event);
    }
  });

  board.addEventListener("pointerup", function (event) {
    if (DEBUG_CLICK_TO_MOVE) {
      console.log("[PointerUp]", {
        button: event.button,
        targetClass: event.target && event.target.className ? event.target.className : "",
        selectedSquare: selectedSquare,
        dragFromSquare: dragFromSquare,
        isDragging: isDragging
      });
    }
    if (event.button === 2) {
      if (rightClickCanceledDrag) {
        rightClickCanceledDrag = false;

        if (board.releasePointerCapture && board.hasPointerCapture && board.hasPointerCapture(event.pointerId)) {
          board.releasePointerCapture(event.pointerId);
        }

        return;
      }

      handleRightClickAnnotation(event);
      return;
    }

    if (event.button === 0) {
      handleDragAndDrop(event);
    }

    if (board.releasePointerCapture && board.hasPointerCapture && board.hasPointerCapture(event.pointerId)) {
      board.releasePointerCapture(event.pointerId);
    }
  });

  board.addEventListener("pointercancel", function () {
    draggedPiece = null;
    dragFromSquare = null;
    pointerStart = null;
    isDragging = false;
    removeDragGhost();
    renderBoard();
  });

  window.addEventListener("resize", drawAnnotations);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      hidePromotionPicker();
      clearPremove();
      clearSelection();
      renderBoard();
    }
  });

  undoButton.addEventListener("click", undoMove);
  redoButton.addEventListener("click", redoMove);
  flipButton.addEventListener("click", flipBoard);
  applySettingsButton.addEventListener("click", applyGameSettings);
  modeSelect.addEventListener("change", function () {
    cancelPendingBee3Move();
    updateModeControls();
  });
  playerColorSelect.addEventListener("change", cancelPendingBee3Move);
  botDifficultySelect.addEventListener("change", cancelPendingBee3Move);

  notationButton.addEventListener("click", function () {
    notationLocale = notationLocale === "EN" ? "VI" : "EN";
    notationButton.textContent = t("notation", { locale: notationLocale });
    renderMoveHistory();
  });

  languageButton.addEventListener("click", function () {
    setLanguage(language === "vi" ? "en" : "vi");
  });

  themeButton.addEventListener("click", function () {
    setTheme(theme === "dark" ? "light" : "dark");
  });

  soundButton.addEventListener("click", function () {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? t("soundOn") : t("soundOff");
  });

  legalMovesButton.addEventListener("click", function () {
    if (isTurtle1Mode() || isTurtle2Mode()) {
      turtle3LegalMovesEnabled = false;
    } else if (isTurtle3Mode() || isBee1Mode() || isBee2Mode() || isBee3Mode()) {
      turtle3LegalMovesEnabled = !turtle3LegalMovesEnabled;
    } else {
      legalMovesEnabled = !legalMovesEnabled;
    }

    updateLegalMovesButtonText();
    renderBoard();
  });

  if (copyHistoryButton) {
    copyHistoryButton.addEventListener("click", copyMoveHistoryToClipboard);
  }

  resetButton.addEventListener("click", function () {
    cancelPendingBee3Move();
    game.reset();
    exitReplayMode(true);
    hideGameOverOverlay();
    resetInteractionState();
    clearLearningState();
    renderBoard();
    scheduleBotMove();
  });

  if (newGameOverlayButton) {
    newGameOverlayButton.addEventListener("click", function () {
      cancelPendingBee3Move();
      game.reset();
      exitReplayMode(true);
      hideGameOverOverlay();
      resetInteractionState();
      clearLearningState();
      renderBoard();
      scheduleBotMove();
    });
  }

  if (reviewGameButton) {
    reviewGameButton.addEventListener("click", function () {
      enterReplayMode(0);
    });
  }

  if (returnToCurrentButton) {
    returnToCurrentButton.addEventListener("click", function () {
      exitReplayMode();
    });
  }

  createBoardThemeControls();
  applyTheme();
  applyBoardTheme(boardTheme);
  updateLanguageUI();
});
