/**
 * ResolveIQ Incident Working Memory & Repository
 *
 * Maintains structured working memory for active and resolved incidents.
 * Tracks telemetry, gathered evidence, hypotheses, approval gates,
 * actions taken, and audit events.
 */

const fs = require("fs");
const path = require("path");

class IncidentRepository {
  constructor() {
    this.incidents = new Map();
    this.storageFile = path.resolve(__dirname, "../../data/incidents-store.json");
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, "utf-8");
        const list = JSON.parse(raw);
        list.forEach((inc) => this.incidents.set(inc.id, inc));
      }
    } catch (e) {
      // Safe fallback to clean memory store
      console.warn("Could not read disk incident cache, using in-memory store.");
    }
  }

  saveToDisk() {
    try {
      const dataDir = path.dirname(this.storageFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const list = Array.from(this.incidents.values());
      fs.writeFileSync(this.storageFile, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not persist incident cache to disk:", e.message);
    }
  }

  createIncident({ title, description, service = "payments-api", environment = "production" }) {
    const id = `INC-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const incident = {
      id,
      title: title || description.slice(0, 60),
      description,
      service,
      environment,
      status: "DETECTING", // DETECTING, RECALLING_MEMORY, INVESTIGATING, HYPOTHESIS_FORMULATION, PLANNING, WAITING_APPROVAL, EXECUTING, VERIFYING, RESOLVED, FAILED, REJECTED
      stageProgress: 10,
      symptoms: [],
      observations: [],
      evidence: [],
      hypotheses: [],
      memories: [],
      memoryCount: 0,
      remediationPlan: null,
      pendingAction: null,
      actionsTaken: [],
      failedAttempts: [],
      verification: null,
      report: null,
      events: [
        {
          id: `ev-${Date.now()}-1`,
          timestamp: now,
          phase: "DETECT",
          title: "Incident received",
          detail: description
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    this.incidents.set(id, incident);
    this.saveToDisk();
    return incident;
  }

  getIncident(id) {
    return this.incidents.get(id) || null;
  }

  listIncidents() {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  updateIncident(id, updates) {
    const incident = this.incidents.get(id);
    if (!incident) return null;

    Object.assign(incident, updates, { updatedAt: new Date().toISOString() });
    this.saveToDisk();
    return incident;
  }

  addEvent(id, { phase, title, detail, tool = null, status = "INFO" }) {
    const incident = this.incidents.get(id);
    if (!incident) return null;

    const event = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      phase,
      title,
      detail,
      tool,
      status
    };

    incident.events.push(event);
    incident.updatedAt = event.timestamp;
    this.saveToDisk();
    return event;
  }
}

const incidentRepo = new IncidentRepository();

module.exports = {
  incidentRepo,
  IncidentRepository
};
