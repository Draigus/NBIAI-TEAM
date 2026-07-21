import { describe, it, expect } from 'vitest'
import { mapSteamComingSoon, customParsers } from '../../src/ingest/custom-parsers.js'
import { fetchSourceItems } from '../../src/ingest/scheduler.js'

describe('custom-parsers registry', () => {
  it('registers steam_upcoming (the key used by news.sources)', () => {
    expect(typeof customParsers.steam_upcoming).toBe('function')
  })

  it('fetchSourceItems throws on a named-but-unregistered parser key', async () => {
    // Silent RSS fallback is how custom sources spent months polling
    // "empty" while looking healthy — a config error must be loud, and it
    // must also stop the recovery probe re-enabling a broken source.
    await expect(
      fetchSourceItems({ feedUrl: 'https://example.com/x', customParserKey: 'not_a_real_parser' }, {})
    ).rejects.toThrow(/unregistered custom parser key/)
  })
})

describe('mapSteamComingSoon', () => {
  it('maps coming_soon items to titled store links', () => {
    const items = mapSteamComingSoon({
      coming_soon: { items: [
        { id: 4923400, name: 'Hyperlane Rally' },
        { id: 111, name: 'Second Game' },
      ] },
    })
    expect(items).toEqual([
      { title: 'Hyperlane Rally', link: 'https://store.steampowered.com/app/4923400/' },
      { title: 'Second Game', link: 'https://store.steampowered.com/app/111/' },
    ])
  })

  it('returns [] for missing or malformed payloads', () => {
    expect(mapSteamComingSoon(undefined)).toEqual([])
    expect(mapSteamComingSoon({})).toEqual([])
    expect(mapSteamComingSoon({ coming_soon: {} })).toEqual([])
    expect(mapSteamComingSoon({ coming_soon: { items: 'nope' } })).toEqual([])
  })

  it('drops entries without a numeric id or non-empty name', () => {
    const items = mapSteamComingSoon({
      coming_soon: { items: [
        { id: 1, name: 'Valid' },
        { id: 'x', name: 'Bad id' },
        { id: 2, name: '' },
        null,
      ] },
    })
    expect(items).toEqual([{ title: 'Valid', link: 'https://store.steampowered.com/app/1/' }])
  })
})
