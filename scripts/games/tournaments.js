const sizeNode = document.getElementById("tournament-size");
const buyinNode = document.getElementById("tournament-buyin");
const styleNode = document.getElementById("tournament-style");
const startBtn = document.getElementById("tournament-start");
const statusNode = document.getElementById("tournament-status");
const coinsNode = document.getElementById("tournament-coins");
const bestPlaceNode = document.getElementById("tournament-best-place");
const totalWinNode = document.getElementById("tournament-total-win");
const bracketNode = document.getElementById("tournament-bracket");
const logNode = document.getElementById("tournament-log-list");
const titleNode = document.getElementById("tournaments-title");
const liveCanvas = document.getElementById("tournaments-live-canvas");

const stats = {
  bestPlace: null,
  totalWin: 0,
  runs: 0,
  wins: 0,
};

function updateHeaderByMode() {
  const mode = new URLSearchParams(window.location.search).get("mode") || "default";
  if (mode === "slot-blitz") {
    titleNode.textContent = "Slot Blitz Tournament Engine";
    styleNode.value = "slot";
  }
}

function updateOverview(message) {
  coinsNode.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  bestPlaceNode.textContent = stats.bestPlace ? `#${stats.bestPlace}` : "-";
  totalWinNode.textContent = CasinoStore.formatCoins(stats.totalWin);
  statusNode.textContent = message;
}

async function hydrateStats() {
  const response = await CasinoStore.fetchEngineState("tournaments");
  if (!response.ok || !response.state) {
    return;
  }

  stats.bestPlace = response.state.bestPlace ?? null;
  stats.totalWin = Number(response.state.totalWin || 0);
  stats.runs = Number(response.state.runs || 0);
  stats.wins = Number(response.state.wins || 0);
}

function logLine(text, isGood) {
  const item = document.createElement("li");
  item.className = isGood ? "is-win" : "is-loss";
  item.textContent = text;
  logNode.prepend(item);
}

function renderLeaderboard(rows) {
  if (!rows?.length) {
    return;
  }

  const board = document.createElement("article");
  board.className = "tournament-round";
  board.innerHTML = "<h4>Global Leaderboard</h4>";

  rows.slice(0, 6).forEach((row) => {
    const line = document.createElement("p");
    line.textContent = `#${row.rank} ${row.username} | Score ${row.score} | Best #${row.bestPlace}`;
    board.appendChild(line);
  });

  bracketNode.appendChild(board);
}

async function simulateTournament() {
  const size = Number(sizeNode.value || 8);
  const buyin = Number(buyinNode.value || 0);
  if (!Number.isFinite(buyin) || buyin < 20) {
    updateOverview("Mindesteinsatz fur Turniere ist ₥ 20.");
    return;
  }

  bracketNode.innerHTML = "";
  logNode.innerHTML = "";

  const response = await CasinoStore.playTournament({
    size,
    buyin,
    style: styleNode.value,
  });

  if (!response.ok || !response.data) {
    CasinoFX.play("lose");
    updateOverview(response.message || "Turnier konnte nicht gestartet werden.");
    return;
  }

  const { result, stats: apiStats, leaderboard } = response.data;
  result.bracket.forEach((roundData) => {
    const roundNode = document.createElement("article");
    roundNode.className = "tournament-round";
    roundNode.innerHTML = `<h4>Round ${roundData.round}</h4>`;
    roundData.matches.forEach((match) => {
      const line = document.createElement("p");
      line.textContent = `${match.p1} vs ${match.p2} -> ${match.winner}`;
      line.className = match.youWon ? "is-win" : match.youLost ? "is-loss" : "";
      roundNode.appendChild(line);
    });
    bracketNode.appendChild(roundNode);
  });

  renderLeaderboard(leaderboard);

  stats.bestPlace = apiStats.bestPlace;
  stats.totalWin = apiStats.totalWin;
  stats.runs = apiStats.runs;
  stats.wins = apiStats.wins;

  if (result.payout > 0) {
    if (result.place === 1) {
      CasinoFX.celebrateJackpot();
    } else {
      CasinoFX.celebrateWin();
    }
  } else {
    CasinoFX.play("lose");
  }

  logLine(`Style ${result.style.toUpperCase()} | Place #${result.place} | Reward ${CasinoStore.formatCoins(result.payout)}`, result.payout > 0);
  updateOverview(`Turnier beendet: Platz #${result.place}. ${result.payout > 0 ? `Auszahlung ${CasinoStore.formatCoins(result.payout)}.` : "Kein Preisgeld."} Runs ${stats.runs} | Wins ${stats.wins}`);
}

function initLiveBackground() {
  if (!liveCanvas) {
    return;
  }

  const ctx = liveCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  let pulse = 0;
  function resize() {
    liveCanvas.width = window.innerWidth;
    liveCanvas.height = window.innerHeight;
  }

  function draw() {
    pulse += 0.02;
    ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);

    for (let i = 0; i < 8; i += 1) {
      const radius = 120 + i * 65 + Math.sin(pulse + i) * 12;
      const alpha = 0.05 + i * 0.013;
      ctx.beginPath();
      ctx.arc(liveCanvas.width * 0.75, liveCanvas.height * 0.38, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 205, 126, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
}

async function initTournaments() {
  if (!CasinoStore.requireAccount({ withOverlay: true })) {
    startBtn.disabled = true;
    sizeNode.disabled = true;
    buyinNode.disabled = true;
    styleNode.disabled = true;
    updateOverview("Bitte zuerst Account erstellen und einloggen.");
    return;
  }

  updateHeaderByMode();
  initLiveBackground();
  await hydrateStats();
  const board = await CasinoStore.fetchLeaderboard();
  if (board.ok) {
    renderLeaderboard(board.leaderboard);
  }
  updateOverview("Turnier-Engine bereit. Wale Setup und starte den Bracket-Run.");
  startBtn.addEventListener("click", () => {
    simulateTournament().catch(() => {
      updateOverview("Turnier-Request fehlgeschlagen.");
    });
  });
}

initTournaments();