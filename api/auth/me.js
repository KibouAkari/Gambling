import {
  getTokenFromRequest,
  json,
  readBody,
  withCors,
} from "../_lib/authUtils.js";
import {
  readSessions,
  readUsers,
  writeUsers,
} from "../_lib/blobStore.js";

export default async function handler(req, res) {
  withCors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const token = getTokenFromRequest(req);
  if (!token) {
    return json(res, 401, { ok: false, message: "Nicht eingeloggt." });
  }

  const sessions = await readSessions();
  const currentSession = sessions[token];
  if (!currentSession) {
    return json(res, 401, { ok: false, message: "Session abgelaufen." });
  }

  const users = await readUsers();
  const user = users[currentSession.usernameKey];
  if (!user) {
    return json(res, 404, { ok: false, message: "User nicht gefunden." });
  }

  if (req.method === "GET") {
    return json(res, 200, {
      ok: true,
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

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, message: "Method not allowed" });
  }

  const payload = readBody(req);
  if (typeof payload.email === "string") {
    user.email = payload.email.trim();
  }
  if (typeof payload.bio === "string") {
    user.bio = payload.bio.trim();
  }
  if (typeof payload.profileImage === "string" && payload.profileImage.trim()) {
    user.profileImage = payload.profileImage.trim();
  }
  if (typeof payload.paymentMethod === "string") {
    user.paymentMethod = payload.paymentMethod.trim();
  }
  if (typeof payload.dateOfBirth === "string") {
    user.dateOfBirth = payload.dateOfBirth.trim();
  }
  if (typeof payload.coins === "number" && Number.isFinite(payload.coins)) {
    user.coins = Math.max(0, Math.floor(payload.coins));
  }

  users[currentSession.usernameKey] = user;
  await writeUsers(users);

  return json(res, 200, {
    ok: true,
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
