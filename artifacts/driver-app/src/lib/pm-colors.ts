// Vibrant Modern design tokens — Moroccan TC→Gold gradient header, white cards, vivid stats
import type React from "react";

export const PM = {
  // Backgrounds
  BG: "#F8F9FA",
  BG_SOLID: "#F8F9FA",
  BG_CARD: "#FFFFFF",
  BG_CARD_HOVER: "#F8FAFC",
  BG_HEADER: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)",

  // Accents
  TC: "#C14B2A",
  TC_DIM: "rgba(193,75,42,0.12)",
  GOLD: "#D4880C",
  GOLD_LIGHT: "#FEF6E4",
  GREEN: "#2A7A48",
  GREEN_GLOW: "#10B981",

  // Vibrant stat card colors
  STAT_RED: "#FF4B4B",
  STAT_BLUE: "#3B82F6",
  STAT_GREEN: "#10B981",
  STAT_AMBER: "#F59E0B",

  // Text (dark on light)
  TEXT: "#1E293B",
  TEXT_MID: "#475569",
  TEXT_LIGHT: "#94A3B8",

  // Borders
  BORDER: "#E2E8F0",
  BORDER_GOLD: "rgba(212,136,12,0.30)",

  // Card styles (white with shadow)
  CARD: {
    background: "#FFFFFF",
    borderRadius: "24px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
    border: "1px solid #F1F5F9",
  } as React.CSSProperties,

  CARD_GOLD: {
    background: "#FFFFFF",
    borderRadius: "24px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
    border: "1px solid #F1F5F9",
    borderLeft: "4px solid #C14B2A",
  } as React.CSSProperties,

  // CTA button (TC→Gold gradient, white text)
  CTA: {
    background: "linear-gradient(135deg, #C14B2A 0%, #D4880C 100%)",
    color: "#FFFFFF",
    fontWeight: 800,
  } as React.CSSProperties,

  // Online status pill
  ONLINE: {
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.40)",
  } as React.CSSProperties,

  // Moroccan star pattern (white stars, used inside gradient headers)
  STAR_PATTERN: {
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`,
    backgroundSize: "40px 40px",
  } as React.CSSProperties,

  // Bottom nav (white, rounded top)
  NAV: {
    background: "#FFFFFF",
    borderTop: "1px solid #F1F5F9",
    boxShadow: "0 -10px 40px rgba(0,0,0,0.08)",
  } as React.CSSProperties,
} as const;

// Shorthand exports for pages
export const TC        = PM.TC;
export const GOLD      = PM.GOLD;
export const GREEN     = PM.GREEN;
export const SAND      = PM.BG;
export const BORDER    = PM.BORDER;
export const BROWN     = PM.TEXT;
export const BROWN_MID = PM.TEXT_MID;
export const BROWN_LIGHT = PM.TEXT_LIGHT;
