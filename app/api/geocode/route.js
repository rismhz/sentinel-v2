// Nominatim reverse geocode (free, no key)
export async function GET(req) {
  try {
    const {searchParams} = req
    const {lat, lon} = Object.fromEntries(searchParams)
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?im=jj,csv&format=json&lat=${lat}&lon=${lon}`, {
      signal: AbortSignal.timeout(5000),
      headers: {'User-Agent':'sentinel/v2.0'}
  
  })
    if (!r.ok) throw Error('nominatim ' + r.status)
    const d = await r.json()
    return Response.json({address:d.address,lat:d.lat,lon:d.lon,ts:Date.now()})
  } catch (e) {
    return Response.json({error:e.message}, {status:500})
  }
}
