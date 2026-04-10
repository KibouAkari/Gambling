import { json, withCors } from "../_lib/authUtils.js";
import { readGameState } from "../_lib/blobStore.js";

function normalizeLeaderboard(state) {
  const rows = Array.isArray(state?.tournaments?.leaderboard)
    ? state.tournaments.leaderboard
    : [];

  return [...rows]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 25)
    .map((row, index) => ({
      rank: index + 1,
      username: row.username,
      score: Number(row.score || 0),
      totalWin: Number(row.totalWin || 0),
      bestPlace: Number(row.bestPlace || 0),
      lastStyle: row.lastStyle || "-",
      updatedAt: row.updatedAt || "",
    }));
}

export default async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return json(res, 405, { ok: false, message: "Method not allowed" });
  }

  const state = await readGameState();
  const leaderboard = normalizeLeaderboard(state);

  return json(res, 200, {
    ok: true,
    leaderboard,
    ts: Date.now(),
  });
}
