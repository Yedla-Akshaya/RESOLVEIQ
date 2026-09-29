/**
 * End-to-End Orchestrator Lifecycle Test
 *
 * Tests the entire autonomous loop:
 * 1. startInvestigation (Detection -> Memory -> Telemetry -> Hypotheses -> Approval Gate)
 * 2. approveAndExecute (Tool Gateway -> Rollback -> Verification -> Report -> Hindsight Retention)
 */

require("dotenv").config();
const { orchestrator } = require("./agent/orchestrator");
const { resetSandboxState } = require("./tools");

async function main() {
  console.log("=== RUNNING FULL END-TO-END ORCHESTRATOR TEST ===");

  resetSandboxState();

  const incidentDescription =
    "Payment API is returning HTTP 500 errors. Error rate has increased significantly after recent deployment.";

  // Phase 1: Investigation
  console.log("\n[PHASE 1] Starting autonomous investigation...");
  const incident = await orchestrator.startInvestigation(incidentDescription);

  console.log("\n--- INVESTIGATION RESULTS ---");
  console.log("Incident ID:", incident.id);
  console.log("Status:", incident.status);
  console.log("Memories Recalled:", incident.memoryCount);
  console.log("Evidence items count:", incident.evidence.length);
  incident.evidence.forEach((e, i) => console.log(`  ${i + 1}. [${e.source}] ${e.description.substring(0, 70)}...`));
  console.log("Hypotheses count:", incident.hypotheses.length);
  incident.hypotheses.forEach((h) => console.log(`  - [${h.probability}%] ${h.title}`));
  console.log("Pending Action:", incident.pendingAction?.tool, "| Risk:", incident.pendingAction?.riskMeta?.badgeText);
  console.log("Approval Required:", incident.pendingAction?.approvalRequired);

  if (incident.status !== "WAITING_APPROVAL") {
    throw new Error(`Expected status WAITING_APPROVAL, got ${incident.status}`);
  }

  // Phase 2: Operator Approval & Execution
  console.log("\n[PHASE 2] Simulating Human Approval & Tool Execution...");
  const resolvedIncident = await orchestrator.approveAndExecute(incident.id, {
    operator: "sre-lead@acmepay.internal",
    notes: "Approved rollback after reviewing commit fa891b diff and pod connection timeouts."
  });

  console.log("\n--- POST-EXECUTION & VERIFICATION RESULTS ---");
  console.log("Final Status:", resolvedIncident.status);
  console.log("Actions Taken:", resolvedIncident.actionsTaken.length);
  resolvedIncident.actionsTaken.forEach((a) => console.log(`  - ${a.tool} -> ${a.status} (${a.executionMode})`));

  console.log("\nVerification Summary:", resolvedIncident.verification?.summary);
  console.log("Verification Status:", resolvedIncident.verification?.status);
  console.log("Before Metrics:", resolvedIncident.verification?.before);
  console.log("After Metrics:", resolvedIncident.verification?.after);

  console.log("\nTimeline Events count:", resolvedIncident.events.length);
  console.log("Post-Mortem Report Length:", resolvedIncident.report ? resolvedIncident.report.length : 0);

  if (resolvedIncident.status !== "RESOLVED") {
    throw new Error(`Expected status RESOLVED, got ${resolvedIncident.status}`);
  }

  console.log("\n✅ FULL END-TO-END AUTONOMOUS LIFECYCLE TEST PASSED!");
}

main().catch((err) => {
  console.error("\n❌ E2E TEST FAILED:", err);
  process.exit(1);
});
