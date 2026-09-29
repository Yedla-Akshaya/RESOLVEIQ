/**
 * Structured Prompt Templates for ResolveIQ Agent Reasoning
 */

function buildClassificationPrompt(incidentText) {
  return `
You are ResolveIQ, an autonomous engineering incident response agent.
Analyze the following incident report and extract structured details.

INCIDENT:
"${incidentText}"

Respond ONLY with valid JSON in this exact structure:
{
  "service": "string (e.g. payments-api)",
  "environment": "string (e.g. production)",
  "severity": "P1-CRITICAL | P2-HIGH | P3-MEDIUM",
  "symptoms": ["string", "string"],
  "initialHypothesis": "brief string"
}
`.trim();
}

function buildHypothesisPrompt({ incidentText, evidenceList, memoriesText, toolsList }) {
  return `
You are ResolveIQ, an autonomous engineering error resolution agent.
You are investigating a live production incident using connected engineering systems.

CURRENT INCIDENT:
${incidentText}

COLLECTED TELEMETRY & EVIDENCE:
${evidenceList.map((e, i) => `${i + 1}. [${e.source}] ${e.description}`).join("\n")}

HISTORICAL EXPERIENCE FROM HINDSIGHT:
${memoriesText || "No previous experience recorded. Investigate purely from live telemetry."}

AVAILABLE CONNECTED TOOLS:
${toolsList.map((t) => `- ${t.name}: ${t.description} (Risk: Level ${t.riskLevel})`).join("\n")}

Your task:
1. Determine the probable root cause based on evidence and memories.
2. Generate ranked hypotheses with estimated probabilities (summing to 100).
3. Propose a targeted remediation plan specifying the exact tool to execute, risk level, and required engineer approval.

Respond ONLY with valid JSON matching this schema:
{
  "rootCause": "Detailed explanation of the exact technical failure",
  "hypotheses": [
    {
      "title": "Short title",
      "probability": 82,
      "rationale": "Evidence-backed rationale",
      "supportingEvidence": ["evidence 1", "evidence 2"]
    },
    {
      "title": "Alternative cause",
      "probability": 11,
      "rationale": "Why this is less likely",
      "supportingEvidence": []
    },
    {
      "title": "Third cause",
      "probability": 7,
      "rationale": "Why this is unlikely",
      "supportingEvidence": []
    }
  ],
  "recommendedAction": {
    "tool": "k8s_rollback_deployment",
    "params": {
      "deploymentName": "payments-api",
      "targetRevision": "v2.8.3"
    },
    "description": "Roll back payments-api from problematic v2.8.4 to stable release v2.8.3",
    "riskLevel": 2,
    "approvalRequired": true,
    "reason": "Recent commit fa891b restricted pool size and timeout causing request timeouts. Rollback restores proven configuration.",
    "expectedEffect": "Restores connection pool capacity to 100, drops error rate to <0.3%, recovers p99 latency.",
    "potentialRisk": "Transient pod rollout restart over ~15 seconds."
  },
  "verificationPlan": [
    "Check HTTP 5xx error rate drops below 1.0%",
    "Verify p99 latency recovers under 350ms",
    "Confirm 3/3 Kubernetes pod replicas are ready"
  ]
}
`.trim();
}

function buildIncidentReportPrompt({ incident, verification, actionsTaken, reportData }) {
  return `
Generate an executive Post-Incident Engineering Post-Mortem Report in GitHub Markdown format.

INCIDENT:
ID: ${incident.id}
Service: ${incident.service}
Environment: ${incident.environment}
Description: ${incident.description}

EVIDENCE & ROOT CAUSE:
${incident.evidence.map((e) => `- ${e.description}`).join("\n")}
Root Cause: ${reportData.rootCause || "Database pool exhaustion triggered by recent deployment change"}

ACTIONS EXECUTED:
${actionsTaken.map((a) => `- Executed: ${a.tool} (Risk: ${a.riskLevel}) -> Status: ${a.status}`).join("\n")}

VERIFICATION RESULT:
Status: ${verification?.status || "PASSED"}
Error Rate: ${verification?.before?.errorRate5xx}% -> ${verification?.after?.errorRate5xx}%
Latency: ${verification?.before?.latencyMs}ms -> ${verification?.after?.latencyMs}ms

Return a well-formatted markdown report including:
# Incident Post-Mortem: ${incident.id} - ${incident.service}
## Executive Summary
## Incident Timeline
## Root Cause Analysis
## Remediation Actions Executed
## Telemetry & Verification (Before vs After)
## Lessons Learned & Preventative Recommendations
`.trim();
}

module.exports = {
  buildClassificationPrompt,
  buildHypothesisPrompt,
  buildIncidentReportPrompt
};
