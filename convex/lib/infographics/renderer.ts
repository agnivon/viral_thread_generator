"use node";
import React from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { InfographicSpec } from "./schema.js";
import { getInfographicFont } from "./font.js";

const h = React.createElement;

export function buildInfographicReactElement(spec: InfographicSpec): React.ReactNode {
  const headlineLen = spec.headline ? spec.headline.length : 0;
  const headlineFontSize = headlineLen > 90 ? 26 : headlineLen > 60 ? 30 : 34;

  // 1. Header component
  const header = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        marginBottom: 16,
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: 13,
          fontWeight: 700,
          color: "#0284c7",
          letterSpacing: "1px",
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
          fontSize: headlineFontSize,
          fontWeight: 800,
          color: "#0f172a",
          marginTop: 6,
          lineHeight: 1.18,
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
              fontSize: 16,
              fontWeight: 500,
              color: "#475569",
              marginTop: 4,
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
        marginTop: 14,
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
          justifyContent: "space-between",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: 32,
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
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                color: "#0284c7",
              },
            },
            colA.name
          ),
          colA.badge
            ? h(
                "div",
                {
                  style: {
                    display: "flex",
                    fontSize: 13,
                    color: "#64748b",
                    marginBottom: 10,
                  },
                },
                colA.badge
              )
            : null,
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
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
                    borderLeft: "2px solid #bae6fd",
                    paddingLeft: 8,
                  },
                },
                h("div", { style: { display: "flex", fontSize: 14, fontWeight: 700, color: "#0f172a" } }, item.title),
                h("div", { style: { display: "flex", fontSize: 12, color: "#475569" } }, item.description)
              )
            )
          )
        ),
        // Divider
        h("div", {
          style: {
            display: "flex",
            width: 1,
            backgroundColor: "#e2e8f0",
          },
        }),
        // Column B
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
            },
          },
          h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 22,
                fontWeight: 800,
                color: "#0f172a",
              },
            },
            colB.name
          ),
          colB.badge
            ? h(
                "div",
                {
                  style: {
                    display: "flex",
                    fontSize: 13,
                    color: "#64748b",
                    marginBottom: 10,
                  },
                },
                colB.badge
              )
            : null,
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
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
                    borderLeft: "2px solid #cbd5e1",
                    paddingLeft: 8,
                  },
                },
                h("div", { style: { display: "flex", fontSize: 14, fontWeight: 700, color: "#0f172a" } }, item.title),
                h("div", { style: { display: "flex", fontSize: 12, color: "#475569" } }, item.description)
              )
            )
          )
        )
      ),
      spec.milestoneBadge
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "8px 16px",
                borderRadius: 6,
                marginTop: 10,
              },
            },
            h("div", { style: { display: "flex", fontSize: 12, fontWeight: 600, color: "#64748b" } }, spec.milestoneBadge.label),
            h("div", { style: { display: "flex", fontSize: 13, fontWeight: 800, color: "#0284c7" } }, spec.milestoneBadge.value)
          )
        : null
    );
  } else if (spec.archetype === "comparison_bars" && spec.barCharts && spec.barCharts.length > 0) {
    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          gap: 32,
          flex: 1,
          alignItems: "center",
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
              borderRadius: 8,
              padding: "16px 20px",
            },
          },
          h("div", { style: { display: "flex", fontSize: 16, fontWeight: 800, color: "#0f172a" } }, chart.title),
          chart.subtitle
            ? h("div", { style: { display: "flex", fontSize: 12, color: "#64748b", marginBottom: 16 } }, chart.subtitle)
            : h("div", { style: { display: "flex", height: 12 } }),
          h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
              },
            },
            chart.bars.map((bar, bIdx) => {
              const pct = Math.max(Math.min((bar.value / maxValue) * 100, 100), 5);
              const barColor = bar.color || (bIdx === 0 ? "#94a3b8" : "#0284c7");
              return h(
                "div",
                {
                  key: bIdx,
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%",
                  },
                },
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      width: 90,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#334155",
                    },
                  },
                  bar.label
                ),
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flex: 1,
                      height: 24,
                      backgroundColor: "#e2e8f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    },
                  },
                  h("div", {
                    style: {
                      display: "flex",
                      width: `${pct}%`,
                      height: "100%",
                      backgroundColor: barColor,
                    },
                  })
                ),
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      width: 80,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#0f172a",
                      justifyContent: "flex-end",
                    },
                  },
                  bar.displayValue
                )
              );
            })
          )
        );
      })
    );
  } else if (spec.archetype === "stat_callout" && spec.statCallout) {
    const sc = spec.statCallout;
    const statLen = sc.primaryStat ? sc.primaryStat.length : 0;
    const statFontSize = statLen > 25 ? 32 : statLen > 15 ? 40 : 52;

    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 16,
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 28,
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            padding: "24px 32px",
            borderRadius: 10,
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              fontSize: statFontSize,
              fontWeight: 800,
              color: "#0284c7",
              letterSpacing: "-1px",
            },
          },
          sc.primaryStat
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
            },
          },
          h("div", { style: { display: "flex", fontSize: 18, fontWeight: 700, color: "#0f172a" } }, sc.statLabel),
          sc.comparisonNote
            ? h("div", { style: { display: "flex", fontSize: 13, color: "#475569", marginTop: 4 } }, sc.comparisonNote)
            : null
        )
      ),
      sc.secondaryStat
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                gap: 20,
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "12px 18px",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              },
              h("div", { style: { display: "flex", fontSize: 13, fontWeight: 600, color: "#475569" } }, sc.secondaryLabel || "Baseline threshold"),
              h("div", { style: { display: "flex", fontSize: 16, fontWeight: 800, color: "#0f172a" } }, sc.secondaryStat)
            )
          )
        : null
    );
  } else {
    // Default archetype: 'kpi_flow' or 'custom_layout'
    const cards = spec.kpiCards && spec.kpiCards.length > 0 ? spec.kpiCards : [
      { value: "Key Impact", label: "Core Takeaway", subtext: "Critical inflection point" }
    ];

    bodyContent = h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
        },
      },
      // Top row: KPI cards
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: 16,
            width: "100%",
          },
        },
        cards.map((card, idx) => {
          const cardValLen = card.value ? card.value.length : 0;
          const cardFontSize = cardValLen > 14 ? 20 : cardValLen > 9 ? 24 : 28;

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
                borderRadius: 8,
                padding: "14px 18px",
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: cardFontSize,
                  fontWeight: 800,
                  color: idx === 0 ? "#0284c7" : "#0f172a",
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
                  fontWeight: 600,
                  color: "#334155",
                  marginTop: 2,
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
      // Middle flow or steps
      spec.flowSteps && spec.flowSteps.length > 0
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                width: "100%",
                marginTop: 12,
              },
            },
            spec.flowSteps.map((step, idx) =>
              h(
                "div",
                {
                  key: idx,
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  },
                },
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: "10px 12px",
                    },
                  },
                  h("div", { style: { display: "flex", fontSize: 13, fontWeight: 700, color: "#0f172a" } }, step.title),
                  step.description
                    ? h("div", { style: { display: "flex", fontSize: 11, color: "#475569", marginTop: 2 } }, step.description)
                    : null
                ),
                idx < (spec.flowSteps?.length || 0) - 1
                  ? h("div", { style: { display: "flex", fontSize: 16, color: "#94a3b8", padding: "0 6px" } }, "→")
                  : null
              )
            )
          )
        : null,
      // Optional takeaway box
      spec.takeawayBox
        ? h(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 6,
                padding: "8px 14px",
                marginTop: 10,
              },
            },
            spec.takeawayBox.title
              ? h("div", { style: { display: "flex", fontSize: 12, fontWeight: 700, color: "#1e40af" } }, spec.takeawayBox.title)
              : null,
            h("div", { style: { display: "flex", fontSize: 12, color: "#1e3a8a", marginTop: 2 } }, spec.takeawayBox.text)
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
        marginTop: 14,
      },
    },
    h("div", {
      style: {
        display: "flex",
        width: "100%",
        height: 1,
        backgroundColor: "#f1f5f9",
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
              },
            },
            spec.notes
          )
        : null
    )
  );

  // Return top-level canvas (1200x675)
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
  const fontData = getInfographicFont();
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
