import {
  createToken,
  hashPassword,
  json,
  readBody,
  withCors,
} from "../_lib/authUtils.js";
import {
  readSessions,
  readUsers,
  writeSessions,
  writeUsers,
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
  const usernameRaw = String(payload.username || "").trim();
  const emailRaw = String(payload.email || "").trim();
  const passwordRaw = String(payload.password || "").trim();
  const dateOfBirthRaw = String(payload.dateOfBirth || "").trim();
  const promoCodeRaw = String(payload.promoCode || "").trim();

  if (!usernameRaw || !emailRaw || !passwordRaw) {
    return json(res, 400, { ok: false, message: "Bitte alle Felder ausfüllen." });
  }

  if (passwordRaw.length < 6) {
    return json(res, 400, { ok: false, message: "Passwort muss mindestens 6 Zeichen haben." });
  }

  const usernameKey = usernameRaw.toLowerCase();
  const users = await readUsers();

  if (users[usernameKey]) {
    return json(res, 409, { ok: false, message: "Username bereits vergeben." });
  }

  users[usernameKey] = {
    username: usernameRaw,
    email: emailRaw,
    passwordHash: hashPassword(passwordRaw),
    profileImage:
      "https://static.vecteezy.com/system/resources/previews/023/465/688/non_2x/contact-dark-mode-glyph-ui-icon-address-book-profile-page-user-interface-design-white-silhouette-symbol-on-black-space-solid-pictogram-for-web-mobile-isolated-illustration-vector.jpg",
    bio: "",
    paymentMethod: "",
    dateOfBirth: dateOfBirthRaw,
    promoCode: promoCodeRaw,
    coins: 1000,
    createdAt: new Date().toISOString(),
  };

  await writeUsers(users);

  const sessions = await readSessions();
  const token = createToken();
  sessions[token] = {
    usernameKey,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  await writeSessions(sessions);

  const user = users[usernameKey];
  return json(res, 200, {
    ok: true,
    token,
    user: {
      username: user.username,
      email: user.email,
      bio: user.bio,
      paymentMethod: user.paymentMethod,
      dateOfBirth: user.dateOfBirth,
      profileImage: user.profileImage,
      coins: user.coins,
    },
  });
}
