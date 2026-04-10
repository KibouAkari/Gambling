import { json, readBody, withCors } from "../_lib/authUtils.js";
import { requireSessionUser, saveUserRecord } from "../_lib/sessionUser.js";
import { todayKeyUtc, weekKeyUtc } from "../_lib/gameUtils.js";

const MISSIONS = [
  { id: "m-slot", title: "Slot Sprint", action: "slot", goal: 5, reward: 180, xp: 120 },
  { id: "m-live", title: "Live Pressure", action: "live", goal: 4, reward: 230, xp: 160 },
  { id: "m-sports", title: "Sharp Picks", action: "sports", goal: 6, reward: 210, xp: 140 },
];

function yesterdayKeyUtc() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ensureProgressRoot(user) {
  if (!user.gameProgress || typeof user.gameProgress !== "object") {
    user.gameProgress = {};
  }
  if (!user.gameProgress.missions || typeof user.gameProgress.missions !== "object") {
    user.gameProgress.missions = {};
  }

  const m = user.gameProgress.missions;
  if (typeof m.xp !== "number") m.xp = 0;
  if (typeof m.streak !== "number") m.streak = 0;
  if (typeof m.seasonXp !== "number") m.seasonXp = 0;
  if (typeof m.seasonClaims !== "number") m.seasonClaims = 0;
  if (!m.progress || typeof m.progress !== "object") m.progress = {};
  if (!m.claimed || typeof m.claimed !== "object") m.claimed = {};
  if (typeof m.dailyKey !== "string") m.dailyKey = todayKeyUtc();
  if (typeof m.weekKey !== "string") m.weekKey = weekKeyUtc();
  if (typeof m.lastClaimDay !== "string") m.lastClaimDay = "";
}

function applyResets(missionsState) {
  const today = todayKeyUtc();
  const week = weekKeyUtc();

  if (missionsState.weekKey !== week) {
    missionsState.weekKey = week;
    missionsState.seasonXp = 0;
    missionsState.seasonClaims = 0;
  }

  if (missionsState.dailyKey !== today) {
    missionsState.dailyKey = today;
    missionsState.progress = {};
    missionsState.claimed = {};

    if (missionsState.lastClaimDay !== yesterdayKeyUtc()) {
      missionsState.streak = 0;
    }
  }
}

function rewardWithDrift(baseReward) {
  const drift = (Math.random() * 2 - 1) * 0.18;
  return Math.max(10, Math.floor(baseReward * (1 + drift)));
}

function publicState(missionsState) {
  return {
    dailyKey: missionsState.dailyKey,
    weekKey: missionsState.weekKey,
    xp: missionsState.xp,
    streak: missionsState.streak,
    seasonXp: missionsState.seasonXp,
    seasonClaims: missionsState.seasonClaims,
    progress: missionsState.progress,
    claimed: missionsState.claimed,
    missions: MISSIONS,
  };
}

export default async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "Method not allowed" });
  }

  const session = await requireSessionUser(req, res);
  if (!session) {
    return;
  }

  const payload = readBody(req);
  const missionId = String(payload.missionId || "").trim();
  const mission = MISSIONS.find((item) => item.id === missionId);

  if (!mission) {
    return json(res, 400, { ok: false, message: "Mission nicht gefunden." });
  }

  const { users, user, usernameKey } = session;
  if (typeof user.coins !== "number") {
    user.coins = 1000;
  }

  ensureProgressRoot(user);
  const missionsState = user.gameProgress.missions;
  applyResets(missionsState);

  if (missionsState.claimed[mission.id]) {
    return json(res, 400, { ok: false, message: "Mission bereits geclaimt." });
  }

  const progress = Number(missionsState.progress[mission.id] || 0);
  if (progress < mission.goal) {
    return json(res, 400, { ok: false, message: "Mission noch nicht abgeschlossen." });
  }

  const today = todayKeyUtc();
  const wasYesterday = missionsState.lastClaimDay === yesterdayKeyUtc();
  const wasToday = missionsState.lastClaimDay === today;

  missionsState.claimed[mission.id] = true;
  missionsState.xp += mission.xp;
  missionsState.seasonXp += mission.xp;
  missionsState.seasonClaims += 1;

  if (!wasToday) {
    missionsState.streak = wasYesterday ? missionsState.streak + 1 : 1;
    missionsState.lastClaimDay = today;
  }

  const reward = rewardWithDrift(mission.reward);
  user.coins += reward;

  await saveUserRecord(users, usernameKey, user);

  return json(res, 200, {
    ok: true,
    reward,
    xp: mission.xp,
    user: { coins: user.coins },
    state: publicState(missionsState),
  });
}
