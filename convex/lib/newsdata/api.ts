import { z } from 'zod';

export const NewsCategorySchema = z.enum([
  'breaking', 'business', 'crime', 'domestic', 'education',
  'entertainment', 'environment', 'food', 'health', 'lifestyle',
  'politics', 'science', 'sports', 'technology', 'top',
  'tourism', 'world', 'other'
]);
export type NewsCategory = z.infer<typeof NewsCategorySchema>;

export const NewsLanguageSchema = z.enum([
  'af', 'sq', 'am', 'ar', 'hy', 'as', 'az', 'bm', 'eu', 'be',
  'bn', 'bs', 'bg', 'my', 'ca', 'ckb', 'zh', 'hr', 'cs', 'da',
  'nl', 'en', 'et', 'pi', 'fi', 'fr', 'gl', 'ka', 'de', 'el',
  'gu', 'ha', 'he', 'hi', 'hu', 'is', 'id', 'it', 'jp', 'kn',
  'kz', 'kh', 'rw', 'ko', 'ku', 'lv', 'lt', 'lb', 'mk', 'ms',
  'ml', 'mt', 'mi', 'mr', 'mn', 'ne', 'no', 'or', 'ps', 'fa',
  'pl', 'pt', 'pa', 'ro', 'ru', 'sm', 'sr', 'sn', 'sd', 'si',
  'sk', 'sl', 'so', 'es', 'sw', 'sv', 'tg', 'ta', 'te', 'th',
  'zht', 'tr', 'tk', 'uk', 'ur', 'uz', 'vi', 'cy', 'zu'
]);
export type NewsLanguage = z.infer<typeof NewsLanguageSchema>;

export const NewsCountrySchema = z.enum([
  'us', 'gb', 'ae', 'af', 'al', 'dz', 'as', 'ad', 'ao', 'ai',
  'aq', 'ag', 'ar', 'am', 'aw', 'au', 'at', 'az', 'bs', 'bh',
  'bd', 'bb', 'by', 'be', 'bz', 'bj', 'bm', 'bt', 'bo', 'ba',
  'bw', 'bv', 'br', 'io', 'bn', 'bg', 'bf', 'bi', 'kh', 'cm',
  'ca', 'cv', 'ky', 'cf', 'td', 'cl', 'cn', 'cx', 'co', 'km',
  'cg', 'cd', 'ck', 'cr', 'ci', 'hr', 'je', 'cu', 'cy', 'cw',
  'cz', 'dk', 'dj', 'dm', 'do', 'tp', 'ec', 'eg', 'sv', 'gq',
  'er', 'ee', 'et', 'fk', 'fo', 'fj', 'fi', 'fr', 'gf', 'pf',
  'tf', 'ga', 'gm', 'ge', 'de', 'gh', 'gi', 'gr', 'gl', 'gd',
  'gp', 'gu', 'gt', 'gn', 'gw', 'gy', 'ht', 'hm', 'va', 'hn',
  'tl', 'hk', 'hu', 'is', 'in', 'id', 'ir', 'iq', 'ie', 'il',
  'it', 'jm', 'jp', 'jo', 'kz', 'ke', 'ki', 'xk', 'kp', 'kr',
  'kw', 'kg', 'la', 'lv', 'lb', 'ls', 'lr', 'ly', 'li', 'lt',
  'lu', 'mo', 'mk', 'mg', 'mw', 'my', 'mv', 'ml', 'mt', 'mh',
  'mq', 'mr', 'mu', 'yt', 'mx', 'fm', 'md', 'mc', 'mn', 'ms',
  'ma', 'mz', 'mm', 'me', 'na', 'nr', 'np', 'nl', 'an', 'nc',
  'nz', 'ni', 'ne', 'ng', 'nu', 'nf', 'mp', 'no', 'om', 'pk',
  'pw', 'ps', 'pa', 'pg', 'py', 'pe', 'ph', 'pn', 'pl', 'pt',
  'pr', 'qa', 're', 'ro', 'ru', 'rw', 'sh', 'kn', 'lc', 'pm',
  'vc', 'ws', 'sm', 'st', 'sa', 'sn', 'sc', 'sl', 'sg', 'sk',
  'si', 'sb', 'so', 'za', 'gs', 'es', 'lk', 'sd', 'sr', 'sj',
  'sz', 'se', 'ch', 'sy', 'tw', 'tj', 'tz', 'th', 'tg', 'tk',
  'to', 'tt', 'tn', 'tr', 'tm', 'tc', 'tv', 'ug', 'ua', 'uy',
  'uz', 'vu', 've', 'vi', 'vg', 'wf', 'eh', 'ye', 'yu', 'zm',
  'zw', 'rs', 'sx'
]);
export type NewsCountry = z.infer<typeof NewsCountrySchema>;

export const NewsSortSchema = z.enum(['pubdateasc', 'relevancy', 'source', 'fetched_at']);
export type NewsSort = z.infer<typeof NewsSortSchema>;

export const NewsDatatypeSchema = z.enum(['news', 'blog', 'multimedia', 'forum', 'press_release', 'review', 'research', 'opinion', 'analysis', 'podcast']);
export type NewsDatatype = z.infer<typeof NewsDatatypeSchema>;

export const LatestNewsParamsSchema = z.object({
  apikey: z.string().optional(),
  q: z.string().optional(),
  qInTitle: z.string().optional(),
  qInMeta: z.string().optional(),
  country: z.union([NewsCountrySchema, z.array(NewsCountrySchema), z.string()]).optional(),
  category: z.union([NewsCategorySchema, z.array(NewsCategorySchema), z.string()]).optional(),
  language: z.union([NewsLanguageSchema, z.array(NewsLanguageSchema), z.string()]).optional(),
  domainurl: z.string().optional(),
  excludedomain: z.string().optional(),
  prioritydomain: z.enum(['top', 'medium', 'low']).optional(),
  timezone: z.string().optional(),
  timeframe: z.union([z.number(), z.string()]).optional(),
  full_content: z.boolean().optional(),
  image: z.boolean().optional(),
  video: z.boolean().optional(),
  size: z.number().optional(),
  page: z.string().optional(),
  sort: NewsSortSchema.optional(),
  datatype: z.union([NewsDatatypeSchema, z.array(NewsDatatypeSchema), z.string()]).optional()
});
export type LatestNewsParams = z.infer<typeof LatestNewsParamsSchema>;

export const NewsArticleSchema = z.object({
  article_id: z.string(),
  title: z.string(),
  link: z.string(),
  keywords: z.array(z.string()).optional().nullable(),
  creator: z.array(z.string()).optional().nullable(),
  video_url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  pubDate: z.string(),
  image_url: z.string().optional().nullable(),
  source_id: z.string(),
  source_priority: z.number().optional().nullable(),
  source_url: z.string().optional().nullable(),
  source_icon: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  country: z.array(z.string()).optional().nullable(),
  category: z.array(z.string()).optional().nullable(),
  ai_tag: z.string().optional().nullable(),
  sentiment: z.string().optional().nullable(),
  sentiment_stats: z.string().optional().nullable(),
  ai_region: z.string().optional().nullable(),
}).passthrough();
export type NewsArticle = z.infer<typeof NewsArticleSchema>;

export const NewsDataResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number(),
  results: z.array(NewsArticleSchema),
  nextPage: z.string().optional().nullable(),
}).passthrough();
export type NewsDataResponse = z.infer<typeof NewsDataResponseSchema>;

export class NewsDataAPI {
  private baseUrl = 'https://newsdata.io/api/1';
  private defaultApiKey: string | undefined;

  constructor(apiKey?: string) {
    this.defaultApiKey = apiKey;
  }

  /**
   * Fetches the latest news from Newsdata.io
   * Refer to: https://newsdata.io/documentation#latest-news
   */
  async getLatestNews(params: LatestNewsParams): Promise<NewsDataResponse> {
    // Validate inputs
    const validatedParams = LatestNewsParamsSchema.parse(params);

    const apiKey = validatedParams.apikey || this.defaultApiKey;
    if (!apiKey) {
      throw new Error('API key is required for NewsData API');
    }

    const url = new URL(`${this.baseUrl}/latest`);
    url.searchParams.append('apikey', apiKey);

    if (validatedParams.q) url.searchParams.append('q', validatedParams.q);
    if (validatedParams.qInTitle) url.searchParams.append('qInTitle', validatedParams.qInTitle);
    if (validatedParams.qInMeta) url.searchParams.append('qInMeta', validatedParams.qInMeta);
    
    if (validatedParams.country) {
      url.searchParams.append('country', Array.isArray(validatedParams.country) ? validatedParams.country.join(',') : validatedParams.country);
    }
    if (validatedParams.category) {
      url.searchParams.append('category', Array.isArray(validatedParams.category) ? validatedParams.category.join(',') : validatedParams.category);
    }
    if (validatedParams.language) {
      url.searchParams.append('language', Array.isArray(validatedParams.language) ? validatedParams.language.join(',') : validatedParams.language);
    }
    
    if (validatedParams.domainurl) url.searchParams.append('domainurl', validatedParams.domainurl);
    if (validatedParams.excludedomain) url.searchParams.append('excludedomain', validatedParams.excludedomain);
    if (validatedParams.prioritydomain) url.searchParams.append('prioritydomain', validatedParams.prioritydomain);
    if (validatedParams.timezone) url.searchParams.append('timezone', validatedParams.timezone);
    if (validatedParams.timeframe !== undefined) url.searchParams.append('timeframe', validatedParams.timeframe.toString());
    if (validatedParams.full_content !== undefined) url.searchParams.append('full_content', validatedParams.full_content ? '1' : '0');
    if (validatedParams.image !== undefined) url.searchParams.append('image', validatedParams.image ? '1' : '0');
    if (validatedParams.video !== undefined) url.searchParams.append('video', validatedParams.video ? '1' : '0');
    if (validatedParams.size !== undefined) url.searchParams.append('size', validatedParams.size.toString());
    if (validatedParams.page) url.searchParams.append('page', validatedParams.page);
    if (validatedParams.sort) url.searchParams.append('sort', validatedParams.sort);
    if (validatedParams.datatype) {
      url.searchParams.append('datatype', Array.isArray(validatedParams.datatype) ? validatedParams.datatype.join(',') : validatedParams.datatype);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NewsData API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Validate outputs
    return NewsDataResponseSchema.parse(data);
  }
}
