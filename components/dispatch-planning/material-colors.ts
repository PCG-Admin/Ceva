export const MATERIAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  coal: { bg: 'bg-neutral-800', text: 'text-white', border: 'border-neutral-700' },
  chrome: { bg: 'bg-slate-500', text: 'text-white', border: 'border-slate-400' },
  manganese: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-500' },
  iron_ore: { bg: 'bg-red-700', text: 'text-white', border: 'border-red-600' },
  limestone: { bg: 'bg-amber-200', text: 'text-amber-900', border: 'border-amber-300' },
  sand: { bg: 'bg-yellow-300', text: 'text-yellow-900', border: 'border-yellow-400' },
  gravel: { bg: 'bg-stone-400', text: 'text-white', border: 'border-stone-500' },
  cement: { bg: 'bg-gray-400', text: 'text-gray-900', border: 'border-gray-500' },
  fertilizer: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-500' },
  grain: { bg: 'bg-orange-400', text: 'text-orange-950', border: 'border-orange-500' },
  maize: { bg: 'bg-yellow-500', text: 'text-yellow-950', border: 'border-yellow-600' },
  sugar: { bg: 'bg-pink-300', text: 'text-pink-900', border: 'border-pink-400' },
  other: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
}

export function getMaterialColor(material: string) {
  return MATERIAL_COLORS[material] || MATERIAL_COLORS.other
}

export const MATERIAL_LABELS: Record<string, string> = {
  coal: 'Coal',
  chrome: 'Chrome',
  manganese: 'Manganese',
  iron_ore: 'Iron Ore',
  limestone: 'Limestone',
  sand: 'Sand',
  gravel: 'Gravel',
  cement: 'Cement',
  fertilizer: 'Fertilizer',
  grain: 'Grain',
  maize: 'Maize',
  sugar: 'Sugar',
  other: 'Other',
}
