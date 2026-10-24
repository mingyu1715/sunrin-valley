import type { MemoryRecommendation } from '../shared'
export function recommendMemory(totalMb: number): MemoryRecommendation {
  return { totalMb, minimumMb: 8192, preferredMb: 12288, recommendedMb: totalMb >= 24576 ? 12288 : Math.max(2048, Math.min(8192, Math.floor(totalMb / 2 / 512) * 512)) }
}
