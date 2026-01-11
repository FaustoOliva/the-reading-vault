import mssql, { ConnectionPool, config as MssqlConfig } from "mssql";

const env = process.env;

const buildConfig = (): MssqlConfig => {
  return {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    server: env.DB_HOST ?? "localhost",
    port: env.DB_PORT ? parseInt(env.DB_PORT, 10) : 1433,
    database: env.DB_NAME,
    options: {
      encrypt: env.DB_ENCRYPT === "true",
      trustServerCertificate: env.DB_TRUST_CERT === "true",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  } as MssqlConfig;
};

class DatabaseConfig {
  private static pool: ConnectionPool | null = null;

  public static async getPool(): Promise<ConnectionPool> {
    if (this.pool && this.pool.connected) return this.pool;

    const cfg = buildConfig();
    const pool = new mssql.ConnectionPool(cfg);
    const poolConnect = pool.connect();

    this.pool = pool;
    await poolConnect;
    return this.pool;
  }

  public static async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
      } finally {
        this.pool = null;
      }
    }
  }
}

export default DatabaseConfig;
