import { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GitCommit,
  Layers,
  Lightbulb,
  Lock,
  Play,
  RefreshCw,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000";

const DEMO_SCENARIO = `Payment API is returning HTTP 500 errors. Error rate has increased significantly after recent deployment v2.8.4. Database connection pool errors and timeout exceptions observed in pod logs.`;

function App() {
  const [incidentText, setIncidentText] = useState(DEMO_SCENARIO);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");
  const [systemStatus, setSystemStatus] = useState(null);
  const [registeredTools, setRegisteredTools] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [selectedToolModal, setSelectedToolModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00");

  useEffect(() => {
    fetchSystemStatus();
    fetchTools();
  }, []);

  // Timer for live agent status elapsed time
  useEffect(() => {
    let timer;
    if (loading || (currentIncident && currentIncident.status !== "RESOLVED" && currentIncident.status !== "REJECTED")) {
      const start = Date.now();
      timer = setInterval(() => {
        const secs = Math.floor((Date.now() - start) / 1000);
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        setElapsedTime(`${m}:${s}`);
      }, 1000);
    } else if (currentIncident && currentIncident.status === "RESOLVED") {
      setElapsedTime("00:14");
    }
    return () => clearInterval(timer);
  }, [loading, currentIncident]);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/system/status`);
      const data = await res.json();
      if (data.success) {
        setSystemStatus(data.data);
      }
    } catch (e) {
      console.warn("Could not reach backend system status:", e.message);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tools`);
      const data = await res.json();
      if (data.success) {
        setRegisteredTools(data.data.tools || []);
      }
    } catch (e) {
      console.warn("Could not fetch tools:", e.message);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await fetch(`${API_URL}/api/demo/reset`, { method: "POST" });
      setCurrentIncident(null);
      setIncidentText(DEMO_SCENARIO);
      await fetchSystemStatus();
    } catch (e) {
      setError("Failed to reset sandbox state: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  const startInvestigation = async () => {
    if (!incidentText.trim()) return;

    setLoading(true);
    setError("");
    setCurrentIncident(null);

    try {
      const response = await fetch(`${API_URL}/api/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: incidentText,
          service: incidentText.toLowerCase().includes("payment") ? "payments-api" : "checkout-service",
          environment: "production",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to start autonomous investigation.");
      }

      setCurrentIncident(data.data);
      setActiveTab("overview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async () => {
    if (!currentIncident?.id) return;
    setApproving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/incidents/${currentIncident.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator: "sre-lead@acmepay.io",
          notes: "Approved deployment rollback after reviewing commit diff and connection pool timeouts.",
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to execute approved remediation.");
      }

      setCurrentIncident(data.data);
      await fetchSystemStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectAction = async () => {
    if (!currentIncident?.id) return;
    try {
      const response = await fetch(`${API_URL}/api/incidents/${currentIncident.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Engineer rejected automated rollback to perform manual pool scaling.",
          operator: "sre-lead@acmepay.io",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentIncident(data.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const exportReportAsMarkdown = () => {
    if (!currentIncident?.report) return;
    const blob = new Blob([currentIncident.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resolveiq-incident-report-${currentIncident.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getRiskBadge = (riskLevel) => {
    switch (riskLevel) {
      case 0:
        return <span className="risk-pill l0">L0 · READ ONLY</span>;
      case 1:
        return <span className="risk-pill l1">L1 · LOW RISK</span>;
      case 2:
        return <span className="risk-pill l2">L2 · APPROVAL REQUIRED</span>;
      case 3:
        return <span className="risk-pill l3">L3 · CRITICAL</span>;
      default:
        return <span className="risk-pill l2">L2 · APPROVAL REQUIRED</span>;
    }
  };

  const getLifecycleStages = () => {
    const status = currentIncident?.status || (loading ? "INVESTIGATING" : "IDLE");

    return [
      { id: 1, name: "Detect", state: status !== "IDLE" ? "done" : "idle" },
      { id: 2, name: "Memory Recall", state: ["INVESTIGATING", "WAITING_APPROVAL", "EXECUTING", "VERIFYING", "RESOLVED"].includes(status) ? (status === "INVESTIGATING" ? "current" : "done") : "idle" },
      { id: 3, name: "Tool Telemetry", state: ["WAITING_APPROVAL", "EXECUTING", "VERIFYING", "RESOLVED"].includes(status) ? "done" : (status === "INVESTIGATING" ? "current" : "idle") },
      { id: 4, name: "Hypotheses", state: ["WAITING_APPROVAL", "EXECUTING", "VERIFYING", "RESOLVED"].includes(status) ? "done" : "idle" },
      { id: 5, name: "Approval Gate", state: status === "WAITING_APPROVAL" ? "current" : (["EXECUTING", "VERIFYING", "RESOLVED"].includes(status) ? "done" : "idle") },
      { id: 6, name: "Tool Execution", state: status === "EXECUTING" ? "current" : (["VERIFYING", "RESOLVED"].includes(status) ? "done" : "idle") },
      { id: 7, name: "Verification", state: status === "VERIFYING" ? "current" : (status === "RESOLVED" ? "done" : "idle") },
    ];
  };

  const stages = getLifecycleStages();

  return (
    <div className="app">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Brain size={24} />
          </div>
          <div>
            <h1>ResolveIQ</h1>
            <span>Autonomous Engineering & Error Resolution Agent</span>
          </div>
        </div>

        <div className="topbar-controls">
          <div className="mode-badge simulation" title="Sandbox execution mode enabled">
            <span className="mode-pulse"></span>
            <span>SIMULATION / DEMO MODE</span>
          </div>

          <button
            className="secondary-btn"
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset sandbox state to initial degraded incident"
          >
            <RefreshCw size={14} className={resetting ? "spin-icon" : ""} />
            Reset Sandbox
          </button>

          <div className="system-status">
            <span className="status-dot"></span>
            Agent Online
          </div>
        </div>
      </header>

      <main className="container">
        {/* Hero Section */}
        <section className="hero">
          <div>
            <p className="eyebrow">
              <Sparkles size={15} />
              AUTONOMOUS INCIDENT INVESTIGATION & RESOLUTION
            </p>

            <h2>
              ResolveIQ doesn't just explain errors.
              <span> It investigates, executes fixes, and verifies recovery.</span>
            </h2>

            <p className="hero-text">
              Connected to Git, CI/CD, Kubernetes, and PostgreSQL telemetry through a secure
              Tool Gateway with 4-tier risk policies, human approval checkpoints, and automated verification.
            </p>
          </div>
        </section>

        {/* SIMULATION MODE TRANSPARENCY NOTICE (Section 19) */}
        <div className="simulation-notice-bar">
          <div className="sim-notice-title">
            <Shield size={14} />
            <span>SIMULATION MODE ACTIVE: No real production infrastructure will be modified.</span>
          </div>
          <div className="sim-badges-list">
            <span className="sim-chip">GitHub: <strong>SIMULATED</strong></span>
            <span className="sim-chip">Kubernetes: <strong>SIMULATED</strong></span>
            <span className="sim-chip">CI/CD: <strong>SIMULATED</strong></span>
            <span className="sim-chip">Database: <strong>SIMULATED</strong></span>
            <span className="sim-chip">Monitoring: <strong>SIMULATED</strong></span>
          </div>
        </div>

        {/* LIVE AGENT STATUS AREA (Section 18) */}
        <div className="agent-status-widget panel">
          <div className="agent-status-header">
            <div className="status-indicator">
              <span className="agent-pulse"></span>
              <strong>AGENT ONLINE</strong>
            </div>
            <div className="status-timer">
              <Clock3 size={14} />
              <span>Elapsed: {elapsedTime}</span>
            </div>
          </div>

          <div className="agent-status-body">
            <div className="status-col">
              <label>CURRENT TASK:</label>
              <span>{currentIncident?.currentTask || (loading ? "Investigating Payment API 500 incident..." : "Ready for incident ingestion")}</span>
            </div>
            <div className="status-col">
              <label>CURRENT ACTION:</label>
              <span>{currentIncident?.currentAction || (loading ? "Inspecting telemetry and system logs..." : "Awaiting user input or alert webhook")}</span>
            </div>
            <div className="status-col">
              <label>TOOL:</label>
              <code>{currentIncident?.currentTool || (loading ? "get_deployment" : "none")}</code>
            </div>
          </div>
        </div>

        {/* AGENT LIFECYCLE PROGRESS PIPELINE (Section 17) */}
        <section className="pipeline-bar panel">
          <div className="pipeline-title">
            <Activity size={16} />
            <span>Lifecycle:</span>
          </div>

          <div className="pipeline-steps">
            {stages.map((st, i) => (
              <div key={st.id} className="pipeline-step-wrap">
                <div className={`step-node ${st.state}`}>
                  <div className="step-circle">
                    {st.state === "done" ? <Check size={14} /> : st.id}
                  </div>
                  <div className="step-text">
                    <span className="step-name">{st.name}</span>
                    <span className="step-state-tag">
                      {st.state === "done" ? "✓" : st.state === "current" ? "● CURRENT" : "○"}
                    </span>
                  </div>
                </div>
                {i < stages.length - 1 && <div className={`step-connector ${st.state === "done" ? "done" : ""}`}></div>}
              </div>
            ))}
          </div>
        </section>

        {/* INCIDENT INPUT & DEMO LOADER */}
        <section className="input-section panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">INCIDENT INPUT & TELEMETRY INTAKE</span>
              <h3>Describe or Simulate Production Incident</h3>
            </div>
            <div className="quick-actions">
              <button
                className="pill-btn"
                onClick={() => setIncidentText(DEMO_SCENARIO)}
              >
                ⚡ Load Payment API 500 Spike Demo
              </button>
            </div>
          </div>

          <div className="input-body">
            <textarea
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
              placeholder="Paste incident alert, Sentry error, or symptoms..."
              rows={3}
            />

            <div className="input-footer">
              <div className="context-tags">
                <span className="tag"><Server size={13} /> Service: payments-api</span>
                <span className="tag"><Shield size={13} /> Environment: production</span>
                <span className="tag"><Database size={13} /> Bank: resolveiq-demo (Hindsight)</span>
              </div>

              <button
                className="analyze-button"
                onClick={startInvestigation}
                disabled={loading || !incidentText.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Investigating Systems...
                  </>
                ) : (
                  <>
                    Investigate & Remediate Incident
                    <Play size={16} fill="currentColor" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="error-box">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* AUTONOMOUS INCIDENT CONSOLE */}
        {currentIncident && (
          <div className="console-wrapper">
            {/* TABS NAVIGATION */}
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <Cpu size={16} />
                Remediation Proposal & Lifecycle
              </button>

              <button
                className={`tab-btn ${activeTab === "tools_used" ? "active" : ""}`}
                onClick={() => setActiveTab("tools_used")}
              >
                <Terminal size={16} />
                Tools Used ({currentIncident.toolsUsed?.length || 0})
              </button>

              <button
                className={`tab-btn ${activeTab === "evidence" ? "active" : ""}`}
                onClick={() => setActiveTab("evidence")}
              >
                <Activity size={16} />
                Evidence & Telemetry ({currentIncident.evidence?.length || 0})
              </button>

              <button
                className={`tab-btn ${activeTab === "memory" ? "active" : ""}`}
                onClick={() => setActiveTab("memory")}
              >
                <Database size={16} />
                Hindsight Memory ({currentIncident.memoryCount || 0})
              </button>

              <button
                className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
                onClick={() => setActiveTab("timeline")}
              >
                <Clock3 size={16} />
                Audit Trail & Timeline ({currentIncident.events?.length || 0})
              </button>

              {currentIncident.report && (
                <button
                  className="tab-btn report-cta-tab"
                  onClick={() => setShowReportModal(true)}
                >
                  <FileText size={16} />
                  View Incident Report
                </button>
              )}
            </div>

            {/* TAB 1: OVERVIEW & REMEDIATION */}
            {activeTab === "overview" && (
              <div className="tab-content">
                {/* 1. SECTION 10: REMEDIATION PROPOSAL & APPROVAL GATE */}
                {currentIncident.status === "WAITING_APPROVAL" && currentIncident.pendingAction && (
                  <div className="remediation-proposal-card">
                    <div className="proposal-top">
                      <div className="proposal-title">
                        <Lock size={18} />
                        <h4>REMEDIATION PROPOSAL</h4>
                      </div>
                      <span className="risk-pill l2">RISK: MEDIUM (Approval Required)</span>
                    </div>

                    <div className="proposal-body">
                      <div className="proposal-main-action">
                        <div className="action-row">
                          <label>Action:</label>
                          <code>{currentIncident.pendingAction.actionName || "Rollback deployment v2.8.4 → v2.8.3"}</code>
                        </div>
                        <div className="action-row">
                          <label>Risk:</label>
                          <span className="risk-text-amber">MEDIUM</span>
                        </div>
                        <div className="action-row">
                          <label>Reason:</label>
                          <p>{currentIncident.pendingAction.reason}</p>
                        </div>
                        <div className="action-row">
                          <label>Expected recovery:</label>
                          <span>{currentIncident.pendingAction.expectedRecovery || "~2 minutes"}</span>
                        </div>
                        <div className="action-row">
                          <label>Evidence:</label>
                          <span>{currentIncident.pendingAction.supportingObservationsCount || 5} supporting observations</span>
                        </div>
                      </div>

                      {/* FAILED ATTEMPT 1 CALLOUT (Section 13) */}
                      {currentIncident.failedAttempts?.length > 0 && (
                        <div className="attempt-failed-callout">
                          <div className="callout-header">
                            <AlertCircle size={16} />
                            <strong>Attempt 1: Restart Pod — FAILED</strong>
                          </div>
                          <p>
                            Initial automated low-risk pod restart failed to recover availability (HTTP 500 error rate remained at 16.8%, DB errors at 120/min).
                            Agent concluded failure is not isolated to transient pod state, confirming code/config regression in deployment v2.8.4.
                          </p>
                        </div>
                      )}

                      <div className="proposal-buttons-bar">
                        <button
                          className="approve-btn"
                          onClick={handleApproveAction}
                          disabled={approving}
                        >
                          {approving ? (
                            <>
                              <span className="spinner"></span>
                              Executing via Tool Gateway...
                            </>
                          ) : (
                            <>
                              <Check size={18} />
                              APPROVE & EXECUTE
                            </>
                          )}
                        </button>

                        <button className="secondary-action-btn" onClick={() => setActiveTab("evidence")}>
                          INVESTIGATE MORE
                        </button>

                        <button className="reject-btn" onClick={handleRejectAction}>
                          <X size={16} />
                          REJECT
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SECTION 11: EXECUTION PANEL */}
                {currentIncident.actionsTaken?.length > 0 && (
                  <div className="panel execution-panel">
                    <div className="panel-header">
                      <div>
                        <span className="panel-label">TOOL GATEWAY EXECUTION</span>
                        <h3>Execution Audit Trail</h3>
                      </div>
                      <span className="badge-tag sim-tag">SIMULATED ACTION</span>
                    </div>

                    <div className="execution-steps-list">
                      <div className="exec-step-item">
                        <CheckCircle2 size={16} className="green-icon" />
                        <span>Approval received from operator</span>
                      </div>
                      <div className="exec-step-item">
                        <CheckCircle2 size={16} className="green-icon" />
                        <span>Rollback requested via Tool Gateway</span>
                      </div>
                      <div className="exec-step-item">
                        <CheckCircle2 size={16} className="green-icon" />
                        <span>Deployment rollback started (payments-api v2.8.4 → v2.8.3)</span>
                      </div>
                      <div className="exec-step-item">
                        <CheckCircle2 size={16} className="green-icon" />
                        <span>Pods restarting on verified stable image</span>
                      </div>
                      <div className="exec-step-item">
                        <CheckCircle2 size={16} className="green-icon" />
                        <span>New version becoming healthy (8/8 replicas ready)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SECTION 12: VERIFICATION PANEL */}
                {currentIncident.verification && currentIncident.verification.after && (
                  <div className="verification-card panel">
                    <div className="panel-header">
                      <div className="verif-title">
                        <ShieldCheck size={22} className="teal-icon" />
                        <div>
                          <h3>Automated Telemetry Verification: {currentIncident.verification.status}</h3>
                          <span className="verif-sub">{currentIncident.verification.summary}</span>
                        </div>
                      </div>
                      <span className="badge-tag live-badge">SIMULATED ENVIRONMENT</span>
                    </div>

                    <div className="metrics-comparison-table">
                      <div className="metric-row header-row">
                        <span>METRIC</span>
                        <span>BEFORE (INITIAL)</span>
                        <span>ATTEMPT 1 (RESTART)</span>
                        <span>AFTER (ROLLBACK)</span>
                        <span>VERDICT</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-name">HTTP 500 Rate</span>
                        <span className="metric-val danger">17.2%</span>
                        <span className="metric-val danger">16.8%</span>
                        <span className="metric-val success">0.4%</span>
                        <span className="verdict passed"><Check size={14} /> PASSED</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-name">Pod Health</span>
                        <span className="metric-val danger">3/8 healthy</span>
                        <span className="metric-val danger">3/8 healthy</span>
                        <span className="metric-val success">8/8 healthy</span>
                        <span className="verdict passed"><Check size={14} /> PASSED</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-name">Database Errors</span>
                        <span className="metric-val danger">124/min</span>
                        <span className="metric-val danger">120/min</span>
                        <span className="metric-val success">2/min</span>
                        <span className="verdict passed"><Check size={14} /> PASSED</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-name">Deployment Version</span>
                        <span className="metric-val warning">v2.8.4</span>
                        <span className="metric-val warning">v2.8.4</span>
                        <span className="metric-val success">v2.8.3</span>
                        <span className="verdict passed"><Check size={14} /> PASSED</span>
                      </div>
                    </div>

                    <div className="verification-footer">
                      <CheckCircle2 size={16} className="teal-icon" />
                      <strong>✓ Recovery verified:</strong>
                      <span>All 4 telemetry criteria satisfied. Incident marked RESOLVED.</span>
                    </div>
                  </div>
                )}

                {/* 4. SECTION 14: MEMORY UPDATED NOTIFICATION */}
                {currentIncident.status === "RESOLVED" && (
                  <div className="memory-updated-banner panel">
                    <div className="mem-up-header">
                      <Database size={18} className="teal-icon" />
                      <h4>MEMORY UPDATED (Vectorize Hindsight)</h4>
                    </div>

                    <div className="mem-checklist">
                      <div className="mem-check-item">
                        <Check size={16} className="green-icon" />
                        <span>Incident pattern stored</span>
                      </div>
                      <div className="mem-check-item">
                        <Check size={16} className="green-icon" />
                        <span>Root cause stored (connection pool config regression in v2.8.4)</span>
                      </div>
                      <div className="mem-check-item">
                        <Check size={16} className="green-icon" />
                        <span>Successful remediation stored (rollback to v2.8.3)</span>
                      </div>
                      <div className="mem-check-item">
                        <Check size={16} className="green-icon" />
                        <span>Failed attempt stored (Attempt 1: pod restart ineffective)</span>
                      </div>
                      <div className="mem-check-item">
                        <Check size={16} className="green-icon" />
                        <span>Verification result stored (HTTP 500: 17.2% → 0.4%)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TWO-COLUMN RESULTS GRID: Hypotheses & Summary */}
                <div className="results-grid">
                  {/* Left Column: Hypotheses */}
                  <div className="panel hypothesis-panel">
                    <div className="panel-header">
                      <div>
                        <span className="panel-label">AGENT HYPOTHESES</span>
                        <h3>Ranked Probable Causes</h3>
                      </div>
                      <Brain size={20} className="teal-icon" />
                    </div>

                    <div className="hypotheses-list">
                      {currentIncident.hypotheses?.map((hyp, idx) => (
                        <div key={idx} className="hypothesis-item">
                          <div className="hyp-header">
                            <span className="hyp-rank">{idx + 1}</span>
                            <span className="hyp-title">{hyp.title}</span>
                            <span className="hyp-prob">{hyp.probability}%</span>
                          </div>

                          <div className="meter-bar">
                            <div
                              className="meter-fill"
                              style={{ width: `${hyp.probability}%` }}
                            ></div>
                          </div>

                          <p className="hyp-rationale">{hyp.rationale}</p>

                          {hyp.supportingEvidence?.length > 0 && (
                            <div className="hyp-evidence-mini">
                              <strong>Supporting Evidence:</strong>
                              <ul>
                                {hyp.supportingEvidence.map((ev, ei) => (
                                  <li key={ei}>✓ {ev}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="root-cause-banner">
                      <strong>Determined Root Cause:</strong>
                      <p>{currentIncident.rootCause}</p>
                    </div>
                  </div>

                  {/* Right Column: Remediation Details & Report CTA */}
                  <div className="panel plan-panel">
                    <div className="panel-header">
                      <div>
                        <span className="panel-label">AUTONOMOUS LIFECYCLE SUMMARY</span>
                        <h3>Incident Resolution Status</h3>
                      </div>
                      <ShieldCheck size={20} className="teal-icon" />
                    </div>

                    <div className="plan-content">
                      <div className="status-summary-card">
                        <div className="sum-item">
                          <label>Incident ID:</label>
                          <span>{currentIncident.id}</span>
                        </div>
                        <div className="sum-item">
                          <label>Affected Service:</label>
                          <span>{currentIncident.service} ({currentIncident.environment})</span>
                        </div>
                        <div className="sum-item">
                          <label>Lifecycle Status:</label>
                          <span className={`status-pill ${currentIncident.status.toLowerCase()}`}>
                            {currentIncident.status}
                          </span>
                        </div>
                        <div className="sum-item">
                          <label>Remediation Attempted:</label>
                          <span>Attempt 1: restart_pod (Failed) → Attempt 2: rollback_deployment (Success)</span>
                        </div>
                        <div className="sum-item">
                          <label>Hindsight Memories Recalled:</label>
                          <span>{currentIncident.memoryCount} relevant experiences</span>
                        </div>
                      </div>

                      {currentIncident.report && (
                        <div className="report-cta-box">
                          <FileText size={24} className="teal-icon" />
                          <div>
                            <strong>Post-Mortem Incident Report Ready</strong>
                            <p>Complete executive post-mortem documented with timeline, root cause, and verification.</p>
                          </div>
                          <div className="report-btn-group">
                            <button className="primary-btn" onClick={() => setShowReportModal(true)}>
                              <Eye size={14} />
                              VIEW INCIDENT REPORT
                            </button>
                            <button className="secondary-btn" onClick={exportReportAsMarkdown}>
                              <Download size={14} />
                              EXPORT REPORT
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SECTION 6 "TOOLS USED" INTERACTIVE PANEL */}
            {activeTab === "tools_used" && (
              <div className="tab-content">
                <div className="panel tools-used-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-label">SECTION 6 · TOOLS USED</span>
                      <h3>Connected Engineering Tools Invoked by Agent</h3>
                    </div>
                    <Terminal size={20} className="teal-icon" />
                  </div>

                  <p className="panel-sub-desc">
                    Click any tool to inspect exact parameters, status, output result, and execution mode.
                  </p>

                  <div className="tools-used-grid">
                    {currentIncident.toolsUsed?.map((tu, idx) => (
                      <div
                        key={idx}
                        className="tool-used-card"
                        onClick={() => setSelectedToolModal(tu)}
                      >
                        <div className="tu-header">
                          <span className="tu-name">{tu.name}</span>
                          <span className="tu-check">✓</span>
                        </div>

                        <div className="tu-tool-call">
                          <code>{tu.tool}</code>
                        </div>

                        <p className="tu-snippet">{tu.result?.slice(0, 80)}...</p>

                        <div className="tu-footer">
                          <span className="tu-mode">[{tu.mode}]</span>
                          <span className="tu-click">Click to view output →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SECTION 7 EVIDENCE PANEL */}
            {activeTab === "evidence" && (
              <div className="tab-content">
                <div className="panel evidence-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-label">SECTION 7 · EVIDENCE</span>
                      <h3>Collected Telemetry & Observations</h3>
                    </div>
                    <Activity size={20} className="teal-icon" />
                  </div>

                  <div className="evidence-list">
                    {currentIncident.evidence?.map((ev, idx) => (
                      <div key={idx} className="evidence-card">
                        <div className="ev-icon-wrapper">
                          <CheckCircle2 size={18} className="teal-icon" />
                        </div>
                        <div className="ev-details">
                          <div className="ev-header">
                            <span className="ev-source">{ev.source}</span>
                            <span className="ev-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="ev-desc">{ev.description}</p>
                          <span className="ev-relevance">Relevance: {ev.relevance}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: HINDSIGHT MEMORY */}
            {activeTab === "memory" && (
              <div className="tab-content">
                <div className="panel memory-browser-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-label">SECTION 14 · HINDSIGHT MEMORY BANK</span>
                      <h3>Recalled Incident Experiences ({currentIncident.memoryCount})</h3>
                    </div>
                    <Database size={20} className="teal-icon" />
                  </div>

                  <div className="memory-grid">
                    {currentIncident.memories?.map((mem, idx) => (
                      <div key={idx} className="memory-card-full">
                        <div className="mem-top">
                          <span className="mem-id">MEMORY #{idx + 1}</span>
                          <span className="sim-score">Similarity: {mem.similarity}%</span>
                        </div>

                        <div className="mem-section">
                          <strong>Previous Root Cause:</strong>
                          <p>{mem.extractedSummary?.rootCause}</p>
                        </div>

                        <div className="mem-section">
                          <strong>Previous Resolution:</strong>
                          <p>{mem.extractedSummary?.resolution}</p>
                        </div>

                        <div className="mem-section preference">
                          <strong>Learned Preference:</strong>
                          <p>{mem.extractedSummary?.preference}</p>
                        </div>

                        <div className="mem-raw">
                          <pre>{mem.text.slice(0, 180)}...</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SECTION 15 AUDIT TRAIL */}
            {activeTab === "timeline" && (
              <div className="tab-content">
                <div className="panel audit-panel">
                  <div className="panel-header">
                    <div>
                      <span className="panel-label">SECTION 15 · AUDIT TRAIL</span>
                      <h3>Chronological System Audit Events</h3>
                    </div>
                    <Clock3 size={20} className="teal-icon" />
                  </div>

                  <div className="audit-table-wrapper">
                    <div className="audit-table-row header">
                      <span>TIME</span>
                      <span>AGENT</span>
                      <span>TOOL</span>
                      <span>ACTION</span>
                      <span>RISK</span>
                      <span>APPROVAL</span>
                      <span>RESULT</span>
                    </div>

                    {currentIncident.events?.map((ev, idx) => (
                      <div key={idx} className="audit-table-row">
                        <span className="audit-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                        <span className="audit-agent">ResolveIQ</span>
                        <span className="audit-tool"><code>{ev.tool || "orchestrator"}</code></span>
                        <span className="audit-action">{ev.title}</span>
                        <span className="audit-risk">{ev.phase === "REMEDIATION" ? "L1" : ev.phase === "EXECUTION" ? "L2" : "L0"}</span>
                        <span className="audit-approval">{ev.phase === "EXECUTION" ? "Approved" : "Auto"}</span>
                        <span className="audit-result success">Success</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: TOOL DETAILS DRAWER (Section 6) */}
        {selectedToolModal && (
          <div className="modal-backdrop" onClick={() => setSelectedToolModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-label">TOOL EXECUTION INSPECTION</span>
                  <h3>{selectedToolModal.name}</h3>
                </div>
                <button className="close-btn" onClick={() => setSelectedToolModal(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-row">
                  <label>Tool:</label>
                  <code>{selectedToolModal.tool}</code>
                </div>
                <div className="modal-row">
                  <label>Status:</label>
                  <span className="badge-success">{selectedToolModal.status}</span>
                </div>
                <div className="modal-row">
                  <label>Mode:</label>
                  <span className="badge-sim">{selectedToolModal.mode}</span>
                </div>
                <div className="modal-row">
                  <label>Duration:</label>
                  <span>{selectedToolModal.duration} ms</span>
                </div>
                <div className="modal-row">
                  <label>Timestamp:</label>
                  <span>{new Date(selectedToolModal.timestamp).toLocaleString()}</span>
                </div>

                <div className="modal-result-block">
                  <label>Result Output:</label>
                  <pre>{selectedToolModal.result}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: INCIDENT REPORT MODAL (Section 16) */}
        {showReportModal && currentIncident?.report && (
          <div className="modal-backdrop" onClick={() => setShowReportModal(false)}>
            <div className="modal-card report-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-label">SECTION 16 · RESOLVEIQ INCIDENT REPORT</span>
                  <h3>Incident Post-Mortem: {currentIncident.id}</h3>
                </div>
                <div className="modal-actions-right">
                  <button className="secondary-btn" onClick={exportReportAsMarkdown}>
                    <Download size={14} />
                    EXPORT REPORT (.MD)
                  </button>
                  <button className="close-btn" onClick={() => setShowReportModal(false)}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="modal-body report-markdown-viewer">
                <pre>{currentIncident.report}</pre>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        <div>
          <strong>ResolveIQ</strong> · Autonomous AI Engineering / Error Resolution Agent
        </div>
        <div>
          Hindsight Vector Memory + Tool Gateway + Automated Telemetry Verification
        </div>
      </footer>
    </div>
  );
}

export default App;
