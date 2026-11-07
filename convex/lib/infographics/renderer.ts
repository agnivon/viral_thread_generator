"use node";
import React from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { InfographicSpec } from "./schema.js";
import { getInfographicFont } from "./font.js";

const h = React.createElement;

function renderArrowIcon(): React.ReactNode {
  return h(
    "svg",
    {
      width: 20,
      height: 20,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#0284c7",
      strokeWidth: 2.5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "flex", flexShrink: 0 },
    },
    h("path", { d: "M5 12h14" }),
    h("path", { d: "m12 5 7 7-7 7" })
  );
}

export function buildInfographicReactElement(spec: InfographicSpec): React.ReactNode {
  const headlineLen = spec.headline ? spec.headline.length : 0;
  const headlineFontSize = headlineLen > 90 ? 24 : headlineLen > 60 ? 28 : 31;

  // 1. Header component
  const header = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 12,
            fontWeight: 800,
            color: "#0284c7",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
          },
        },
        spec.kicker || "EDITORIAL INFOGRAPHIC"
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 11,
            fontWeight: 700,
            color: "#475569",
            backgroundColor: "#f1f5f9",
            padding: "3px 8px",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          },
        },
        "VISUAL INTELLIGENCE"
      )
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: headlineFontSize,
          fontWeight: 800,
          color: "#0f172a",
          marginTop: 6,
          lineHeight: 1.2,
        },
      },
      spec.headline
    ),
    spec.subheading
      ? h(
          "div",
          {
            style: {
              display: "flex",
              fontSize: 14,
              fontWeight: 500,
              color: "#475569",
              marginTop: 4,
              lineHeight: 1.35,
            },
          },
          spec.subheading
        )
      : null,
    h("div", {
      style: {
        display: "flex",
        width: "100%",
        height: 1,
        backgroundColor: "#e2e8f0",
        marginTop: 12,
      },
    })
  );

  // 2. Middle Body Content according to archetype
  let bodyContent: React.ReactNode = null;

  if (spec.archetype === "entity_comparison" && spec.entityColumns && spec.entityColumns.length >= 2) {
    const colA = spec.entityColumns[0];
    const colB = spec.entityColumns[1];

    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 18,
          justifyContent: "space-between",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: 20,
            width: "100%",
            flex: 1,
          },
        },
        // Column A
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderTop: "4px solid #0284c7",
              borderRadius: 8,
              padding: "16px 20px",
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              },
            },
            h("div", { style: { display: "flex", fontSize: 19, fontWeight: 800, color: "#0284c7" } }, colA.name),
            colA.badge
              ? h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#0369a1",
                      backgroundColor: "#e0f2fe",
                      padding: "3px 8px",
                      borderRadius: 4,
                    },
                  },
                  colA.badge
                )
              : null
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
              },
            },
            colA.items.map((item, idx) =>
              h(
                "div",
                {
                  key: idx,
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    flex: 1,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderLeft: "4px solid #0284c7",
                    borderRadius: 6,
                    padding: "12px 14px",
                  },
                },
                h("div", { style: { display: "flex", fontSize: 14, fontWeight: 700, color: "#0f172a" } }, item.title),
                h("div", { style: { display: "flex", fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 1.3 } }, item.description)
              )
            )
          )
        ),
        // Column B
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderTop: "4px solid #475569",
              borderRadius: 8,
              padding: "16px 20px",
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              },
            },
            h("div", { style: { display: "flex", fontSize: 19, fontWeight: 800, color: "#0f172a" } }, colB.name),
            colB.badge
              ? h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      backgroundColor: "#f1f5f9",
                      padding: "3px 8px",
                      borderRadius: 4,
                    },
                  },
                  colB.badge
                )
              : null
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
              },
            },
            colB.items.map((item, idx) =>
              h(
                "div",
                {
                  key: idx,
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    flex: 1,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderLeft: "4px solid #94a3b8",
                    borderRadius: 6,
                    padding: "12px 14px",
                  },
                },
                h("div", { style: { display: "flex", fontSize: 14, fontWeight: 700, color: "#0f172a" } }, item.title),
                h("div", { style: { display: "flex", fontSize: 12, color: "#475569", marginTop: 2, lineHeight: 1.3 } }, item.description)
              )
            )
          )
        )
      ),
      spec.milestoneBadge || spec.takeawayBox
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                gap: 14,
                width: "100%",
              },
            },
            spec.milestoneBadge
              ? h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "12px 18px",
                      borderRadius: 8,
                      flex: spec.takeawayBox ? 1 : 1,
                    },
                  },
                  h("div", { style: { display: "flex", fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase" } }, spec.milestoneBadge.label),
                  h("div", { style: { display: "flex", fontSize: 15, fontWeight: 800, color: "#15803d" } }, spec.milestoneBadge.value)
                )
              : null,
            spec.takeawayBox
              ? h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderLeft: "4px solid #2563eb",
                      padding: "12px 18px",
                      borderRadius: 8,
                      flex: spec.milestoneBadge ? 1.5 : 1,
                    },
                  },
                  spec.takeawayBox.title
                    ? h("div", { style: { display: "flex", fontSize: 11, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", whiteSpace: "nowrap" } }, spec.takeawayBox.title + ":")
                    : null,
                  h("div", { style: { display: "flex", fontSize: 12, color: "#1e3a8a", lineHeight: 1.35 } }, spec.takeawayBox.text)
                )
              : null
          )
        : null
    );
  } else if (spec.archetype === "comparison_bars" && spec.barCharts && spec.barCharts.length > 0) {
    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 18,
          justifyContent: "space-between",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: 20,
            flex: 1,
          },
        },
        spec.barCharts.map((chart, cIdx) => {
          const maxValue = Math.max(...chart.bars.map((b) => b.value), 1);
          return h(
            "div",
            {
              key: cIdx,
              style: {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderTop: "4px solid #0284c7",
                borderRadius: 8,
                padding: "18px 22px",
                justifyContent: "space-between",
              },
            },
            h(
              "div",
              { style: { display: "flex", flexDirection: "column" } },
              h("div", { style: { display: "flex", fontSize: 17, fontWeight: 800, color: "#0f172a" } }, chart.title),
              chart.subtitle
                ? h("div", { style: { display: "flex", fontSize: 12, color: "#64748b", marginTop: 2 } }, chart.subtitle)
                : null
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  width: "100%",
                  marginTop: 10,
                  flex: 1,
                  justifyContent: "center",
                },
              },
              chart.bars.map((bar, bIdx) => {
                const pct = Math.max(Math.min((bar.value / maxValue) * 100, 100), 8);
                const barColor = bar.color || (bIdx === 0 ? "#0284c7" : "#38bdf8");
                return h(
                  "div",
                  {
                    key: bIdx,
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      gap: 4,
                    },
                  },
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      },
                    },
                    h("div", { style: { display: "flex", fontSize: 13, fontWeight: 700, color: "#334155" } }, bar.label),
                    h("div", { style: { display: "flex", fontSize: 14, fontWeight: 800, color: "#0f172a" } }, bar.displayValue)
                  ),
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        width: "100%",
                        height: 30,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 6,
                        overflow: "hidden",
                      },
                    },
                    h("div", {
                      style: {
                        display: "flex",
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: barColor,
                        borderRadius: 6,
                      },
                    })
                  )
                );
              }),
              h(
                "div",
                {
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    borderTop: "1px dashed #cbd5e1",
                    paddingTop: 6,
                    marginTop: 6,
                    fontSize: 11,
                    color: "#94a3b8",
                  },
                },
                h("div", { style: { display: "flex" } }, "0"),
                h("div", { style: { display: "flex" } }, "Baseline"),
                h("div", { style: { display: "flex" } }, `Max: ${chart.bars[0]?.displayValue || maxValue}`)
              )
            )
          );
        })
      ),
      spec.takeawayBox
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderLeft: "4px solid #2563eb",
                borderRadius: 8,
                padding: "12px 20px",
              },
            },
            spec.takeawayBox.title
              ? h("div", { style: { display: "flex", fontSize: 11, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px" } }, spec.takeawayBox.title)
              : null,
            h("div", { style: { display: "flex", fontSize: 12, color: "#1e3a8a", marginTop: 2, lineHeight: 1.35 } }, spec.takeawayBox.text)
          )
        : null
    );
  } else if (spec.archetype === "stat_callout" && spec.statCallout) {
    const sc = spec.statCallout;
    const statLen = sc.primaryStat ? sc.primaryStat.length : 0;
    const statFontSize = statLen > 25 ? 38 : statLen > 15 ? 48 : 58;

    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 18,
          justifyContent: "space-between",
        },
      },
      // 1. Primary Hero Card
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 36,
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderTop: "5px solid #0284c7",
            padding: "26px 36px",
            borderRadius: 10,
            flex: 1.2,
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 320,
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 11,
                fontWeight: 800,
                color: "#0369a1",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: 6,
              },
            },
            "HERO DATA METRIC"
          ),
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: statFontSize,
                fontWeight: 900,
                color: "#0284c7",
                letterSpacing: "-1.5px",
                lineHeight: 1,
              },
            },
            sc.primaryStat
          )
        ),
        // Divider
        h("div", {
          style: {
            display: "flex",
            width: 1,
            height: "70%",
            backgroundColor: "#cbd5e1",
          },
        }),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
            },
          },
          h("div", { style: { display: "flex", fontSize: 21, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 } }, sc.statLabel),
          sc.comparisonNote
            ? h("div", { style: { display: "flex", fontSize: 14, color: "#334155", marginTop: 8, lineHeight: 1.4 } }, sc.comparisonNote)
            : null
        )
      ),

      // 2. Lower row: 2-column balanced breakdown cards
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: 16,
            flex: 1,
          },
        },
        // Card 1: Benchmark or Baseline
        h(
          "div",
          {
            style: {
              display: "flex",
              flex: 1,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderTop: "4px solid #64748b",
              padding: "18px 24px",
              borderRadius: 8,
              flexDirection: "column",
              justifyContent: "center",
            },
          },
          h(
            "div",
            { style: { display: "flex", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" } },
            sc.secondaryLabel || "COMPARISON BENCHMARK"
          ),
          h(
            "div",
            { style: { display: "flex", fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 } },
            sc.secondaryStat || "Baseline Metric"
          ),
          h(
            "div",
            { style: { display: "flex", fontSize: 12, color: "#64748b", marginTop: 4 } },
            sc.secondaryStat ? "Standard threshold comparison" : "Historical baseline reference"
          )
        ),
        // Card 2: Takeaway Box
        h(
          "div",
          {
            style: {
              display: "flex",
              flex: 1.8,
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderLeft: "4px solid #2563eb",
              padding: "18px 26px",
              borderRadius: 8,
              flexDirection: "column",
              justifyContent: "center",
            },
          },
          h(
            "div",
            { style: { display: "flex", fontSize: 11, fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px" } },
            spec.takeawayBox?.title || "STRATEGIC IMPLICATION"
          ),
          h(
            "div",
            { style: { display: "flex", fontSize: 13, color: "#1e3a8a", marginTop: 4, lineHeight: 1.4 } },
            spec.takeawayBox?.text || (sc.comparisonNote ? sc.comparisonNote : "Key empirical finding confirmed by research analysis.")
          )
        )
      )
    );
  } else {
    // Default archetype: 'kpi_flow' or 'custom_layout'
    const cards = spec.kpiCards && spec.kpiCards.length > 0 ? spec.kpiCards : [
      { value: "Key Impact", label: "Core Takeaway", subtext: "Critical inflection point" }
    ];

    const hasFlow = spec.flowSteps && spec.flowSteps.length > 0;

    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          margin: "18px 0",
        },
      },
      // 1. Top row: KPI cards
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: 16,
            width: "100%",
            height: 125,
          },
        },
        cards.map((card, idx) => {
          const cardValLen = card.value ? card.value.length : 0;
          const cardFontSize = cardValLen > 14 ? 22 : cardValLen > 9 ? 26 : 32;

          return h(
            "div",
            {
              key: idx,
              style: {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderTop: idx === 0 ? "4px solid #0284c7" : "4px solid #cbd5e1",
                borderRadius: 8,
                padding: "16px 20px",
                justifyContent: "center",
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: 10,
                  fontWeight: 800,
                  color: idx === 0 ? "#0369a1" : "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 4,
                },
              },
              `METRIC 0${idx + 1}`
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: cardFontSize,
                  fontWeight: 800,
                  color: idx === 0 ? "#0284c7" : "#0f172a",
                  lineHeight: 1.1,
                },
              },
              card.value
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginTop: 4,
                },
              },
              card.label
            ),
            card.subtext
              ? h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 2,
                    },
                  },
                  card.subtext
                )
              : null
          );
        })
      ),

      // 2. Middle row: Either flow steps OR structured 2-column analysis
      hasFlow
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: 12,
                width: "100%",
                height: 155,
              },
            },
            spec.flowSteps!.map((step, idx) => {
              const totalSteps = spec.flowSteps?.length || 4;
              const progressPct = Math.round(((idx + 1) / totalSteps) * 100);

              return h(
                "div",
                {
                  key: idx,
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    gap: 12,
                  },
                },
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      height: "100%",
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "16px 16px",
                      justifyContent: "space-between",
                    },
                  },
                  h(
                    "div",
                    { style: { display: "flex", flexDirection: "column" } },
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        },
                      },
                      h(
                        "div",
                        {
                          style: {
                            display: "flex",
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#0369a1",
                            backgroundColor: "#e0f2fe",
                            padding: "2px 6px",
                            borderRadius: 4,
                            letterSpacing: "0.5px",
                          },
                        },
                        `STEP 0${idx + 1}`
                      )
                    ),
                    h("div", { style: { display: "flex", fontSize: 13, fontWeight: 700, color: "#0f172a" } }, step.title),
                    step.description
                      ? h("div", { style: { display: "flex", fontSize: 11.5, color: "#475569", marginTop: 5, lineHeight: 1.4 } }, step.description)
                      : null
                  ),
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        width: "100%",
                        height: 3,
                        backgroundColor: "#f1f5f9",
                        borderRadius: 2,
                        marginTop: 8,
                        overflow: "hidden",
                      },
                    },
                    h("div", {
                      style: {
                        display: "flex",
                        width: `${progressPct}%`,
                        height: "100%",
                        backgroundColor: "#0284c7",
                      },
                    })
                  )
                ),
                idx < totalSteps - 1 ? renderArrowIcon() : null
              );
            })
          )
        : h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                gap: 16,
                width: "100%",
                height: 140,
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flex: 1,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid #0284c7",
                  borderRadius: 8,
                  padding: "18px 22px",
                  flexDirection: "column",
                  justifyContent: "center",
                },
              },
              h("div", { style: { display: "flex", fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px" } }, "EXECUTIVE BRIEF"),
              h("div", { style: { display: "flex", fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 4 } }, "Core Structural Thesis"),
              h("div", { style: { display: "flex", fontSize: 12.5, color: "#475569", marginTop: 5, lineHeight: 1.4 } }, spec.subheading || spec.headline)
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flex: 1,
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid #475569",
                  borderRadius: 8,
                  padding: "18px 22px",
                  flexDirection: "column",
                  justifyContent: "center",
                },
              },
              h("div", { style: { display: "flex", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" } }, "MARKET IMPACT"),
              h("div", { style: { display: "flex", fontSize: 15, fontWeight: 800, color: "#0f172a", marginTop: 4 } }, "Downstream Consequences"),
              h("div", { style: { display: "flex", fontSize: 12.5, color: "#475569", marginTop: 5, lineHeight: 1.4 } }, spec.takeawayBox?.text || spec.notes || "Key systemic dynamics impacting stakeholders across the market.")
            )
          ),

      // 3. Takeaway box
      spec.takeawayBox
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderLeft: "4px solid #2563eb",
                borderRadius: 8,
                padding: "14px 20px",
              },
            },
            spec.takeawayBox.title
              ? h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#1e40af",
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                    },
                  },
                  spec.takeawayBox.title
                )
              : null,
            h("div", { style: { display: "flex", fontSize: 12.5, color: "#1e3a8a", marginTop: 2, lineHeight: 1.35 } }, spec.takeawayBox.text)
          )
        : null
    );
  }

  // 3. Footer Section (Sources & Methodology, strictly NO byline)
  const footer = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
      },
    },
    h("div", {
      style: {
        display: "flex",
        width: "100%",
        height: 1,
        backgroundColor: "#e2e8f0",
        marginBottom: 8,
      },
    }),
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: 11,
            color: "#64748b",
            fontWeight: 500,
          },
        },
        spec.sourceCitation || "Source: Verified Research Context"
      ),
      spec.notes
        ? h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 11,
                color: "#94a3b8",
                maxWidth: "60%",
                justifyContent: "flex-end",
              },
            },
            spec.notes
          )
        : null
    )
  );

  // Return top-level canvas (1200x675) with generous outer padding & comfortable vertical distribution
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: 1200,
        height: 675,
        backgroundColor: "#ffffff",
        padding: "36px 44px",
        boxSizing: "border-box",
        justifyContent: "space-between",
        fontFamily: "Inter",
        borderTop: "4px solid #0284c7",
      },
    },
    header,
    bodyContent,
    footer
  );
}

/**
 * Renders an InfographicSpec to an SVG string using Satori.
 */
export async function renderInfographicToSvg(spec: InfographicSpec): Promise<string> {
  const fontData = await getInfographicFont();
  const element = buildInfographicReactElement(spec) as React.ReactElement;

  return await satori(element, {
    width: 1200,
    height: 675,
    fonts: [
      {
        name: "Inter",
        data: fontData,
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: fontData,
        weight: 700,
        style: "normal",
      },
      {
        name: "Inter",
        data: fontData,
        weight: 800,
        style: "normal",
      },
    ],
  });
}

/**
 * Renders an InfographicSpec to a PNG Buffer using Satori and Resvg.
 */
export async function renderInfographicToPng(spec: InfographicSpec): Promise<Buffer> {
  const svg = await renderInfographicToSvg(spec);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    background: "#ffffff",
  });
  const pngData = resvg.render().asPng();
  return Buffer.from(pngData);
}
