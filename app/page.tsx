import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductMockup } from "@/components/landing/ProductMockup";
import { AgentPipelineSection } from "@/components/landing/AgentPipelineSection";
import { FeatureMatrix } from "@/components/landing/FeatureMatrix";
import { TrendRadarSpotlight } from "@/components/landing/TrendRadarSpotlight";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  getSiteUrl,
  SITE_NAME,
  SITE_DESCRIPTION,
  AUTHOR_NAME,
  AUTHOR_SITE,
} from "@/lib/site";

export default function LandingPage() {
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#webapp`,
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "All",
        browserRequirements: "Requires modern web browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        author: {
          "@type": "Person",
          name: AUTHOR_NAME,
          url: AUTHOR_SITE,
        },
        creator: {
          "@type": "Person",
          name: AUTHOR_NAME,
          url: AUTHOR_SITE,
        },
        featureList: [
          "5-Stage Multi-Agent LangGraph Pipeline",
          "Human-in-the-Loop Hook Selection with 5 Psychological Frameworks",
          "Real-Time Google Trends Velocity Radar across 8 Niches",
          "Direct Meta Threads Publishing & OAuth Integration",
          "Pareto Frontier Virality Critic & Post Refinement",
          "Batch Thread Generation Studio",
        ],
        screenshot: `${siteUrl}/opengraph-image`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: {
          "@type": "Organization",
          "@id": `${siteUrl}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon.svg`,
        },
        founder: {
          "@type": "Person",
          name: AUTHOR_NAME,
          url: AUTHOR_SITE,
        },
        sameAs: [
          AUTHOR_SITE,
          "https://github.com/agnivon/viral_thread_generator",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Do I need a Meta Threads developer account to publish?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No! You simply connect your personal or professional Threads profile using our official Meta OAuth integration in Settings. We handle container creation, media carousel bundling, and automated 60-day token refreshes in the background.",
            },
          },
          {
            "@type": "Question",
            name: "How does the Human-In-The-Loop hook selection work?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Instead of forcing a single AI guess, our LangGraph pipeline pauses at the Hook Strategist node. You can review 5 distinct psychological hook frameworks (Curiosity Gap, Contrarian Take, Bold Data Claim, Story Lead, Actionable Listicle), select your favorite, tweak the wording with live 500-character budgeting, or write a custom hook before resuming generation.",
            },
          },
          {
            "@type": "Question",
            name: "Can I generate threads from multiple sources simultaneously?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! The Generation Studio allows you to queue multiple article URLs, newsletters, or topic prompts in parallel. Convex background workpools process them concurrently so you can generate multiple drafts at once without blocking your browser.",
            },
          },
          {
            "@type": "Question",
            name: "How does Google Trends Radar discover breakout topics?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Trend Radar continuously scans real-time Google search trends across 8 creator niches: Tech & AI, Crypto & Finance, Business & Startups, Gaming & Esports, Entertainment & Culture, Sports, Science & Health, and Politics & World. It identifies surging search volume velocity and lets you generate research-backed threads with 1 click before the topic peaks.",
            },
          },
          {
            "@type": "Question",
            name: "Is my data private? Are external URLs stored in your database?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "We enforce a strict zero-database policy for URL metadata. All webpage title resolution and OpenGraph extractions are cached purely in client-side memory using TanStack Query. Your draft content is strictly accessible only to your authenticated account.",
            },
          },
          {
            "@type": "Question",
            name: "Can I attach images or videos to my thread posts?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! The approval studio allows you to attach images and videos directly to any post in your thread sequence. You can select visual assets automatically extracted from your source article or attach custom media URLs. We validate URL formats and keep your thread posts within Meta Threads requirements.",
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col selection:bg-violet-500/20 selection:text-violet-600 dark:selection:text-violet-300">
      {/* Structured Data (Schema.org JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Sticky Header with Navigation, Theme Toggle, & Auth CTA */}
      <LandingNavbar />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Product Studio Mockup Preview */}
        <ProductMockup />

        {/* Core Feature Matrix (The 6 Pillars) */}
        <FeatureMatrix />

        {/* Multi-Agent Architecture (5-Node LangGraph Flow) */}
        <AgentPipelineSection />

        {/* Google Trends Intelligence (Trend Radar Spotlight) */}
        <TrendRadarSpotlight />

        {/* How It Works (3-Step Creator Journey) */}
        <HowItWorksSection />

        {/* Interactive FAQ Section */}
        <FaqSection />
      </main>

      {/* High-Impact Pre-Footer CTA & Footer */}
      <LandingFooter />
    </div>
  );
}
