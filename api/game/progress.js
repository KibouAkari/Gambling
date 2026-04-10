import { json, readBody, withCors } from "../_lib/authUtils.js";
import { requireSessionUser, saveUserRecord } from "../_lib/sessionUser.js";

const ALLOWED_ENGINES = new Set(["missions", "tournaments"]);

function ensureProgressRoot(user) {
  if (!user.gameProgress || typeof user.gameProgress !== "object") {
    user.gameProgress = {};
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
