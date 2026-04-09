const symbols = [
    { key: "7", weight: 5, payout: [16, 65, 240], color: "#ff5f6d" },
    { key: "BAR", weight: 9, payout: [10, 32, 120], color: "#ffcb4c" },
    { key: "♦", weight: 12, payout: [8, 24, 90], color: "#7fd6ff" },
    { key: "🔔", weight: 16, payout: [6, 18, 70], color: "#9fffde" },
    { key: "🍒", weight: 22, payout: [3, 10, 40], color: "#ff9dbf" },
    { key: "A", weight: 18, payout: [2, 7, 25], color: "#d7e4ff" },
    { key: "K", weight: 18, payout: [2, 7, 25], color: "#b7f8ff" },
];

const reelsContainer = document.getElementById("reels");
const statusText = document.getElementById("status");
const spinButton = document.getElementById("spin-button");
const autoButton = document.getElementById("auto-button");
const betDisplay = document.getElementById("bet-display");
const betDown = document.getElementById("bet-down");
const betUp = document.getElementById("bet-up");

const reelCount = 5;
const rows = 3;
const betSteps = [5, 10, 20, 50, 100, 250, 500, 1000];
let betIndex = 1;
let spinning = false;
let autoSpinsLeft = 0;

const lineDefinitions = [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
];

function weightedSymbol() {
    const total = symbols.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;

    for (const symbol of symbols) {
        roll -= symbol.weight;
        if (roll <= 0) {
            return symbol;
        }
    }

    return symbols[symbols.length - 1];
}

function createGrid() {
    reelsContainer.innerHTML = "";
    for (let reel = 0; reel < reelCount; reel++) {
        const reelElement = document.createElement("div");
        reelElement.className = "reel";

        for (let row = 0; row < rows; row++) {
            const cell = document.createElement("div");
            cell.className = "symbol";
            reelElement.appendChild(cell);
        }

        reelsContainer.appendChild(reelElement);
    }
}

function randomBoard() {
    return Array.from({ length: reelCount }, () =>
        Array.from({ length: rows }, () => weightedSymbol())
    );
}

function renderBoard(board, highlighted = new Set()) {
    const reelNodes = reelsContainer.querySelectorAll(".reel");

    board.forEach((reel, reelIndex) => {
        const cells = reelNodes[reelIndex].querySelectorAll(".symbol");
        reel.forEach((symbol, rowIndex) => {
            const key = `${reelIndex}-${rowIndex}`;
            cells[rowIndex].textContent = symbol.key;
            cells[rowIndex].style.color = symbol.color;
            cells[rowIndex].classList.toggle("win", highlighted.has(key));
        });
    });
}

function evaluateBoard(board, bet) {
    let payout = 0;
    const highlightedCells = new Set();
    const winningLines = [];

    for (const line of lineDefinitions) {
        const first = board[0][line[0]];
        let count = 1;

        for (let reel = 1; reel < reelCount; reel++) {
            if (board[reel][line[reel]].key !== first.key) {
                break;
            }
            count += 1;
        }

        if (count >= 3) {
            const multiplier = first.payout[count - 3];
            const lineWin = Math.floor(bet * multiplier);
            payout += lineWin;
            winningLines.push(`${first.key} x${count} (+${lineWin})`);

            for (let reel = 0; reel < count; reel++) {
                highlightedCells.add(`${reel}-${line[reel]}`);
            }
        }
    }

    return { payout, highlightedCells, winningLines };
}

function getBet() {
    return betSteps[betIndex];
}

function updateBetView() {
    betDisplay.textContent = CasinoStore.formatCoins(getBet());
}

function updateStatus(message) {
    const coins = CasinoStore.getCoins();
    statusText.textContent = `${message} | Bankroll: ${CasinoStore.formatCoins(coins)}`;
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function spinOnce() {
    if (spinning) {
        return;
    }

    const bet = getBet();
    if (!CasinoStore.spendCoins(bet)) {
        updateStatus("Nicht genug Coins. Lade im Store auf.");
        autoSpinsLeft = 0;
        return;
    }

    spinning = true;
    spinButton.disabled = true;
    autoButton.disabled = true;

    const reelNodes = reelsContainer.querySelectorAll(".reel");
    const board = randomBoard();

    for (let i = 0; i < reelNodes.length; i++) {
        reelNodes[i].classList.add("spinning");
        for (let step = 0; step < 10; step++) {
            board[i] = Array.from({ length: rows }, () => weightedSymbol());
            renderBoard(board);
            await delay(35);
        }
        reelNodes[i].classList.remove("spinning");
        await delay(90);
    }

    const { payout, highlightedCells, winningLines } = evaluateBoard(board, bet);
    renderBoard(board, highlightedCells);

    if (payout > 0) {
        CasinoStore.addCoins(payout);
        updateStatus(`Gewinn ${CasinoStore.formatCoins(payout)} | ${winningLines.join(" • ")}`);
    } else {
        updateStatus(`Kein Treffer. Einsatz: ${CasinoStore.formatCoins(bet)}`);
    }

    spinning = false;
    spinButton.disabled = false;
    autoButton.disabled = false;

    if (autoSpinsLeft > 0) {
        autoSpinsLeft -= 1;
        await delay(220);
        await spinOnce();
    }
}

function wireEvents() {
    spinButton.addEventListener("click", () => {
        autoSpinsLeft = 0;
        spinOnce();
    });

    autoButton.addEventListener("click", () => {
        if (spinning) {
            return;
        }
        autoSpinsLeft = 10;
        spinOnce();
    });

    betDown.addEventListener("click", () => {
        if (spinning || betIndex === 0) {
            return;
        }
        betIndex -= 1;
        updateBetView();
    });

    betUp.addEventListener("click", () => {
        if (spinning || betIndex === betSteps.length - 1) {
            return;
        }
        betIndex += 1;
        updateBetView();
    });

    document.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
            event.preventDefault();
            spinButton.click();
        }
        if (event.code === "ArrowLeft") {
            betDown.click();
        }
        if (event.code === "ArrowRight") {
            betUp.click();
        }
    });
}

function init() {
    createGrid();
    const board = randomBoard();
    renderBoard(board);
    updateBetView();
    updateStatus("Bereit. Einsatz einstellen und Spin starten.");
    wireEvents();
}

init();
