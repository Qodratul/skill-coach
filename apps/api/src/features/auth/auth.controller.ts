import type { Request, Response } from "express";
import { env } from "../../config.js";
import {
  loginAccount,
  registerAccount,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./auth.service.js";

const REFRESH_COOKIE = "skill_coach_refresh";
const cookieBase = [
  `${REFRESH_COOKIE}=`,
  "Path=/auth",
  "HttpOnly",
].join("; ");

function setRefreshCookie(res: Response, refreshToken: string | null) {
  const secure =
    env.NODE_ENV === "production" || new URL(env.FRONTEND_URL).protocol === "https:";
  const sameSite = secure ? "None" : "Lax";
  const value = refreshToken ? encodeURIComponent(refreshToken) : "";
  const maxAge = refreshToken ? 7 * 24 * 60 * 60 : 0;
  const cookie = `${cookieBase}${value}; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  res.append("Set-Cookie", cookie);
}

function getRefreshCookie(req: Request) {
  const cookieHeader = req.header("cookie");
  const entry = cookieHeader
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${REFRESH_COOKIE}=`));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice(REFRESH_COOKIE.length + 1)) || undefined;
  } catch {
    return undefined;
  }
}

export async function registerController(req: Request, res: Response) {
  const { refreshToken, ...result } = await registerAccount(req.body);
  setRefreshCookie(res, refreshToken);
  res.setHeader("Cache-Control", "no-store");
  res.locals.ok(result, 201);
}

export async function loginController(req: Request, res: Response) {
  const result = await loginAccount(req.body.email, req.body.password);
  if (!result)
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Email atau kata sandi salah." },
    });
  setRefreshCookie(res, result.refreshToken);
  res.setHeader("Cache-Control", "no-store");
  const { refreshToken: _refreshToken, ...response } = result;
  res.locals.ok(response);
}

export async function refreshController(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const result = await rotateRefreshToken(getRefreshCookie(req) || "");
  if (!result) {
    setRefreshCookie(res, null);
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_REFRESH_TOKEN", message: "Silakan masuk kembali." },
    });
  }
  setRefreshCookie(res, result.refreshToken);
  res.locals.ok({ accessToken: result.accessToken });
}

export async function logoutController(req: Request, res: Response) {
  await revokeRefreshToken(getRefreshCookie(req));
  setRefreshCookie(res, null);
  res.setHeader("Cache-Control", "no-store");
  res.locals.ok({ loggedOut: true });
}
