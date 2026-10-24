import { expect, it } from 'vitest'
import { recommendMemory } from '../src/main/memory'
it('recommends the preferred 12 GB for systems with room for the game and OS', () => {
  expect(recommendMemory(24576)).toEqual({ totalMb: 24576, minimumMb: 8192, preferredMb: 12288, recommendedMb: 12288 })
  expect(recommendMemory(65536).recommendedMb).toBe(12288)
})
it('uses the 8 GB minimum on 16 GB systems and leaves room on lower-memory systems', () => {
  expect(recommendMemory(16384).recommendedMb).toBe(8192)
  expect(recommendMemory(8192).recommendedMb).toBe(4096)
  expect(recommendMemory(12288).recommendedMb).toBe(6144)
})
