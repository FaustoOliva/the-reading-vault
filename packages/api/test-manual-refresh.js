/**
 * Manual test script to verify reader profile refresh
 * Run: node test-manual-refresh.js
 */

import "dotenv/config";
import { DIContainer } from "./config/container.js";

async function testOpenAIDirectly() {
  console.log("\n=== TESTING OPENAI CLIENT DIRECTLY ===\n");

  const container = new DIContainer();
  container.bootstrap();

  const openAIClient = container.instances.get("openAIClient");

  console.log("Config:");
  console.log(
    `  API Key: ${openAIClient.apiKey ? `${openAIClient.apiKey.substring(0, 10)}...` : "NOT SET"}`,
  );
  console.log(`  Model: ${openAIClient.model}`);
  console.log(`  Timeout: ${openAIClient.timeout}ms`);
  console.log("");

  if (!openAIClient.apiKey || openAIClient.apiKey === "your-api-key-here") {
    console.error("❌ OPENAI_API_KEY is not configured in .env");
    console.log("\nAdd to .env file:");
    console.log("OPENAI_API_KEY=sk-proj-...");
    return;
  }

  try {
    console.log("Testing OpenAI health check...");
    const health = await openAIClient.checkHealth();
    console.log("✅ OpenAI connection OK");
    console.log(`   Model: ${health.model}`);
    console.log(`   Organization: ${health.organization || "N/A"}`);
  } catch (error) {
    console.error("❌ OpenAI health check failed:");
    console.error(`   Type: ${error.name}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
    console.error(`\n   Stack: ${error.stack}`);
    return;
  }

  console.log("\nTesting profile summary generation...");
  const testProfile = {
    statistics: {
      totalBooks: 10,
      completedBooks: 8,
      readingBooks: 1,
      abandonedBooks: 1,
      wishlistBooks: 0,
      completionRate: 80.0,
      booksRated: 8,
      avgScore: 7.5,
    },
    topAuthors: [
      {
        name: "Test Author",
        nationality: "Argentina",
        bookCount: 3,
        avgScore: 8,
      },
    ],
    topCountries: [{ name: "Argentina", bookCount: 5 }],
    favoriteBooks: [{ title: "Test Book", author: "Test Author", score: 9 }],
    abandonedBooks: [],
  };

  try {
    const result = await openAIClient.generateProfileSummary(testProfile);
    console.log("✅ Summary generated successfully!");
    console.log(`   Tokens used: ${result.tokensUsed}`);
    console.log(`   Summary:\n   ${result.summary}`);
  } catch (error) {
    console.error("❌ Summary generation failed:");
    console.error(`   Type: ${error.name}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    if (error.details) {
      console.error(`   Details: ${error.details}`);
    }
  }
}

async function testRefresh() {
  console.log("\n=== Testing Reader Profile Refresh ===\n");

  const container = new DIContainer();
  container.bootstrap();

  const database = container.getDatabase();
  await database.connect();

  try {
    const service = container.getService("getReaderProfileService");

    console.log("1. Getting current profile...");
    const beforeProfile = await service.execute();
    console.log(`   Version: ${beforeProfile.version}`);
    console.log(`   Has semantic summary: ${!!beforeProfile.semanticSummary}`);
    console.log(`   Tokens used: ${beforeProfile.tokensUsed || 0}`);

    console.log("\n2. Forcing refresh (reason: book_completed)...");
    const refreshResult = await service.refreshIfNeeded({
      event: "book_completed",
      bookId: 1,
    });

    console.log(`   Refresh result:`, refreshResult);

    console.log("\n3. Getting updated profile...");
    const afterProfile = await service.execute();
    console.log(`   Version: ${afterProfile.version}`);
    console.log(`   Has semantic summary: ${!!afterProfile.semanticSummary}`);
    console.log(`   Tokens used: ${afterProfile.tokensUsed || 0}`);

    if (afterProfile.semanticSummary) {
      console.log("\n✅ Semantic Summary Generated:");
      console.log("---");
      console.log(afterProfile.semanticSummary);
      console.log("---");
    } else {
      console.log("\n⚠️ No semantic summary generated");
      console.log("   Check logs above for errors");
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await database.disconnect();
  }
}

// Run both tests
async function runAll() {
  await testOpenAIDirectly();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await testRefresh();
}

runAll();
