export type MeltingTheme = "jj" | "fire" | "ice" | "ember" | "mono";

export type MeltingPalette = {
  low: string;
  mid: string;
  high: string;
  outline: string;
};

export const meltingThemes: Record<MeltingTheme, MeltingPalette> = {
  jj: { low: "#2c1352", mid: "#4b30cc", high: "#f2c766", outline: "#161232" },
  fire: { low: "#521fe6", mid: "#ff1a0a", high: "#ffd152", outline: "#ffe0eb" },
  ice: { low: "#004dff", mid: "#00c7ff", high: "#ffd95a", outline: "#8cffff" },
  ember: { low: "#4d14cc", mid: "#ff6105", high: "#ffe666", outline: "#ff8c80" },
  mono: { low: "#0b0820", mid: "#3a3448", high: "#f6f3ef", outline: "#0b0820" }
};

export type MeltingFontConfig = {
  family: string;
  googleFont: string;
  weight: number;
  uppercase: boolean;
  lineHeight: number;
  letterSpacing: number;
};

export type MeltingTextConfig = {
  theme: MeltingTheme;
  palette: MeltingPalette | null;
  melt: number;
  warp: number;
  bend: number;
  grain: number;
  meltPulse: number;
  lines: string[] | null;
  font: MeltingFontConfig;
};

export const meltingTextConfig: MeltingTextConfig = {
  theme: "mono",
  palette: null,
  melt: 0.702,
  warp: 1.0,
  bend: -0.238,
  grain: 0.5,
  meltPulse: 0.006,
  lines: null,
  font: {
    family: "",
    googleFont: "",
    weight: 400,
    uppercase: true,
    lineHeight: 0.94,
    letterSpacing: 0
  }
};
