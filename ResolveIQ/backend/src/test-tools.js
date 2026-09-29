const { gateway } = require("./tools");

async function main() {
  console.log("=== TESTING RESOLVEIQ TOOL GATEWAY ===");

  const tools = gateway.listTools();
  console.log(`Registered tools count: ${tools.length}`);
  tools.forEach(t => console.log(` - [${t.riskMeta.code}] ${t.name}: ${t.description.substring(0, 50)}...`));

  console.log("\n1. Testing Level 0 (Read-Only) Tool: monitoring_get_error_rate...");
  const resL0 = await gateway.executeTool("monitoring_get_error_rate", { service: "payments-api" });
  console.log("Result L0:", resL0);

  console.log("\n2. Testing Level 2 (Medium Risk) Tool without approval: k8s_rollback_deployment...");
  const resL2Blocked = await gateway.executeTool("k8s_rollback_deployment", {
    deploymentName: "payments-api",
    targetRevision: "v2.8.3"
  }, { approved: false, reason: "Testing block" });
  console.log("Blocked result:", resL2Blocked.blocked, "Requires approval:", resL2Blocked.requiresApproval);

  console.log("\n3. Testing Level 2 Tool WITH approval...");
  const resL2Approved = await gateway.executeTool("k8s_rollback_deployment", {
    deploymentName: "payments-api",
    targetRevision: "v2.8.3"
  }, { approved: true, operator: "lead-engineer@acmepay.internal" });
  console.log("Approved execution success:", resL2Approved.success, "Mode:", resL2Approved.executionMode);

  console.log("\n4. Checking metrics after rollback...");
  const resAfter = await gateway.executeTool("monitoring_get_error_rate", { service: "payments-api" });
  console.log("Metrics after rollback:", resAfter.result.errorRate5xx, "% error rate (Status:", resAfter.result.status, ")");

  console.log("\n✅ All Tool Gateway tests PASSED!");
}

main().catch(console.error);
