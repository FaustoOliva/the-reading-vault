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
   * Analyze book compatibility against reader profile
   * @param {Object} input - { profile: {type, summary?, data}, book }
   * @returns {Promise<{compatibility:Object, tokensUsed:number}>}
   */
  async analyzeBookSynergy(input) {
    const systemPrompt =
      "Eres un analista literario experto en match de perfiles de lectura. " +
      "Evalúa compatibilidad realista entre un libro específico y el perfil del lector.";

    const userPrompt = this._buildBookSynergyPrompt(input);
    const parsed = await this._executeJSONCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 900,
    });

    const score = Number(parsed?.compatibility?.score || 0);

    return {
      compatibility: {
        score,
        label: this._toCompatibilityLabel(score),
        reasoning:
          parsed?.compatibility?.reasoning ||
          "Insufficient evidence to explain compatibility.",
        positiveSignals: parsed?.compatibility?.positiveSignals || [],
        cautionSignals: parsed?.compatibility?.cautionSignals || [],
      },
      tokensUsed: parsed.tokensUsed,
    };
  }

  /**
   * Analyze author compatibility against reader profile
   * @param {Object} input - { profile: {type, summary?, data}, author, booksByAuthor }
   * @returns {Promise<{compatibility:Object, tokensUsed:number}>}
   */
  async analyzeAuthorSynergy(input) {
    const systemPrompt =
      "Eres un analista literario experto en afinidad autor-lector. " +
      "Evalúa de forma crítica si un autor encaja con el perfil del lector.";

    const userPrompt = this._buildAuthorSynergyPrompt(input);
    const parsed = await this._executeJSONCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxTokens: 900,
    });

    const score = Number(parsed?.compatibility?.score || 0);

    return {
      compatibility: {
        score,
        label: this._toCompatibilityLabel(score),
        reasoning:
          parsed?.compatibility?.reasoning ||
          "Insufficient evidence to explain compatibility.",
        positiveSignals: parsed?.compatibility?.positiveSignals || [],
        cautionSignals: parsed?.compatibility?.cautionSignals || [],
      },
      tokensUsed: parsed.tokensUsed,
    };
  }

  /**
   * Generate recommendations constrained to favorite authors
   * @param {Object} input - { profile: {type, summary?, data}, topAuthors, excludedBooks }
   * @returns {Promise<{recommendations:Array, tokensUsed:number}>}
   */
  async recommendBooksByFavoriteAuthors(input) {
    const systemPrompt =
      "Eres un curador literario experto en bibliografías de autores y secuenciación de lecturas. " +
      "Debes recomendar libros de autores ya leídos por el usuario, evitando repetir libros existentes.";

    const userPrompt = this._buildFavoriteAuthorsRecommendationPrompt(input);

    const parsed = await this._executeJSONCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      maxTokens: 1200,
    });

    return {
      recommendations: parsed.recommendations || [],
      tokensUsed: parsed.tokensUsed,
    };
  }

  async _executeJSONCompletion({
    systemPrompt,
    userPrompt,
    temperature,
    maxTokens,
  }) {
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
            temperature,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

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
        ...parsed,
        tokensUsed: data.usage.total_tokens,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new OpenAITimeoutError(this.timeout);
      }

      if (
        error instanceof OpenAIInvalidAPIKeyError ||
        error instanceof OpenAIRateLimitError
      ) {
        throw error;
      }

      throw new OpenAIUnavailableError(error.message);
    }
  }

  _toCompatibilityLabel(score) {
    if (score >= 85) return "very_high";
    if (score >= 70) return "high";
    if (score >= 50) return "moderate";
    return "low";
  }

  /**
   * Build prompt for profile summary generation (MVP)
   * @private
   * @param {Object} profile - MVP profile data
   * @returns {string} Formatted prompt
   */
  _buildProfileSummaryPrompt(profile) {
    const statistics = profile.statistics || {};
    const distributions = profile.distributions || {};
    const metadataSignals = profile.metadataSignals || {};

    const completedBooks = statistics.completedBooks || 0;
    const completionRate =
      statistics.completionRate !== null &&
      statistics.completionRate !== undefined
        ? Number(statistics.completionRate).toFixed(1)
        : "0.0";

    const averageScoreValue =
      statistics.averageScore !== null && statistics.averageScore !== undefined
        ? statistics.averageScore
        : statistics.avgScore;
    const averageScore =
      averageScoreValue !== null && averageScoreValue !== undefined
        ? Number(averageScoreValue).toFixed(1)
        : "N/A";

    const formatDistributionList = (items, limit = 5) => {
      if (!items || items.length === 0) {
        return "N/A";
      }

      return items
        .slice(0, limit)
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object") {
            const name = item.name || item.label || "N/A";
            const count = item.count ?? item.bookCount;
            return count !== null && count !== undefined
              ? `${name} (${count})`
              : name;
          }

          return String(item);
        })
        .join(", ");
    };

    const formatBooksList = (books, limit = 5) => {
      if (!books || books.length === 0) {
        return "Ninguno";
      }

      return books
        .slice(0, limit)
        .map((book) => {
          const scoreText =
            book.score !== null && book.score !== undefined
              ? `${Number(book.score).toFixed(1)}/10`
              : "sin score";
          return `"${book.title}" (${book.author}, ${scoreText})`;
        })
        .join(", ");
    };

    const topRatedBooks = profile.topRatedBooks || profile.favoriteBooks || [];
    const lowRatedBooks = profile.lowRatedBooks || [];
    const abandonedBooks = profile.abandonedBooks || [];

    const genres =
      distributions.genres ||
      metadataSignals.topGenres ||
      profile.topGenres ||
      [];
    const countries =
      distributions.countries ||
      profile.topCountries ||
      metadataSignals.topCountries ||
      [];
    const formats =
      distributions.formats ||
      metadataSignals.topBookTypes ||
      profile.topBookTypes ||
      [];

    const years = distributions.years || {};
    const pages = distributions.pages || {};

    const yearsText =
      years.average !== null && years.average !== undefined
        ? `promedio ${Number(years.average).toFixed(1)}, rango ${years.min || "N/A"}-${years.max || "N/A"}`
        : "N/A";

    const pagesText =
      pages.average !== null && pages.average !== undefined
        ? `promedio ${Number(pages.average).toFixed(1)}, rango ${pages.min || "N/A"}-${pages.max || "N/A"}`
        : "N/A";

    return `Analiza este perfil de lectura como un sistema de preferencias implícitas.

DATOS DEL PERFIL:

RESUMEN:
- Libros completados: ${completedBooks}
- Tasa de finalización: ${completionRate}%
- Score promedio: ${averageScore}

DISTRIBUCIONES:
- Géneros más frecuentes: ${formatDistributionList(genres)}
- Nacionalidades de autores: ${formatDistributionList(countries)}
- Años de publicación (promedio y rango): ${yearsText}
- Cantidad de páginas (promedio y rango): ${pagesText}
- Formatos consumidos (bookType editorial): ${formatDistributionList(formats)}

COMPORTAMIENTO:
- Libros mejor puntuados: ${formatBooksList(topRatedBooks)}
- Libros peor puntuados: ${formatBooksList(lowRatedBooks)}
- Libros abandonados: ${formatBooksList(abandonedBooks)}

INSTRUCCIONES:

Analiza el perfil sin repetir los datos anteriores.

1. Identifica correlaciones entre variables (género, nacionalidad, año, páginas, formato).
2. Detecta patrones estructurales:
   - complejidad narrativa
   - tipo de conflicto (psicológico vs acción)
   - estilo predominante (realismo, existencialismo, etc.)
3. Deduce qué busca el lector (motivación emocional o intelectual).
4. Explica los abandonos como desviaciones del patrón principal.
5. Define reglas accionables para recomendación:
   - filtros duros (qué incluir/excluir)
   - criterios de scoring

RESTRICCIONES:
- No listar datos explícitos
- No hacer descripciones obvias
- Cada afirmación debe implicar inferencia

OUTPUT:
máximo 250 palabras, español, tercera persona, tono analítico-profesional.`;
  }

  /**
   * Build recommendation prompt based on input type
   * @private
   * @param {Object} input - { type, summary?, data?, abandonedBooks? }
   * @returns {string} Formatted prompt
   */
  _buildRecommendationPrompt(input) {
    let contextSection;
    const excludedSection =
      input.excludeBooks && input.excludeBooks.length > 0
        ? `\n\nLIBROS YA LEIDOS/EN VAULT (NO RECOMENDAR):\n${input.excludeBooks.map((b) => `- "${b.title}" por ${b.author}`).join("\n")}`
        : "";

    if (input.type === "semantic") {
      // ✅ Efficient mode: Use pre-analyzed summary
      const abandonedSection =
        input.abandonedBooks && input.abandonedBooks.length > 0
          ? `LIBROS ABANDONADOS (evitar similares):
${input.abandonedBooks.map((b) => `- "${b.title}" por ${b.author}`).join("\n")}`
          : "";

      contextSection = `ANÁLISIS DEL PERFIL:
${input.summary}

    ${abandonedSection}${excludedSection}`;
    } else {
      // ⚠️ Fallback: Reconstruct from structured data
      const data = input.data;
      const topAuthors =
        data.topAuthors
          ?.slice(0, 3)
          .map((a) => `${a.name} (${a.bookCount} libros)`)
          .join(", ") || "N/A";

      const favorites =
        (data.topRatedBooks || data.favoriteBooks)
          ?.slice(0, 3)
          .map((b) => `"${b.title}" por ${b.author} (${b.score}/10)`)
          .join(", ") || "N/A";

      contextSection = `PREFERENCIAS DEL LECTOR:
- Autores favoritos: ${topAuthors}
- Libros mejor valorados: ${favorites}
- Score promedio: ${data.statistics?.avgScore?.toFixed(1) || "N/A"}
    - Libros completados: ${data.statistics?.completedBooks || 0}${excludedSection}`;
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

  _buildBookSynergyPrompt(input) {
    const profileContext =
      input.profile.type === "semantic"
        ? `PERFIL (RESUMEN SEMÁNTICO):\n${input.profile.summary}`
        : `PERFIL (DATOS ESTRUCTURADOS):\n${JSON.stringify(input.profile.data)}`;

    return `${profileContext}

LIBRO A EVALUAR:
- Título: ${input.book.title}
- Autor: ${input.book.author.name}
- Book type: ${input.book.bookType || "N/A"}
- Géneros: ${(input.book.genres || []).join(", ") || "N/A"}
- Sinopsis: ${input.book.synopsis || "N/A"}

INSTRUCCIONES:
- Evalúa compatibilidad realista del 0 al 100.
- Señala fortalezas y riesgos concretos según perfil.
- Evita frases genéricas.

RESPUESTA JSON ESTRICTA:
{
  "compatibility": {
    "score": 0,
    "reasoning": "Explicación corta y concreta",
    "positiveSignals": ["signal 1", "signal 2"],
    "cautionSignals": ["signal 1", "signal 2"]
  }
}`;
  }

  _buildAuthorSynergyPrompt(input) {
    const profileContext =
      input.profile.type === "semantic"
        ? `PERFIL (RESUMEN SEMÁNTICO):\n${input.profile.summary}`
        : `PERFIL (DATOS ESTRUCTURADOS):\n${JSON.stringify(input.profile.data)}`;

    const booksByAuthor =
      input.booksByAuthor && input.booksByAuthor.length > 0
        ? input.booksByAuthor
            .map((book) => {
              const score =
                book.score !== null && book.score !== undefined
                  ? `${book.score}/10`
                  : "sin score";
              return `- ${book.title} (${book.status}, ${score})`;
            })
            .join("\n")
        : "- El lector no tiene libros de este autor aún";

    return `${profileContext}

AUTOR A EVALUAR:
- Nombre: ${input.author.name}
- Nacionalidad: ${input.author.nationality || "N/A"}

HISTORIAL DEL LECTOR CON ESTE AUTOR:
${booksByAuthor}

INSTRUCCIONES:
- Evalúa compatibilidad realista del 0 al 100.
- Fundamenta usando patrones del perfil y del historial con este autor.
- Marca señales positivas y cautelares.

RESPUESTA JSON ESTRICTA:
{
  "compatibility": {
    "score": 0,
    "reasoning": "Explicación corta y concreta",
    "positiveSignals": ["signal 1", "signal 2"],
    "cautionSignals": ["signal 1", "signal 2"]
  }
}`;
  }

  _buildFavoriteAuthorsRecommendationPrompt(input) {
    const profileContext =
      input.profile.type === "semantic"
        ? `PERFIL (RESUMEN SEMÁNTICO):\n${input.profile.summary}`
        : `PERFIL (DATOS ESTRUCTURADOS):\n${JSON.stringify(input.profile.data)}`;

    const topAuthorsText =
      input.topAuthors && input.topAuthors.length > 0
        ? input.topAuthors
            .map(
              (author) =>
                `- ${author.name} (${author.bookCount} libros, score promedio ${author.avgScore ?? "N/A"})`,
            )
            .join("\n")
        : "- No hay autores favoritos disponibles";

    const excludedBooksText =
      input.excludedBooks && input.excludedBooks.length > 0
        ? input.excludedBooks
            .map((book) => `- "${book.title}" por ${book.author}`)
            .join("\n")
        : "- Ninguno";

    const strictAuthorsText =
      input.strictAuthorNames && input.strictAuthorNames.length > 0
        ? input.strictAuthorNames.map((author) => `- ${author}`).join("\n")
        : topAuthorsText;

    return `${profileContext}

AUTORES PRIORITARIOS:
${topAuthorsText}

AUTORES PERMITIDOS (OBLIGATORIO):
${strictAuthorsText}

LIBROS YA EN EL VAULT (NO RECOMENDAR):
${excludedBooksText}

INSTRUCCIONES:
- Recomienda 3 a 5 libros SOLO de los AUTORES PERMITIDOS.
- No repitas libros de la lista de exclusión.
- Prioriza variedad entre autores y alta compatibilidad.

FORMATO DE RESPUESTA (JSON estricto):
{
  "recommendations": [
    {
      "title": "Título exacto",
      "author": "Autor",
      "synopsis": "Sinopsis breve",
      "compatibilityScore": 80,
      "reasoning": "Por qué encaja con el perfil"
    }
  ]
}`;
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
