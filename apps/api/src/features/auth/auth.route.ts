import type { Express } from "express";
import { Router } from "express";
import { authLimit, body, handle, requireFrontendOrigin } from "../../app.js";
import { z } from "zod";
import {
  loginController,
  logoutController,
  refreshController,
  registerController,
} from "./auth.controller.js";

export function registerRoutes(app: Express) {
  const router = Router();
  router.post(
    "/auth/register",
    authLimit,
    requireFrontendOrigin,
    body(
      z.object({
        email: z.string().email().max(255),
        username: z
          .string()
          .min(3)
          .max(50)
          .regex(/^[a-zA-Z0-9_]+$/),
        password: z.string().min(10).max(128),
        displayName: z.string().min(1).max(100),
      }),
    ),
    handle(registerController),
  );
  router.post(
    "/auth/login",
    authLimit,
    requireFrontendOrigin,
    body(z.object({ email: z.string().email(), password: z.string() })),
    handle(loginController),
  );
  router.post(
    "/auth/refresh",
    authLimit,
    requireFrontendOrigin,
    handle(refreshController),
  );
  router.post(
    "/auth/logout",
    authLimit,
    requireFrontendOrigin,
    handle(logoutController),
  );
  app.use(router);
}
