import { json, readBody, withCors } from "../_lib/authUtils.js";
import { requireSessionUser, saveUserRecord } from "../_lib/sessionUser.js";
import { todayKeyUtc, weekKeyUtc, randomItem } from "../_lib/gameUtils.js";

const MISSIONS = [
  { id: "m-slot", title: "Slot Sprint", action: "slot", goal: 5, reward: 180, xp: 120 },
  { id: "m-live", title: "Live Pressure", action: "live", goal: 4, reward: 230, xp: 160 },
  { id: "m-sports", title: "Sharp Picks", action: "sports", goal: 6, reward: 210, xp: 140 },
];

const ACTION_COST = {
  slot: 20,
  live: 35,
  sports: 25,
};

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
  const action = String(payload.action || "").trim();
  const cost = ACTION_COST[action];

  if (!cost) {
    return json(res, 400, { ok: false, message: "Ungultige Missions-Aktion." });
  }

  const { users, user, usernameKey } = session;
  if (typeof user.coins !== "number") {
    user.coins = 1000;
  }

  ensureProgressRoot(user);
  const missionsState = user.gameProgress.missions;
  applyResets(missionsState);

  if (user.coins < cost) {
    return json(res, 400, { ok: false, message: "Nicht genug Coins fur diese Aktion." });
  }

  user.coins -= cost;

  let advanced = 0;
  const touched = [];
  for (const mission of MISSIONS) {
    if (mission.action !== action || missionsState.claimed[mission.id]) {
      continue;
    }

    const current = Number(missionsState.progress[mission.id] || 0);
    if (current >= mission.goal) {
      continue;
    }

    const boost = randomItem([1, 1, 1, 2]);
    missionsState.progress[mission.id] = Math.min(mission.goal, current + boost);
    advanced += 1;
    touched.push(mission.id);
  }

  await saveUserRecord(users, usernameKey, user);

  return json(res, 200, {
    ok: true,
    advanced,
    touched,
    user: { coins: user.coins },
    state: publicState(missionsState),
  });
}
