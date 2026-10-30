export const PRODUCT_COLOURS = [
  { name: "Black", hex: "#171717" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#DC2626" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Green", hex: "#16A34A" },
  { name: "Yellow", hex: "#FACC15" },
  { name: "Orange", hex: "#EA580C" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Brown", hex: "#854D0E" },
  { name: "Grey", hex: "#6B7280" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Maroon", hex: "#7F1D1D" },
  { name: "Beige", hex: "#D6C4A8" },
] as const;

export function productColourHex(name: string) {
  return PRODUCT_COLOURS.find((colour) => colour.name === name)?.hex ?? "#9CA3AF";
}
