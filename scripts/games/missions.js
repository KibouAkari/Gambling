const missionsBase = [
  { id: "m-slot", title: "Slot Sprint", action: "slot", goal: 5, reward: 180, xp: 120 },
  { id: "m-live", title: "Live Pressure", action: "live", goal: 4, reward: 230, xp: 160 },
  { id: "m-sports", title: "Sharp Picks", action: "sports", goal: 6, reward: 210, xp: 140 },
];

const balancing = {
  actionVolatility: 0.26,
  rewardBoostMax: 0.18,
  xpScale: 1,
};

const actionCosts = {
  slot: 20,
  live: 35,
  sports: 25,
};

const gridNode = document.getElementById("missions-grid");
const coinsNode = document.getElementById("missions-coins");
const xpNode = document.getElementById("missions-xp");
const streakNode = document.getElementById("missions-streak");
const statusNode = document.getElementById("missions-status");
const titleNode = document.getElementById("missions-title");
const liveCanvas = document.getElementById("missions-live-canvas");

const missionState = {
  xp: 0,
  streak: 0,
  progress: {},
  claimed: {},
};

function updateHeaderByMode() {
  const mode = new URLSearchParams(window.location.search).get("mode") || "default";
  if (mode === "night-ops") {
    titleNode.textContent = "Night Ops Missions Engine";
  }
}

function missionProgress(mission) {
  return Number(missionState.progress[mission.id] || 0);
}

function missionDone(mission) {
  return missionProgress(mission) >= mission.goal;
}

function rewardWithBalance(baseReward) {
  const drift = (Math.random() * 2 - 1) * balancing.rewardBoostMax;
  return Math.max(10, Math.floor(baseReward * (1 + drift)));
}

function refreshTop(message) {
  coinsNode.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  xpNode.textContent = String(missionState.xp);
  streakNode.textContent = String(missionState.streak);
  statusNode.textContent = message;
}

async function persistState() {
  await CasinoStore.saveEngineState("missions", {
    xp: missionState.xp,
    streak: missionState.streak,
    progress: missionState.progress,
    claimed: missionState.claimed,
  });
}

async function hydrateState() {
  const response = await CasinoStore.fetchEngineState("missions");
  if (!response.ok || !response.state) {
    return;
  }

  missionState.xp = Number(response.state.xp || 0);
  missionState.streak = Number(response.state.streak || 0);
  missionState.progress = response.state.progress || {};
  missionState.claimed = response.state.claimed || {};
}

function renderMissions() {
  gridNode.innerHTML = "";

  missionsBase.forEach((mission) => {
    const progress = missionProgress(mission);
    const percent = Math.min(100, Math.round((progress / mission.goal) * 100));
    const isDone = missionDone(mission);
    const claimed = Boolean(missionState.claimed[mission.id]);

    const card = document.createElement("article");
    card.className = "mission-card";
    card.innerHTML = `
      <h3>${mission.title}</h3>
      <p>Aktion: ${mission.action.toUpperCase()} | Ziel: ${mission.goal} Runs</p>
      <div class="mission-progress-track">
        <div style="width:${percent}%"></div>
      </div>
      <div class="mission-meta">
        <span>${progress}/${mission.goal}</span>
        <span>Reward ${CasinoStore.formatCoins(mission.reward)}</span>
      </div>
      <button type="button" data-claim-id="${mission.id}" ${!isDone || claimed ? "disabled" : ""}>
        ${claimed ? "Claimed" : "Claim Reward"}
      </button>
    `;

    gridNode.appendChild(card);
  });

  gridNode.querySelectorAll("[data-claim-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const mission = missionsBase.find((item) => item.id === button.dataset.claimId);
      if (!mission || missionState.claimed[mission.id] || !missionDone(mission)) {
        return;
      }

      missionState.claimed[mission.id] = true;
      missionState.xp += Math.floor(mission.xp * balancing.xpScale);
      missionState.streak += 1;
      const reward = rewardWithBalance(mission.reward);
      CasinoStore.addCoins(reward);
      CasinoFX.celebrateWin();
      persistState().catch(() => {});
      renderMissions();
      refreshTop(`${mission.title} geclaimt: +${Math.floor(mission.xp * balancing.xpScale)} XP und ${CasinoStore.formatCoins(reward)}.`);
    });
  });
}

function runAction(action) {
  const cost = actionCosts[action] || 0;
  if (!CasinoStore.spendCoins(cost)) {
    CasinoFX.play("lose");
    refreshTop("Nicht genug Coins fur diese Aktion.");
    return;
  }

  let advanced = 0;
  missionsBase.forEach((mission) => {
    if (mission.action !== action || missionState.claimed[mission.id]) {
      return;
    }

    const current = missionProgress(mission);
    if (current < mission.goal) {
      const boostRoll = Math.random() < balancing.actionVolatility ? 2 : 1;
      missionState.progress[mission.id] = current + boostRoll;
      advanced += 1;
    }
  });

  if (advanced > 0) {
    CasinoFX.play("spin");
    refreshTop(`Aktion ${action.toUpperCase()} abgeschlossen. ${advanced} Missionsfortschritte hinzugefugt.`);
  } else {
    CasinoFX.play("lose");
    refreshTop(`Aktion ${action.toUpperCase()} abgeschlossen, aber keine offene Mission passt.`);
  }

  persistState().catch(() => {});
  renderMissions();
}

function initLiveBackground() {
  if (!liveCanvas) {
    return;
  }

  const ctx = liveCanvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const glyphs = Array.from({ length: 52 }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.001 + Math.random() * 0.002,
    size: 10 + Math.random() * 18,
    char: ["◆", "◇", "✦", "✧", "◈"][Math.floor(Math.random() * 5)],
  }));

  function resize() {
    liveCanvas.width = window.innerWidth;
    liveCanvas.height = window.innerHeight;
  }

  function frame() {
    ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
    glyphs.forEach((g) => {
      g.y += g.speed;
      if (g.y > 1.05) {
        g.y = -0.05;
        g.x = Math.random();
      }
      ctx.fillStyle = "rgba(143, 255, 211, 0.2)";
      ctx.font = `${g.size}px Cinzel`;
      ctx.fillText(g.char, g.x * liveCanvas.width, g.y * liveCanvas.height);
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  frame();
}

async function initMissions() {
  if (!CasinoStore.requireAccount({ withOverlay: true })) {
    document.querySelectorAll("[data-mission-action]").forEach((button) => {
      button.disabled = true;
    });
    refreshTop("Bitte zuerst Account erstellen und einloggen.");
    return;
  }

  updateHeaderByMode();
  initLiveBackground();
  await hydrateState();
  renderMissions();
  refreshTop("Mission Engine bereit. Starte Aktionen und claime Rewards.");

  document.querySelectorAll("[data-mission-action]").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.missionAction));
  });
}

initMissions();