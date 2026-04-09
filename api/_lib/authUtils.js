import crypto from "node:crypto";

export function json(res, status, body) {
  res.status(status).json(body);
}

export function readBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_error) {
      return {};
    }
  }

  return req.body || {};
}

export function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.headers["x-session-token"] || "";
}

export function withCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-token");
}
