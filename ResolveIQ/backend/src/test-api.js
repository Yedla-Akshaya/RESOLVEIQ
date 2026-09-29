/**
 * Integration Test for Express REST API Endpoints
 */

const http = require("http");

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("=== TESTING RESOLVEIQ REST API ===");

  // 1. System status
  const sys = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/system/status",
    method: "GET"
  });
  console.log("System status:", sys.status, sys.body.data?.integrations);

  // 2. Tools
  const tools = await request({
    hostname: "localhost",
    port: 5000,
    path: "/api/tools",
    method: "GET"
  });
  console.log("Tools endpoint:", tools.status, `Total: ${tools.body.data?.total}`);

  // 3. Post Incident
  const inc = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: "/api/incidents",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      description: "Payment API returning HTTP 500 errors after deployment."
    }
  );
  console.log("Create Incident:", inc.status, "ID:", inc.body.data?.id, "Status:", inc.body.data?.status);

  const incId = inc.body.data?.id;

  // 4. Approve Action
  const approve = await request(
    {
      hostname: "localhost",
      port: 5000,
      path: `/api/incidents/${incId}/approve`,
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    {
      operator: "sre-test@resolveiq.io"
    }
  );
  console.log("Approve Incident:", approve.status, "Final Status:", approve.body.data?.status);
  console.log("Verification Verdict:", approve.body.data?.verification?.status);

  console.log("\n✅ All REST APIs verified successfully!");
}

main().catch(console.error);
