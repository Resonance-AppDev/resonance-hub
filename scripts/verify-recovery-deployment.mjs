import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Explicit target avoids accidentally certifying an unrelated/default deployment.
const target = process.argv[2];
assert.ok(target, "Usage: node scripts/verify-recovery-deployment.mjs <deployment-origin>");
const origin = new URL(target);
assert.ok(["https:", "http:"].includes(origin.protocol), "HTTP(S) target required");
assert.equal(origin.pathname, "/", "Use the deployment origin, without a path");
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash,
  "Target must not contain credentials, query parameters, or fragments");
const baseline = JSON.parse(readFileSync(new URL("../baselines/app-status.json", import.meta.url), "utf8"));
const evidence = { target: origin.origin, checkedAt: new Date().toISOString(), checks: [] };

async function check(path, validate) {
  try {
    const response = await fetch(new URL(path, origin), {
      redirect: "manual", signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, `${path}: expected unauthenticated HTTP 200`);
    await validate(response);
    evidence.checks.push({ path, passed: true });
  } catch (error) {
    evidence.checks.push({ path, passed: false, error: error.message });
  }
}

await check("/", async (response) => {
  assert.match(response.headers.get("content-type") || "", /text\/html/i);
  const html = await response.text();
  assert.match(html, /href=["']\/nova["'][^>]*>[\s\S]*?Open Nova Studio/i, "Nova CTA missing");
  assert.match(html, /href=["']#apps["'][^>]*>[\s\S]*?Start creating/i, "Apps CTA missing");
  assert.match(html, /id=["']updates["']/, "Latest Updates section missing");
  assert.match(html, /Latest updates/i);
});
await check("/content/updates.json", async (response) => {
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  const updates = await response.json();
  assert.ok(Array.isArray(updates) && updates.length > 0, "Updates must be a nonempty array");
  for (const entry of updates) {
    for (const field of ["app", "status", "change", "date", "href", "cta"]) {
      assert.ok(typeof entry[field] === "string" && entry[field].trim(), `Invalid update ${field}`);
    }
  }
});
await check("/api/public/app-status/health", async (response) => {
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.service, "reson8-app-status");
  assert.equal(payload.schemaVersion, baseline.schemaVersion);
  for (const group of ["apps", "ecosystem"]) {
    assert.ok(Array.isArray(payload[group]), `${group} must be an array`);
    // The September 19 snapshot predates Nova Studio in the pinned recovery source.
    const expectedKeys = baseline[group].map((entry) => entry.key);
    if (group === "ecosystem") expectedKeys.push("nova_studio");
    assert.deepEqual(payload[group].map((entry) => entry.key).sort(),
      expectedKeys.sort(), `${group} registry differs from recovery source`);
    assert.equal(payload.counts[group], payload[group].length);
  }
  assert.deepEqual(payload.legend.map((entry) => entry.status).sort(),
    baseline.legend.map((entry) => entry.status).sort());
});
evidence.passed = evidence.checks.every((check) => check.passed);
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = evidence.passed ? 0 : 1;
