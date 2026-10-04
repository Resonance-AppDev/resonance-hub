import { readFile } from "node:fs/promises";

const MANIFEST_PATH = "docs/consolidation/repository-transfer-manifest.yaml";

const PRE_TRANSFER_HARD_STOPS = [
  "source_admin_access_restored",
  "complete_source_inventory_with_exact_head_shas",
  "authority_domains_classified_for_all_source_repositories",
  "deployment_and_configuration_dependencies_captured",
  "rollback_checkpoints_captured",
  "backup_and_ref_evidence_captured",
  "target_names_and_transfer_permissions_verified",
  "pages_domains_actions_environments_integrations_mapped",
  "open_pr_issue_review_state_inventoried",
  "resonance_hub_main_protected",
  "resonance_hub_required_reviews_and_checks_verified",
] as const;

const CANONICAL_TRANSFER_HARD_STOPS = [
  "mirror_rehearsal_completed",
  "mirror_post_transfer_validation_passed",
  "datanest_open_governance_reconciled",
  "datanest_live_head_refs_reverified",
] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function readManifestBoolean(manifest: string, key: string): boolean {
  const pattern = new RegExp(
    `^\\s*${escapeRegex(key)}\\s*:\\s*(true|false)\\s*(?:#.*)?$`,
    "m",
  );
  const match = manifest.match(pattern);
  if (!match) throw new Error(`Missing boolean manifest key: ${key}`);
  return match[1] === "true";
}

export function evaluateTransferGates(
  manifest: string,
  observedMainProtected: boolean | null,
): string[] {
  const errors: string[] = [];

  const anyTransferAllowed = readManifestBoolean(manifest, "any_transfer_allowed");
  const mirrorTransferAllowed = readManifestBoolean(manifest, "mirror_transfer_allowed");
  const datanestTransferAllowed = readManifestBoolean(manifest, "datanest_transfer_allowed");

  const preTransferStates = PRE_TRANSFER_HARD_STOPS.map((key) => [
    key,
    readManifestBoolean(manifest, key),
  ] as const);
  const canonicalStates = CANONICAL_TRANSFER_HARD_STOPS.map((key) => [
    key,
    readManifestBoolean(manifest, key),
  ] as const);

  const failedPreTransfer = preTransferStates.filter(([, value]) => !value).map(([key]) => key);
  const failedCanonical = canonicalStates.filter(([, value]) => !value).map(([key]) => key);

  if ((anyTransferAllowed || mirrorTransferAllowed) && failedPreTransfer.length > 0) {
    errors.push(
      `Transfer enabled before all pre-transfer hard stops cleared: ${failedPreTransfer.join(", ")}`,
    );
  }

  if (datanestTransferAllowed && (failedPreTransfer.length > 0 || failedCanonical.length > 0)) {
    errors.push(
      `Canonical DataNest transfer enabled before all required hard stops cleared: ${[
        ...failedPreTransfer,
        ...failedCanonical,
      ].join(", ")}`,
    );
  }

  const declaredMainProtected = readManifestBoolean(manifest, "resonance_hub_main_protected");
  const declaredReviewsAndChecks = readManifestBoolean(
    manifest,
    "resonance_hub_required_reviews_and_checks_verified",
  );

  if (declaredReviewsAndChecks && !declaredMainProtected) {
    errors.push(
      "Required reviews/checks cannot be verified while resonance_hub_main_protected is false.",
    );
  }

  if (declaredMainProtected && observedMainProtected === false) {
    errors.push(
      "Manifest claims resonance_hub_main_protected=true, but GitHub reports main protected=false.",
    );
  }

  return errors;
}

async function fetchObservedMainProtection(): Promise<boolean | null> {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/branches/main`, {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Unable to read GitHub main branch state: HTTP ${response.status}`);
  }

  const body = (await response.json()) as { protected?: boolean };
  return typeof body.protected === "boolean" ? body.protected : null;
}

async function main() {
  const manifest = await readFile(MANIFEST_PATH, "utf8");
  const observedMainProtected = await fetchObservedMainProtection();
  const errors = evaluateTransferGates(manifest, observedMainProtected);

  console.log(
    JSON.stringify(
      {
        manifest: MANIFEST_PATH,
        observedMainProtected,
        transferControl: {
          any_transfer_allowed: readManifestBoolean(manifest, "any_transfer_allowed"),
          mirror_transfer_allowed: readManifestBoolean(manifest, "mirror_transfer_allowed"),
          datanest_transfer_allowed: readManifestBoolean(manifest, "datanest_transfer_allowed"),
        },
        valid: errors.length === 0,
        errors,
      },
      null,
      2,
    ),
  );

  if (errors.length > 0) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
