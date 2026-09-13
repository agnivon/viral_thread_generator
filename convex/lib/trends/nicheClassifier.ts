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
    "tv season",
    "new season",
    "season premiere",
    "season finale",
    "series",
    "episode",
    "cast",
    "premiere",
  ],
  gaming: [
    "video game",
    "videogame",
    "video games",
    "gameplay",
    "pc game",
    "console game",
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
    // Sports disciplines
    "football",
    "soccer",
    "basketball",
    "baseball",
    "hockey",
    "tennis",
    "golf",
    "cricket",
    "rugby",
    "volleyball",
    "lacrosse",
    "badminton",
    "swimming",
    "athletics",
    "track and field",
    "boxing",
    "mma",
    "ufc",
    "wrestling",
    "wwe",
    "nascar",
    "f1",
    "formula 1",
    "grand prix",
    "motogp",
    "indycar",

    // Roles, positions & actions
    "athlete",
    "player",
    "coach",
    "head coach",
    "referee",
    "umpire",
    "quarterback",
    "qb",
    "running back",
    "wide receiver",
    "touchdown",
    "field goal",
    "interception",
    "punt",
    "sack",
    "linebacker",
    "home run",
    "grand slam",
    "strikeout",
    "pitcher",
    "batter",
    "bullpen",
    "inning",
    "slam dunk",
    "three-pointer",
    "free throw",
    "triple-double",
    "buzzer beater",
    "rebound",
    "goalkeeper",
    "goalie",
    "striker",
    "midfielder",
    "clean sheet",
    "hat trick",
    "penalty kick",
    "red card",
    "yellow card",
    "offside",
    "puck",
    "power play",
    "faceoff",
    "wicket",
    "batsman",
    "bowler",
    "bogey",
    "birdie",
    "hole in one",
    "par",
    "knockout",
    "tko",
    "bout",

    // Game, tournament & event concepts
    "sports",
    "sport",
    "match",
    "ball game",
    "game today",
    "game score",
    "game highlights",
    "halftime",
    "overtime",
    "playoff",
    "playoffs",
    "championship",
    "tournament",
    "roster",
    "stadium",
    "ballpark",
    "tailgate",
    "sportsbook",
    "fantasy football",
    "gametime",
    "pregame",
    "postgame",
    "injury report",
    "starting lineup",

    // Leagues & Major Tournaments
    "nfl",
    "nba",
    "mlb",
    "nhl",
    "mls",
    "wnba",
    "ncaa",
    "college football",
    "college basketball",
    "cfb",
    "cbb",
    "fifa",
    "uefa",
    "champions league",
    "europa league",
    "premier league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "liga mx",
    "copa america",
    "euro 2024",
    "world cup",
    "super bowl",
    "stanley cup",
    "world series",
    "march madness",
    "final four",
    "heisman",
    "bowl game",
    "rose bowl",
    "sugar bowl",
    "orange bowl",
    "cotton bowl",
    "peach bowl",
    "fiesta bowl",
    "us open",
    "australian open",
    "french open",
    "roland garros",
    "wimbledon",
    "atp",
    "wta",
    "pga",
    "pga tour",
    "masters tournament",
    "ryder cup",
    "liv golf",
    "daytona 500",
    "indy 500",
    "ipl",
    "t20",

    // MLB Teams (30)
    "yankees",
    "mets",
    "dodgers",
    "red sox",
    "cubs",
    "braves",
    "astros",
    "phillies",
    "padres",
    "rangers",
    "orioles",
    "guardians",
    "diamondbacks",
    "dbacks",
    "blue jays",
    "mariners",
    "rays",
    "tampa bay rays",
    "giants",
    "cardinals",
    "tigers",
    "twins",
    "reds",
    "pirates",
    "royals",
    "brewers",
    "athletics",
    "angels",
    "rockies",
    "marlins",
    "white sox",
    "nationals",

    // NFL Teams (32)
    "chiefs",
    "ravens",
    "cowboys",
    "eagles",
    "49ers",
    "niners",
    "bills",
    "packers",
    "lions",
    "dolphins",
    "jets",
    "patriots",
    "steelers",
    "browns",
    "bengals",
    "texans",
    "colts",
    "jaguars",
    "titans",
    "broncos",
    "chargers",
    "raiders",
    "commanders",
    "vikings",
    "saints",
    "buccaneers",
    "bucs",
    "falcons",
    "panthers",
    "seahawks",
    "rams",
    "bears",

    // NBA Teams (30)
    "lakers",
    "celtics",
    "warriors",
    "bulls",
    "knicks",
    "heat",
    "bucks",
    "suns",
    "nuggets",
    "mavericks",
    "clippers",
    "76ers",
    "sixers",
    "cavaliers",
    "cavs",
    "timberwolves",
    "thunder",
    "pacers",
    "trail blazers",
    "blazers",
    "spurs",
    "raptors",
    "grizzlies",
    "pelicans",
    "hawks",
    "hornets",
    "pistons",
    "rockets",
    "magic",
    "kings",
    "jazz",
    "wizards",
    "nets",

    // NHL Teams (32)
    "bruins",
    "sabres",
    "red wings",
    "panthers",
    "canadiens",
    "senators",
    "lightning",
    "maple leafs",
    "hurricanes",
    "blue jackets",
    "devils",
    "islanders",
    "flyers",
    "penguins",
    "capitals",
    "blackhawks",
    "avalanche",
    "stars",
    "wild",
    "predators",
    "blues",
    "ducks",
    "flames",
    "oilers",
    "sharks",
    "kraken",
    "canucks",
    "golden knights",

    // Major International Soccer Clubs
    "real madrid",
    "barcelona",
    "manchester city",
    "man city",
    "manchester united",
    "man united",
    "arsenal",
    "liverpool",
    "chelsea",
    "tottenham",
    "bayern",
    "bayern munich",
    "psg",
    "juventus",
    "inter miami",
    "al nassr",
    "necaxa",
    "puebla",
    "pumas",
    "león",
    "club america",
    "chivas",
    "cruz azul",
    "tigres",
    "monterrey",

    // Major College Programs & Athletic Teams
    "mizzou",
    "nc state",
    "rutgers",
    "villanova",
    "louisville",
    "lsu",
    "lsu tigers",
    "tennessee",
    "tennessee vols",
    "volunteers",
    "vols",
    "lady vols",
    "la tech",
    "louisiana tech",
    "louisiana tech bulldogs",
    "georgia tech",
    "gerogia tech",
    "ga tech",
    "yellow jackets",
    "texas tech",
    "texas tech red raiders",
    "red raiders",
    "virginia tech",
    "va tech",
    "hokies",
    "virginia tech hokies",
    "tennessee tech",
    "michigan tech",
    "caltech",
    "alabama",
    "crimson tide",
    "roll tide",
    "bama",
    "georgia bulldogs",
    "uga",
    "ohio state",
    "buckeyes",
    "osu",
    "michigan wolverines",
    "wolverines",
    "penn state",
    "nittany lions",
    "notre dame",
    "fighting irish",
    "texas longhorns",
    "longhorns",
    "oklahoma sooners",
    "sooners",
    "florida gators",
    "gators",
    "clemson",
    "clemson tigers",
    "fsu",
    "florida state",
    "seminoles",
    "noles",
    "auburn",
    "auburn tigers",
    "war eagle",
    "ole miss",
    "rebels",
    "mississippi state",
    "kentucky wildcats",
    "arkansas razorbacks",
    "razorbacks",
    "south carolina gamecocks",
    "gamecocks",
    "texas a&m",
    "aggies",
    "vanderbilt",
    "vandy",
    "oregon ducks",
    "washington huskies",
    "usc trojans",
    "ucla bruins",
    "wisconsin badgers",
    "badgers",
    "iowa hawkeyes",
    "hawkeyes",
    "nebraska cornhuskers",
    "cornhuskers",
    "michigan state",
    "spartans",
    "indiana hoosiers",
    "hoosiers",
    "illinois fighting illini",
    "fighting illini",
    "illini",
    "purdue boilermakers",
    "boilermakers",
    "minnesota golden gophers",
    "golden gophers",
    "gophers",
    "maryland terrapins",
    "terrapins",
    "terps",
    "tar heels",
    "unc",
    "north carolina tar heels",
    "blue devils",
    "duke blue devils",
    "uva",
    "virginia cavaliers",
    "wolfpack",
    "pitt",
    "pittsburgh panthers",
    "syracuse orange",
    "wake forest",
    "demon deacons",
    "smu mustangs",
    "kansas jayhawks",
    "jayhawks",
    "kansas state",
    "k-state",
    "baylor",
    "baylor bears",
    "tcu",
    "horned frogs",
    "oklahoma state",
    "west virginia",
    "wvu",
    "mountaineers",
    "iowa state",
    "cyclones",
    "cincinnati bearcats",
    "ucf",
    "ucf knights",
    "houston cougars",
    "byu",
    "byu cougars",
    "utah utes",
    "utes",
    "colorado buffaloes",
    "buffs",
    "arizona wildcats",
    "arizona state",
    "asu",
    "sun devils",
    "uconn",
    "uconn huskies",
    "gonzaga",
    "zags",
    "creighton",
    "bluejays",
    "georgetown hoyas",
    "hoyas",
    "st johns",
    "red storm",
    "xavier",
    "providence friars",
    "seton hall",
    "butler bulldogs",
    "memphis tigers",
    "tulane green wave",
    "boise state",
    "san diego state",
    "sdsu",
    "unlv",
    "fresno state",
    "app state",
    "appalachian state",
    "coastal carolina",
    "jmu",
    "james madison",
    "liberty flames",
    "marshall thundering herd",
    "army black knights",
    "navy midshipmen",
    "air force falcons",
    "college football",
    "college basketball",
    "cfb",
    "cbb",
    "fbs",
    "fcs",
    "ncaa",
    "ncaa tournament",
    "march madness",
    "final four",
    "sweet 16",
    "elite 8",
    "heisman",
    "score",
    "scores",
    "game score",
    "live score",
    "box score",
    "gymnastics",
    "softball",

    // Star Athletes Across Disciplines
    "alcaraz",
    "carlos alcaraz",
    "sinner",
    "jannik sinner",
    "djokovic",
    "novak djokovic",
    "nadal",
    "federer",
    "tiafoe",
    "frances tiafoe",
    "ben shelton",
    "coco gauff",
    "gauff",
    "sabalenka",
    "swiatek",
    "tiger woods",
    "scottie scheffler",
    "scheffler",
    "rory mcilroy",
    "mcilroy",
    "caitlin clark",
    "angel reese",
    "trinity rodman",
    "scherzer",
    "max scherzer",
    "shohei ohtani",
    "ohtani",
    "aaron judge",
    "juan soto",
    "mookie betts",
    "cody bellinger",
    "patrick mahomes",
    "mahomes",
    "travis kelce",
    "kelce",
    "jalen hurts",
    "lamar jackson",
    "josh allen",
    "aaron rodgers",
    "dak prescott",
    "caleb williams",
    "shedeur sanders",
    "lebron",
    "lebron james",
    "steph curry",
    "curry",
    "kevin durant",
    "giannis",
    "luka doncic",
    "jokic",
    "messi",
    "lionel messi",
    "ronaldo",
    "cristiano ronaldo",
    "mbappe",
    "haaland",
    "bellingham",
    "vinicius",
    "neymar",
    "max verstappen",
    "verstappen",
    "lewis hamilton",
    "leclerc",
    "lando norris",
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

// Prefixes where "tech" represents a university/college sports team or non-software technician
const COLLEGE_NON_TECH_PREFIXES =
  "(?:la|louisiana|georgia|gerogia|ga|texas|virginia|va|tennessee|arkansas|michigan|indiana|florida|cal|vet|veterinary|radiology|rad|pharmacy|surgical|dental|nail)";

const TECH_KEYWORD_REGEX = new RegExp(
  `(?<!\\b${COLLEGE_NON_TECH_PREFIXES}\\s+)tech(?!\\s+(?:bulldogs|yellow jackets|hokies|red raiders))\\b`,
  "i"
);

// Pre-compiled regex patterns per niche to avoid thousands of RegExp instantiations on each evaluation
const COMPILED_NICHE_PATTERNS: Record<string, RegExp[]> = Object.fromEntries(
  Object.entries(NICHE_KEYWORDS_TAXONOMY).map(([nicheId, terms]) => [
    nicheId,
    terms.map((term) => {
      if (nicheId === "tech_ai" && term === "tech") {
        return TECH_KEYWORD_REGEX;
      }
      return term.includes(" ")
        ? new RegExp(`(?:^|\\s)${escapeRegex(term)}(?:$|\\s)`, "i")
        : new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
    }),
  ])
);

// Matchup detection regex for sporting events (e.g. "mets vs yankees", "la tech vs lsu", "tennessee vs gerogia tech")
const MATCHUP_PATTERN =
  /\b(?:[a-z0-9\s]+\s+(?:vs\.?|v\.?)\s+[a-z0-9\s]+|[a-z0-9\s]+\s+-\s+[a-z0-9\s]+)\b/i;
const POLITICS_LEGAL_PATTERN =
  /\b(?:court|supreme court|lawsuit|judge|trial|verdict|debate|election|presidential|senate|congress)\b/i;
const TECH_PRODUCT_COMPARISON_PATTERN =
  /\b(?:claude|gpt|deepseek|gemini|openai|anthropic|llama|copilot|chatgpt|mistral|qwen|grok|nvidia|amd|intel|apple|google|microsoft|meta|linux|windows|ios|android|mac|pc|python|rust|golang|javascript|typescript|react|vue|angular|svelte|docker|kubernetes|aws|azure|gcp)\b/i;
const CRYPTO_COMPARISON_PATTERN =
  /\b(?:bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|cardano|tether)\b/i;
const GAMING_COMPARISON_PATTERN =
  /\b(?:ps5|playstation|xbox|nintendo|switch|steam deck)\b/i;

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

  // Sports matchup evaluation:
  // If the query represents a head-to-head match (X vs Y or X - Y), classify it as sports
  // UNLESS it is an explicit political/legal debate or a recognized tech/crypto/gaming product comparison
  // (e.g. "Claude vs GPT-4o", "Bitcoin vs Ethereum", "PS5 vs Xbox").
  const isMatchup =
    MATCHUP_PATTERN.test(keyword) ||
    relatedKeywords.some((rk) => MATCHUP_PATTERN.test(rk));

  if (isMatchup) {
    const isPolitics = POLITICS_LEGAL_PATTERN.test(combinedText);
    const isTechComparison =
      TECH_PRODUCT_COMPARISON_PATTERN.test(combinedText);
    const isCryptoComparison = CRYPTO_COMPARISON_PATTERN.test(combinedText);
    const isGamingComparison = GAMING_COMPARISON_PATTERN.test(combinedText);

    const isNonSportsMatchup =
      isPolitics ||
      isTechComparison ||
      isCryptoComparison ||
      isGamingComparison;

    if (!isNonSportsMatchup) {
      matchedNiches.add("sports");
      // If a sports matchup was misattributed to tech_ai, purge it unless genuine tech comparison
      if (matchedNiches.has("tech_ai") && !isTechComparison) {
        matchedNiches.delete("tech_ai");
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

    // If trend belongs to no recognized niche, suppress it
    if (classifiedNiches.length === 0) {
      return false;
    }

    // Strict sports suppression:
    // If the user has explicitly deselected "sports", ensure that ANY trend classified as
    // sports is strictly suppressed, even if it was co-classified with an enabled niche (e.g. entertainment or gaming).
    if (!settings.selectedNiches.includes("sports") && classifiedNiches.includes("sports")) {
      return false;
    }

    // If trend has no overlap with user's selected niches:
    const hasOverlap = classifiedNiches.some((nicheId) =>
      settings.selectedNiches.includes(nicheId)
    );

    if (!hasOverlap) {
      return false;
    }
  }

  return true;
}
