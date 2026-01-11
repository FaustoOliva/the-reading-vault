import DatabaseConfig from "../../infrastructure/database/DatabaseConfig";

export class GetHealthStatus {
  async execute(): Promise<{ db: string; status: string }> {
    try {
      const pool = await DatabaseConfig.getPool();
      // simple query to validate connection
      await pool.request().query("SELECT 1 AS status");
      return { db: "ok", status: "connected" };
    } catch (error) {
      return { db: "error", status: "disconnected" };
    }
  }
}
