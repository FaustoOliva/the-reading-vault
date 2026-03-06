export class HealthController {
  constructor(pgClient, container) {
    this.pgClient = pgClient;
    this.container = container;
  }

  async healthCheck(req, res) {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {},
    };

    // Database check
    try {
      await this.pgClient.getPool().query("SELECT 1");
      health.services.database = { status: "connected" };
    } catch (error) {
      health.services.database = { status: "error", message: error.message };
      health.status = "degraded";
    }

    // OpenAI check (optional - doesn't degrade overall status)
    try {
      const openAIClient = this.container.instances.get("openAIClient");
      const openAIHealth = await openAIClient.checkHealth();
      health.services.openai = {
        status: "connected",
        model: openAIHealth.model,
        organization: openAIHealth.organization || "N/A",
      };
    } catch (error) {
      health.services.openai = {
        status: "unavailable",
        message: error.message,
      };
      // Don't degrade overall status - OpenAI is optional
    }

    // Reader profile check
    try {
      const aiContextRepository = this.container.getRepository(
        "aiContextRepository",
      );
      const profile = await aiContextRepository.getReaderProfile();

      if (!profile) {
        health.services.readerProfile = {
          status: "not_initialized",
          version: 0,
          schemaVersion: 0,
        };
      } else {
        // Repository already returns parsed profileData
        health.services.readerProfile = {
          status: "ready",
          version: profile.version,
          schemaVersion: profile.profileData.schemaVersion,
          lastUpdated: profile.lastUpdated,
          lastRefreshReason: profile.lastRefreshReason || null,
          hasSemanticSummary: !!profile.semanticSummary,
          tokensUsed: profile.tokensUsed || 0,
        };
      }
    } catch (error) {
      health.services.readerProfile = {
        status: "error",
        message: error.message,
      };
      health.status = "degraded";
    }

    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  }
}
