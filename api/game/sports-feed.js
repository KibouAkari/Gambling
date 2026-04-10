import { json, withCors } from "../_lib/authUtils.js";

const MATCHES = [
  { id: "m1", home: "Neon Hawks", away: "Iron Sharks", base: { home: 2.15, draw: 3.2, away: 2.55 } },
  { id: "m2", home: "Royal Meteors", away: "Pulse Titans", base: { home: 1.9, draw: 3.35, away: 3.1 } },
  { id: "m3", home: "Atlas Wolves", away: "Crimson Knights", base: { home: 2.45, draw: 3.1, away: 2.35 } },
  { id: "m4", home: "Nova Rangers", away: "Emerald Forge", base: { home: 2.05, draw: 3.45, away: 2.8 } },
];

function drift(baseValue, timeUnit, speed, amplitude) {
  const wave = Math.sin(timeUnit * speed) * amplitude;
  const jitter = Math.cos(timeUnit * speed * 0.6) * (amplitude * 0.35);
  const value = baseValue + wave + jitter;
  return Number(Math.max(1.2, value).toFixed(2));
}

export default async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return json(res, 405, { ok: false, message: "Method not allowed" });
  }

  const now = Date.now();
  const t = now / 1000;

  const matches = MATCHES.map((match, index) => {
    const speed = 0.18 + index * 0.05;
    const amp = 0.24 + index * 0.02;

    return {
      id: match.id,
      home: match.home,
      away: match.away,
      odds: {
        home: drift(match.base.home, t + index * 1.1, speed, amp),
        draw: drift(match.base.draw, t + index * 0.8, speed * 0.9, amp * 0.7),
        away: drift(match.base.away, t + index * 1.4, speed * 1.1, amp),
      },
    };
  });

  const ticker = [
    `Live Market Sync ${new Date(now).toLocaleTimeString("de-DE")}`,
    `${matches[0].home} vs ${matches[0].away}: ${matches[0].odds.home}/${matches[0].odds.draw}/${matches[0].odds.away}`,
    `${matches[1].home} vs ${matches[1].away}: ${matches[1].odds.home}/${matches[1].odds.draw}/${matches[1].odds.away}`,
  ];

  return json(res, 200, {
    ok: true,
    ts: now,
    ticker,
    matches,
  });
}
