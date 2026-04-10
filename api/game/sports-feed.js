import { json, withCors } from "../_lib/authUtils.js";

const MATCHES = [
  { id: "m1", home: "Neon Hawks", away: "Iron Sharks", base: { home: 2.15, draw: 3.2, away: 2.55 } },
  { id: "m2", home: "Royal Meteors", away: "Pulse Titans", base: { home: 1.9, draw: 3.35, away: 3.1 } },
  { id: "m3", home: "Atlas Wolves", away: "Crimson Knights", base: { home: 2.45, draw: 3.1, away: 2.35 } },
  { id: "m4", home: "Nova Rangers", away: "Emerald Forge", base: { home: 2.05, draw: 3.45, away: 2.8 } },
];

const EVENT_TYPES = [
  { type: "red-card-home", label: "Red Card Home", shift: { home: 1.2, draw: 0.35, away: -0.45 } },
  { type: "red-card-away", label: "Red Card Away", shift: { home: -0.45, draw: 0.35, away: 1.2 } },
  { type: "home-momentum", label: "Home Momentum", shift: { home: -0.35, draw: 0.15, away: 0.28 } },
  { type: "away-momentum", label: "Away Momentum", shift: { home: 0.28, draw: 0.15, away: -0.35 } },
  { type: "home-injury", label: "Home Injury", shift: { home: 0.55, draw: 0.2, away: -0.3 } },
  { type: "away-injury", label: "Away Injury", shift: { home: -0.3, draw: 0.2, away: 0.55 } },
];

function drift(baseValue, timeUnit, speed, amplitude) {
  const wave = Math.sin(timeUnit * speed) * amplitude;
  const jitter = Math.cos(timeUnit * speed * 0.6) * (amplitude * 0.35);
  const value = baseValue + wave + jitter;
  return Number(Math.max(1.2, value).toFixed(2));
}

function maybeEvent(match, index, now) {
  const seed = Math.sin(now / 10000 + index * 2.3);
  const chance = (seed + 1) / 2;
  if (chance < 0.72) {
    return null;
  }

  const type = EVENT_TYPES[Math.floor(((seed + 1) / 2) * EVENT_TYPES.length) % EVENT_TYPES.length];
  return {
    type: type.type,
    label: `${type.label}: ${match.home} vs ${match.away}`,
    shift: type.shift,
  };
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
    const event = maybeEvent(match, index, now);

    const baseOdds = {
      home: drift(match.base.home, t + index * 1.1, speed, amp),
      draw: drift(match.base.draw, t + index * 0.8, speed * 0.9, amp * 0.7),
      away: drift(match.base.away, t + index * 1.4, speed * 1.1, amp),
    };

    const odds = event
      ? {
          home: Number(Math.max(1.2, baseOdds.home + event.shift.home).toFixed(2)),
          draw: Number(Math.max(1.2, baseOdds.draw + event.shift.draw).toFixed(2)),
          away: Number(Math.max(1.2, baseOdds.away + event.shift.away).toFixed(2)),
        }
      : baseOdds;

    return {
      id: match.id,
      home: match.home,
      away: match.away,
      odds,
      event,
    };
  });

  const activeEvents = matches.filter((m) => m.event).map((m) => `${m.event.label}`);
  const ticker = [
    `Live Market Sync ${new Date(now).toLocaleTimeString("de-DE")}`,
    `${matches[0].home} vs ${matches[0].away}: ${matches[0].odds.home}/${matches[0].odds.draw}/${matches[0].odds.away}`,
    `${matches[1].home} vs ${matches[1].away}: ${matches[1].odds.home}/${matches[1].odds.draw}/${matches[1].odds.away}`,
    ...(activeEvents.length ? activeEvents : ["No critical in-play event right now"]),
  ];

  return json(res, 200, {
    ok: true,
    ts: now,
    ticker,
    matches,
  });
}
