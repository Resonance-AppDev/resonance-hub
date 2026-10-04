import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { evaluateTransferGates } from "../verify-datanest-transfer-gates";

const manifest = readFileSync(
  "docs/consolidation/repository-transfer-manifest.yaml",
  "utf8",
);

function replaceOnce(source: string, from: string, to: string) {
  const next = source.replace(from, to);
  if (next === source) throw new Error(`Fixture replacement did not match: ${from}`);
  return next;
}

describe("DataNest transfer gate invariants", () => {
  test("current fail-closed manifest is valid while Hub main is unprotected", () => {
    expect(evaluateTransferGates(manifest, false)).toEqual([]);
  });

  test("blocks general or Mirror transfer while any pre-transfer hard stop is false", () => {
    const generalEnabled = replaceOnce(
      manifest,
      "any_transfer_allowed: false",
      "any_transfer_allowed: true",
    );
    const mirrorEnabled = replaceOnce(
      manifest,
      "mirror_transfer_allowed: false",
      "mirror_transfer_allowed: true",
    );

    expect(evaluateTransferGates(generalEnabled, false)[0]).toContain(
      "Transfer enabled before all pre-transfer hard stops cleared",
    );
    expect(evaluateTransferGates(mirrorEnabled, false)[0]).toContain(
      "Transfer enabled before all pre-transfer hard stops cleared",
    );
  });

  test("blocks canonical DataNest transfer until pre-transfer and canonical stops are true", () => {
    const canonicalEnabled = replaceOnce(
      manifest,
      "datanest_transfer_allowed: false",
      "datanest_transfer_allowed: true",
    );

    expect(evaluateTransferGates(canonicalEnabled, false).join("\n")).toContain(
      "Canonical DataNest transfer enabled before all required hard stops cleared",
    );
  });

  test("rejects a false claim that Hub main is protected", () => {
    const protectionClaimed = replaceOnce(
      manifest,
      "resonance_hub_main_protected: false",
      "resonance_hub_main_protected: true",
    );

    expect(evaluateTransferGates(protectionClaimed, false)).toContain(
      "Manifest claims resonance_hub_main_protected=true, but GitHub reports main protected=false.",
    );
  });

  test("reviews and checks cannot be verified before main protection", () => {
    const reviewsClaimed = replaceOnce(
      manifest,
      "resonance_hub_required_reviews_and_checks_verified: false",
      "resonance_hub_required_reviews_and_checks_verified: true",
    );

    expect(evaluateTransferGates(reviewsClaimed, false)).toContain(
      "Required reviews/checks cannot be verified while resonance_hub_main_protected is false.",
    );
  });
});
