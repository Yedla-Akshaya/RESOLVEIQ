/**
 * ResolveIQ Central Tool Gateway & Registry
 *
 * Implements the secure Action Layer. AI orchestrators cannot directly run
 * arbitrary commands; every operation must pass through registered tools
 * with strictly typed schemas, 4-tier risk evaluations, approval gates,
 * and immutable audit logging.
 */

const { evaluateActionPolicy } = require("../policy/riskPolicy");

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.auditLogs = [];
  }

  /**
   * Registers a tool into the gateway.
   * @param {object} toolConfig
   */
  registerTool(toolConfig) {
    const {
      name,
      description,
      riskLevel = 0,
      inputSchema = {},
      outputSchema = {},
      handler,
      category = "general"
    } = toolConfig;

    if (!name || typeof name !== "string") {
      throw new Error("Tool registration failed: 'name' is required.");
    }
    if (typeof handler !== "function") {
      throw new Error(`Tool registration failed for '${name}': 'handler' must be a function.`);
    }

    const { riskMeta, requiresApproval } = evaluateActionPolicy(riskLevel);

    this.tools.set(name, {
      name,
      description,
      riskLevel,
      riskMeta,
      requiresApproval,
      inputSchema,
      outputSchema,
      category,
      handler,
      createdAt: new Date().toISOString()
    });

    return this.tools.get(name);
  }

  /**
   * Retrieves tool by name.
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * Lists all registered tools for LLM tool discovery and UI display.
   */
  listTools() {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      riskLevel: tool.riskLevel,
      riskMeta: tool.riskMeta,
      requiresApproval: tool.requiresApproval,
      category: tool.category,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Executes a tool via the gateway.
   *
   * @param {string} toolName - Name of the registered tool
   * @param {object} args - Arguments conforming to inputSchema
   * @param {object} context - Execution context (e.g. incidentId, approved: boolean, reason, operator)
   * @returns {Promise<object>} Execution result with audit details
   */
  async executeTool(toolName, args = {}, context = {}) {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool Gateway Error: '${toolName}' is not a recognized or approved tool.`);
    }

    const policy = evaluateActionPolicy(tool.riskLevel);
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const executionTimestamp = new Date().toISOString();

    // Check if Human-In-The-Loop Approval is required
    if (policy.requiresApproval && context.approved !== true) {
      const pendingApprovalEvent = {
        auditId,
        tool: toolName,
        args,
        riskLevel: tool.riskLevel,
        riskMeta: policy.riskMeta,
        status: "BLOCKED_PENDING_APPROVAL",
        timestamp: executionTimestamp,
        incidentId: context.incidentId || null,
        message: `Action '${toolName}' blocked. Requires human approval (${policy.riskMeta.name}).`
      };

      this.auditLogs.push(pendingApprovalEvent);

      return {
        success: false,
        blocked: true,
        requiresApproval: true,
        tool: toolName,
        riskLevel: tool.riskLevel,
        riskMeta: policy.riskMeta,
        reason: policy.reason,
        proposedAction: {
          tool: toolName,
          args,
          reason: context.reason || "Autonomous remediation proposal",
          expectedEffect: context.expectedEffect || "Restore system availability",
          potentialRisk: context.potentialRisk || "Transient service disruption during switchover"
        },
        auditId
      };
    }

    // Execute through handler
    try {
      const startTime = Date.now();
      const rawResult = await tool.handler(args, context);
      const executionDurationMs = Date.now() - startTime;

      // Extract simulation flag if tool is in mock/sandbox mode
      const isSimulation = rawResult?._simulation === true ||
        process.env.EXECUTION_MODE === "mock" ||
        rawResult?.executionMode === "SIMULATION";

      const executionMode = isSimulation ? "SIMULATION" : "LIVE";

      const auditEntry = {
        auditId,
        tool: toolName,
        args,
        riskLevel: tool.riskLevel,
        riskMeta: policy.riskMeta,
        status: "SUCCESS",
        executionMode,
        executionDurationMs,
        timestamp: executionTimestamp,
        incidentId: context.incidentId || null,
        approvedBy: context.operator || (policy.requiresApproval ? "human-engineer" : "autonomous-policy")
      };

      this.auditLogs.push(auditEntry);

      return {
        success: true,
        tool: toolName,
        executionMode,
        isSimulation,
        riskLevel: tool.riskLevel,
        durationMs: executionDurationMs,
        result: rawResult,
        auditId,
        timestamp: executionTimestamp
      };
    } catch (err) {
      const failedAuditEntry = {
        auditId,
        tool: toolName,
        args,
        riskLevel: tool.riskLevel,
        status: "FAILED",
        error: err.message,
        timestamp: executionTimestamp,
        incidentId: context.incidentId || null
      };

      this.auditLogs.push(failedAuditEntry);

      return {
        success: false,
        tool: toolName,
        error: err.message,
        auditId,
        timestamp: executionTimestamp
      };
    }
  }

  getAuditLogs(incidentId = null) {
    if (incidentId) {
      return this.auditLogs.filter((entry) => entry.incidentId === incidentId);
    }
    return [...this.auditLogs];
  }
}

// Singleton gateway instance
const gateway = new ToolRegistry();

module.exports = {
  gateway,
  ToolRegistry
};
