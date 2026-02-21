import sql from "mssql";

export class HealthController {
  async healthCheck(req, res) {
    const dbStatus = sql.connect
      ? "Database connected"
      : "Database disconnected";
    res.json({
      status: "OK",
      timestamp: new Date(),
      uptime: process.uptime(),
      db: dbStatus,
    });
  }
}
