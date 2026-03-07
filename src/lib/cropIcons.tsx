import type { ComponentType } from "react";
import {
  Wheat,
  Sprout,
  Leaf,
  FlameKindling,
  TreePalm,
} from "lucide-react";

export const CROP_WASTE_CONFIG = {
  paddy_husk: {
    key: "paddy_husk",
    label: "Paddy Husk",
    emoji: "🌾",
    Icon: Wheat,
    color: "#74c69d",
    bgColor: "rgba(116,198,157,0.10)",
    borderColor: "rgba(116,198,157,0.20)",
  },
  wheat_straw: {
    key: "wheat_straw",
    label: "Wheat Straw",
    emoji: "🌿",
    Icon: Sprout,
    color: "#d4a843",
    bgColor: "rgba(212,168,67,0.10)",
    borderColor: "rgba(212,168,67,0.20)",
  },
  corn_stalks: {
    key: "corn_stalks",
    label: "Corn Stalks",
    emoji: "🌽",
    Icon: Leaf,
    color: "#fb923c",
    bgColor: "rgba(251,146,60,0.10)",
    borderColor: "rgba(251,146,60,0.20)",
  },
  sugarcane_bagasse: {
    key: "sugarcane_bagasse",
    label: "Sugarcane Bagasse",
    emoji: "🎋",
    Icon: FlameKindling,
    color: "#86c35e",
    bgColor: "rgba(134,195,94,0.10)",
    borderColor: "rgba(134,195,94,0.20)",
  },
  coconut_shells: {
    key: "coconut_shells",
    label: "Coconut Shells",
    emoji: "🥥",
    Icon: TreePalm,
    color: "#7dd3fc",
    bgColor: "rgba(125,211,252,0.10)",
    borderColor: "rgba(125,211,252,0.20)",
  },
} as const;

export type CropWasteKey = keyof typeof CROP_WASTE_CONFIG;

interface CropBadgeProps {
  type: CropWasteKey;
  size?: "sm" | "md" | "lg";
}

const sizeMap: Record<NonNullable<CropBadgeProps["size"]>, { icon: number; font: number; padding: string }> =
  {
    sm: { icon: 12, font: 11, padding: "3px 8px" },
    md: { icon: 15, font: 13, padding: "5px 12px" },
    lg: { icon: 18, font: 15, padding: "6px 14px" },
  };

export function CropBadge({ type, size = "md" }: CropBadgeProps) {
  const config = CROP_WASTE_CONFIG[type];
  if (!config) return null;

  const { Icon, color, bgColor, borderColor, label, emoji } = config as {
    Icon: ComponentType<{ size?: number; color?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    emoji: string;
  };

  const { icon, font, padding } = sizeMap[size];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 999,
      }}
    >
      <Icon size={icon} color={color} />
      <span
        style={{
          fontSize: font,
          color,
          fontWeight: 500,
          fontFamily: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {emoji} {label}
      </span>
    </div>
  );
}

