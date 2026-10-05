# Meta Threads Publishing Engine

**Viral Thread Generator** integrates directly with the official **Meta Threads Graph API** (`graph.threads.net`), providing complete OAuth authorization, token lifecycle management, media container processing, and asynchronous thread publishing.

---

## 🔐 1. OAuth 2.0 Token Lifecycle

The Threads integration uses a two-tier token exchange mechanism:

```
[User clicks "Link Threads"] ──> Generates HMAC-Signed State (1-hr TTL)
                                             │
                                             ▼
                               Redirects to Threads OAuth URL
                                             │
                                             ▼
[User approves on Threads]   ──> Returns authorization code to /auth
                                             │
                                             ▼
                               Exchanges code for Short-Lived Token (1-hr)
                                             │
                                             ▼
                               Exchanges for Long-Lived Token (60 days)
                                             │
                                             ▼
                               Stores in Convex accessTokens table
                                             │
                                             ▼
                     [Recurring Cron Job refreshes token every 30 days]
```

### Security & State Verification
In `app/actions/threadsAuth.ts`, the OAuth state parameter is signed with HMAC-SHA256 using `THREADS_APP_SECRET` and contains `userId:timestamp`. When the user is redirected to `convex/http.ts`, the signature and timestamp are cryptographically verified before any tokens are stored.

### Automated Token Refresh Cron
In `convex/crons.ts`, a daily background cron inspects active tokens and refreshes long-lived tokens that are within 15 days of expiration using `ThreadsAuthAPI.refreshLongLivedToken()`.

---

## 📦 2. Media Container Publishing Architecture

Publishing a multi-post thread to Meta Threads requires containerized creation:

```
Step 1: Create Media / Text Container for Post 1
        POST /v1.0/{user_id}/threads
        Body: { text: "...", media_type: "IMAGE", image_url: "..." }
        Returns: { id: "container_1" }
                 │
                 ▼
Step 2: Poll Container Status until "FINISHED"
        GET /v1.0/{container_1}?fields=status
                 │
                 ▼
Step 3: Publish Container
        POST /v1.0/{user_id}/threads_publish?creation_id=container_1
        Returns: { id: "published_post_1" }
                 │
                 ▼
Step 4: Create Reply Post 2 linked to Post 1
        POST /v1.0/{user_id}/threads
        Body: { text: "...", reply_to_id: "published_post_1" }
```

### Media Types Supported:
- **`TEXT`**: Standard text post up to 500 characters.
- **`IMAGE`**: Single high-resolution JPEG/PNG via public image URL.
- **`CAROUSEL`**: Multi-image carousel containers (2–10 images per post).
- **`VIDEO`**: MP4/MOV videos with automatic transcoding status polling.

---

## 🔄 3. Error Handling & Propagation Retries

Meta's Graph API occasionally exhibits eventual consistency delays: a media container reported as `FINISHED` may return `400: The requested resource does not exist` when immediately sent to `/threads_publish`.

The client in `convex/lib/clients/threads.ts` includes exponential backoff retry logic:
- Up to **5 retries** with a 2-second sleep interval.
- Automatically handles transient container propagation lags without failing the user's publication request.
- Updates the draft's `publication_status` in Convex to `"success"` or records the exact `publication_error` upon failure.
