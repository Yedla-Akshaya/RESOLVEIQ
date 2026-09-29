const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { resolveIncident, orchestrator } = require("./agent");
const { incidentRepo } = require("./incidents/repository");
const { gateway, resetSandboxState } = require("./tools");
const { recallIncidentExperience, BANK_ID } = require("./agent/memory");

const app = express();

app.use(cors());
app.use(express.json());

/* 1. Health & System Status API */
app.get("/", (req, res) => {
  res.json({
    project: "ResolveIQ",
    status: "Backend is running",
    message: "Autonomous AI Engineering / Error Resolution Agent",
    version: "2.1.0",
    executionMode: process.env.EXECUTION_MODE || "mock"
  });
});

app.get("/api/system/status", (req, res) => {
  const isGroqConfigured = Boolean(process.env.GROQ_API_KEY);
  const isHindsightConfigured = Boolean(process.env.HINDSIGHT_BASE_URL && process.env.HINDSIGHT_API_KEY);
  const isK8sConfigured = Boolean(process.env.KUBERNETES_SERVICE_HOST || process.env.KUBECONFIG);
  const isGitHubConfigured = Boolean(process.env.GITHUB_TOKEN);

  res.json({
    success: true,
    data: {
      mode: process.env.EXECUTION_MODE === "live" ? "LIVE" : "SIMULATION",
      isSimulation: process.env.EXECUTION_MODE !== "live",
      toolsCount: gateway.listTools().length,
      integrations: {
        groq: isGroqConfigured ? "ONLINE" : "OFFLINE",
        hindsight: isHindsightConfigured ? "CONNECTED" : "DISCONNECTED",
        kubernetes: isK8sConfigured ? "LIVE_CLUSTER" : "SAFE_SANDBOX",
        github: isGitHubConfigured ? "LIVE_API" : "SAFE_SANDBOX",
        cicd: "SAFE_SANDBOX",
        database: "SAFE_SANDBOX",
        monitoring: "ACTIVE"
      },
      hindsightBank: BANK_ID,
      activeIncidentsCount: incidentRepo.listIncidents().length
    }
  });
});

/* 2. Tool Gateway Discovery API */
app.get("/api/tools", (req, res) => {
  const tools = gateway.listTools();
  res.json({
    success: true,
    data: {
      total: tools.length,
      tools
    }
  });
});

/* 3. Hindsight Memory Query API */
app.get("/api/memory", async (req, res) => {
  try {
    const query = req.query.q || "payment api error";
    const memoryResult = await recallIncidentExperience(query);
    res.json({
      success: true,
      data: {
        bankId: BANK_ID,
        query,
        count: memoryResult.count,
        memories: memoryResult.memories,
        message: memoryResult.message
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* 4. Legacy Incident API (Preserved for backwards compatibility) */
app.post("/api/incident", async (req, res) => {
  try {
    const { incident } = req.body;

    if (!incident || !incident.trim()) {
      return res.status(400).json({
        success: false,
        error: "Incident description is required."
      });
    }

    console.log("\n================================");
    console.log("INCIDENT RECEIVED (via /api/incident)");
    console.log("================================");
    console.log(incident);

    const result = await resolveIncident(incident);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Incident processing error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to process incident.",
      details: error.message
    });
  }
});

/* 5. RESTful Autonomous Incident Lifecycle APIs (Section 21) */

// POST /api/incidents - Start new autonomous investigation
app.post("/api/incidents", async (req, res) => {
  try {
    const { description, service, environment } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: "Field 'description' is required."
      });
    }

    const incident = await orchestrator.startInvestigation(description, {
      service: service || "payments-api",
      environment: environment || "production"
    });

    res.status(201).json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error("Autonomous investigation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start investigation.",
      details: error.message
    });
  }
});

// GET /api/incidents - List all incidents
app.get("/api/incidents", (req, res) => {
  const list = incidentRepo.listIncidents();
  res.json({
    success: true,
    data: list
  });
});

// GET /api/incidents/:id - Get specific incident working memory & state
app.get("/api/incidents/:id", (req, res) => {
  const incident = incidentRepo.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({
      success: false,
      error: `Incident '${req.params.id}' not found.`
    });
  }

  res.json({
    success: true,
    data: incident
  });
});

// POST /api/incidents/:id/investigate - Trigger / continue investigation
app.post("/api/incidents/:id/investigate", async (req, res) => {
  try {
    const incident = incidentRepo.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found" });
    }
    const updated = await orchestrator.startInvestigation(incident.description, {
      service: incident.service,
      environment: incident.environment
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/incidents/:id/events - Get audit timeline events
app.get("/api/incidents/:id/events", (req, res) => {
  const incident = incidentRepo.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: "Incident not found" });
  }
  res.json({ success: true, data: incident.events || [] });
});

// GET /api/incidents/:id/evidence - Get collected evidence items
app.get("/api/incidents/:id/evidence", (req, res) => {
  const incident = incidentRepo.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: "Incident not found" });
  }
  res.json({ success: true, data: incident.evidence || [] });
});

// GET /api/incidents/:id/hypotheses - Get agent hypotheses
app.get("/api/incidents/:id/hypotheses", (req, res) => {
  const incident = incidentRepo.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: "Incident not found" });
  }
  res.json({ success: true, data: incident.hypotheses || [] });
});

// GET /api/incidents/:id/report - Get incident post-mortem report
app.get("/api/incidents/:id/report", (req, res) => {
  const incident = incidentRepo.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: "Incident not found" });
  }
  res.json({ success: true, data: { report: incident.report } });
});

// GET /api/incidents/:id/memory - Get Hindsight memories for incident
app.get("/api/incidents/:id/memory", (req, res) => {
  const incident = incidentRepo.getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: "Incident not found" });
  }
  res.json({ success: true, data: { memories: incident.memories || [], count: incident.memoryCount || 0 } });
});

// POST /api/incidents/:id/approve - Human authorization gate to execute action
app.post("/api/incidents/:id/approve", async (req, res) => {
  try {
    const { operator = "lead-engineer", notes = "" } = req.body;
    const resolvedIncident = await orchestrator.approveAndExecute(req.params.id, {
      operator,
      notes
    });

    res.json({
      success: true,
      data: resolvedIncident
    });
  } catch (error) {
    console.error("Action execution error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to execute approved remediation.",
      details: error.message
    });
  }
});

// POST /api/incidents/:id/reject - Human rejects remediation
app.post("/api/incidents/:id/reject", async (req, res) => {
  try {
    const { reason = "Rejected by engineer", operator = "lead-engineer" } = req.body;
    const updatedIncident = await orchestrator.rejectAction(req.params.id, {
      reason,
      operator
    });

    res.json({
      success: true,
      data: updatedIncident
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to reject action.",
      details: error.message
    });
  }
});

// POST /api/demo/reset - Reset sandbox state for fresh demo runs
app.post("/api/demo/reset", (req, res) => {
  resetSandboxState();
  res.json({
    success: true,
    message: "Sandbox environment and telemetry reset to initial degraded incident state."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 ResolveIQ Autonomous Backend running`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🔒 Execution Mode: ${process.env.EXECUTION_MODE || "mock (safe simulation)"}`);
});

module.exports = app;