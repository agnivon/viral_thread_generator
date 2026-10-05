import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProductMockup } from "@/components/landing/ProductMockup";
import { AgentPipelineSection } from "@/components/landing/AgentPipelineSection";
import { FeatureMatrix } from "@/components/landing/FeatureMatrix";
import { TrendRadarSpotlight } from "@/components/landing/TrendRadarSpotlight";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col selection:bg-violet-500/20 selection:text-violet-600 dark:selection:text-violet-300">
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
