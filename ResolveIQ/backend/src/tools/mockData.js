/**
 * Realistic Mock & Sandbox Telemetry for ResolveIQ
 *
 * Provides realistic engineering context for demonstrations and offline simulation.
 * Clearly tagged with simulation metadata to prevent any misleading claims.
 */

const mockRepositoryData = {
  repo: "acme-corp/payments-service",
  defaultBranch: "main",
  currentRelease: "v2.8.4",
  previousRelease: "v2.8.3",
  recentCommits: [
    {
      sha: "fa891b29a4c10e3d",
      shortSha: "fa891b",
      author: "alex.kumar@acmepay.internal",
      date: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
      message: "perf(db): reduce connection pool max size and aggressively lower acquisition timeout",
      changedFiles: [
        "config/database.ts",
        "src/db/connection-pool.ts"
      ],
      diff: `diff --git a/config/database.ts b/config/database.ts
index e398a12..fa891b2 100644
--- a/config/database.ts
+++ b/config/database.ts
@@ -14,8 +14,8 @@ export const dbConfig = {
   database: process.env.DB_NAME || "payments_prod",
   pool: {
-    min: 10,
-    max: 100,
-    acquireTimeoutMillis: 10000,
+    min: 2,
+    max: 20, // Reduced from 100 to save DB resources
+    acquireTimeoutMillis: 1000, // Reduced from 10000ms to fail-fast
     idleTimeoutMillis: 30000
   }
 };`
    },
    {
      sha: "b710cc88921a4f02",
      shortSha: "b710cc",
      author: "sarah.chen@acmepay.internal",
      date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      message: "feat(checkout): add idempotent key validation for Stripe webhooks",
      changedFiles: ["src/api/webhooks.ts"],
      diff: ""
    }
  ]
};

const mockKubernetesData = {
  namespace: "production",
  service: "payments-api",
  deployment: {
    name: "payments-api",
    replicas: 8,
    readyReplicas: 3, // 3/8 healthy initially
    currentVersion: "v2.8.4",
    previousVersion: "v2.8.3",
    image: "registry.acmepay.internal/payments/api:v2.8.4",
    previousImage: "registry.acmepay.internal/payments/api:v2.8.3",
    lastDeploymentTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  pods: [
    {
      name: "payments-api-79f8b4d8-j9x2k",
      status: "Running (Unhealthy)",
      ready: "0/1",
      restarts: 3,
      age: "18m",
      node: "k8s-worker-prod-04",
      lastError: "HTTP 500 on readiness probe /healthz"
    },
    {
      name: "payments-api-79f8b4d8-m4p1l",
      status: "Running (Unhealthy)",
      ready: "0/1",
      restarts: 2,
      age: "18m",
      node: "k8s-worker-prod-02",
      lastError: "Readiness probe failed: Connection acquisition timeout"
    },
    {
      name: "payments-api-79f8b4d8-q8w5z",
      status: "Running",
      ready: "1/1",
      restarts: 1,
      age: "18m",
      node: "k8s-worker-prod-08",
      lastError: null
    },
    {
      name: "payments-api-79f8b4d8-b2x1a",
      status: "Running (Unhealthy)",
      ready: "0/1",
      restarts: 4,
      age: "18m",
      node: "k8s-worker-prod-01",
      lastError: "Connection pool exhausted"
    },
    {
      name: "payments-api-79f8b4d8-c7y3m",
      status: "Running (Unhealthy)",
      ready: "0/1",
      restarts: 2,
      age: "18m",
      node: "k8s-worker-prod-03",
      lastError: "HTTP 500 on /healthz"
    },
    {
      name: "payments-api-79f8b4d8-d9z4p",
      status: "Running (Unhealthy)",
      ready: "0/1",
      restarts: 3,
      age: "18m",
      node: "k8s-worker-prod-05",
      lastError: "Timeout acquiring connection from pool"
    },
    {
      name: "payments-api-79f8b4d8-e1w5q",
      status: "Running",
      ready: "1/1",
      restarts: 0,
      age: "18m",
      node: "k8s-worker-prod-06",
      lastError: null
    },
    {
      name: "payments-api-79f8b4d8-f3v6r",
      status: "Running",
      ready: "1/1",
      restarts: 0,
      age: "18m",
      node: "k8s-worker-prod-07",
      lastError: null
    }
  ],
  podLogs: [
    `[2026-09-28T14:48:10.120Z] [WARN] [pool] Database connection pool capacity 20 reached. Waiting for available connection...`,
    `[2026-09-28T14:48:11.121Z] [ERROR] [checkout-handler] TimeoutError: ResourceRequest timed out after 1000ms`,
    `    at Timeout.<anonymous> (/app/node_modules/tarn/dist/Pool.js:219:24)`,
    `    at listOnTimeout (node:internal/timers:573:17)`,
    `[2026-09-28T14:48:11.125Z] [ERROR] [http] POST /api/v1/charge - 500 Internal Server Error (Duration: 1004ms)`,
    `[2026-09-28T14:48:12.304Z] [ERROR] [http] POST /api/v1/refund - 500 Internal Server Error (Duration: 1001ms)`
  ],
  events: [
    {
      type: "Warning",
      reason: "Unhealthy",
      message: "Readiness probe failed: HTTP probe failed with statuscode: 500",
      count: 14,
      firstTimestamp: "18m ago"
    },
    {
      type: "Warning",
      reason: "BackOff",
      message: "Back-off restarting failed container payments-api in pod payments-api-79f8b4d8-j9x2k",
      count: 4,
      firstTimestamp: "12m ago"
    }
  ]
};

const mockMonitoringData = {
  // Baseline initial state (Pre-Remediation)
  beforeRemediation: {
    service: "payments-api",
    environment: "production",
    errorRate5xx: 17.2, // 17.2% HTTP 500
    normalBaselineErrorRate: 0.25,
    p95LatencyMs: 640,
    p99LatencyMs: 820,
    baselineLatencyMs: 185,
    dbErrorsPerMin: 124, // 124/min
    healthyPods: "3/8 healthy",
    deploymentVersion: "v2.8.4",
    activeDbConnections: 20,
    dbConnectionLimit: 20,
    connectionWaitQueueDepth: 184,
    throughputRps: 450,
    serviceHealth: "DEGRADED",
    statusMessage: "Severe HTTP 500 error spike detected following deployment v2.8.4"
  },
  // Intermediate state after failed restart (Attempt 1)
  afterFailedRestart: {
    service: "payments-api",
    environment: "production",
    errorRate5xx: 16.8, // 16.8% HTTP 500 (still critical)
    normalBaselineErrorRate: 0.25,
    p95LatencyMs: 610,
    p99LatencyMs: 790,
    baselineLatencyMs: 185,
    dbErrorsPerMin: 120, // 120/min (persisting)
    healthyPods: "3/8 healthy",
    deploymentVersion: "v2.8.4",
    activeDbConnections: 20,
    dbConnectionLimit: 20,
    connectionWaitQueueDepth: 176,
    throughputRps: 440,
    serviceHealth: "DEGRADED",
    statusMessage: "Pod restart completed, but HTTP 500 errors and connection exhaustion persist across replicas."
  },
  // Final state after successful rollback (Attempt 2)
  afterRemediation: {
    service: "payments-api",
    environment: "production",
    errorRate5xx: 0.4, // Dropped to 0.4%
    normalBaselineErrorRate: 0.25,
    p95LatencyMs: 142,
    p99LatencyMs: 190,
    baselineLatencyMs: 185,
    dbErrorsPerMin: 2, // 2/min (recovered)
    healthyPods: "8/8 healthy", // All 8 pods healthy
    deploymentVersion: "v2.8.3",
    activeDbConnections: 38,
    dbConnectionLimit: 100, // Restored with v2.8.3
    connectionWaitQueueDepth: 0,
    throughputRps: 485,
    serviceHealth: "HEALTHY",
    statusMessage: "All replicas healthy on v2.8.3, error rate returned to nominal baseline."
  }
};

const mockCicdData = {
  latestBuild: {
    pipelineId: "pipe-90812",
    branch: "main",
    commit: "fa891b",
    status: "SUCCESS",
    deployedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    deployedVersion: "v2.8.4",
    targetEnvironment: "production"
  }
};

const mockDatabaseData = {
  service: "payments-db-primary",
  engine: "PostgreSQL 16.2",
  status: "ONLINE",
  cpuUtilizationPct: 24.5,
  memoryUtilizationPct: 41.2,
  iops: 320,
  activeConnections: 20,
  maxConnections: 500,
  poolClientQueueDepth: 184,
  connectionErrorsPerMin: 124,
  healthVerdict: "Database server itself is completely healthy and under-utilized. Client-side application pool config in v2.8.4 artificially throttled maximum connections to 20 with 1000ms acquisition timeout."
};

module.exports = {
  mockRepositoryData,
  mockKubernetesData,
  mockMonitoringData,
  mockCicdData,
  mockDatabaseData,
};
