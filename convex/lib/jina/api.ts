export type JinaRespondWith =
  | 'content'
  | 'markdown'
  | 'html'
  | 'text'
  | 'pageshot'
  | 'screenshot'
  | 'vlm'
  | 'readerlm-v2'
  | 'frontmatter'
  | (string & {});

export interface JinaBaseOptions {
  respondWith?: JinaRespondWith;
  noCache?: boolean;
  cacheTolerance?: number;
  waitForSelector?: string | string[];
  targetSelector?: string | string[];
  removeSelector?: string | string[];
  keepImgDataUrl?: boolean;
  withGeneratedAlt?: boolean;
  withImagesSummary?: boolean;
  withLinksSummary?: boolean;
  retainImages?: 'none' | 'all' | 'alt' | 'all_p' | 'alt_p';
  retainMedia?: 'none' | 'text' | 'link' | 'image' | 'html';
  retainLinks?: 'none' | 'all' | 'text' | 'gpt-oss';
  preset?: 'reader' | 'index' | 'research' | 'agent' | 'spider';
  withIframe?: boolean;
  withShadowDom?: boolean;
  proxyUrl?: string;
  proxy?: string;
  userAgent?: string;
  timeout?: number; // max 180
  locale?: string;
  referer?: string;
  tokenBudget?: number;
  robotsTxt?: string;
  doNotTrack?: boolean | object;
  removeOverlay?: boolean;
  detachInvisibles?: boolean;
  noGfm?: boolean;
  instruction?: string;
  jsonSchema?: object;
}

export interface JinaReaderOptions extends JinaBaseOptions {
  url?: string;
  html?: string;
  pdf?: string;
  file?: string;
  page?: number;
  preloadUrl?: string;
  noServiceWorker?: boolean;
  base?: 'initial' | 'final';
  setCookies?: Array<object | string> | string;
  exportStorageState?: boolean;
  engine?: 'auto' | 'browser' | 'curl' | 'cf-browser-rendering' | (string & {});
  injectPageScript?: string | string[];
  injectFrameScript?: string | string[];
  assertStatusCode?: number;
}

export interface JinaSearchOptions extends JinaBaseOptions {
  q?: string;
  engine?: 'google' | 'bing' | 'reader';
  respondTiming?: 'html' | 'visible-content' | 'mutation-idle' | 'resource-idle' | 'media-idle' | 'network-idle';
  markdownChunking?: 'true' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'structured' | 's1' | 's2' | 's3' | 's4' | 's5' | (string & {});
  maxTokens?: number;
  count?: number; // 0 to 20
  provider?: 'google' | 'bing' | 'reader'; // same as engine
  location?: string;
  gl?: string;
  hl?: string;
  fallback?: boolean;
  nfpr?: boolean; // do not auto-correct query
  ext?: string[];
  filetype?: string[];
  intitle?: string[];
  site?: string[];
  loc?: string[]; // lang ISO 639-1
  type?: 'web' | 'images' | 'news';
}

export interface FormattedPageDto {
  title?: string;
  description?: string;
  url: string;
  content?: string;
  chunks?: string[];
  publishedTime?: string;
  html?: string;
  text?: string;
  screenshotUrl?: string;
  pageshotUrl?: string;
  numPages?: number;
  links?: Record<string, string> | string[];
  images?: Record<string, string> | string[];
  warning?: string;
  metadata?: Record<string, string>;
  external?: unknown;
  httpStatus?: number;
  httpStatusText?: string;
  storageState?: unknown;
}

export interface JinaResponse<T = any> {
  code: number;
  status: number;
  data?: T;
  meta?: any;
  error?: string;
}

export class JinaClient {
  private apiKey: string;
  private readerBaseUrl = 'https://r.jina.ai/';
  private searchBaseUrl = 'https://s.jina.ai/';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ((globalThis as any).process?.env?.JINA_API_KEY as string) || '';
  }

  /**
   * Helper to perform requests against the Jina API
   */
  private async request<T = any>(
    baseUrl: string,
    endpoint: string,
    payload: object,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const url = new URL(endpoint, baseUrl).toString();

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina API Error (${response.status}): ${errorText}`);
    }

    // Usually Jina returns JSON when Accept is application/json.
    // However, if it returns plain text markdown (e.g. when simply asking for markdown), 
    // it depends on how the Jina API responds based on headers.
    // Because we use Accept: application/json, Jina returns a structured JSON wrapper.
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    
    // Fallback if not JSON
    return (await response.text()) as unknown as T;
  }

  /**
   * Read, extract and crawl content from a URL or raw HTML/PDF
   */
  async read(url: string, options?: Omit<JinaReaderOptions, 'url'>): Promise<JinaResponse<FormattedPageDto | string> | string> {
    return this.request<JinaResponse<FormattedPageDto | string> | string>(this.readerBaseUrl, '', { url, ...options }, 'POST');
  }

  /**
   * Read raw HTML
   */
  async readHtml(html: string, options?: Omit<JinaReaderOptions, 'html'>): Promise<JinaResponse<FormattedPageDto | string> | string> {
    return this.request<JinaResponse<FormattedPageDto | string> | string>(this.readerBaseUrl, '', { html, ...options }, 'POST');
  }

  /**
   * Search the web for a given query
   */
  async search(query: string, options?: Omit<JinaSearchOptions, 'q'>): Promise<JinaResponse<FormattedPageDto[]> | string> {
    return this.request<JinaResponse<FormattedPageDto[]> | string>(this.searchBaseUrl, '', { q: query, ...options }, 'POST');
  }
}
