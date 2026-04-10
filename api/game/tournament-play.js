import { json, readBody, withCors } from "../_lib/authUtils.js";
import { readGameState, writeGameState } from "../_lib/blobStore.js";
import { requireSessionUser, saveUserRecord } from "../_lib/sessionUser.js";
import { clampInt, randomItem } from "../_lib/gameUtils.js";

const STYLE_BONUS = {
  wheel: 1,
  slot: 0.97,
};

const NAME_A = ["Neon", "Royal", "Atlas", "Nova", "Crimson", "Pulse", "Ember", "Frozen"];
const NAME_B = ["Raiders", "Knights", "Titans", "Wolves", "Sharks", "Falcons", "Guard", "Storm"];

function randomName() {
  return `${randomItem(NAME_A)} ${randomItem(NAME_B)}`;
}

function ensureTournamentState(gameState) {
  if (!gameState.tournaments || typeof gameState.tournaments !== "object") {
    gameState.tournaments = {};
  }
  if (!Array.isArray(gameState.tournaments.leaderboard)) {
    gameState.tournaments.leaderboard = [];
  }
}

function ensureUserTournamentProgress(user) {
  if (!user.gameProgress || typeof user.gameProgress !== "object") {
    user.gameProgress = {};
  }
  if (!user.gameProgress.tournaments || typeof user.gameProgress.tournaments !== "object") {
    user.gameProgress.tournaments = {
      bestPlace: 0,
      totalWin: 0,
      runs: 0,
      wins: 0,
    };
  }
}

function createPlayers(size) {
  const players = [{ name: "YOU", skill: 0.65 + Math.random() * 0.17, isYou: true }];
  while (players.length < size) {
    players.push({
      name: randomName(),
      skill: 0.42 + Math.random() * 0.52,
      isYou: false,
    });
  }
  return players.sort(() => Math.random() - 0.5);
}

function matchWinner(a, b) {
  const aScore = a.skill + Math.random() * 0.5;
  const bScore = b.skill + Math.random() * 0.5;
  return aScore >= bScore ? a : b;
}

function placeFromRound(elimRound, rounds) {
  const delta = rounds - elimRound;
  if (delta <= 0) return 1;
  if (delta === 1) return 2;
  if (delta === 2) return 4;
  return 8;
}

function payoutForPlace(place, pool) {
  if (place === 1) return Math.floor(pool * 0.56);
  if (place === 2) return Math.floor(pool * 0.24);
  if (place <= 4) return Math.floor(pool * 0.1);
  return 0;
}

function updateLeaderboard(gameState, username, progress, place, style) {
  const rows = gameState.tournaments.leaderboard;
  const score = Math.floor(progress.totalWin + (progress.wins || 0) * 250 + (place === 1 ? 300 : 0));
  const nowIso = new Date().toISOString();

  const existing = rows.find((row) => row.username === username);
  if (existing) {
    existing.totalWin = progress.totalWin;
    existing.bestPlace = progress.bestPlace;
    existing.wins = progress.wins || 0;
    existing.runs = progress.runs || 0;
    existing.score = score;
    existing.lastStyle = style;
    existing.updatedAt = nowIso;
    return;
  }

  rows.push({
    username,
    totalWin: progress.totalWin,
    bestPlace: progress.bestPlace,
    wins: progress.wins || 0,
    runs: progress.runs || 0,
    score,
    lastStyle: style,
    updatedAt: nowIso,
  });
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
  const requestedSize = clampInt(payload.size, 8, 16);
  const size = requestedSize >= 16 ? 16 : 8;
  const buyin = clampInt(payload.buyin, 20, 10000);
  const style = String(payload.style || "wheel").trim() || "wheel";
  const styleFactor = STYLE_BONUS[style] || 1;

  const { users, user, usernameKey } = session;
  ensureUserTournamentProgress(user);

  if (typeof user.coins !== "number") {
    user.coins = 1000;
  }
  if (user.coins < buyin) {
    return json(res, 400, { ok: false, message: "Nicht genug Coins fur das Buy-In." });
  }

  user.coins -= buyin;

  const players = createPlayers(size);
  const pool = size * buyin;
  const rounds = Math.log2(size);
  let active = players;
  let eliminationRound = rounds;
  const bracket = [];

  for (let round = 1; round <= rounds; round += 1) {
    const next = [];
    const matches = [];

    for (let i = 0; i < active.length; i += 2) {
      const p1 = active[i];
      const p2 = active[i + 1];
      const winner = matchWinner(p1, p2);
      const loser = winner === p1 ? p2 : p1;

      next.push(winner);
      matches.push({
        p1: p1.name,
        p2: p2.name,
        winner: winner.name,
        youWon: winner.isYou,
        youLost: loser.isYou,
      });

      if (loser.isYou) {
        eliminationRound = round;
      }
    }

    bracket.push({ round, matches });
    active = next;
  }

  const youWon = active[0]?.isYou;
  const place = youWon ? 1 : placeFromRound(eliminationRound, rounds);
  const basePayout = payoutForPlace(place, pool);
  const payout = Math.max(0, Math.floor(basePayout * styleFactor * (1 + (Math.random() * 2 - 1) * 0.14)));

  if (payout > 0) {
    user.coins += payout;
  }

  const progress = user.gameProgress.tournaments;
  progress.runs = Number(progress.runs || 0) + 1;
  progress.totalWin = Number(progress.totalWin || 0) + payout;
  if (place === 1) {
    progress.wins = Number(progress.wins || 0) + 1;
  }
  if (!progress.bestPlace || place < progress.bestPlace) {
    progress.bestPlace = place;
  }

  await saveUserRecord(users, usernameKey, user);

  const gameState = await readGameState();
  ensureTournamentState(gameState);
  updateLeaderboard(gameState, user.username || usernameKey, progress, place, style);
  await writeGameState(gameState);

  const leaderboard = [...gameState.tournaments.leaderboard]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 20)
    .map((row, index) => ({
      rank: index + 1,
      username: row.username,
      score: row.score,
      totalWin: row.totalWin,
      bestPlace: row.bestPlace,
      lastStyle: row.lastStyle,
    }));

  return json(res, 200, {
    ok: true,
    result: {
      place,
      payout,
      style,
      buyin,
      pool,
      bracket,
    },
    stats: {
      bestPlace: progress.bestPlace,
      totalWin: progress.totalWin,
      runs: progress.runs,
      wins: progress.wins || 0,
    },
    user: {
      coins: user.coins,
    },
    leaderboard,
  });
}
