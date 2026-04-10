const balancing = {
  houseEdge: 0.062,
  volatility: 0.27,
  minStake: 10,
  jackpotThreshold: 4.6,
};

const selectedMatchNode = document.getElementById("sports-selected-match");
const marketNode = document.getElementById("sports-market");
const stakeNode = document.getElementById("sports-stake");
const oddsNode = document.getElementById("sports-current-odds");
const statusNode = document.getElementById("sports-status");
const coinsNode = document.getElementById("sports-coins");
const placeBetBtn = document.getElementById("sports-place-bet");
const matchListNode = document.getElementById("sports-match-list");
const historyNode = document.getElementById("sports-history");
const titleNode = document.getElementById("sports-title");
const tickerNode = document.getElementById("sports-ticker-line");
const liveCanvas = document.getElementById("sports-live-canvas");

let feedMatches = [];
let selectedMatchId = "";
let tickerIndex = 0;
let tickerLines = ["Sports Feed wird aufgebaut..."];

function currentMatch() {
  return feedMatches.find((match) => match.id === selectedMatchId) || feedMatches[0] || null;
}

function formatOdds(value) {
  return Number(value || 0).toFixed(2);
}

function inverseWeight(odd) {
  return 1 / Math.max(1.01, odd);
}

function weightedOutcome(match) {
  const event = match.event || null;
  const homeShift = event?.type?.includes("home") ? 0.12 : event?.type?.includes("away") ? -0.1 : 0;
  const awayShift = event?.type?.includes("away") ? 0.12 : event?.type?.includes("home") ? -0.1 : 0;
  const drawShift = event?.type?.includes("momentum") ? -0.08 : 0.06;

  const homeWeight = inverseWeight(match.odds.home) * (1 + homeShift);
  const drawWeight = inverseWeight(match.odds.draw) * (1 + balancing.volatility * 0.2 + drawShift);
  const awayWeight = inverseWeight(match.odds.away) * (1 + awayShift);
  const total = homeWeight + drawWeight + awayWeight;

  let roll = Math.random() * total;
  roll -= homeWeight;
  if (roll <= 0) return "home";
  roll -= drawWeight;
  if (roll <= 0) return "draw";
  return "away";
}

function updateHeaderByMode() {
  const mode = new URLSearchParams(window.location.search).get("mode") || "default";
  if (mode === "arena-clash") {
    titleNode.textContent = "Arena Clash Sports Engine";
  }
}

function updateInfo(message) {
  coinsNode.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  statusNode.textContent = message;
}

function updateSelectedUi() {
  const match = currentMatch();
  if (!match) {
    selectedMatchNode.textContent = "-";
    oddsNode.textContent = "-";
    return;
  }

  selectedMatchNode.textContent = `${match.home} vs ${match.away}`;
  oddsNode.textContent = formatOdds(match.odds[marketNode.value]);

  document.querySelectorAll(".sports-match-card").forEach((node) => {
    node.classList.toggle("is-active", node.dataset.matchId === selectedMatchId);
  });
}

function pushHistory(text, isWin) {
  const item = document.createElement("li");
  item.className = isWin ? "is-win" : "is-loss";
  item.textContent = text;
  historyNode.prepend(item);
  while (historyNode.children.length > 10) {
    historyNode.removeChild(historyNode.lastChild);
  }
}

function renderMatches() {
  matchListNode.innerHTML = "";
  feedMatches.forEach((match) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "sports-match-card";
    card.dataset.matchId = match.id;
    card.innerHTML = `
      <strong>${match.home} vs ${match.away}</strong>
      <span>1: ${formatOdds(match.odds.home)} | X: ${formatOdds(match.odds.draw)} | 2: ${formatOdds(match.odds.away)}</span>
      ${match.event ? `<small>${match.event.label}</small>` : ""}
    `;
    card.addEventListener("click", () => {
      selectedMatchId = match.id;
      updateSelectedUi();
    });
    matchListNode.appendChild(card);
  });
  updateSelectedUi();
}

function effectivePayout(stake, odd, won) {
  if (!won) {
    return 0;
  }
  const edgeFactor = 1 - balancing.houseEdge;
  return Math.floor(stake * odd * edgeFactor);
}

function resolveBet() {
  const stake = Number(stakeNode.value || 0);
  if (!Number.isFinite(stake) || stake < balancing.minStake) {
    updateInfo(`Mindesteinsatz ist ${CasinoStore.formatCoins(balancing.minStake)}.`);
    return;
  }

  if (!CasinoStore.spendCoins(stake)) {
    CasinoFX.play("lose");
    updateInfo("Nicht genug Coins fur diesen Einsatz.");
    return;
  }

  const match = currentMatch();
  if (!match) {
    updateInfo("Kein Match aktiv.");
    return;
  }

  const selectedMarket = marketNode.value;
  const outcome = weightedOutcome(match);
  const odd = Number(match.odds[selectedMarket]);
  const won = selectedMarket === outcome;
  const payout = effectivePayout(stake, odd, won);

  if (payout > 0) {
    CasinoStore.addCoins(payout);
    if (odd >= balancing.jackpotThreshold) {
      CasinoFX.celebrateJackpot();
    } else {
      CasinoFX.celebrateWin();
    }
    updateInfo(`Treffer! ${match.home} vs ${match.away} -> ${outcome.toUpperCase()} | Gewinn ${CasinoStore.formatCoins(payout)}.`);
  } else {
    CasinoFX.play("lose");
    updateInfo(`Verloren: Ergebnis war ${outcome.toUpperCase()} bei ${match.home} vs ${match.away}.`);
  }

  pushHistory(`${match.home} vs ${match.away} | Pick ${selectedMarket.toUpperCase()} -> ${outcome.toUpperCase()} | ${won ? "+" : "-"}${CasinoStore.formatCoins(won ? payout : stake)}`, won);
  updateSelectedUi();
}

async function refreshSportsFeed() {
  const response = await CasinoStore.fetchSportsFeed();
  if (!response.ok || !response.data) {
    tickerLines = ["Feed-Delay: Live-Markt reconnect..."];
    return;
  }

  feedMatches = response.data.matches || feedMatches;
  if (!selectedMatchId && feedMatches.length) {
    selectedMatchId = feedMatches[0].id;
  }

  tickerLines = response.data.ticker || tickerLines;
  if (response.data.matches?.some((m) => m.event)) {
    const eventCount = response.data.matches.filter((m) => m.event).length;
    updateInfo(`In-Play aktiv: ${eventCount} Event(s) beeinflussen gerade die Odds.`);
  }
  renderMatches();
}

function startTickerLoop() {
  setInterval(() => {
    if (!tickerLines.length) {
      return;
    }
    tickerIndex = (tickerIndex + 1) % tickerLines.length;
    tickerNode.textContent = tickerLines[tickerIndex];
  }, 1800);
}

function initLiveBackground() {
  if (!liveCanvas) {
    return;
  }

  const ctx = liveCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0009,
    vy: (Math.random() - 0.5) * 0.0009,
    r: 1.2 + Math.random() * 2.2,
  }));

  let mouseX = 0.5;
  let mouseY = 0.5;

  function resize() {
    liveCanvas.width = window.innerWidth;
    liveCanvas.height = window.innerHeight;
  }

  function frame() {
    ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);

    particles.forEach((p) => {
      p.x += p.vx + (mouseX - 0.5) * 0.00015;
      p.y += p.vy + (mouseY - 0.5) * 0.00015;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05;
      if (p.y > 1.05) p.y = -0.05;

      const px = p.x * liveCanvas.width;
      const py = p.y * liveCanvas.height;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 214, 255, 0.22)";
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX / Math.max(1, window.innerWidth);
    mouseY = event.clientY / Math.max(1, window.innerHeight);
  });

  resize();
  frame();
}

async function initSports() {
  if (!CasinoStore.requireAccount({ withOverlay: true })) {
    placeBetBtn.disabled = true;
    stakeNode.disabled = true;
    marketNode.disabled = true;
    updateInfo("Bitte zuerst Account erstellen und einloggen.");
    return;
  }

  updateHeaderByMode();
  initLiveBackground();
  await refreshSportsFeed();
  updateSelectedUi();
  startTickerLoop();
  updateInfo("Live-Markt aktiv: Engine bereit fur Match-Simulation.");

  setInterval(refreshSportsFeed, 2400);
  marketNode.addEventListener("change", updateSelectedUi);
  placeBetBtn.addEventListener("click", resolveBet);
}

initSports();