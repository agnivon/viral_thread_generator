import { z } from "zod";

export const currentsApiOptionsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  version: z.enum(['v1', 'v2']).optional(),
});

export type CurrentsApiOptions = z.infer<typeof currentsApiOptionsSchema>;

export const latestNewsParamsSchema = z.object({
  language: z.string().optional(),
  country: z.string().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  type: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  domain: z.string().optional(),
  domain_not: z.string().optional(),
  author: z.string().optional(),
  page_number: z.number().int().min(1).max(180).optional(),
  page_size: z.number().int().min(1).max(300).optional(),
});

export type LatestNewsParams = z.infer<typeof latestNewsParamsSchema>;

export const searchParamsSchema = latestNewsParamsSchema.extend({
  keywords: z.string().optional(),
  query: z.string().optional(),
  start_date: z.string().optional(), // RFC 3339 / ISO-8601
  end_date: z.string().optional(),   // RFC 3339 / ISO-8601
  cursor: z.string().optional(),     // v2 only
  limit: z.number().optional(),
  has_image: z.boolean().optional(),
  has_description: z.boolean().optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  author: z.string(),
  image: z.string(),
  language: z.string(),
  category: z.array(z.string()),
  published: z.string(),
});

export type Article = z.infer<typeof articleSchema>;

export const currentsApiResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  news: z.array(articleSchema),
  page: z.number(),
  next_cursor: z.string().optional(), // v2 only
});

export type CurrentsApiResponse = z.infer<typeof currentsApiResponseSchema>;

export const currentsErrorResponseSchema = z.object({
  status: z.union([z.string(), z.number()]).transform(String),
  msg: z.string(),
  details: z.object({
    message: z.string().optional(),
    errors: z.record(z.string(), z.string()).optional(),
  }).optional(),
});

export type CurrentsErrorResponse = z.infer<typeof currentsErrorResponseSchema>;

export const rateLimitInfoSchema = z.object({
  remaining: z.number().nullable(),
  limit: z.number().nullable(),
});

export type RateLimitInfo = z.infer<typeof rateLimitInfoSchema>;

export const currentsResponseWithRateLimitSchema = z.object({
  data: currentsApiResponseSchema,
  rateLimit: rateLimitInfoSchema,
});

export type CurrentsResponseWithRateLimit = z.infer<typeof currentsResponseWithRateLimitSchema>;

export class CurrentsAPIError extends Error {
  status: string;
  details?: Record<string, any>;

  constructor(msg: string, status: string, details?: Record<string, any>) {
    super(msg);
    this.status = status;
    this.details = details;
    this.name = 'CurrentsAPIError';
  }
}

export class CurrentsAPI {
  private apiKey: string;
  private baseUrl: string;
  private lastRateLimit: RateLimitInfo = { remaining: null, limit: null };

  constructor(options: CurrentsApiOptions) {
    const validatedOpts = currentsApiOptionsSchema.parse(options);
    this.apiKey = validatedOpts.apiKey;
    this.baseUrl = `https://api.currentsapi.services/${validatedOpts.version || 'v2'}`;
  }

  /**
   * Fetches data from a specific Currents API endpoint.
   */
  private async fetch(endpoint: string, params: Record<string, any> = {}): Promise<CurrentsResponseWithRateLimit> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    // Update rate limit state
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const limit = response.headers.get('X-RateLimit-Limit');
    this.lastRateLimit = rateLimitInfoSchema.parse({
      remaining: remaining !== null ? parseInt(remaining, 10) : null,
      limit: limit !== null ? parseInt(limit, 10) : null,
    });

    if (!response.ok) {
      let errorPayload: CurrentsErrorResponse;
      try {
        const rawJson = await response.json();
        errorPayload = currentsErrorResponseSchema.parse(rawJson);
      } catch (e) {
        if (e instanceof z.ZodError) {
           throw new CurrentsAPIError(
             `Currents API Error response validation failed: ${e.message}`,
             String(response.status)
           );
        }
        throw new CurrentsAPIError(
          `Currents API Error: ${response.status} ${response.statusText}`,
          String(response.status)
        );
      }

      throw new CurrentsAPIError(
        errorPayload.msg || response.statusText,
        errorPayload.status,
        errorPayload.details
      );
    }

    const rawData = await response.json();
    const data = currentsApiResponseSchema.parse(rawData);

    return currentsResponseWithRateLimitSchema.parse({
      data,
      rateLimit: this.lastRateLimit
    });
  }

  /**
   * Provides a real-time stream of international news articles from diverse sources.
   * Note: Search specific parameters like keywords, start_date etc are not allowed here.
   */
  public async latestNews(params?: LatestNewsParams): Promise<CurrentsResponseWithRateLimit> {
    const validatedParams = params ? latestNewsParamsSchema.parse(params) : {};
    return this.fetch('/latest-news', validatedParams);
  }

  /**
   * Allows you to query through tens of millions of articles based on keywords or structured filters.
   */
  public async search(params?: SearchParams): Promise<CurrentsResponseWithRateLimit> {
    const validatedParams = params ? searchParamsSchema.parse(params) : {};
    return this.fetch('/search', validatedParams);
  }

  /**
   * Get the last known rate limit info from the headers of the previous response.
   */
  public getRateLimitInfo(): RateLimitInfo {
    return this.lastRateLimit;
  }
}
