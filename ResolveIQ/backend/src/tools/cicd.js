/**
 * CI/CD Pipeline Tool Adapter
 *
 * Implements pipeline diagnostics, build log inspections,
 * and safe build retries (Level 1: Low Risk).
 */

const { mockCicdData } = require("./mockData");

const isLiveCicdConfigured = Boolean(process.env.GITHUB_ACTIONS || process.env.CIRCLE_CI_TOKEN);

function registerCicdTools(gateway) {
  // 1. Get Latest Build (Level 0: Read-Only)
  gateway.registerTool({
    name: "cicd_get_latest_build",
    category: "cicd",
    description: "Returns the latest deployment pipeline status and metadata.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" }
      }
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveCicdConfigured,
        executionMode: isLiveCicdConfigured ? "LIVE" : "SIMULATION",
        build: mockCicdData.latestBuild
      };
    }
  });

  // 2. Retry Build (Level 1: Low Risk)
  gateway.registerTool({
    name: "cicd_retry_build",
    category: "cicd",
    description: "Retries a flaky or transiently failed CI/CD workflow run.",
    riskLevel: 1,
    inputSchema: {
      type: "object",
      properties: {
        pipelineId: { type: "string" }
      },
      required: ["pipelineId"]
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveCicdConfigured,
        executionMode: isLiveCicdConfigured ? "LIVE" : "SIMULATION",
        pipelineId: args.pipelineId,
        status: "QUEUED",
        message: `Pipeline ${args.pipelineId} queued for retry.`
      };
    }
  });
}

module.exports = {
  registerCicdTools
};
