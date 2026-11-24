export type HeatShaderConfig = {
  imageSrc: string;
  label: string;
  title: string;
  heat: number;
  palette: readonly string[];
};

export const heatShaderConfig: HeatShaderConfig = {
  imageSrc: "/humai-transparent-1.png",
  label: "Humai",
  title: "Nyawit Lu",
  heat: 0.58,
  palette: ["#070410", "#1a0e30", "#2c1352", "#4b30cc", "#9e6de9", "#c9a24a", "#f2c766", "#f6f3ef"]
};
