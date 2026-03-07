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

    // Create only if profile is missing and minimum requirement is met.
    const profile = await getReaderProfileService.execute({
      createIfEligible: true,
    });

    if (profile) {
      console.log(
        `✅ Reader profile ready (version ${profile.version}, schema v${profile.schemaVersion})`,
      );
    } else {
      const requirement =
        await getReaderProfileService.getMinimumRequirementStatus();
      console.log(
        `ℹ️ Reader profile not created yet (${requirement.current}/${requirement.required} completed or abandoned books).`,
      );
    }
  } catch (error) {
    // Graceful degradation: seed failures don't prevent startup
    console.warn("⚠️ Failed to seed reader profile:", error.message);
    console.warn(
      "   Server will continue, profile will be created on first relevant event.",
    );
  }
}
