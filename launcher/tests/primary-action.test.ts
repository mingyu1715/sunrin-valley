import { expect, it } from 'vitest'
import { PrimaryActionController, type PrimaryInspection } from '../src/main/primary-action'

it('offers an operating update on the first click and installs before launching on the next click', async () => {
  const controller = new PrimaryActionController(), events: string[] = []
  const operations = {
    check: async (): Promise<PrimaryInspection> => { events.push('check'); return { phase: 'update', key: 'operating-a' } },
    offer: () => { events.push('offer') }, install: async () => { events.push('install') }, launch: async () => { events.push('launch') }
  }
  await controller.run(operations)
  expect(events).toEqual(['check', 'offer'])
  await controller.run(operations)
  expect(events).toEqual(['check', 'offer', 'check', 'install', 'launch'])
})

it('requires another confirmation when the operating bundle changes after it was offered', async () => {
  const controller = new PrimaryActionController(), events: string[] = []
  let key = 'a'
  const operations = { check: async (): Promise<PrimaryInspection> => ({ phase: 'update', key }), offer: () => { events.push('offer') }, install: async () => { events.push('install') }, launch: async () => { events.push('launch') } }
  await controller.run(operations); key = 'b'; await controller.run(operations)
  expect(events).toEqual(['offer', 'offer'])
  await controller.run(operations)
  expect(events).toEqual(['offer', 'offer', 'install', 'launch'])
})

it('never launches after an installation failure and permits a deliberate retry', async () => {
  const controller = new PrimaryActionController(), events: string[] = []
  let fail = true
  const operations = { check: async (): Promise<PrimaryInspection> => ({ phase: 'update', key: 'a' }), offer: () => {}, install: async () => { events.push('install'); if (fail) throw new Error('disk full') }, launch: async () => { events.push('launch') } }
  await controller.run(operations)
  await expect(controller.run(operations)).rejects.toThrow('disk full')
  expect(events).toEqual(['install'])
  fail = false; await controller.run(operations)
  expect(events).toEqual(['install', 'install', 'launch'])
})

it('launches an unchanged installation and installs a new instance without automatically starting it', async () => {
  const controller = new PrimaryActionController(), events: string[] = []
  let phase: PrimaryInspection['phase'] = 'ready'
  const operations = { check: async (): Promise<PrimaryInspection> => ({ phase, key: 'a' }), offer: () => {}, install: async () => { events.push('install') }, launch: async () => { events.push('launch') } }
  await controller.run(operations); phase = 'not-installed'; await controller.run(operations)
  expect(events).toEqual(['launch', 'install'])
})

it('a maintenance gate clears consent and performs no installation or launch', async () => {
  const controller = new PrimaryActionController(), events: string[] = []
  let phase: PrimaryInspection['phase'] = 'update'
  const operations = { check: async (): Promise<PrimaryInspection> => ({ phase, key: 'a' }), offer: () => { events.push('offer') }, install: async () => { events.push('install') }, launch: async () => { events.push('launch') } }
  await controller.run(operations); phase = 'blocked'; await controller.run(operations); phase = 'update'; await controller.run(operations)
  expect(events).toEqual(['offer', 'offer'])
})

it('does not launch or lose consent when storage confirmation is cancelled', async () => {
  const controller = new PrimaryActionController(), events: string[] = []
  const operations = { check: async (): Promise<PrimaryInspection> => ({ phase: 'update', key: 'a' }), offer: () => { events.push('offer') }, install: async () => { events.push('cancel'); return false }, launch: async () => { events.push('launch') } }
  await controller.run(operations); await controller.run(operations)
  expect(events).toEqual(['offer', 'cancel'])
  expect(controller.hasOffer()).toBe(true)
})
