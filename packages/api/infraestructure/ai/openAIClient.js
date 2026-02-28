/**
 * OpenAIClient
 * Handles integration with OpenAI API for AI-powered features
 *
 * Responsibilities:
 * - Generate narrative summaries from structured profile data
 * - Generate book recommendations based on reader profile
 * - Manage API communication with proper error handling
 * - Track token usage for cost monitoring
 *
 * Rules:
 * - Graceful degradation: failures should not block profile save
 * - Cost controls: profile (temp 0.4, tokens 500), recommendations (temp 0.7, tokens 1200)
 * - MVP: generateProfileSummary() + recommendBooks()
 *
 * Phase: MVP (Phase 1 + Phase 5.1)
 */

import {
  OpenAIUnavailableError,
  OpenAITimeoutError,
  OpenAIRateLimitError,
  OpenAIInvalidAPIKeyError,
} from "../../errors/domain/openAIErrors.js";

export class OpenAIClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gpt-3.5-turbo";
    this.temperature = config.temperature || 0.4;
    this.maxTokens = config.maxTokens || 500;
    this.timeout = config.timeout || 15000; // 15 seconds
  }

  /**
   * Generate narrative summary from structured profile data
   * @param {Object} profileData - MVP profile structure
   * @returns {Promise<{summary: string, tokensUsed: number}>}
   * @throws {OpenAIUnavailableError} - Connection failed
   * @throws {OpenAITimeoutError} - Request timeout
   * @throws {OpenAIRateLimitError} - Rate limit exceeded
   * @throws {OpenAIInvalidAPIKeyError} - Invalid API key
   */
  async generateProfileSummary(profileData) {
    const systemPrompt =
      "Eres un analista literario experto en identificar patrones de lectura ocultos y generar insights accionables para sistemas de recomendación. Tu objetivo es encontrar preferencias subyacentes, no simplemente repetir estadísticas.";
    const userPrompt = this._buildProfileSummaryPrompt(profileData);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (response.status === 401) {
        throw new OpenAIInvalidAPIKeyError();
      }

      if (response.status === 429) {
        throw new OpenAIRateLimitError();
      }

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        summary: data.choices[0].message.content.trim(),
        tokensUsed: data.usage.total_tokens,
      };
    } catch (error) {
      // Handle timeout
      if (error.name === "AbortError") {
        throw new OpenAITimeoutError(this.timeout);
      }

      // Re-throw domain errors
      if (
        error instanceof OpenAIInvalidAPIKeyError ||
        error instanceof OpenAIRateLimitError
      ) {
        throw error;
      }

      // Wrap other errors as unavailable
      throw new OpenAIUnavailableError(error.message);
    }
  }

  /**
   * Generate book recommendations based on reader profile
   * @param {Object} input - { type: 'semantic'|'structured', summary?:string, data?: Object, abandonedBooks?: Array }
   * @returns {Promise<{recommendations: Array, tokensUsed: number}>}
   * @throws {OpenAIUnavailableError} - Connection failed
   * @throws {OpenAITimeoutError} - Request timeout
   * @throws {OpenAIRateLimitError} - Rate limit exceeded
   * @throws {OpenAIInvalidAPIKeyError} - Invalid API key
   */
  async recommendBooks(input) {
    const systemPrompt =
      "Eres un experto curador literario con conocimiento profundo de ficción contemporánea, clásicos y literatura global. " +
      "Tu objetivo es recomendar libros altamente compatibles basándote en el perfil de lectura del usuario, evitando sugerencias genéricas.";

    const userPrompt = this._buildRecommendationPrompt(input);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7, // Higher for creative diversity
            max_tokens: 1200, // ~3-5 recommendations with reasoning
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      // Handle HTTP errors (reuse existing pattern)
      if (response.status === 401) {
        throw new OpenAIInvalidAPIKeyError();
      }

      if (response.status === 429) {
        throw new OpenAIRateLimitError();
      }

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content.trim());

      return {
        recommendations: parsed.recommendations,
        tokensUsed: data.usage.total_tokens,
      };
    } catch (error) {
      // Handle timeout
      if (error.name === "AbortError") {
        throw new OpenAITimeoutError(this.timeout);
      }

      // Re-throw domain errors
      if (
        error instanceof OpenAIInvalidAPIKeyError ||
        error instanceof OpenAIRateLimitError
      ) {
        throw error;
      }

      // Wrap other errors as unavailable
      throw new OpenAIUnavailableError(error.message);
    }
  }

  /**
   * Build prompt for profile summary generation (MVP)
   * @private
   * @param {Object} profile - MVP profile data
   * @returns {string} Formatted prompt
   */
  _buildProfileSummaryPrompt(profile) {
    // Format top authors
    const topAuthors =
      profile.topAuthors && profile.topAuthors.length > 0
        ? profile.topAuthors
            .slice(0, 3)
            .map((a) => {
              const avgScoreText =
                a.avgScore !== null && a.avgScore !== undefined
                  ? a.avgScore.toFixed(1)
                  : "N/A";
              return `${a.name} (${a.bookCount} libros, promedio: ${avgScoreText})`;
            })
            .join(", ")
        : "Ninguno aún";

    // Format top countries
    const topCountries =
      profile.topCountries && profile.topCountries.length > 0
        ? profile.topCountries
            .slice(0, 3)
            .map((c) => `${c.name} (${c.bookCount} libros)`)
            .join(", ")
        : "N/A";

    // Format favorite books
    const favoriteBooks =
      profile.favoriteBooks && profile.favoriteBooks.length > 0
        ? profile.favoriteBooks
            .slice(0, 3)
            .map((b) => `"${b.title}" por ${b.author} (${b.score}/10)`)
            .join(", ")
        : "Ninguno aún";

    // Format statistics avgScore
    const avgScoreText =
      profile.statistics.avgScore !== null &&
      profile.statistics.avgScore !== undefined
        ? profile.statistics.avgScore.toFixed(1)
        : "N/A";

    // Format abandoned books for anti-patterns
    const abandonedList =
      profile.abandonedBooks && profile.abandonedBooks.length > 0
        ? profile.abandonedBooks
            .map((b) => `"${b.title}" (${b.author})`)
            .join(", ")
        : "Ninguno";

    return `Analiza este perfil de lectura e identifica patrones ocultos y preferencias subyacentes.

DATOS CLAVE:
${profile.statistics.completedBooks} libros completados (${profile.statistics.completionRate.toFixed(1)}% tasa), score promedio ${avgScoreText}
Autores destacados: ${topAuthors}
Países: ${topCountries}
Favoritos: ${favoriteBooks}
Abandonados: ${abandonedList}

INSTRUCCIONES - IMPORTANTE:
❌ NO repitas las estadísticas ni los datos de entrada
❌ NO hagas listas descriptivas de lo obvio
✅ IDENTIFICA patrones temáticos, de género o estilo narrativo común entre sus autores favoritos
✅ DEDUCE qué busca este lector (¿tensión psicológica? ¿realismo sucio? ¿literatura existencial?)
✅ EXPLICA por qué podría haber abandonado ciertos libros (diferencias con sus favoritos)
✅ RECOMIENDA estrategias de filtrado para un sistema de recomendaciones (qué características priorizar)

Genera un análisis de máximo 250 palabras en español, tercera persona, tono profesional. Enfócate en insights accionables, no en reformular datos.`;
  }

  /**
   * Build recommendation prompt based on input type
   * @private
   * @param {Object} input - { type, summary?, data?, abandonedBooks? }
   * @returns {string} Formatted prompt
   */
  _buildRecommendationPrompt(input) {
    let contextSection;

    if (input.type === "semantic") {
      // ✅ Efficient mode: Use pre-analyzed summary
      const abandonedSection =
        input.abandonedBooks && input.abandonedBooks.length > 0
          ? `LIBROS ABANDONADOS (evitar similares):
${input.abandonedBooks.map((b) => `- "${b.title}" por ${b.author}`).join("\n")}`
          : "";

      contextSection = `ANÁLISIS DEL PERFIL:
${input.summary}

${abandonedSection}`;
    } else {
      // ⚠️ Fallback: Reconstruct from structured data
      const data = input.data;
      const topAuthors =
        data.topAuthors
          ?.slice(0, 3)
          .map((a) => `${a.name} (${a.bookCount} libros)`)
          .join(", ") || "N/A";

      const favorites =
        data.favoriteBooks
          ?.slice(0, 3)
          .map((b) => `"${b.title}" por ${b.author} (${b.score}/10)`)
          .join(", ") || "N/A";

      contextSection = `PREFERENCIAS DEL LECTOR:
- Autores favoritos: ${topAuthors}
- Libros mejor valorados: ${favorites}
- Score promedio: ${data.statistics?.avgScore?.toFixed(1) || "N/A"}
- Libros completados: ${data.statistics?.completedBooks || 0}`;
    }

    return `${contextSection}

INSTRUCCIONES:
- Recomienda 3-5 libros disponibles comercialmente (no inventes títulos)
- Prioriza libros que conecten con sus preferencias pero que NO sean obvios
- Evita repetir autores que ya tiene en su biblioteca
- Incluye mezcla de clásicos contemporáneos y obras recientes
- Para cada recomendación, justifica la compatibilidad específica

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendations": [
    {
      "title": "Título exacto del libro",
      "author": "Nombre del autor",
      "synopsis": "Sinopsis breve (2-3 oraciones) sin spoilers",
      "compatibilityScore": 85,
      "reasoning": "Explicación específica de por qué este libro encaja con su perfil (2-3 oraciones)"
    }
  ]
}

REGLAS:
- compatibilityScore debe ser número entero entre 60-95 (realista, no todos son perfectos)
- reasoning debe mencionar aspectos concretos del perfil del lector
- NO uses frases genéricas como "te gustará porque es similar a..."
- Asegura diversidad en los scores (no todos 90+)`;
  }

  /**
   * Check OpenAI API health and connectivity
   * @returns {Promise<{status: string, model: string, organization?: string}>}
   * @throws {OpenAIInvalidAPIKeyError} - Invalid API key
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new OpenAIInvalidAPIKeyError();
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      return {
        status: "ok",
        model: this.model,
        organization: response.headers.get("openai-organization") || undefined,
      };
    } catch (error) {
      if (error instanceof OpenAIInvalidAPIKeyError) {
        throw error;
      }

      throw new OpenAIUnavailableError(error.message);
    }
  }
}
