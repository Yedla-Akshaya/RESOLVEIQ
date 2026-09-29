/**
 * ResolveIQ Action Risk Policy & Safety Model
 *
 * Defines the 4 risk tiers for all engineering tools and governs whether
 * an action may be executed autonomously or requires human-in-the-loop approval.
 */

const RISK_LEVELS = {
  LEVEL_0_READ_ONLY: {
    level: 0,
    code: "LEVEL_0",
    name: "Read-Only / Diagnostic",
    description: "Informational queries that inspect state without modifying systems.",
    requiresApproval: false,
    autoExecutable: true,
    badgeColor: "#10b981", // Emerald
    badgeText: "L0 · READ ONLY",
  },
  LEVEL_1_LOW_RISK: {
    level: 1,
    code: "LEVEL_1",
    name: "Low Risk Automated Remediation",
    description: "Safe, idempotent remediation actions that can be auto-executed under policy.",
    requiresApproval: false, // Can be auto-executed if policy allows
    autoExecutable: true,
    badgeColor: "#06b6d4", // Cyan
    badgeText: "L1 · LOW RISK",
  },
  LEVEL_2_MEDIUM_RISK: {
    level: 2,
    code: "LEVEL_2",
    name: "Medium Risk Remediation",
    description: "State-altering operations (rollbacks, deploys, scaling) requiring engineer approval.",
    requiresApproval: true,
    autoExecutable: false,
    badgeColor: "#f59e0b", // Amber
    badgeText: "L2 · APPROVAL REQUIRED",
  },
  LEVEL_3_HIGH_RISK: {
    level: 3,
    code: "LEVEL_3",
    name: "High Risk / Critical Operation",
    description: "Dangerous or destructive mutations (DB changes, infrastructure deletion, IAM).",
    requiresApproval: true,
    autoExecutable: false,
    badgeColor: "#ef4444", // Red
    badgeText: "L3 · CRITICAL APPROVAL",
  },
};

/**
 * Global policy configuration.
 * Can be overridden via environment variables or runtime policy settings.
 */
const currentPolicy = {
  allowAutoLevel1: process.env.AUTO_EXECUTE_LEVEL_1 === "true" || true,
  requireApprovalLevel2: true,
  requireApprovalLevel3: true,
  maxAutonomousActionsPerIncident: 5,
};

/**
 * Evaluates whether an action requires approval based on risk level and policy.
 * @param {number} riskLevel - 0, 1, 2, or 3
 * @returns {{ requiresApproval: boolean, riskMeta: object, reason: string }}
 */
function evaluateActionPolicy(riskLevel) {
  let riskMeta;

  switch (riskLevel) {
    case 0:
      riskMeta = RISK_LEVELS.LEVEL_0_READ_ONLY;
      return {
        requiresApproval: false,
        riskMeta,
        reason: "Read-only diagnostic query. Automatically permitted.",
      };
    case 1:
      riskMeta = RISK_LEVELS.LEVEL_1_LOW_RISK;
      const requiresApprovalL1 = !currentPolicy.allowAutoLevel1;
      return {
        requiresApproval: requiresApprovalL1,
        riskMeta,
        reason: requiresApprovalL1
          ? "Low-risk action, but auto-execution is disabled by policy."
          : "Low-risk action permitted for autonomous execution.",
      };
    case 2:
      riskMeta = RISK_LEVELS.LEVEL_2_MEDIUM_RISK;
      return {
        requiresApproval: true,
        riskMeta,
        reason: "Medium-risk state change (e.g. rollback, deployment). Engineer sign-off required.",
      };
    case 3:
      riskMeta = RISK_LEVELS.LEVEL_3_HIGH_RISK;
      return {
        requiresApproval: true,
        riskMeta,
        reason: "High-risk critical mutation. Mandatory multi-factor engineer approval required.",
      };
    default:
      riskMeta = RISK_LEVELS.LEVEL_3_HIGH_RISK;
      return {
        requiresApproval: true,
        riskMeta,
        reason: `Unknown risk level ${riskLevel}. Defaulting to safest high-risk approval requirement.`,
      };
  }
}

module.exports = {
  RISK_LEVELS,
  currentPolicy,
  evaluateActionPolicy,
};
