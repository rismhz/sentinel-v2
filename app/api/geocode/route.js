// Nominatim reverse geocode (free, no key)
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const q   = searchParams.get('q')

  try {
    let url
    if (q) {
      url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
    } else {
      url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    }
    const r = await fetch(url, {
      headers: { 'User-Agent': 'sentinel-v2/2.0' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) throw new Error('Nominatim ' + r.status)
    const d = await r.json()
    if (q) {
      const f = Array.isArray(d) ? d[0] : d
      return Response.json({ lat: f?.lat, lon: f?.lon, display: f?.display_name })
    }
    return Response.json({
      country: d.address?.country || '',
      city:    d.address?.city || d.address?.town || d.address?.village || '',
      display: d.display_name || '',
    })
  } catch(e) {
    return Response.json({ country:'', city:'', display:'', error: e.message })
  }
}
