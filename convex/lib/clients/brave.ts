export interface WebSearchApiResponse {
  type: string;
  query: {
    original: string;
    altered?: string;
    cleaned?: string;
    spellcheck_off?: boolean;
    more_results_available: boolean;
    show_strict_warning?: boolean;
    search_operators?: {
      applied: boolean;
      cleaned_query?: string;
      sites?: string[];
    };
  };
  web?: {
    type: string;
    results: Array<{
      title: string;
      url: string;
      description?: string;
      age?: string;
      language?: string;
      meta_url?: {
        scheme?: string;
        netloc?: string;
        hostname?: string;
        path?: string;
      };
      thumbnail?: {
        src: string;
        original?: string;
        logo?: boolean;
      };
      profile?: {
        name: string;
        url: string;
        long_name?: string;
        img?: string;
      };
      page_age?: string;
      extra_snippets?: string[];
      deep_results?: {
        buttons?: any[];
        links?: any[];
      };
      schemas?: any[];
      product?: any;
      recipe?: any;
      article?: any;
      book?: any;
      software?: any;
      rating?: any;
      faq?: any;
      movie?: any;
      video?: any;
      location?: any;
      qa?: any;
      creative_work?: any;
      music_recording?: any;
      organization?: any;
      review?: any;
      content_type?: string;
      fetched_content_timestamp?: number;
    }>;
    mutated_by_goggles: boolean;
    family_friendly: boolean;
  };
  mixed?: {
    type: string;
    main: Array<{ type: string; index?: number; all?: boolean }>;
    top: Array<any>;
    side: Array<any>;
  };
  discussions?: {
    results: Array<{
      data: {
        forum_name?: string;
        num_answers?: number;
        question?: string;
        top_comment?: string;
      };
    }>;
  };
  faq?: { results: any[] };
  news?: { results: any[] };
  videos?: { results: any[] };
  infobox?: { results: any[] };
  locations?: { results: any[] };
  rich?: {
    hint?: {
      vertical?: string;
      callback_key?: string;
    };
  };
}

export interface NewsSearchApiResponse {
  type: string;
  query: {
    original: string;
    altered?: string;
    cleaned?: string;
    spellcheck_off?: boolean;
    show_strict_warning?: boolean;
    search_operators?: {
      applied: boolean;
      cleaned_query?: string;
      sites?: string[];
    };
  };
  results?: Array<{
    type: string;
    title: string;
    url: string;
    description?: string;
    age?: string;
    page_age?: string;
    page_fetched?: string;
    fetched_content_timestamp?: number;
    meta_url?: {
      scheme?: string;
      netloc?: string;
      hostname?: string;
      favicon?: string;
      path?: string;
    };
    thumbnail?: {
      src: string;
      original?: string;
    };
    extra_snippets?: string[];
  }>;
}

export interface ImageSearchApiResponse {
  type: string;
  query: {
    original: string;
    altered?: string;
    spellcheck_off?: boolean;
    show_strict_warning?: boolean;
  };
  results: Array<{
    type: string;
    title?: string;
    url?: string;
    source?: string;
    page_fetched?: string;
    thumbnail?: {
      src?: string;
      width?: number;
      height?: number;
    };
    properties?: {
      url?: string;
      placeholder?: string;
      width?: number;
      height?: number;
    };
    meta_url?: {
      scheme?: string;
      netloc?: string;
      hostname?: string;
      favicon?: string;
      path?: string;
    };
    confidence?: string;
  }>;
  extra?: {
    might_be_offensive: boolean;
  };
}

export interface AnswersApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    index: number;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface BraveWebSearchOptions {
  /** The user's search query term. Maximum of 400 characters and 50 words in the query. */
  q: string;
  /** The 2 character country code where the search results come from. */
  country?: string;
  /** The 2 or more character language code for which the search results are provided. */
  search_lang?: string;
  /** User interface language preferred in response. */
  ui_lang?: string;
  /** The number of search results returned in response. The maximum is 20. */
  count?: number;
  /** The zero based offset that indicates number of search result pages (count) to skip. */
  offset?: number;
  /** Filters search results for adult content. */
  safesearch?: 'off' | 'moderate' | 'strict';
  /** Whether to spell check provided query. */
  spellcheck?: boolean;
  /** Filters search results by page age (e.g. pd, pw, pm, py, or YYYY-MM-DDtoYYYY-MM-DD). */
  freshness?: string;
  /** Whether to return display strings with bolding tags. */
  text_decorations?: boolean;
  /** A comma-delimited string of result types to include in the search response. */
  result_filter?: string;
  /** Goggles act as a custom ranking filter. */
  goggles_id?: string;
  /** The measurement units for the search results. */
  units?: 'metric' | 'imperial';
  /** Whether to return extra snippets for web results. */
  extra_snippets?: boolean;
  /** Whether to apply search operators. */
  operators?: boolean;
  /** Enable rich 3rd party data callback. */
  enable_rich_callback?: boolean;
  /** Include fetched_content_timestamp on results. */
  include_fetch_metadata?: boolean;
}

export interface BraveNewsSearchOptions {
  /** The user's search query term. */
  q: string;
  /** The 2 character country code where the search results come from. */
  country?: string;
  /** The 2 or more character language code for which the search results are provided. */
  search_lang?: string;
  /** User interface language preferred in response. */
  ui_lang?: string;
  /** The number of search results returned in response. */
  count?: number;
  /** The zero based offset that indicates number of search result pages (count) to skip. */
  offset?: number;
  /** Filters search results for adult content. */
  safesearch?: 'off' | 'moderate' | 'strict';
  /** Whether to spell check provided query. */
  spellcheck?: boolean;
  /** Filters search results by page age. */
  freshness?: string;
  /** Whether to return extra snippets. */
  extra_snippets?: boolean;
  /** Custom ranking filter (URL or inline; repeat param for multiple). */
  goggles?: string | string[];
  /** Apply search operators. */
  operators?: boolean;
  /** Include fetch timestamps in results. */
  include_fetch_metadata?: boolean;
}

export interface BraveImageSearchOptions {
  /** The user's search query term. */
  q: string;
  /** The 2 character country code where the search results come from. */
  country?: string;
  /** The 2 or more character language code for which the search results are provided. */
  search_lang?: string;
  /** The number of search results returned in response. Maximum is 100. */
  count?: number;
  /** The zero based offset that indicates number of search result pages (count) to skip. */
  offset?: number;
  /** Filters search results for adult content. */
  safesearch?: 'off' | 'moderate' | 'strict';
  /** Whether to spell check provided query. */
  spellcheck?: boolean;
}

export interface BraveChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface BraveChatCompletionOptions {
  /** Array of messages representing the conversation history. */
  messages: BraveChatCompletionMessage[];
  /** ID of the model to use (e.g. brave, brave-pro). */
  model?: string;
  /** The maximum number of tokens to generate in the completion. */
  max_completion_tokens?: number;
  /** Set of key-value pairs that you can attach to an object. */
  metadata?: Record<string, any>;
  /** Optional integer for deterministic sampling. */
  seed?: number;
  /** Whether to stream back partial progress. */
  stream?: boolean;
  /** Search options for the web search backing the answers. */
  web_search_options?: Record<string, any>;
  /** Country code to bias the search results. */
  country?: string;
  /** Language to use for the response. */
  language?: string;
  /** Filters search results for adult content. */
  safesearch?: 'off' | 'moderate' | 'strict';
  /** Enable entities in the response. */
  enable_entities?: boolean;
  /** Enable citations in the response. */
  enable_citations?: boolean;
  /** Enable extended research mode. */
  enable_research?: boolean;
  /** Allow model to generate internal reasoning before answering. */
  research_allow_thinking?: boolean;
  /** Maximum number of tokens per research query. */
  research_maximum_number_of_tokens_per_query?: number;
  /** Maximum number of queries allowed. */
  research_maximum_number_of_queries?: number;
  /** Maximum number of iterations for research. */
  research_maximum_number_of_iterations?: number;
  /** Maximum duration in seconds for research. */
  research_maximum_number_of_seconds?: number;
  /** Maximum number of results to fetch per query. */
  research_maximum_number_of_results_per_query?: number;
}

export class BraveSearchAPI {
  private apiKey: string;
  private baseUrl = 'https://api.search.brave.com';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.BRAVE_SEARCH_API_KEY;
    if (!key) {
      throw new Error('Brave Search API key is required. Pass it to the constructor or set BRAVE_SEARCH_API_KEY environment variable.');
    }
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, params: Record<string, any> = {}, method = 'GET', body?: any): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Subscription-Token': this.apiKey,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errJson = JSON.parse(errorText);
        errorText = JSON.stringify(errJson, null, 2);
      } catch {
        // Not JSON
      }
      throw new Error(`Brave API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Search the web from a large independent index of web pages.
   */
  async webSearch(options: BraveWebSearchOptions): Promise<WebSearchApiResponse> {
    return this.request<WebSearchApiResponse>('/res/v1/web/search', options);
  }

  /**
   * Search for news articles from a large independent index.
   */
  async newsSearch(options: BraveNewsSearchOptions): Promise<NewsSearchApiResponse> {
    return this.request<NewsSearchApiResponse>('/res/v1/news/search', options);
  }

  /**
   * Search for images.
   */
  async imageSearch(options: BraveImageSearchOptions): Promise<ImageSearchApiResponse> {
    return this.request<ImageSearchApiResponse>('/res/v1/images/search', options);
  }

  /**
   * Get AI-generated answers backed by real-time web search.
   */
  async answers(options: BraveChatCompletionOptions): Promise<AnswersApiResponse> {
    return this.request<AnswersApiResponse>('/v1/chat/completions', {}, 'POST', options);
  }
}
