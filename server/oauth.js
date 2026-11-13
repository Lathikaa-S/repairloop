import crypto from "node:crypto";
import { HttpError, safeEqual, signToken } from "./security.js";
// One-time OAuth state binds the callback to this browser; tokens stay server-side.
export function mountOAuth(
  app,
  { store, cache, secret, origin, cookieOptions },
) {
  app.get("/api/auth/google", async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      throw new HttpError(503, "Google login is not configured");
    const state = crypto.randomBytes(32).toString("hex");
    await cache.set(`oauth:${state}`, "pending", 600);
    res.cookie("oauth_state", state, { ...cookieOptions, maxAge: 600000 });
    const q = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: `${origin}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  });
  app.get("/api/auth/google/callback", async (req, res) => {
    const { state, code } = req.query;
    if (
      typeof state !== "string" ||
      typeof code !== "string" ||
      !safeEqual(state, req.cookies.oauth_state) ||
      !(await cache.get(`oauth:${state}`))
    )
      throw new HttpError(400, "Invalid or expired OAuth state");
    await cache.del(`oauth:${state}`);
    res.clearCookie("oauth_state", cookieOptions);
    const token = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!token.ok) throw new HttpError(502, "Google login failed");
    const tokens = await token.json();
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw new HttpError(502, "Could not verify Google profile");
    const profile = await response.json();
    if (!profile.email_verified || !profile.sub || !profile.email)
      throw new HttpError(403, "A verified Google email is required");
    let user = await store.googleUser(profile.sub);
    if (!user) {
      if (await store.usersByEmail(profile.email.toLowerCase()))
        throw new HttpError(
          409,
          "This email already uses password login. Sign in with your password.",
        );
      user = await store.createUser({
        googleId: profile.sub,
        email: profile.email.toLowerCase(),
        name: profile.name || "RepairLoop member",
      });
    }
    res.cookie("session", signToken(user, secret), cookieOptions);
    res.redirect("/dashboard");
  });
}
