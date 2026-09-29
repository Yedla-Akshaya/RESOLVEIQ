/**
 * ResolveIQ Tool Gateway & Registry Aggregator
 *
 * Registers the 14 approved engineering tools with strict schemas, risk tiers,
 * and deterministic sandbox handlers.
 */

const { gateway } = require("./registry");
const { registerGitHubTools } = require("./github");
const { registerKubernetesTools, resetSandboxState, getSandboxK8sState } = require("./kubernetes");
const { registerMonitoringTools, getEffectiveMetrics } = require("./monitoring");
const { registerCicdTools } = require("./cicd");
const { mockRepositoryData, mockKubernetesData, mockMonitoringData, mockCicdData, mockDatabaseData } = require("./mockData");

// Register modular tools first
registerGitHubTools(gateway);
registerKubernetesTools(gateway);
registerMonitoringTools(gateway);
registerCicdTools(gateway);

// Register standardized Section 5 tools:
// 1. search_logs
gateway.registerTool({
  name: "search_logs",
  category: "observability",
  description: "Searches aggregated container and service stdout/stderr logs for exceptions.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" },
      query: { type: "string" },
      tailLines: { type: "number", default: 50 }
    }
  },
  handler: async (args) => {
    const k8s = getSandboxK8sState();
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      service: args.service || "payments-api",
      query: args.query || "ERROR",
      matchedCount: k8s.podLogs.length,
      logs: k8s.podLogs
    };
  }
});

// 2. get_deployment
gateway.registerTool({
  name: "get_deployment",
  category: "kubernetes",
  description: "Inspects current deployment metadata, revision history, and active image tags.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      deploymentName: { type: "string" }
    }
  },
  handler: async (args) => {
    const k8s = getSandboxK8sState();
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      deployment: k8s.deployment
    };
  }
});

// 3. get_recent_changes
gateway.registerTool({
  name: "get_recent_changes",
  category: "github",
  description: "Fetches recent commits and release pull requests correlated with the incident.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      repo: { type: "string" },
      limit: { type: "number", default: 5 }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      repo: args.repo || mockRepositoryData.repo,
      commits: mockRepositoryData.recentCommits
    };
  }
});

// 4. get_git_diff
gateway.registerTool({
  name: "get_git_diff",
  category: "github",
  description: "Inspects code differences and configuration edits in recent commits.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      commitSha: { type: "string" }
    }
  },
  handler: async (args) => {
    const commit = mockRepositoryData.recentCommits.find(
      (c) => c.sha.startsWith(args.commitSha) || c.shortSha === args.commitSha
    ) || mockRepositoryData.recentCommits[0];

    return {
      _simulation: true,
      executionMode: "SIMULATION",
      commitSha: commit.shortSha,
      author: commit.author,
      diff: commit.diff
    };
  }
});

// 5. get_metrics
gateway.registerTool({
  name: "get_metrics",
  category: "monitoring",
  description: "Retrieves HTTP error rates, latency percentiles, and active connection saturation.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" }
    }
  },
  handler: async (args) => {
    const metrics = getEffectiveMetrics();
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      service: args.service || "payments-api",
      metrics
    };
  }
});

// 6. get_database_status
gateway.registerTool({
  name: "get_database_status",
  category: "database",
  description: "Inspects PostgreSQL database engine health, CPU utilization, and pool queue saturation.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      database: mockDatabaseData
    };
  }
});

// 7. get_kubernetes_events
gateway.registerTool({
  name: "get_kubernetes_events",
  category: "kubernetes",
  description: "Fetches cluster warning events (e.g. Unhealthy, BackOff, FailedProbe).",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      namespace: { type: "string", default: "production" }
    }
  },
  handler: async (args) => {
    const k8s = getSandboxK8sState();
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      events: k8s.events
    };
  }
});

// 8. get_pod_status
gateway.registerTool({
  name: "get_pod_status",
  category: "kubernetes",
  description: "Inspects pod lifecycle phases, readiness checks, and restart tallies.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" }
    }
  },
  handler: async (args) => {
    const k8s = getSandboxK8sState();
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      service: args.service || "payments-api",
      podsCount: k8s.pods.length,
      readyCount: k8s.deployment.readyReplicas,
      pods: k8s.pods
    };
  }
});

// 9. restart_pod (Level 1: Low Risk)
gateway.registerTool({
  name: "restart_pod",
  category: "kubernetes",
  description: "Gracefully terminates and restarts pod instances (safe low-risk remediation).",
  riskLevel: 1,
  inputSchema: {
    type: "object",
    properties: {
      podName: { type: "string" }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      action: "RESTART_POD",
      podName: args.podName || "payments-api-79f8b4d8-j9x2k",
      status: "TERMINATING_AND_RECREATING",
      message: `Pod ${args.podName || "payments-api-79f8b4d8-j9x2k"} restarted. New instance scheduled.`
    };
  }
});

// 10. rollback_deployment (Level 2: Medium Risk - Human Approval Required!)
gateway.registerTool({
  name: "rollback_deployment",
  category: "kubernetes",
  description: "Rolls back production deployment to previous stable revision and images.",
  riskLevel: 2,
  inputSchema: {
    type: "object",
    properties: {
      deploymentName: { type: "string" },
      targetRevision: { type: "string" }
    }
  },
  handler: async (args) => {
    const depName = args.deploymentName || "payments-api";
    const targetVersion = args.targetRevision || "v2.8.3";
    const k8s = getSandboxK8sState();

    k8s.deployment.currentVersion = targetVersion;
    k8s.deployment.image = k8s.deployment.previousImage;
    k8s.deployment.readyReplicas = 8;
    k8s.pods = k8s.pods.map((p, idx) => ({
      ...p,
      name: `${depName}-rolledback-v283-${idx + 1}`,
      status: "Running",
      ready: "1/1",
      restarts: 0,
      age: "1m",
      lastError: null
    }));
    k8s.podLogs = [
      `[${new Date().toISOString()}] [INFO] [server] payments-api ${targetVersion} started successfully.`,
      `[${new Date().toISOString()}] [INFO] [pool] Database connection pool initialized (min: 10, max: 100, acquireTimeout: 10000ms).`,
      `[${new Date().toISOString()}] [INFO] [healthz] Readiness probe passed HTTP 200 OK.`
    ];

    return {
      _simulation: true,
      executionMode: "SIMULATION",
      deployment: depName,
      rolledBackFrom: "v2.8.4",
      rolledBackTo: targetVersion,
      replicasReady: "8/8",
      status: "SUCCESSFUL_ROLLOUT",
      message: `Deployment '${depName}' successfully rolled back to release ${targetVersion}.`
    };
  }
});

// 11. run_tests
gateway.registerTool({
  name: "run_tests",
  category: "cicd",
  description: "Executes health and smoke test suite against target service.",
  riskLevel: 0,
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      service: args.service || "payments-api",
      testsRun: 24,
      passed: 24,
      failed: 0,
      status: "PASSED"
    };
  }
});

// 12. deploy_staging
gateway.registerTool({
  name: "deploy_staging",
  category: "cicd",
  description: "Deploys candidate release branch to isolated staging environment.",
  riskLevel: 1,
  inputSchema: {
    type: "object",
    properties: {
      branch: { type: "string" }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      environment: "staging",
      branch: args.branch || "fix/connection-pool",
      status: "DEPLOYED"
    };
  }
});

// 13. create_incident
gateway.registerTool({
  name: "create_incident",
  category: "incident_management",
  description: "Creates or escalates incident record in PagerDuty or Jira.",
  riskLevel: 1,
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      severity: { type: "string" }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      incidentId: "INC-9901",
      title: args.title,
      severity: args.severity || "P1",
      status: "OPEN"
    };
  }
});

// 14. send_notification
gateway.registerTool({
  name: "send_notification",
  category: "communication",
  description: "Dispatches status update to Slack or Microsoft Teams channels.",
  riskLevel: 1,
  inputSchema: {
    type: "object",
    properties: {
      channel: { type: "string" },
      message: { type: "string" }
    }
  },
  handler: async (args) => {
    return {
      _simulation: true,
      executionMode: "SIMULATION",
      channel: args.channel || "#incidents-prod",
      sent: true,
      message: args.message
    };
  }
});

module.exports = {
  gateway,
  resetSandboxState,
  getSandboxK8sState
};
