import {
  createToken,
  getTokenFromRequest,
  hashPassword,
  json,
  readBody,
  withCors,
} from "../_lib/authUtils.js";
import {
  readSessions,
  readUsers,
  writeSessions,
} from "../_lib/blobStore.js";

export default async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "Method not allowed" });
  }

  const payload = readBody(req);
  const action = String(payload.action || "login");

  if (action === "logout") {
    const token = getTokenFromRequest(req);
    if (!token) {
      return json(res, 200, { ok: true });
    }

    const sessions = await readSessions();
    delete sessions[token];
    await writeSessions(sessions);
    return json(res, 200, { ok: true });
  }

  const usernameRaw = String(payload.username || "").trim();
  const passwordRaw = String(payload.password || "").trim();

  if (!usernameRaw || !passwordRaw) {
    return json(res, 400, { ok: false, message: "Bitte Username und Passwort eingeben." });
  }

  const users = await readUsers();
  const usernameKey = usernameRaw.toLowerCase();
  const user = users[usernameKey];

  if (!user || user.passwordHash !== hashPassword(passwordRaw)) {
    return json(res, 401, { ok: false, message: "Login fehlgeschlagen. Bitte Daten prüfen." });
  }

  const sessions = await readSessions();
  const token = createToken();
  sessions[token] = {
    usernameKey,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  await writeSessions(sessions);

  return json(res, 200, {
    ok: true,
    token,
    user: {
      username: user.username,
      email: user.email,
      bio: user.bio,
      paymentMethod: user.paymentMethod || "",
      dateOfBirth: user.dateOfBirth || "",
      profileImage: user.profileImage,
      coins: user.coins,
    },
  });
}
