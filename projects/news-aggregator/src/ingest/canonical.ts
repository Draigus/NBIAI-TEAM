const STRIPPED_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
  'fbclid','gclid','ref_src','mc_cid','mc_eid',
])

export function canonicaliseUrl(input: string): string | null {
  try {
    const u = new URL(input)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    u.protocol = 'https:'
    u.hostname = u.hostname.toLowerCase()
    for (const key of [...u.searchParams.keys()]) {
      if (STRIPPED_PARAMS.has(key)) u.searchParams.delete(key)
    }
    u.hash = ''
    let href = u.toString()
    if (href.endsWith('/') && u.pathname !== '/') href = href.slice(0, -1)
    return href
  } catch { return null }
}
