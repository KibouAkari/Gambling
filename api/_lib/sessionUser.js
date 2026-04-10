import { getTokenFromRequest, json } from "./authUtils.js";
import { readSessions, readUsers, writeUsers } from "./blobStore.js";

export async function requireSessionUser(req, res) {
  const token = getTokenFromRequest(req);
  if (!token) {
    json(res, 401, { ok: false, message: "Nicht eingeloggt." });
    return null;
  }

  const sessions = await readSessions();
  const session = sessions[token];
  if (!session) {
    json(res, 401, { ok: false, message: "Session abgelaufen." });
    return null;
  }

  const users = await readUsers();
  const user = users[session.usernameKey];
  if (!user) {
    json(res, 404, { ok: false, message: "User nicht gefunden." });
    return null;
  }

  return { token, sessions, users, user, usernameKey: session.usernameKey };
}

export async function saveUserRecord(users, usernameKey, user) {
  users[usernameKey] = user;
  await writeUsers(users);
}
