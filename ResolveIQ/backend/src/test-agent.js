const { resolveIncident } = require("./agent");

async function main() {

  const incident = `
  Payment API is returning HTTP 500 errors again.
  The error rate increased to 18%.
  Database connections are also approaching the configured limit.
  `;

  await resolveIncident(incident);
}

main().catch((error) => {
  console.error("\n❌ AGENT ERROR:");
  console.error(error);
});