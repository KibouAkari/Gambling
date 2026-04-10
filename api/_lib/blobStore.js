import { list, put } from "@vercel/blob";

const AUTH_NAMESPACE = process.env.AUTH_STORAGE_NAMESPACE || "mongo-casino-auth-storage";
const USER_PREFIX = `${AUTH_NAMESPACE}/users/users-`;
const SESSION_PREFIX = `${AUTH_NAMESPACE}/sessions/sessions-`;

async function readLatestJson(prefix) {
  let result;
  try {
    result = await list({ prefix, limit: 1000 });
  } catch (_error) {
    return {};
  }

  if (!result.blobs.length) {
    return {};
  }

  const latest = [...result.blobs].sort(
    (a, b) =>
      new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime() ||
      b.pathname.localeCompare(a.pathname),
  )[0];

  const response = await fetch(latest.url);
  if (!response.ok) {
    return {};
  }

  return response.json();
}

async function writeSnapshot(prefix, value) {
  const key = `${prefix}${Date.now()}.json`;
  await put(key, JSON.stringify(value), {
    access: "private",
    contentType: "application/json",
  });
}

export async function readUsers() {
  return readLatestJson(USER_PREFIX);
}

export async function writeUsers(nextUsers) {
  await writeSnapshot(USER_PREFIX, nextUsers);
}

export async function readSessions() {
  const current = await readLatestJson(SESSION_PREFIX);
  const now = Date.now();
  const cleaned = {};

  Object.entries(current).forEach(([token, item]) => {
    if (item && item.expiresAt && new Date(item.expiresAt).getTime() > now) {
      cleaned[token] = item;
    }
  });

  return cleaned;
}

export async function writeSessions(nextSessions) {
  await writeSnapshot(SESSION_PREFIX, nextSessions);
}
