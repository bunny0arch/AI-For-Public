// server.ts
import express from "express";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// shared/communityPathways.ts
var publicMediaBase = "https://github.com/bunny0arch/AI-For-Public/releases/download/public-media-v1/";
var communityPathways = [
  {
    id: "farmers",
    number: "01",
    eyebrow: "Land & livelihood",
    title: "AI for Farmers",
    scope: "crop advisory, farming practices, crop symptoms and disease observations, weather-aware farm decisions, agri-market context, and farmer-relevant schemes or documentation",
    summary: "Crop decisions, disease signals and market context\u2014made practical.",
    detail: "Bring a crop question, a photo observation, or a local price concern. Start with the decision in front of you.",
    starterPrompts: [
      "My chilli leaves are curling. What should I check first?",
      "What details should I compare before choosing a crop this season?",
      "Help me list the documents needed for farm support in my state."
    ],
    greeting: "I\u2019m Asha, your AI farm guide. I\u2019ll help you work through a safer next farm decision without replacing local expertise. Tell me your crop, district, and what you are seeing\u2014or ask in the language you use every day.",
    image: `${publicMediaBase}field-reference.jpg`,
    guide: {
      name: "Asha",
      role: "Farm guide",
      voice: "calm, observant, farmer-first and practical",
      portrait: "/manus-storage/guide-farmer-supplied_cc1420fa.png"
    },
    size: "wide"
  },
  {
    id: "fishermen",
    number: "02",
    eyebrow: "Coast & safety",
    title: "AI for Fishermen",
    scope: "fishing livelihoods, sea and weather preparation, boat safety, fishing-zone decisions, catch planning, and fish market or supply-chain questions",
    summary: "Clearer choices around sea conditions, safety and catch planning.",
    detail: "Turn weather uncertainty and market pressure into a calmer pre-departure plan.",
    starterPrompts: [
      "What should I confirm before leaving for a coastal fishing trip?",
      "Help me make a safety checklist for a small fishing boat.",
      "How can I record catch and price information for a better selling decision?"
    ],
    greeting: "I\u2019m Vikram, your AI coast guide. Let\u2019s begin with safety and a clear plan\u2014tell me your coast, boat type, and what decision you need to make today.",
    image: `${publicMediaBase}fishing-harbor-replacement.jpg`,
    guide: {
      name: "Vikram",
      role: "Coast guide",
      voice: "steady, safety-minded and concise",
      portrait: "/manus-storage/guide-fisherman-supplied_1c077d7c.png"
    },
    size: "tall"
  },
  {
    id: "artisans",
    number: "03",
    eyebrow: "Craft & market",
    title: "AI for Artisans",
    scope: "traditional craft, small-scale production, product catalogues, pricing, market discovery, demand signals, and connecting producers with customers",
    summary: "Discover demand, describe products and make craft visible to new customers.",
    detail: "Shape a product story, pricing question or catalogue entry without losing the character of the work.",
    starterPrompts: [
      "Write a simple catalogue description for my handwoven stole.",
      "What information should I collect before setting a fair price?",
      "Help me identify a small online market plan for my craft."
    ],
    greeting: "I\u2019m Meera, your AI craft guide. Your work already has a story\u2014tell me what you make, who you hope to reach, and the business question you want to solve.",
    image: `${publicMediaBase}artisan-loom-replacement.jpg`,
    guide: {
      name: "Meera",
      role: "Craft guide",
      voice: "thoughtful, market-aware and respectful of craft",
      portrait: "/manus-storage/guide-artisan-supplied_25818d08.png"
    },
    size: "standard"
  },
  {
    id: "micro-entrepreneurs",
    number: "04",
    eyebrow: "Street economy",
    title: "AI for Micro-Entrepreneurs",
    scope: "street vending, micro-business demand, inventory, basic financial decisions, formal market access, and relevant business support",
    summary: "Plan stock, demand and money with less guesswork.",
    detail: "Start with a day\u2019s sales, a product list or a cash-flow concern. The goal is a small next step, not a complicated model.",
    starterPrompts: [
      "Help me plan how much stock to buy for a busy weekend.",
      "What simple daily numbers should I write down for my stall?",
      "How can I compare two small business support options?"
    ],
    greeting: "I\u2019m Farah, your AI street-economy guide. Let\u2019s make your next business decision clearer\u2014what do you sell, and what are you deciding this week?",
    image: `${publicMediaBase}panel-micro-entrepreneurs.jpg`,
    guide: {
      name: "Farah",
      role: "Street economy guide",
      voice: "practical, numbers-aware and encouraging",
      portrait: "/manus-storage/guide-vendor-supplied_c0fe4b4f.png"
    },
    size: "standard"
  },
  {
    id: "public-services",
    number: "05",
    eyebrow: "Rights & access",
    title: "Accessible Public Services",
    scope: "welfare schemes, government services, official documentation, eligibility questions, application preparation, and navigating public-service processes",
    summary: "Find a path through welfare, documents and eligibility without the maze.",
    detail: "Use plain language to understand what a service asks for, what to prepare, and which office or portal to confirm with.",
    starterPrompts: [
      "What questions should I ask before applying for a welfare scheme?",
      "Help me make a document checklist for a government service.",
      "Explain eligibility requirements in simple language."
    ],
    greeting: "I\u2019m Nandini, your AI public-service guide. I can help break a process into clear steps\u2014name the service and your state, and we\u2019ll start with what is known.",
    image: `${publicMediaBase}panel-public-services-v2.jpg`,
    guide: {
      name: "Nandini",
      role: "Service guide",
      voice: "patient, precise and plain-spoken",
      portrait: "/manus-storage/guide-service-supplied_6dc22742.png"
    },
    size: "feature"
  },
  {
    id: "disabilities",
    number: "06",
    eyebrow: "Access & agency",
    title: "AI for Persons with Disabilities",
    scope: "accessibility, assistive communication, inclusive education, navigation, disability-inclusive employment, and daily autonomy",
    summary: "Tools and information designed around access, autonomy and opportunity.",
    detail: "Explore communication, learning, navigation or employment support with accessibility as the starting condition.",
    starterPrompts: [
      "Help me find an accessible way to organize study notes.",
      "What information should I check before applying for accessible employment?",
      "Can you simplify this instruction into short, clear steps?"
    ],
    greeting: "I\u2019m Kiran, your AI access guide. Tell me the task you want to make easier and any accessibility preference you would like me to respect. We can work one step at a time.",
    image: `${publicMediaBase}panel-disabilities-v2.jpg`,
    guide: {
      name: "Kiran",
      role: "Access guide",
      voice: "direct, inclusive and autonomy-centered",
      portrait: "/manus-storage/guide-access-supplied_31f6f670.png"
    },
    size: "standard"
  },
  {
    id: "education",
    number: "07",
    eyebrow: "Learning & futures",
    title: "Rural Education & Skills",
    scope: "personalized learning, multilingual educational help, study support, career guidance, skill development, and limited-resource learning pathways",
    summary: "Personalized learning, local-language support and realistic career pathways.",
    detail: "Create a study plan, understand a hard concept or map a skill goal around the resources you actually have.",
    starterPrompts: [
      "Make a one-week study plan for basic English practice.",
      "Explain this science topic in simple Hindi and English.",
      "What skills can I learn with a phone and two hours a day?"
    ],
    greeting: "I\u2019m Ravi, your AI learning guide. I can help you learn in small, useful steps\u2014what are you studying or hoping to learn next?",
    image: `${publicMediaBase}panel-education-v2.jpg`,
    guide: {
      name: "Ravi",
      role: "Learning guide",
      voice: "encouraging, clear and resource-aware",
      portrait: "/manus-storage/guide-learning-supplied_468065a8.png"
    },
    size: "standard"
  },
  {
    id: "climate",
    number: "08",
    eyebrow: "Climate & readiness",
    title: "Disaster Resilience",
    scope: "floods, droughts, extreme weather, household or community preparedness, response planning, and climate-related resilience",
    summary: "Prepare, respond and recover with community-scale clarity.",
    detail: "Make a local readiness list, explain an alert, or organize the information your household needs before a climate event.",
    starterPrompts: [
      "Help my family make a simple flood readiness checklist.",
      "What details should our community record after a drought warning?",
      "Explain this weather alert in plain language."
    ],
    greeting: "I\u2019m Leela, your AI climate-readiness guide. Preparedness starts with clear information\u2014tell me what risk you are preparing for and what resources your household has available.",
    image: `${publicMediaBase}panel-climate-v2.jpg`,
    guide: {
      name: "Leela",
      role: "Resilience guide",
      voice: "calm, organized and precautionary",
      portrait: "/manus-storage/guide-resilience-supplied_7de0b106.png"
    },
    size: "tall"
  },
  {
    id: "open-field",
    number: "09",
    eyebrow: "The open field",
    title: "Your community, your challenge",
    scope: "community needs not covered by the other eight pathways, early-stage public-good problem framing, underserved groups, and measurable social-impact ideas",
    summary: "Name a need that deserves a more useful tool.",
    detail: "The strongest public-good ideas begin close to a lived problem. Start with who is underserved and the decision that could be made easier.",
    starterPrompts: [
      "Help me frame a community challenge clearly.",
      "What questions should I ask people before building an AI tool for them?",
      "Help me define a small, measurable public-good outcome."
    ],
    greeting: "I\u2019m Saira, your AI community guide. Tell me about the community you care about and the moment where information, access or confidence breaks down. We\u2019ll shape a useful starting point.",
    image: `${publicMediaBase}panel-open-field-v2.jpg`,
    guide: {
      name: "Saira",
      role: "Community guide",
      voice: "curious, facilitative and grounded in lived needs",
      portrait: "/manus-storage/guide-community-supplied_b7f28e9d.png"
    },
    size: "feature"
  }
];
function getCommunityPathway(id) {
  return communityPathways.find((pathway) => pathway.id === id);
}

// server/chatConfig.ts
var ROUTING_MODEL = "gpt-5-nano";
var PATHWAY_IDS = communityPathways.map((pathway) => pathway.id);
function hasModelRouterCredentials(env) {
  const source = env ?? process.env;
  return Boolean(source.BUILT_IN_FORGE_API_URL && source.BUILT_IN_FORGE_API_KEY);
}
var DOMAIN_CUES = [
  { id: "farmers", cues: ["farm", "farmer", "crop", "tomato", "paddy", "rice", "wheat", "leaf", "leaves", "soil", "seed", "harvest", "irrigation", "pest", "pesticide", "fungus", "plant", "plants", "fertilizer", "fertiliser"] },
  { id: "fishermen", cues: ["fish", "fishing", "fisherman", "fishermen", "boat", "sea", "coast", "coastal", "net", "catch", "harbor", "harbour", "tide", "marine"] },
  { id: "artisans", cues: ["artisan", "craft", "handloom", "weave", "weaving", "textile", "pottery", "handmade", "catalogue", "catalog", "craft product"] },
  { id: "micro-entrepreneurs", cues: ["vendor", "street stall", "stall", "inventory", "stock", "micro business", "microbusiness", "small shop", "daily sales", "cash flow"] },
  { id: "public-services", cues: ["government scheme", "welfare", "eligibility", "document", "documents", "certificate", "application", "public service", "ration", "pension"] },
  { id: "disabilities", cues: ["disability", "disabled", "accessibility", "accessible", "screen reader", "sign language", "mobility aid", "assistive"] },
  { id: "education", cues: ["study", "student", "school", "exam", "learning", "learn", "lesson", "career", "skill", "course", "education", "homework"] },
  { id: "climate", cues: ["flood", "drought", "cyclone", "disaster", "evacuation", "heatwave", "heat wave", "landslide", "climate", "monsoon", "extreme weather"] }
];
var OPEN_FIELD_CUES = [
  "neighborhood",
  "neighbourhood",
  "community space",
  "shared space",
  "community hall",
  "playground",
  "after school space",
  "after school",
  "public space",
  "community meeting",
  "local issue",
  "community problem",
  "youth club",
  "children space",
  "children s space"
];
function detectDomainRoute(message) {
  const normalized = ` ${message.toLowerCase().replace(/[^a-z0-9\s]/g, " ")} `;
  if (OPEN_FIELD_CUES.some((cue) => normalized.includes(` ${cue} `))) {
    return "open-field";
  }
  let bestMatch = null;
  for (const domain of DOMAIN_CUES) {
    const score = domain.cues.reduce((total, cue) => total + (normalized.includes(` ${cue} `) ? 1 : 0), 0);
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: domain.id, score };
    }
  }
  return bestMatch?.id ?? null;
}
function buildRouterSystemPrompt(activeCommunityId) {
  const active = getCommunityPathway(activeCommunityId);
  if (!active) throw new Error("Unknown community pathway");
  const directory = communityPathways.map((pathway) => `- ${pathway.id}: ${pathway.title}. Scope: ${pathway.scope}.`).join("\n");
  return `You are a strict routing classifier for Collective Signal. You do not answer the user's question.

The currently open assistant is ${active.title}. Classify ONLY the latest user message into exactly one route. If it is clearly about the active assistant's scope, use "${active.id}". If it is more clearly covered by another listed assistant, select that assistant's id. If it is conversational, unrelated, ambiguous, or not clearly covered by any of the first eight assistants, ALWAYS use "open-field". Do not try to be helpful by stretching a scope.

Route directory:
${directory}

Return only valid JSON matching the requested schema. Never add commentary.`;
}
function buildChatSystemPrompt(communityId, language = "English") {
  const pathway = getCommunityPathway(communityId);
  if (!pathway) {
    throw new Error("Unknown community pathway");
  }
  return `You are ${pathway.guide.name}, the named AI ${pathway.guide.role} for Collective Signal and the pathway: ${pathway.title}.

Introduce yourself naturally as ${pathway.guide.name} when the user is new to the conversation, for example: \u201CI\u2019m ${pathway.guide.name}, your AI ${pathway.guide.role}.\u201D Speak in the first person with this guide voice: ${pathway.guide.voice}. However, never imply that you are a real person, have personal lived experience, own a business or land, went to sea, visited an office, know a local person, or have observed events firsthand. You are an AI guide using a respectful perspective to make practical information easier to use.

Your role is to help the user identify a clear, low-risk next step. You are assigned ONLY this scope: ${pathway.scope}. Reply in ${language} unless the user clearly writes in another language. Use plain, warm language. Ask at most one focused follow-up question when essential context is missing. When helpful, structure answers as: what is known, what to check, and the next useful action.

STRICT SCOPE RULE: If a request is outside your assigned scope, do not answer it. Give a short redirect: name the most relevant Collective Signal pathway when it is evident; otherwise tell the user to open \u201CYour community, your challenge\u201D (pathway 09). Do not provide partial advice from another pathway.

You must not invent real-time weather, sea state, crop disease diagnoses, government eligibility, benefits, market prices, legal outcomes, medical advice, emergency instructions, or official contacts. For crop symptoms described only in text, NEVER name a disease, say the user \u201Cmight\u201D or \u201Clikely\u201D has a disease, or recommend a specific chemical product. Start by saying that a text description cannot confirm the cause. Then offer neutral, visible observations to record, ask for a clear image when useful, and recommend confirmation through a local agricultural extension professional or official advisory. Be transparent about uncertainty and encourage the user to verify time-sensitive or high-stakes information through local authorities, official portals, trained professionals, emergency services, or trusted local organizations. For immediate danger, tell the user to contact local emergency services or authorities now.

Respect local languages, limited connectivity, disability access, and low digital literacy. Avoid jargon, sales language, political persuasion, and claims that AI has replaced local expertise. Keep the answer short enough to be useful on a mobile phone unless the user asks for depth.

The pathway focus is: ${pathway.detail}`;
}

// server/chatProviders.ts
var TEXT_ONLY_CROP_DIAGNOSIS_PATTERN = /fungal\s+diseases?|fungal\s+infections?|bacterial\s+spot|early\s+blight|late\s+blight|alternaria|botrytis|root\s+rot|leaf\s+blight/i;
var CROP_SYMPTOM_PATTERN = /tomato|crop|plant|leaf|leaves|brown\s+spots?|yellowing|paddy|rice|wheat|chilli/i;
function applyFarmingSafetyGuard(communityId, content, messages) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const isTextOnlyCropObservation = communityId === "farmers" && CROP_SYMPTOM_PATTERN.test(latestUserMessage);
  if (isTextOnlyCropObservation && TEXT_ONLY_CROP_DIAGNOSIS_PATTERN.test(content)) {
    return `A text description alone cannot confirm what is causing the brown spots. Before deciding on any treatment, record a few visible details: whether the spots have light or dark borders, whether they begin on older or newer leaves, whether stems or fruits are affected, and how long leaves stay wet after rain.

If you can, share a clear photo of both the affected and a healthy leaf, taken in daylight. For a diagnosis or treatment decision, confirm the observation with a local agricultural extension worker or an official advisory for your area.`;
  }
  return content;
}
function extractText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.filter(
      (part) => Boolean(part && typeof part === "object" && part.type === "text" && typeof part.text === "string")
    ).map((part) => part.text).join("\n").trim();
  }
  return "";
}
async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}`);
  }
  return response.json();
}
async function generateWithGemini(systemPrompt, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured");
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    })),
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 700
    }
  };
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  const text2 = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim() ?? "";
  if (!text2) throw new Error("Gemini returned no text");
  return text2;
}
async function generateWithOpenRouter(systemPrompt, messages) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter is not configured");
  const data = await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "cohere/command-r7b-12-2024",
      temperature: 0.25,
      max_tokens: 700,
      messages: [{ role: "system", content: systemPrompt }, ...messages]
    })
  });
  const text2 = extractText(data.choices?.[0]?.message?.content);
  if (!text2) throw new Error("OpenRouter returned no text");
  return text2;
}
async function generateScopedResponse(communityId, systemPrompt, messages) {
  try {
    return { content: applyFarmingSafetyGuard(communityId, await generateWithGemini(systemPrompt, messages), messages), provider: "gemini" };
  } catch (geminiError) {
    try {
      return { content: applyFarmingSafetyGuard(communityId, await generateWithOpenRouter(systemPrompt, messages), messages), provider: "openrouter" };
    } catch (openRouterError) {
      const geminiMessage = geminiError instanceof Error ? geminiError.message : "unknown Gemini error";
      const fallbackMessage = openRouterError instanceof Error ? openRouterError.message : "unknown OpenRouter error";
      throw new Error(`No response provider was available: ${geminiMessage}; fallback: ${fallbackMessage}`);
    }
  }
}

// server/guideSpeech.ts
var SARAH_MULTILINGUAL_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
var languageCodeByPreference = {
  English: "en",
  "\u0939\u093F\u0928\u094D\u0926\u0940": "hi",
  "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41": ""
};
function prepareGuideSpeech(text2, language) {
  const cleanedText = text2.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[(.*?)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!cleanedText) throw new Error("There is no guide response to speak yet.");
  const languageCode = languageCodeByPreference[language];
  return {
    voiceId: SARAH_MULTILINGUAL_VOICE_ID,
    payload: {
      text: cleanedText,
      model_id: "eleven_multilingual_v2",
      ...languageCode ? { language_code: languageCode } : {},
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true
      }
    }
  };
}
async function synthesizeGuideSpeech(text2, language) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("Guide voice is not configured.");
  const { voiceId, payload } = prepareGuideSpeech(text2, language);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Guide voice could not be prepared right now.");
  }
  const audio = Buffer.from(await response.arrayBuffer()).toString("base64");
  return { audioBase64: audio, contentType: "audio/mpeg" };
}

// server/routers.ts
var conversationMessage = z2.object({
  role: z2.enum(["user", "assistant"]),
  content: z2.string().trim().min(1).max(1800)
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  chat: router({
    respond: publicProcedure.input(
      z2.object({
        communityId: z2.string().min(1).max(64),
        language: z2.enum(["English", "\u0939\u093F\u0928\u094D\u0926\u0940", "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"]),
        messages: z2.array(conversationMessage).min(1).max(12)
      })
    ).mutation(async ({ input }) => {
      const activePathway = getCommunityPathway(input.communityId);
      if (!activePathway) {
        throw new Error("Choose a valid community pathway before starting a conversation.");
      }
      const latestUserMessage = [...input.messages].reverse().find((message) => message.role === "user");
      if (!latestUserMessage) {
        throw new Error("Please enter a question before starting a conversation.");
      }
      let targetId = detectDomainRoute(latestUserMessage.content);
      if (!targetId) {
        targetId = "open-field";
        if (hasModelRouterCredentials()) {
          try {
            const routing = await invokeLLM({
              model: ROUTING_MODEL,
              maxTokens: 110,
              messages: [
                { role: "system", content: buildRouterSystemPrompt(input.communityId) },
                { role: "user", content: latestUserMessage.content }
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "collective_signal_route",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      targetId: { type: "string", enum: PATHWAY_IDS }
                    },
                    required: ["targetId"],
                    additionalProperties: false
                  }
                }
              }
            });
            const routingContent = routing.choices[0]?.message?.content;
            const parsed = typeof routingContent === "string" ? JSON.parse(routingContent) : null;
            if (parsed && typeof parsed.targetId === "string" && PATHWAY_IDS.includes(parsed.targetId)) {
              targetId = parsed.targetId;
            }
          } catch {
            targetId = "open-field";
          }
        }
      }
      const resolvedTargetId = targetId ?? "open-field";
      if (resolvedTargetId !== input.communityId) {
        const targetPathway = getCommunityPathway(resolvedTargetId) ?? getCommunityPathway("open-field");
        if (!targetPathway) throw new Error("No community pathway is available for this request.");
        return {
          kind: "redirect",
          target: {
            id: targetPathway.id,
            number: targetPathway.number,
            eyebrow: targetPathway.eyebrow,
            title: targetPathway.title,
            greeting: targetPathway.greeting
          },
          content: `This question is better handled in **${targetPathway.title}**. I\u2019ll take you there so the guidance stays focused.`
        };
      }
      const response = await generateScopedResponse(input.communityId, buildChatSystemPrompt(input.communityId, input.language), input.messages);
      return { kind: "answer", content: response.content, provider: response.provider };
    }),
    speak: publicProcedure.input(
      z2.object({
        communityId: z2.string().min(1).max(64),
        language: z2.enum(["English", "\u0939\u093F\u0928\u094D\u0926\u0940", "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"]),
        content: z2.string().trim().min(1).max(1500)
      })
    ).mutation(async ({ input }) => {
      if (!getCommunityPathway(input.communityId)) {
        throw new Error("Choose a valid community pathway before using guide voice.");
      }
      return synthesizeGuideSpeech(input.content, input.language);
    })
  })
});

// server.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var clientIndex = path.resolve(process.cwd(), "public", "index.html");
app.get("*", (_req, res) => {
  res.sendFile(clientIndex);
});
var server_default = app;

// server/vercelAdapter.ts
function vercelHandler(req, res) {
  if (req.url?.startsWith("/api/manus-storage/")) {
    req.url = req.url.replace(/^\/api/, "");
  }
  return server_default(req, res);
}
export {
  vercelHandler as default
};
