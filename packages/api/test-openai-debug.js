/**
 * Debug script to identify exactly where toFixed() fails
 */

import "dotenv/config";
import { DIContainer } from "./config/container.js";

async function debugPromptBuilder() {
  console.log("\n=== DEBUGGING PROMPT BUILDER ===\n");

  const container = new DIContainer();
  container.bootstrap();

  const database = container.getDatabase();
  await database.connect();

  try {
    // Get real profile data
    const aiContextRepository = container.getRepository("aiContextRepository");
    const profileData = await aiContextRepository.calculateReaderProfile();

    console.log("=== RAW PROFILE DATA ===\n");
    console.log(JSON.stringify(profileData, null, 2));

    console.log("\n=== TESTING EACH FIELD ===\n");

    // Test statistics
    console.log("Statistics:");
    console.log(
      `  completedBooks: ${profileData.statistics.completedBooks} (type: ${typeof profileData.statistics.completedBooks})`,
    );
    console.log(
      `  completionRate: ${profileData.statistics.completionRate} (type: ${typeof profileData.statistics.completionRate})`,
    );
    console.log(
      `  avgScore: ${profileData.statistics.avgScore} (type: ${typeof profileData.statistics.avgScore})`,
    );

    try {
      const rate = profileData.statistics.completionRate.toFixed(1);
      console.log(`  ✅ completionRate.toFixed(1) = ${rate}`);
    } catch (e) {
      console.error(`  ❌ completionRate.toFixed(1) FAILED: ${e.message}`);
    }

    try {
      const score =
        profileData.statistics.avgScore !== null &&
        profileData.statistics.avgScore !== undefined
          ? profileData.statistics.avgScore.toFixed(1)
          : "N/A";
      console.log(`  ✅ avgScore formatted = ${score}`);
    } catch (e) {
      console.error(`  ❌ avgScore.toFixed(1) FAILED: ${e.message}`);
    }

    // Test top authors
    console.log("\nTop Authors:");
    profileData.topAuthors.forEach((author, idx) => {
      console.log(`  [${idx}] ${author.name}`);
      console.log(
        `      bookCount: ${author.bookCount} (type: ${typeof author.bookCount})`,
      );
      console.log(
        `      avgScore: ${author.avgScore} (type: ${typeof author.avgScore})`,
      );

      try {
        const avgScoreText =
          author.avgScore !== null && author.avgScore !== undefined
            ? author.avgScore.toFixed(1)
            : "N/A";
        console.log(`      ✅ avgScore formatted = ${avgScoreText}`);
      } catch (e) {
        console.error(`      ❌ avgScore.toFixed(1) FAILED: ${e.message}`);
      }
    });

    // Now try building the prompt
    console.log("\n=== TESTING PROMPT BUILDER ===\n");
    const openAIClient = container.instances.get("openAIClient");

    try {
      const prompt = openAIClient._buildProfileSummaryPrompt(profileData);
      console.log("✅ Prompt built successfully!");
      console.log("\n--- GENERATED PROMPT ---");
      console.log(prompt);
      console.log("--- END PROMPT ---\n");
    } catch (e) {
      console.error("❌ Prompt builder FAILED:");
      console.error(`   Error: ${e.message}`);
      console.error(`   Stack: ${e.stack}`);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await database.disconnect();
  }
}

debugPromptBuilder();
