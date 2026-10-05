"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Do I need a Meta Threads developer account to publish?",
      answer:
        "No! You simply connect your personal or professional Threads profile using our official Meta OAuth integration in Settings. We handle container creation, media carousel bundling, and automated 60-day token refreshes in the background.",
    },
    {
      question: "How does the Human-In-The-Loop hook selection work?",
      answer:
        "Instead of forcing a single AI guess, our LangGraph pipeline pauses at the Hook Strategist node. You can review 5 distinct psychological hook frameworks (Curiosity Gap, Contrarian Take, Bold Data Claim, Story Lead, Actionable Listicle), select your favorite, tweak the wording with live 500-character budgeting, or write a custom hook before resuming generation.",
    },
    {
      question: "Can I generate threads from multiple sources simultaneously?",
      answer:
        "Yes! The Generation Studio allows you to queue multiple article URLs, newsletters, or topic prompts in parallel. Convex background workpools process them concurrently so you can generate multiple drafts at once without blocking your browser.",
    },
    {
      question: "How does Google Trends Radar discover breakout topics?",
      answer:
        "Trend Radar continuously scans real-time Google search trends across 8 creator niches: Tech & AI, Crypto & Finance, Business & Startups, Gaming & Esports, Entertainment & Culture, Sports, Science & Health, and Politics & World. It identifies surging search volume velocity and lets you generate research-backed threads with 1 click before the topic peaks.",
    },
    {
      question: "Is my data private? Are external URLs stored in your database?",
      answer:
        "We enforce a strict zero-database policy for URL metadata. All webpage title resolution and OpenGraph extractions are cached purely in client-side memory using TanStack Query. Your draft content is strictly accessible only to your authenticated account.",
    },
    {
      question: "Can I attach images or videos to my thread posts?",
      answer:
        "Yes! The approval studio allows you to attach images and videos directly to any post in your thread sequence. You can select visual assets automatically extracted from your source article or attach custom media URLs. We validate URL formats and keep your thread posts within Meta Threads requirements.",
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-muted/5 relative">
      <div className="container max-w-4xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Everything You Need to Know
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Got questions about our agent pipeline, Threads publishing, or Trend Radar? We&apos;ve got answers.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4 text-left">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left font-bold text-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-violet-600 dark:text-violet-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3 animate-in fade-in-50 duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
