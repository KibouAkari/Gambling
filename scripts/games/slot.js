const slotSymbols = [
  { key: "7", weight: 5, payout: [16, 65, 240], color: "#ff5f6d" },
  { key: "BAR", weight: 8, payout: [12, 40, 150], color: "#ffd166" },
  { key: "DIAM", weight: 12, payout: [8, 28, 95], color: "#6ec1ff" },
  { key: "BELL", weight: 15, payout: [6, 20, 70], color: "#4fd1b2" },
  { key: "CHRY", weight: 22, payout: [3, 11, 42], color: "#ff9da8" },
  { key: "A", weight: 19, payout: [2, 8, 30], color: "#f2f5ff" },
  { key: "K", weight: 19, payout: [2, 8, 30], color: "#e0f5ff" },
];

const slotRows = 3;
const slotReels = 5;
const lineDefs = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];
const slotBets = [10, 20, 50, 100, 250, 500, 1000, 2000];

const reelsNode = document.getElementById("slot-reels");
const statusNode = document.getElementById("slot-status");
const betNode = document.getElementById("slot-bet");
const spinBtn = document.getElementById("slot-spin");
const autoBtn = document.getElementById("slot-auto");
const betMinusBtn = document.getElementById("slot-bet-down");
const betPlusBtn = document.getElementById("slot-bet-up");

let betIndex = 1;
let spinning = false;
let autoSpins = 0;

function pickWeighted() {
  const total = slotSymbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = Math.random() * total;

  for (const symbol of slotSymbols) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }

  return slotSymbols[slotSymbols.length - 1];
}

function randomBoard() {
  return Array.from({ length: slotReels }, () =>
    Array.from({ length: slotRows }, () => pickWeighted())
  );
}

function createBoardUi() {
  reelsNode.innerHTML = "";
  for (let reel = 0; reel < slotReels; reel += 1) {
    const reelNode = document.createElement("div");
    reelNode.className = "slot-reel";
    for (let row = 0; row < slotRows; row += 1) {
      const symbolNode = document.createElement("div");
      symbolNode.className = "slot-symbol";
      reelNode.appendChild(symbolNode);
    }
    reelsNode.appendChild(reelNode);
  }
}

function renderBoard(board, highlights = new Set()) {
  const reelNodes = reelsNode.querySelectorAll(".slot-reel");

  board.forEach((reel, reelIndex) => {
    const symbols = reelNodes[reelIndex].querySelectorAll(".slot-symbol");
    reel.forEach((symbol, rowIndex) => {
      const key = `${reelIndex}-${rowIndex}`;
      const cell = symbols[rowIndex];
      cell.textContent = symbol.key;
      cell.style.color = symbol.color;
      cell.classList.toggle("is-win", highlights.has(key));
    });
  });
}

function evaluate(board, bet) {
  let payout = 0;
  const lines = [];
  const marks = new Set();

  for (const line of lineDefs) {
    const first = board[0][line[0]];
    let count = 1;
    for (let reel = 1; reel < slotReels; reel += 1) {
      if (board[reel][line[reel]].key !== first.key) {
        break;
      }
      count += 1;
    }

    if (count >= 3) {
      const win = Math.floor(bet * first.payout[count - 3]);
      payout += win;
      lines.push(`${first.key} x${count} (+${win})`);
      for (let reel = 0; reel < count; reel += 1) {
        marks.add(`${reel}-${line[reel]}`);
      }
    }
  }

  return { payout, lines, marks };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateBetView() {
  betNode.textContent = CasinoStore.formatCoins(slotBets[betIndex]);
}

function updateStatus(text) {
  statusNode.textContent = `${text} | Kontostand: ${CasinoStore.formatCoins(CasinoStore.getCoins())}`;
}

async function spin() {
  if (spinning) {
    return;
  }

  const bet = slotBets[betIndex];
  if (!CasinoStore.spendCoins(bet)) {
    CasinoFX.play("lose");
    updateStatus("Nicht genug Coins fur den Einsatz.");
    autoSpins = 0;
    return;
  }

  CasinoFX.play("spin");
  spinning = true;
  spinBtn.disabled = true;
  autoBtn.disabled = true;

  const reelNodes = reelsNode.querySelectorAll(".slot-reel");
  const board = randomBoard();

  for (let reel = 0; reel < reelNodes.length; reel += 1) {
    reelNodes[reel].classList.add("is-spinning");
    for (let tick = 0; tick < 11; tick += 1) {
      board[reel] = Array.from({ length: slotRows }, () => pickWeighted());
      renderBoard(board);
      await delay(35);
    }
    reelNodes[reel].classList.remove("is-spinning");
    await delay(80);
  }

  const result = evaluate(board, bet);
  renderBoard(board, result.marks);

  if (result.payout > 0) {
    CasinoStore.addCoins(result.payout);
    if (result.payout >= bet * 60) {
      CasinoFX.celebrateJackpot();
      updateStatus(`JACKPOT! ${CasinoStore.formatCoins(result.payout)} gewonnen.`);
    } else {
      CasinoFX.celebrateWin();
      updateStatus(`Gewinn ${CasinoStore.formatCoins(result.payout)} | ${result.lines.join(" | ")}`);
    }
  } else {
    CasinoFX.play("lose");
    updateStatus(`Kein Treffer. Einsatz: ${CasinoStore.formatCoins(bet)}.`);
  }

  spinning = false;
  spinBtn.disabled = false;
  autoBtn.disabled = false;

  if (autoSpins > 0) {
    autoSpins -= 1;
    await delay(230);
    spin();
  }
}

function wire() {
  spinBtn.addEventListener("click", () => {
    autoSpins = 0;
    spin();
  });

  autoBtn.addEventListener("click", () => {
    if (spinning) {
      return;
    }
    autoSpins = 10;
    spin();
  });

  betMinusBtn.addEventListener("click", () => {
    if (spinning || betIndex <= 0) {
      return;
    }
    betIndex -= 1;
    updateBetView();
  });

  betPlusBtn.addEventListener("click", () => {
    if (spinning || betIndex >= slotBets.length - 1) {
      return;
    }
    betIndex += 1;
    updateBetView();
  });

  document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      spinBtn.click();
    }
  });
}

function initSlot() {
  createBoardUi();
  renderBoard(randomBoard());
  updateBetView();
  updateStatus("Bereit fur den Spin.");
  wire();
}

initSlot();
