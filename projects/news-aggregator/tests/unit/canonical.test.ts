import { describe, it, expect } from 'vitest'
import { canonicaliseUrl } from '../../src/ingest/canonical.js'

describe('canonicaliseUrl', () => {
  it('strips tracking params', () => {
    expect(canonicaliseUrl('https://www.example.com/post?utm_source=x&id=42&fbclid=abc'))
      .toBe('https://www.example.com/post?id=42')
  })
  it('normalises protocol to https', () => {
    expect(canonicaliseUrl('http://example.com/p')).toBe('https://example.com/p')
  })
  it('lowercases host, preserves path case', () => {
    expect(canonicaliseUrl('https://EXAMPLE.com/MyPost'))
      .toBe('https://example.com/MyPost')
  })
  it('removes trailing slash on path', () => {
    expect(canonicaliseUrl('https://example.com/post/')).toBe('https://example.com/post')
  })
  it('preserves trailing slash for bare hostname', () => {
    expect(canonicaliseUrl('https://example.com/')).toBe('https://example.com/')
  })
  it('strips fragment', () => {
    expect(canonicaliseUrl('https://example.com/p#section-2')).toBe('https://example.com/p')
  })
  it('handles all known tracking params', () => {
    const stripped = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ref_src','mc_cid','mc_eid']
    for (const param of stripped) {
      expect(canonicaliseUrl(`https://x.com/p?${param}=foo&keep=bar`))
        .toBe('https://x.com/p?keep=bar')
    }
  })
  it('returns null for non-http(s) or invalid URLs', () => {
    expect(canonicaliseUrl('javascript:alert(1)')).toBeNull()
    expect(canonicaliseUrl('not a url')).toBeNull()
  })
})
