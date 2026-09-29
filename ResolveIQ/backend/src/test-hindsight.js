require("dotenv").config();

const { HindsightClient } = require("@vectorize-io/hindsight-client");

const client = new HindsightClient({
  baseUrl: process.env.HINDSIGHT_BASE_URL,
  apiKey: process.env.HINDSIGHT_API_KEY,
});

async function testMemory() {
  const bankId = "resolveiq-demo";

  console.log("1. Storing incident memory...");

  await client.retain(
    bankId,
    `Incident: Payment API returned HTTP 500 errors.
    Environment: Production.
    Investigation: Database connection pool was exhausted.
    Resolution: Increased connection pool limit and restarted the service.
    Outcome: Payment API recovered.
    Engineer preference: Check database connection health before rolling back.`
  );

  console.log("Memory stored.");

  console.log("\n2. Recalling memory...");

  const result = await client.recall(
    bankId,
    "What previous payment API incidents and successful resolutions do we know?"
  );

  console.log("\nRECALLED MEMORIES:");

  result.results.forEach((memory, index) => {
    console.log(`\n${index + 1}. [${memory.type}]`);
    console.log(memory.text);
  });
}

testMemory().catch((error) => {
  console.error("\nHINDSIGHT ERROR:");
  console.error(error);
});