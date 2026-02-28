/**
 * seedReaderProfile
 * Seeds initial reader profile on server startup if not exists
 *
 * Purpose:
 * - Ensure profile exists on first startup
 * - Graceful degradation: server starts even if seed fails
 * - Non-blocking: OpenAI failures don't prevent startup
 */

export async function seedReaderProfile(getReaderProfileService) {
  try {
    console.log("📊 Checking reader profile...");

    // This will auto-create profile if missing via execute()
    const profile = await getReaderProfileService.execute();

    if (profile) {
      console.log(
        `✅ Reader profile ready (version ${profile.version}, schema v${profile.schemaVersion})`,
      );
    } else {
      console.log("✅ Reader profile initialized");
    }
  } catch (error) {
    // Graceful degradation: seed failures don't prevent startup
    console.warn("⚠️ Failed to seed reader profile:", error.message);
    console.warn(
      "   Server will continue, profile will be created on first relevant event.",
    );
  }
}
