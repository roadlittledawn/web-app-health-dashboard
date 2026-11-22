/**
 * Auth tests for lib/clang-auth.ts and lib/authenticate.ts.
 * Run with: npm run test:auth (from the repo root or web/).
 *
 * Uses a throwaway ES256 key pair instead of the real JWKS, so it needs no
 * auth service and no network.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { setJwksForTesting, isSameOrigin, readCookie } from "../../lib/clang-auth";
import { authenticate } from "../../lib/authenticate";

const ISS = "https://auth.example.test";
const settings = { authBaseUrl: ISS, appSlug: "health" };
const APP = "https://health.example.test";
const API_KEY = "test-key-123";
process.env.MCP_API_KEY_SHA256 = createHash("sha256").update(API_KEY).digest("hex");

let passed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

async function main() {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "ES256" };
  setJwksForTesting(createLocalJWKSet({ keys: [jwk] }));
  const other = await generateKeyPair("ES256");

  type Overrides = { apps?: Record<string, string[]>; iss?: string; exp?: number; kid?: string; key?: CryptoKey };
  const sign = (o: Overrides = {}) =>
    new SignJWT({ email: "Me@Example.test", name: "Me", apps: o.apps ?? { health: ["admin"] } })
      .setProtectedHeader({ alg: "ES256", kid: o.kid ?? "k1" })
      .setSubject("user-1")
      .setIssuer(o.iss ?? ISS)
      .setIssuedAt()
      .setExpirationTime(o.exp ?? Math.floor(Date.now() / 1000) + 900)
      .sign(o.key ?? privateKey);

  const host = new URL(APP).host;
  const event = (method: string, headers: Record<string, string> = {}) => ({
    httpMethod: method,
    rawUrl: `${APP}/api/incidents-query`,
    headers: { host, "x-forwarded-proto": "https", ...headers },
  });
  const status = async (e: ReturnType<typeof event>) => {
    const r = await authenticate(e, settings);
    return r.ok ? 200 : r.response.statusCode;
  };
  const cookie = (t: string) => ({ cookie: `other=1; ca_access=${t}` });

  await test("valid cookie, GET → ok, identity from claims", async () => {
    const r = await authenticate(event("GET", cookie(await sign())), settings);
    assert.ok(r.ok);
    assert.equal(r.principal.kind, "user");
    if (r.principal.kind === "user") {
      assert.equal(r.principal.identity.email, "me@example.test");
      assert.deepEqual(r.principal.identity.roles, ["admin"]);
    }
  });
  await test("grant with no roles still counts", async () =>
    assert.equal(await status(event("GET", cookie(await sign({ apps: { health: [] } })))), 200));
  await test("no credentials → 401", async () => assert.equal(await status(event("GET")), 401));
  await test("expired token → 401", async () =>
    assert.equal(await status(event("GET", cookie(await sign({ exp: Math.floor(Date.now() / 1000) - 120 })))), 401));
  await test("wrong issuer → 401", async () =>
    assert.equal(await status(event("GET", cookie(await sign({ iss: "https://evil.test" })))), 401));
  await test("signed by another key → 401", async () =>
    assert.equal(await status(event("GET", cookie(await sign({ key: other.privateKey })))), 401));
  await test("unknown kid → 401", async () =>
    assert.equal(await status(event("GET", cookie(await sign({ kid: "nope" })))), 401));
  await test("HS256 token → 401", async () => {
    const hs = await new SignJWT({ email: "a@b", apps: { health: ["admin"] } })
      .setProtectedHeader({ alg: "HS256", kid: "k1" })
      .setSubject("x")
      .setIssuer(ISS)
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("secret"));
    assert.equal(await status(event("GET", cookie(hs))), 401);
  });
  await test("no health grant → 403", async () =>
    assert.equal(await status(event("GET", cookie(await sign({ apps: { photos: ["admin"] } })))), 403));

  await test("cookie PATCH same origin → ok", async () =>
    assert.equal(await status(event("PATCH", { ...cookie(await sign()), origin: APP })), 200));
  await test("cookie PATCH via Referer only → ok", async () =>
    assert.equal(await status(event("PATCH", { ...cookie(await sign()), referer: `${APP}/incidents` })), 200));
  await test("cookie PATCH foreign origin → 403", async () =>
    assert.equal(
      await status(event("PATCH", { ...cookie(await sign()), origin: "https://evil.example.test" })),
      403,
    ));
  await test("cookie POST without Origin/Referer → 403", async () =>
    assert.equal(await status(event("POST", cookie(await sign()))), 403));

  const bearer = (k: string) => ({ authorization: `Bearer ${k}` });
  await test("API key GET → ok", async () => {
    const r = await authenticate(event("GET", bearer(API_KEY)), settings);
    assert.ok(r.ok && r.principal.kind === "api-key");
  });
  await test("API key PATCH without Origin → ok", async () =>
    assert.equal(await status(event("PATCH", bearer(API_KEY))), 200));
  await test("API key DELETE → 403", async () => assert.equal(await status(event("DELETE", bearer(API_KEY))), 403));
  await test("wrong API key → 401", async () => assert.equal(await status(event("GET", bearer("wrong"))), 401));
  await test("bearer JWT (old style) → 401, even with a valid cookie", async () =>
    assert.equal(await status(event("GET", { ...bearer(await sign()), ...cookie(await sign()) })), 401));
  await test("API key unconfigured → 401", async () => {
    const saved = process.env.MCP_API_KEY_SHA256;
    delete process.env.MCP_API_KEY_SHA256;
    try {
      assert.equal(await status(event("GET", bearer(API_KEY))), 401);
    } finally {
      process.env.MCP_API_KEY_SHA256 = saved;
    }
  });

  await test("helpers: readCookie, isSameOrigin", () => {
    assert.equal(readCookie("a=1; ca_access=xyz", "ca_access"), "xyz");
    assert.equal(readCookie("ca_access_old=1", "ca_access"), undefined);
    assert.equal(isSameOrigin(null, null, APP), false);
    assert.equal(isSameOrigin("null", null, APP), false);
    assert.equal(isSameOrigin(APP, null, APP), true);
  });

  console.log(`\n${passed} passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
