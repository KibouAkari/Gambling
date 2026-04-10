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
  dailyKey: "",
  weekKey: "",
  xp: 0,
  seasonXp: 0,
  seasonClaims: 0,
  streak: 0,
  progress: {},
  claimed: {},
  missions: [],
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

function refreshTop(message) {
  coinsNode.textContent = CasinoStore.formatCoins(CasinoStore.getCoins());
  xpNode.textContent = String(missionState.xp);
  streakNode.textContent = String(missionState.streak);
  statusNode.textContent = `${message} | Daily ${missionState.dailyKey || "-"} | Season ${missionState.weekKey || "-"} XP ${missionState.seasonXp}`;
}

function applyServerState(state) {
  if (!state) {
    return;
  }

  missionState.dailyKey = state.dailyKey || missionState.dailyKey;
  missionState.weekKey = state.weekKey || missionState.weekKey;
  missionState.xp = Number(state.xp || 0);
  missionState.seasonXp = Number(state.seasonXp || 0);
  missionState.seasonClaims = Number(state.seasonClaims || 0);
  missionState.streak = Number(state.streak || 0);
  missionState.progress = state.progress || {};
  missionState.claimed = state.claimed || {};
  missionState.missions = Array.isArray(state.missions) ? state.missions : missionState.missions;
}

async function hydrateState() {
  const response = await CasinoStore.fetchEngineState("missions");
  if (!response.ok || !response.state) {
    return;
  }

  applyServerState(response.state);
}

function renderMissions() {
  gridNode.innerHTML = "";

  missionState.missions.forEach((mission) => {
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
    button.addEventListener("click", async () => {
      const mission = missionState.missions.find((item) => item.id === button.dataset.claimId);
      if (!mission || missionState.claimed[mission.id] || !missionDone(mission)) {
        return;
      }

      const response = await CasinoStore.claimMission(mission.id);
      if (!response.ok || !response.data) {
        refreshTop(response.message || "Claim fehlgeschlagen.");
        return;
      }

      applyServerState(response.data.state);
      CasinoFX.celebrateWin();
      renderMissions();
      refreshTop(`${mission.title} geclaimt: +${response.data.xp} XP und ${CasinoStore.formatCoins(response.data.reward)}.`);
    });
  });
}

async function runAction(action) {
  const response = await CasinoStore.runMissionAction(action);
  if (!response.ok || !response.data) {
    CasinoFX.play("lose");
    refreshTop(response.message || "Mission-Aktion fehlgeschlagen.");
    return;
  }

  applyServerState(response.data.state);
  const cost = actionCosts[action] || 0;
  if (response.data.advanced > 0) {
    CasinoFX.play("spin");
    refreshTop(`Aktion ${action.toUpperCase()} abgeschlossen. Kosten ${CasinoStore.formatCoins(cost)}. Fortschritte: ${response.data.advanced}.`);
  } else {
    CasinoFX.play("lose");
    refreshTop(`Aktion ${action.toUpperCase()} ausgefuhrt. Keine passende offene Mission.`);
  }

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
  if (!missionState.missions.length) {
    missionState.missions = [
      { id: "m-slot", title: "Slot Sprint", action: "slot", goal: 5, reward: 180, xp: 120 },
      { id: "m-live", title: "Live Pressure", action: "live", goal: 4, reward: 230, xp: 160 },
      { id: "m-sports", title: "Sharp Picks", action: "sports", goal: 6, reward: 210, xp: 140 },
    ];
  }
  renderMissions();
  refreshTop("Mission Engine bereit. Starte Aktionen und claime Rewards.");

  document.querySelectorAll("[data-mission-action]").forEach((button) => {
    button.addEventListener("click", () => runAction(button.dataset.missionAction));
  });
}

initMissions();