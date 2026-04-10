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

const balancing = {
  skillVariance: 0.14,
  payoutCurve: {
    first: 0.56,
    second: 0.24,
    top4: 0.1,
  },
  bonusVolatility: 0.12,
};

const stats = {
  bestPlace: null,
  totalWin: 0,
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
}

async function persistStats() {
  await CasinoStore.saveEngineState("tournaments", {
    bestPlace: stats.bestPlace,
    totalWin: stats.totalWin,
  });
}

function randomName() {
  const left = ["Neon", "Royal", "Atlas", "Nova", "Crimson", "Pulse", "Ember", "Frozen"];
  const right = ["Raiders", "Knights", "Titans", "Wolves", "Sharks", "Falcons", "Guard", "Storm"];
  return `${left[Math.floor(Math.random() * left.length)]} ${right[Math.floor(Math.random() * right.length)]}`;
}

function createPlayers(size) {
  const players = [{ name: "YOU", skill: 0.64 + Math.random() * 0.14, isYou: true }];
  while (players.length < size) {
    players.push({
      name: randomName(),
      skill: 0.4 + Math.random() * (0.42 + balancing.skillVariance),
      isYou: false,
    });
  }
  return players.sort(() => Math.random() - 0.5);
}

function matchWinner(a, b) {
  const aRoll = a.skill + Math.random() * 0.45;
  const bRoll = b.skill + Math.random() * 0.45;
  return aRoll >= bRoll ? a : b;
}

function payoutForPlace(place, pool) {
  if (place === 1) return Math.floor(pool * balancing.payoutCurve.first);
  if (place === 2) return Math.floor(pool * balancing.payoutCurve.second);
  if (place <= 4) return Math.floor(pool * balancing.payoutCurve.top4);
  return 0;
}

function placeFromRound(eliminationRound, totalRounds) {
  const delta = totalRounds - eliminationRound;
  if (delta <= 0) return 1;
  if (delta === 1) return 2;
  if (delta === 2) return 4;
  return 8;
}

function logLine(text, isGood) {
  const item = document.createElement("li");
  item.className = isGood ? "is-win" : "is-loss";
  item.textContent = text;
  logNode.prepend(item);
}

function simulateTournament() {
  const size = Number(sizeNode.value || 8);
  const buyin = Number(buyinNode.value || 0);
  if (!Number.isFinite(buyin) || buyin < 20) {
    updateOverview("Mindesteinsatz fur Turniere ist ₥ 20.");
    return;
  }

  if (!CasinoStore.spendCoins(buyin)) {
    CasinoFX.play("lose");
    updateOverview("Nicht genug Coins fur das Buy-In.");
    return;
  }

  const players = createPlayers(size);
  const pool = size * buyin;
  const rounds = Math.log2(size);
  let eliminationRound = rounds;
  let active = players;

  bracketNode.innerHTML = "";
  logNode.innerHTML = "";

  for (let round = 1; round <= rounds; round += 1) {
    const next = [];
    const roundNode = document.createElement("article");
    roundNode.className = "tournament-round";
    roundNode.innerHTML = `<h4>Round ${round}</h4>`;

    for (let i = 0; i < active.length; i += 2) {
      const p1 = active[i];
      const p2 = active[i + 1];
      const winner = matchWinner(p1, p2);
      const loser = winner === p1 ? p2 : p1;
      next.push(winner);

      const line = document.createElement("p");
      line.textContent = `${p1.name} vs ${p2.name} -> ${winner.name}`;
      line.className = winner.isYou ? "is-win" : loser.isYou ? "is-loss" : "";
      roundNode.appendChild(line);

      if (loser.isYou) {
        eliminationRound = round;
      }
    }

    bracketNode.appendChild(roundNode);
    active = next;
  }

  const youWon = active[0]?.isYou;
  const place = youWon ? 1 : placeFromRound(eliminationRound, rounds);
  const payout = Math.max(0, Math.floor(payoutForPlace(place, pool) * (1 + (Math.random() * 2 - 1) * balancing.bonusVolatility)));

  if (payout > 0) {
    CasinoStore.addCoins(payout);
    stats.totalWin += payout;
    if (place === 1) {
      CasinoFX.celebrateJackpot();
    } else {
      CasinoFX.celebrateWin();
    }
  } else {
    CasinoFX.play("lose");
  }

  if (!stats.bestPlace || place < stats.bestPlace) {
    stats.bestPlace = place;
  }
  persistStats().catch(() => {});

  logLine(`Style ${styleNode.value.toUpperCase()} | Place #${place} | Reward ${CasinoStore.formatCoins(payout)}`, payout > 0);
  updateOverview(`Turnier beendet: Platz #${place}. ${payout > 0 ? `Auszahlung ${CasinoStore.formatCoins(payout)}.` : "Kein Preisgeld."}`);
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
  updateOverview("Turnier-Engine bereit. Wale Setup und starte den Bracket-Run.");
  startBtn.addEventListener("click", simulateTournament);
}

initTournaments();