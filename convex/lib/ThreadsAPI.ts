export type MediaType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';

export interface MediaItem {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  altText?: string; // alt_text for the individual item in a carousel
}

export interface PollAttachment {
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
}

export interface GifAttachment {
  gifId: string;
  provider: 'GIPHY' | 'TENOR' | (string & {});
}

export interface PostOptions {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  carouselItems?: MediaItem[];
  replyToId?: string;
  autoPublishText?: boolean;    // auto_publish_text
  
  // Advanced parameters based on Facebook / Threads publishing documentation
  altText?: string;             // alt_text (accessibility description)
  linkAttachment?: string;      // link_attachment (URL card preview)
  quotePostId?: string;         // quote_post_id (ID of thread to quote)
  topicTag?: string;            // topic_tag (searchable topic/tag, max 50 chars, no '.' or '&')
  pollAttachment?: PollAttachment; // poll_attachment (JSON object with option_a to option_d)
  gifAttachment?: GifAttachment;   // gif_attachment (JSON object with gif_id and provider)
  
  replyControl?: 'everyone' | 'accounts_you_follow' | 'mentioned_only' | 'parent_post_author_only' | 'followers_only';
  allowlistedCountryCodes?: string[]; // allowlisted_country_codes (ISO 3166-1 alpha-2)
  isSpoilerMedia?: boolean;          // is_spoiler_media
  isGhostPost?: boolean;             // is_ghost_post
  enableReplyApprovals?: boolean;    // enable_reply_approvals
  crossreshareToIg?: boolean;        // crossreshare_to_ig
  crossreshareToIgDarkMode?: boolean;// crossreshare_to_ig_dark_mode
  locationId?: string;               // location_id (use GET /location_search to find IDs)
}

export class ThreadsAPI {
  private accessToken: string;
  private userId: string;

  constructor(accessToken: string, userId: string = 'me') {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  /**
   * Helper to make requests to the Threads Graph API
   */
  private async request(endpoint: string, options: RequestInit = {}) {
    const baseUrl = 'https://graph.threads.net/v1.0';
    const url = new URL(`${baseUrl}/${endpoint}`);
    
    // Always append the access token to the URL query string
    url.searchParams.append('access_token', this.accessToken);

    // Mask/hide the raw access token in log output to prevent leakage
    const logUrl = url.toString().replace(/access_token=[^&]+/, 'access_token=***');
    console.log(`[ThreadsAPI.request] sending request to URL: ${logUrl}`);

    const res = await fetch(url.toString(), options);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error?.message || JSON.stringify(data) || res.statusText;
      console.error(`[ThreadsAPI.request] request failed with status ${res.status}: ${errorMsg}`);
      throw new Error(`Threads API Error (${res.status}): ${errorMsg}`);
    }

    console.log(`[ThreadsAPI.request] request succeeded with status ${res.status}`);
    return data;
  }

  /**
   * Waits for a media container to finish processing
   */
  private async waitForContainer(containerId: string): Promise<void> {
    console.log(`[ThreadsAPI.waitForContainer] start waiting for container ${containerId}...`);
    const maxAttempts = 12; // 60 seconds total
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`[ThreadsAPI.waitForContainer] checking status of container ${containerId} (attempt ${i + 1}/${maxAttempts})...`);
      const res = await this.request(`${containerId}?fields=status,error_message`);
      
      console.log(`[ThreadsAPI.waitForContainer] container status: ${res.status}`);
      if (res.status === 'FINISHED') {
        console.log(`[ThreadsAPI.waitForContainer] container ${containerId} is ready.`);
        return;
      }
      if (res.status === 'ERROR') {
        console.error(`[ThreadsAPI.waitForContainer] container ${containerId} failed: ${res.error_message}`);
        throw new Error(`Media container failed to process: ${res.error_message}`);
      }
      
      // wait 5s before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    console.error(`[ThreadsAPI.waitForContainer] timeout reached waiting for container ${containerId}`);
    throw new Error(`Timeout waiting for container ${containerId} to finish processing.`);
  }

  /**
   * Creates a media container for a post
   */
  private async createContainer(options: PostOptions & { isCarouselItem?: boolean }): Promise<string> {
    console.log(`[ThreadsAPI.createContainer] starting container creation for userId: ${this.userId}...`);
    const params = new URLSearchParams();

    // Determine media type
    let mediaType: MediaType = 'TEXT';
    if (options.carouselItems && options.carouselItems.length > 0) {
      mediaType = 'CAROUSEL';
    } else if (options.videoUrl) {
      mediaType = 'VIDEO';
    } else if (options.imageUrl) {
      mediaType = 'IMAGE';
    }
    params.append('media_type', mediaType);
    console.log(`[ThreadsAPI.createContainer] determined media type: ${mediaType}`);

    // Text content
    if (options.text) {
      params.append('text', options.text);
      const textSnippet = options.text.length > 50 ? options.text.substring(0, 50) + "..." : options.text;
      console.log(`[ThreadsAPI.createContainer] text content: "${textSnippet}"`);
    }

    // Specific media fields
    if (mediaType === 'IMAGE' && options.imageUrl) {
      params.append('image_url', options.imageUrl);
      console.log(`[ThreadsAPI.createContainer] image URL: ${options.imageUrl}`);
    } else if (mediaType === 'VIDEO' && options.videoUrl) {
      params.append('video_url', options.videoUrl);
      console.log(`[ThreadsAPI.createContainer] video URL: ${options.videoUrl}`);
    } else if (mediaType === 'CAROUSEL' && options.carouselItems) {
      console.log(`[ThreadsAPI.createContainer] carousel item count: ${options.carouselItems.length}. Creating children containers...`);
      // Create children containers first
      const childrenIds: string[] = [];
      for (const item of options.carouselItems) {
        const childId = await this.createContainer({
          imageUrl: item.type === 'IMAGE' ? item.url : undefined,
          videoUrl: item.type === 'VIDEO' ? item.url : undefined,
          isCarouselItem: true,
          altText: item.altText // Pass down individual alt text
        });
        childrenIds.push(childId);
      }
      params.append('children', childrenIds.join(','));
      console.log(`[ThreadsAPI.createContainer] children containers created: ${childrenIds.join(', ')}`);
    }

    // Carousel item flag
    if (options.isCarouselItem) {
      params.append('is_carousel_item', 'true');
    }

    // Reply fields
    if (options.replyToId) {
      params.append('reply_to_id', options.replyToId);
      console.log(`[ThreadsAPI.createContainer] reply_to_id: ${options.replyToId}`);
    }
    if (options.replyControl) {
      params.append('reply_control', options.replyControl);
      console.log(`[ThreadsAPI.createContainer] reply_control: ${options.replyControl}`);
    }

    // Target gating (ISO 3166-1 alpha-2 list, comma-separated)
    if (options.allowlistedCountryCodes && options.allowlistedCountryCodes.length > 0) {
      params.append('allowlisted_country_codes', options.allowlistedCountryCodes.join(','));
      console.log(`[ThreadsAPI.createContainer] target gating countries: ${options.allowlistedCountryCodes.join(', ')}`);
    }

    // Meta details
    if (options.altText) {
      params.append('alt_text', options.altText);
      console.log(`[ThreadsAPI.createContainer] alt text: ${options.altText}`);
    }
    if (options.linkAttachment) {
      params.append('link_attachment', options.linkAttachment);
      console.log(`[ThreadsAPI.createContainer] link attachment: ${options.linkAttachment}`);
    }
    if (options.quotePostId) {
      params.append('quote_post_id', options.quotePostId);
      console.log(`[ThreadsAPI.createContainer] quote_post_id: ${options.quotePostId}`);
    }
    if (options.topicTag) {
      if (options.topicTag.includes('.') || options.topicTag.includes('&')) {
        throw new Error("topicTag cannot contain periods (.) or ampersands (&)");
      }
      if (options.topicTag.length > 50) {
        throw new Error("topicTag must be 50 characters or less");
      }
      params.append('topic_tag', options.topicTag);
      console.log(`[ThreadsAPI.createContainer] topic tag: ${options.topicTag}`);
    }

    // Polls validation and parsing
    if (options.pollAttachment) {
      const { optionA, optionB, optionC, optionD } = options.pollAttachment;
      const optionsList = [optionA, optionB, optionC, optionD].filter((opt): opt is string => !!opt);
      
      for (const opt of optionsList) {
        if (opt.length < 1 || opt.length > 25) {
          throw new Error("Poll options must be between 1 and 25 characters");
        }
      }
      if (optionsList.length < 2) {
        throw new Error("Poll must contain at least optionA and optionB");
      }
      
      const pollObj: Record<string, string> = {
        option_a: optionA,
        option_b: optionB,
      };
      if (optionC) pollObj.option_c = optionC;
      if (optionD) pollObj.option_d = optionD;
      
      params.append('poll_attachment', JSON.stringify(pollObj));
      console.log(`[ThreadsAPI.createContainer] poll attachment: ${JSON.stringify(pollObj)}`);
    }

    // GIFs parsing
    if (options.gifAttachment) {
      const gifObj = {
        gif_id: options.gifAttachment.gifId,
        provider: options.gifAttachment.provider
      };
      params.append('gif_attachment', JSON.stringify(gifObj));
      console.log(`[ThreadsAPI.createContainer] gif attachment: ${JSON.stringify(gifObj)}`);
    }

    // Gating and sharing flags
    if (options.isSpoilerMedia !== undefined) {
      params.append('is_spoiler_media', options.isSpoilerMedia ? 'true' : 'false');
    }
    if (options.isGhostPost !== undefined) {
      params.append('is_ghost_post', options.isGhostPost ? 'true' : 'false');
    }
    if (options.enableReplyApprovals !== undefined) {
      params.append('enable_reply_approvals', options.enableReplyApprovals ? 'true' : 'false');
    }
    if (options.crossreshareToIg !== undefined) {
      params.append('crossreshare_to_ig', options.crossreshareToIg ? 'true' : 'false');
    }
    if (options.crossreshareToIgDarkMode !== undefined) {
      params.append('crossreshare_to_ig_dark_mode', options.crossreshareToIgDarkMode ? 'true' : 'false');
    }

    if (options.autoPublishText !== undefined) {
      params.append('auto_publish_text', options.autoPublishText ? 'true' : 'false');
      console.log(`[ThreadsAPI.createContainer] auto_publish_text: ${options.autoPublishText}`);
    }

    // Location tag
    if (options.locationId) {
      params.append('location_id', options.locationId);
    }

    let attempts = 0;
    const maxAttempts = 5;
    let delayMs = 2000;

    while (attempts < maxAttempts) {
      try {
        console.log(`[ThreadsAPI.createContainer] POSTing to container creation endpoint (attempt ${attempts + 1}/${maxAttempts})...`);
        const res = await this.request(`${this.userId}/threads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString()
        });

        if (!res.id) {
          throw new Error('Failed to create container, no ID returned');
        }

        console.log(`[ThreadsAPI.createContainer] container successfully created with ID: ${res.id}`);
        return res.id;
      } catch (error: any) {
        attempts++;
        const isPropagationError = 
          error.message?.includes("does not exist") || 
          error.message?.includes("cannot be loaded") ||
          error.message?.includes("missing permissions") ||
          error.message?.includes("Unsupported post request");

        if (isPropagationError && options.replyToId && attempts < maxAttempts) {
          console.warn(
            `[ThreadsAPI.createContainer] Threads API propagation delay detected for reply_to_id ${options.replyToId}. ` +
            `Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2;
        } else {
          console.error(`[ThreadsAPI.createContainer] error in container creation: ${error.message}`);
          throw error;
        }
      }
    }
    console.error('[ThreadsAPI.createContainer] failed to create container: max attempts exceeded');
    throw new Error('Failed to create container: max attempts exceeded');
  }

  /**
   * Publishes a previously created media container
   */
  private async publishContainer(creationId: string): Promise<string> {
    console.log(`[ThreadsAPI.publishContainer] publishing container with ID: ${creationId}...`);
    const params = new URLSearchParams();
    params.append('creation_id', creationId);

    let attempts = 0;
    const maxAttempts = 5;
    let delayMs = 2000;

    while (attempts < maxAttempts) {
      try {
        console.log(`[ThreadsAPI.publishContainer] POSTing to publish endpoint (attempt ${attempts + 1}/${maxAttempts})...`);
        const res = await this.request(`${this.userId}/threads_publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString()
        });

        console.log(`[ThreadsAPI.publishContainer] container published successfully! Post ID: ${res.id}`);
        return res.id;
      } catch (error: any) {
        attempts++;
        const isContainerNotFoundError = 
          error.message?.includes("does not exist") || 
          error.message?.includes("cannot be loaded") ||
          error.message?.includes("missing permissions") ||
          error.message?.includes("Unsupported post request") ||
          error.message?.includes("resource does not exist");

        if (isContainerNotFoundError && attempts < maxAttempts) {
          console.warn(
            `[ThreadsAPI.publishContainer] Container not found/ready yet for ID ${creationId}. ` +
            `Retrying publish in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2;
        } else {
          console.error(`[ThreadsAPI.publishContainer] error in container publishing: ${error.message}`);
          throw error;
        }
      }
    }
    console.error('[ThreadsAPI.publishContainer] failed to publish container: max attempts exceeded');
    throw new Error('Failed to publish container: max attempts exceeded');
  }

  /**
   * Create a post (single thread or carousel).
   * Supports text, image, video, links, polls, gifs, etc.
   */
  async createPost(options: PostOptions): Promise<string> {
    console.log('[ThreadsAPI.createPost] creating post...');
    
    // Check if it's a text-only post (no image, video, carousel, quotes, polls, gifs, link attachments)
    const isTextOnly = 
      !options.imageUrl && 
      !options.videoUrl && 
      (!options.carouselItems || options.carouselItems.length === 0) &&
      !options.pollAttachment &&
      !options.gifAttachment &&
      !options.linkAttachment &&
      !options.quotePostId;

    if (isTextOnly) {
      console.log('[ThreadsAPI.createPost] text-only post detected. Using auto_publish_text=true to publish in one step...');
      const publishedId = await this.createContainer({
        ...options,
        autoPublishText: true
      });
      console.log(`[ThreadsAPI.createPost] post successfully auto-published. ID: ${publishedId}`);
      return publishedId;
    }

    console.log('[ThreadsAPI.createPost] media/attachment post detected. Using 2-step publishing flow...');
    const containerId = await this.createContainer(options);
    
    // Wait for the container to finish processing if it involves media
    if (options.imageUrl || options.videoUrl || (options.carouselItems && options.carouselItems.length > 0)) {
      console.log('[ThreadsAPI.createPost] media detected, waiting for container to process...');
      await this.waitForContainer(containerId);
    }
    
    const publishedId = await this.publishContainer(containerId);
    console.log(`[ThreadsAPI.createPost] post successfully published. ID: ${publishedId}`);
    return publishedId;
  }

  /**
   * Create a reply to an existing post
   */
  async createReply(replyToId: string, options: PostOptions): Promise<string> {
    console.log(`[ThreadsAPI.createReply] creating reply to post ID: ${replyToId}...`);
    return this.createPost({
      ...options,
      replyToId
    });
  }

  /**
   * Reposts a previously published Threads post
   */
  async repost(mediaId: string): Promise<{ id: string }> {
    console.log(`[ThreadsAPI.repost] reposting media ID: ${mediaId}...`);
    const res = await this.request(`${mediaId}/repost`, {
      method: 'POST'
    });
    console.log(`[ThreadsAPI.repost] successfully reposted. Repost ID: ${res.id}`);
    return res;
  }

  /**
   * Deletes a published Threads post
   */
  async deletePost(mediaId: string): Promise<{ success: boolean }> {
    console.log(`[ThreadsAPI.deletePost] deleting post ID: ${mediaId}...`);
    const res = await this.request(`${mediaId}`, {
      method: 'DELETE'
    });
    console.log(`[ThreadsAPI.deletePost] successfully deleted post ID: ${mediaId}`);
    return res;
  }
}

export class ThreadsAuthAPI {
  /**
   * Exchanges an authorization code for a short-lived access token
   */
  static async getShortLivedToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string
  ): Promise<{ access_token: string; user_id: number }> {
    console.log(`[ThreadsAuthAPI.getShortLivedToken] exchanging auth code for short-lived token (client_id: ${clientId})...`);
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", redirectUri);
    params.append("code", code);

    const res = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      body: params,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error_message || data?.error?.message || res.statusText;
      console.error(`[ThreadsAuthAPI.getShortLivedToken] token exchange failed: ${errorMsg}`);
      throw new Error(`Failed to exchange authorization code: ${errorMsg}`);
    }

    console.log(`[ThreadsAuthAPI.getShortLivedToken] successfully retrieved short-lived token for user_id: ${data.user_id}`);
    return data;
  }

  /**
   * Exchanges a short-lived user access token for a long-lived access token
   */
  static async exchangeForLongLivedToken(
    clientSecret: string,
    shortLivedToken: string
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    console.log("[ThreadsAuthAPI.exchangeForLongLivedToken] exchanging short-lived token for long-lived token...");
    const url = new URL("https://graph.threads.net/access_token");
    url.searchParams.append("grant_type", "th_exchange_token");
    url.searchParams.append("client_secret", clientSecret);
    url.searchParams.append("access_token", shortLivedToken);

    const res = await fetch(url.toString());
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error_message || data?.error?.message || res.statusText;
      console.error(`[ThreadsAuthAPI.exchangeForLongLivedToken] exchange failed: ${errorMsg}`);
      throw new Error(`Failed to exchange short-lived token: ${errorMsg}`);
    }

    console.log(`[ThreadsAuthAPI.exchangeForLongLivedToken] successfully retrieved long-lived token (expires_in: ${data.expires_in}s)`);
    return data;
  }

  /**
   * Refreshes a long-lived access token.
   * Returns a new token valid for 60 days.
   */
  static async refreshAccessToken(
    accessToken: string
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    console.log("[ThreadsAuthAPI.refreshAccessToken] refreshing long-lived token...");
    const url = new URL("https://graph.threads.net/refresh_access_token");
    url.searchParams.append("grant_type", "th_refresh_token");
    url.searchParams.append("access_token", accessToken);

    const res = await fetch(url.toString());
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error_message || data?.error?.message || res.statusText;
      console.error(`[ThreadsAuthAPI.refreshAccessToken] refresh failed: ${errorMsg}`);
      throw new Error(`Failed to refresh long-lived token: ${errorMsg}`);
    }

    console.log(`[ThreadsAuthAPI.refreshAccessToken] token successfully refreshed (expires_in: ${data.expires_in}s)`);
    return data;
  }
}
