import { json, readBody, withCors } from "../_lib/authUtils.js";
import { requireSessionUser, saveUserRecord } from "../_lib/sessionUser.js";
import { todayKeyUtc, weekKeyUtc } from "../_lib/gameUtils.js";

const ALLOWED_ENGINES = new Set(["missions", "tournaments"]);
const MISSION_DEFS = [
  { id: "m-slot", title: "Slot Sprint", action: "slot", goal: 5, reward: 180, xp: 120 },
  { id: "m-live", title: "Live Pressure", action: "live", goal: 4, reward: 230, xp: 160 },
  { id: "m-sports", title: "Sharp Picks", action: "sports", goal: 6, reward: 210, xp: 140 },
];

function ensureProgressRoot(user) {
  if (!user.gameProgress || typeof user.gameProgress !== "object") {
    user.gameProgress = {};
  }
}

function yesterdayKeyUtc() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ensureMissionState(user) {
  ensureProgressRoot(user);
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

  const today = todayKeyUtc();
  const week = weekKeyUtc();
  if (m.weekKey !== week) {
    m.weekKey = week;
    m.seasonXp = 0;
    m.seasonClaims = 0;
  }

  if (m.dailyKey !== today) {
    m.dailyKey = today;
    m.progress = {};
    m.claimed = {};

    if (m.lastClaimDay !== yesterdayKeyUtc()) {
      m.streak = 0;
    }
  }
}

export default async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const session = await requireSessionUser(req, res);
  if (!session) {
    return;
  }

  const { users, user, usernameKey } = session;
  ensureProgressRoot(user);

  if (req.method === "GET") {
    const engine = String(req.query?.engine || "").trim();
    if (!ALLOWED_ENGINES.has(engine)) {
      return json(res, 400, { ok: false, message: "Ungultige Engine." });
    }

    if (engine === "missions") {
      ensureMissionState(user);
      await saveUserRecord(users, usernameKey, user);
      return json(res, 200, {
        ok: true,
        engine,
        state: {
          ...user.gameProgress.missions,
          missions: MISSION_DEFS,
        },
      });
    }

    return json(res, 200, {
      ok: true,
      engine,
      state: user.gameProgress[engine] || {},
    });
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "Method not allowed" });
  }

  const payload = readBody(req);
  const engine = String(payload.engine || "").trim();
  if (!ALLOWED_ENGINES.has(engine)) {
    return json(res, 400, { ok: false, message: "Ungultige Engine." });
  }

  const patch = payload.state && typeof payload.state === "object" ? payload.state : null;
  if (!patch) {
    return json(res, 400, { ok: false, message: "State-Patch fehlt." });
  }

  const previous = user.gameProgress[engine] || {};
  const next = { ...previous, ...patch };

  user.gameProgress[engine] = next;
  await saveUserRecord(users, usernameKey, user);

  return json(res, 200, {
    ok: true,
    engine,
    state: next,
  });
}
