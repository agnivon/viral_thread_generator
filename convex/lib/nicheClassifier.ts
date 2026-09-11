export interface NicheDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const NICHE_DEFINITIONS: NicheDefinition[] = [
  {
    id: "tech_ai",
    name: "Tech & AI",
    description: "Artificial Intelligence, LLMs, developer tools, gadgets & software",
    icon: "Bot",
  },
  {
    id: "finance_crypto",
    name: "Crypto & Finance",
    description: "Bitcoin, Ethereum, stock market, macroeconomic trends & trading",
    icon: "Coins",
  },
  {
    id: "business_startups",
    name: "Business & Startups",
    description: "Founders, venture capital, SaaS, acquisitions, leadership & work",
    icon: "Briefcase",
  },
  {
    id: "entertainment",
    name: "Entertainment & Culture",
    description: "Movies, TV series, music, celebrity news, streaming & Hollywood",
    icon: "Film",
  },
  {
    id: "gaming",
    name: "Gaming & Esports",
    description: "Video games, consoles, game releases, esports & streaming",
    icon: "Gamepad2",
  },
  {
    id: "sports",
    name: "Sports",
    description: "Football, basketball, soccer, baseball, tennis, F1 & major leagues",
    icon: "Trophy",
  },
  {
    id: "science_health",
    name: "Science & Health",
    description: "Medicine, space exploration, biotech, wellness & scientific discoveries",
    icon: "Dna",
  },
  {
    id: "politics_world",
    name: "Politics & World",
    description: "Elections, governance, international relations & public policy",
    icon: "Landmark",
  },
];

export const NICHE_KEYWORDS_TAXONOMY: Record<string, string[]> = {
  tech_ai: [
    "ai",
    "artificial intelligence",
    "gpt",
    "claude",
    "deepseek",
    "gemini",
    "openai",
    "anthropic",
    "nvidia",
    "llm",
    "model",
    "coding",
    "developer",
    "software",
    "hardware",
    "apple",
    "google",
    "microsoft",
    "meta",
    "tech",
    "chip",
    "gpu",
    "semiconductor",
    "robot",
    "robotics",
    "cyber",
    "hacker",
    "linux",
    "windows",
    "ios",
    "android",
    "app",
    "computer",
    "server",
    "cloud",
    "quantum",
    "intel",
    "amd",
    "programming",
    "open source",
    "api",
  ],
  finance_crypto: [
    "crypto",
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "solana",
    "token",
    "blockchain",
    "defi",
    "stock",
    "stocks",
    "nasdaq",
    "s&p",
    "dow",
    "wall street",
    "fed",
    "interest rate",
    "inflation",
    "treasury",
    "earnings",
    "dividend",
    "investing",
    "shares",
    "market",
    "rally",
    "bank",
    "banking",
    "recession",
    "economy",
    "gdp",
    "fund",
    "etf",
    "forex",
    "bond",
    "finance",
  ],
  business_startups: [
    "startup",
    "founder",
    "ceo",
    "venture capital",
    "vc",
    "seed",
    "series a",
    "acquisition",
    "merger",
    "ipo",
    "layoff",
    "layoffs",
    "revenue",
    "profit",
    "valuation",
    "saas",
    "b2b",
    "ecommerce",
    "marketing",
    "sales",
    "enterprise",
    "career",
    "hiring",
    "workplace",
    "business",
    "company",
  ],
  entertainment: [
    "movie",
    "film",
    "actor",
    "actress",
    "director",
    "trailer",
    "cinema",
    "oscar",
    "emmy",
    "grammy",
    "netflix",
    "hbo",
    "disney",
    "song",
    "album",
    "singer",
    "concert",
    "tour",
    "band",
    "music",
    "celebrity",
    "hollywood",
    "jonas",
    "taylor swift",
    "beyonce",
    "broadway",
    "season",
    "series",
    "episode",
    "cast",
    "premiere",
  ],
  gaming: [
    "game",
    "gaming",
    "gamer",
    "playstation",
    "ps5",
    "xbox",
    "nintendo",
    "switch",
    "steam",
    "valve",
    "epic games",
    "esports",
    "fortnite",
    "minecraft",
    "gta",
    "roblox",
    "call of duty",
    "cod",
    "zelda",
    "pokemon",
    "patch notes",
    "dlc",
    "rpg",
    "multiplayer",
    "twitch",
    "discord",
  ],
  sports: [
    "football",
    "soccer",
    "basketball",
    "baseball",
    "hockey",
    "nfl",
    "nba",
    "mlb",
    "nhl",
    "fifa",
    "premier league",
    "champions league",
    "la liga",
    "liga mx",
    "ufc",
    "mma",
    "boxing",
    "f1",
    "formula 1",
    "grand prix",
    "tennis",
    "golf",
    "wimbledon",
    "super bowl",
    "world cup",
    "touchdown",
    "quarterback",
    "coach",
    "pumas",
    "león",
    "stetson bennett",
    "player",
    "match",
    "athlete",
    "score",
  ],
  science_health: [
    "science",
    "health",
    "medicine",
    "medical",
    "vaccine",
    "vaccines",
    "virus",
    "flu",
    "covid",
    "fda",
    "doctor",
    "hospital",
    "disease",
    "cancer",
    "treatment",
    "drug",
    "diet",
    "nutrition",
    "space",
    "nasa",
    "spacex",
    "mars",
    "astronomy",
    "physics",
    "climate",
    "earthquake",
    "planet",
    "biology",
    "biotech",
  ],
  politics_world: [
    "politics",
    "political",
    "election",
    "president",
    "presidential",
    "vote",
    "voter",
    "voting",
    "senate",
    "senator",
    "congress",
    "congressman",
    "white house",
    "democrat",
    "republican",
    "parliament",
    "prime minister",
    "supreme court",
    "judge",
    "law",
    "bill",
    "legislation",
    "treaty",
    "sanction",
    "war",
    "military",
    "diplomacy",
    "nato",
    "un",
  ],
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-compiled regex patterns per niche to avoid thousands of RegExp instantiations on each evaluation
const COMPILED_NICHE_PATTERNS: Record<string, RegExp[]> = Object.fromEntries(
  Object.entries(NICHE_KEYWORDS_TAXONOMY).map(([nicheId, terms]) => [
    nicheId,
    terms.map((term) =>
      term.includes(" ")
        ? new RegExp(`(?:^|\\s)${escapeRegex(term)}(?:$|\\s)`, "i")
        : new RegExp(`\\b${escapeRegex(term)}\\b`, "i")
    ),
  ])
);

/**
 * Classifies a trend into one or more creator niches based on taxonomy matching.
 */
export function classifyTrendNiches(
  keyword: string,
  relatedKeywords: string[] = []
): string[] {
  const combinedText = `${keyword} ${relatedKeywords.join(" ")}`.toLowerCase();
  const matchedNiches = new Set<string>();

  for (const [nicheId, patterns] of Object.entries(COMPILED_NICHE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        matchedNiches.add(nicheId);
        break; // Matched this niche, move to next
      }
    }
  }

  return Array.from(matchedNiches);
}

export interface TrendFilterSettingsInput {
  enabled: boolean;
  minGrowthRate: number;
  selectedNiches: string[];
  whitelistKeywords: string[];
  blacklistKeywords: string[];
  desktopPushEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

function textContainsKeyword(text: string, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return false;
  const escaped = escapeRegex(normalized);
  // Delimit by non-alphanumeric boundaries so e.g. "ai" doesn't match "email" or "war" doesn't match "software"
  const pattern = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, "i");
  return pattern.test(text);
}

/**
 * Evaluates whether an emerging trend satisfies the user's personalization rules.
 */
export function matchesUserPreferences(
  trend: {
    keyword: string;
    trafficGrowthRate: number;
    relatedKeywords?: string[];
    classifiedNiches?: string[];
  },
  settings: TrendFilterSettingsInput
): boolean {
  // 1. Master Toggle check (If disabled, suppress all notifications)
  if (!settings.enabled) {
    return false;
  }

  const combinedText = `${trend.keyword} ${(trend.relatedKeywords || []).join(" ")}`.toLowerCase();

  // 2. Negative Keywords Blacklist check (Immediate suppression)
  if (settings.blacklistKeywords && settings.blacklistKeywords.length > 0) {
    for (const rawBlacklist of settings.blacklistKeywords) {
      if (textContainsKeyword(combinedText, rawBlacklist)) {
        return false;
      }
    }
  }

  // 3. Whitelist Keywords check (Overrides category selection with instant match)
  if (settings.whitelistKeywords && settings.whitelistKeywords.length > 0) {
    for (const rawWhitelist of settings.whitelistKeywords) {
      if (textContainsKeyword(combinedText, rawWhitelist)) {
        return true;
      }
    }
  }

  // 4. Velocity sensitivity check
  if (
    trend.trafficGrowthRate < settings.minGrowthRate &&
    trend.trafficGrowthRate !== 1000
  ) {
    return false;
  }

  // 5. Niche selection check
  // If user has selected specific niches, trend must match at least one.
  // If user has deselected all niches (selectedNiches is empty array), no trend matches unless whitelisted.
  if (Array.isArray(settings.selectedNiches)) {
    if (settings.selectedNiches.length === 0) {
      return false;
    }

    const classifiedNiches =
      trend.classifiedNiches ??
      classifyTrendNiches(
        trend.keyword,
        trend.relatedKeywords || []
      );

    // If trend belongs to no recognized niche, or has no overlap with user's niches:
    const hasOverlap = classifiedNiches.some((nicheId) =>
      settings.selectedNiches.includes(nicheId)
    );

    if (!hasOverlap) {
      return false;
    }
  }

  return true;
}
