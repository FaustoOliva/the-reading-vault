/**
 * Environment configuration validator and loader
 * Validates required environment variables on startup
 */

const requiredEnvVars = [
  "DB_USER",
  "DB_PASSWORD",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "ALLOWED_ORIGINS",
];

const optionalEnvVars = {
  DB_ENCRYPT: false,
  DB_TRUST_CERT: true,
  NODE_ENV: "development",
};

function toBool(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
}

export function validateEnv() {
  const missing = [];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        `Please check your .env file and ensure all required variables are set.`,
    );
  }
}

export const config = {
  port: parseInt(
    process.env.PORT || process.env.SERVER_PORT || optionalEnvVars.PORT,
    10,
  ),

  database: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    options: {
      encrypt: toBool(process.env.DB_ENCRYPT, optionalEnvVars.DB_ENCRYPT),
      trustServerCertificate: toBool(
        process.env.DB_TRUST_CERT,
        optionalEnvVars.DB_TRUST_CERT,
      ),
    },
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : ["http://localhost:3000"],
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.4"),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "500", 10),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || "15000", 10), // 15 seconds
  },

  nodeEnv: process.env.NODE_ENV || optionalEnvVars.NODE_ENV,

  isDevelopment: () => config.nodeEnv === "development",
  isProduction: () => config.nodeEnv === "production",
};
