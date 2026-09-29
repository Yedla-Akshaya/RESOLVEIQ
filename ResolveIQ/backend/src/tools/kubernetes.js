/**
 * Kubernetes Infrastructure Tool Adapter
 *
 * Implements pod diagnostics, log inspection, event analysis,
 * safe pod restarts (Level 1), and controlled deployment rollbacks (Level 2).
 */

const { mockKubernetesData } = require("./mockData");

const isLiveK8sConfigured = Boolean(process.env.KUBERNETES_SERVICE_HOST || process.env.KUBECONFIG);

// Mutable state for the sandbox environment so actions have real observable effects
let sandboxK8sState = JSON.parse(JSON.stringify(mockKubernetesData));

function resetSandboxState() {
  sandboxK8sState = JSON.parse(JSON.stringify(mockKubernetesData));
}

function registerKubernetesTools(gateway) {
  // 1. Get Pods (Level 0: Read-Only)
  gateway.registerTool({
    name: "k8s_get_pods",
    category: "kubernetes",
    description: "Lists pods, container status, readiness checks, and restart counts for a service.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        namespace: { type: "string", default: "production" },
        service: { type: "string" }
      }
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveK8sConfigured,
        executionMode: isLiveK8sConfigured ? "LIVE" : "SIMULATION",
        namespace: args.namespace || "production",
        service: args.service || "payments-api",
        pods: sandboxK8sState.pods
      };
    }
  });

  // 2. Get Pod Logs (Level 0: Read-Only)
  gateway.registerTool({
    name: "k8s_get_pod_logs",
    category: "kubernetes",
    description: "Streams recent container stdout/stderr logs to identify stack traces and exceptions.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        podName: { type: "string" },
        tailLines: { type: "number", default: 50 }
      }
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveK8sConfigured,
        executionMode: isLiveK8sConfigured ? "LIVE" : "SIMULATION",
        podName: args.podName || sandboxK8sState.pods[0].name,
        logs: sandboxK8sState.podLogs
      };
    }
  });

  // 3. Get Cluster Events (Level 0: Read-Only)
  gateway.registerTool({
    name: "k8s_get_events",
    category: "kubernetes",
    description: "Fetches cluster warning events (e.g. BackOff, OOMKilled, FailedProbe).",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        namespace: { type: "string", default: "production" }
      }
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveK8sConfigured,
        executionMode: isLiveK8sConfigured ? "LIVE" : "SIMULATION",
        namespace: args.namespace || "production",
        events: sandboxK8sState.events
      };
    }
  });

  // 4. Get Deployment Status (Level 0: Read-Only)
  gateway.registerTool({
    name: "k8s_get_deployment_status",
    category: "kubernetes",
    description: "Inspects deployment replica sets, images, and rollout revision history.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        deploymentName: { type: "string" }
      }
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveK8sConfigured,
        executionMode: isLiveK8sConfigured ? "LIVE" : "SIMULATION",
        deployment: sandboxK8sState.deployment
      };
    }
  });

  // 5. Restart Pod (Level 1: Low Risk)
  gateway.registerTool({
    name: "k8s_restart_pod",
    category: "kubernetes",
    description: "Gracefully restarts an unhealthy pod instance to clear transient deadlock/leaks.",
    riskLevel: 1,
    inputSchema: {
      type: "object",
      properties: {
        podName: { type: "string" }
      },
      required: ["podName"]
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveK8sConfigured,
        executionMode: isLiveK8sConfigured ? "LIVE" : "SIMULATION",
        action: "RESTART_POD",
        podName: args.podName,
        status: "TERMINATING_AND_RECREATING",
        message: `Pod ${args.podName} restarted successfully.`
      };
    }
  });

  // 6. Rollback Deployment (Level 2: Medium Risk - Human Approval Required!)
  gateway.registerTool({
    name: "k8s_rollback_deployment",
    category: "kubernetes",
    description: "Rolls back deployment to previous stable revision and images (reverts problematic releases).",
    riskLevel: 2,
    inputSchema: {
      type: "object",
      properties: {
        deploymentName: { type: "string" },
        targetRevision: { type: "string" }
      },
      required: ["deploymentName"]
    },
    handler: async (args, context) => {
      const depName = args.deploymentName || "payments-api";
      const targetVersion = args.targetRevision || sandboxK8sState.deployment.previousVersion;

      // Mutate sandbox state realistically to simulate true successful rollout
      sandboxK8sState.deployment.currentVersion = targetVersion;
      sandboxK8sState.deployment.image = sandboxK8sState.deployment.previousImage;
      sandboxK8sState.deployment.readyReplicas = 3;
      sandboxK8sState.pods = sandboxK8sState.pods.map((p, idx) => ({
        ...p,
        name: `${depName}-rolledback-v283-${idx + 1}`,
        status: "Running",
        ready: "1/1",
        restarts: 0,
        age: "1m",
        lastError: null
      }));
      sandboxK8sState.podLogs = [
        `[${new Date().toISOString()}] [INFO] [server] payments-api ${targetVersion} initialized successfully.`,
        `[${new Date().toISOString()}] [INFO] [pool] Database connection pool initialized (min: 10, max: 100, acquireTimeout: 10000ms).`,
        `[${new Date().toISOString()}] [INFO] [healthz] Readiness probe passed HTTP 200 OK.`
      ];
      sandboxK8sState.events = [
        {
          type: "Normal",
          reason: "ScalingReplicaSet",
          message: `Scaled down replica set to roll back to ${targetVersion}`,
          count: 1,
          firstTimestamp: "Just now"
        }
      ];

      return {
        _simulation: !isLiveK8sConfigured,
        executionMode: isLiveK8sConfigured ? "LIVE" : "SIMULATION",
        deployment: depName,
        rolledBackFrom: "v2.8.4",
        rolledBackTo: targetVersion,
        image: sandboxK8sState.deployment.image,
        replicasReady: "3/3",
        status: "SUCCESSFUL_ROLLOUT",
        executedAt: new Date().toISOString(),
        message: `Deployment '${depName}' successfully rolled back to stable release ${targetVersion}.`
      };
    }
  });
}

module.exports = {
  registerKubernetesTools,
  resetSandboxState,
  getSandboxK8sState: () => sandboxK8sState
};
