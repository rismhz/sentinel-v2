// USGS real-time earthquake feed — M2.5+ past 24 hours
export async function GET() {
  try {
    const r = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      { next:{revalidate:120}, signal:AbortSignal.timeout(8000) }
    )
    if(!r.ok) throw new Error('USGS '+r.status)
    const data = await r.json()
    const quakes = (data.features||[]).map(f=>({
      id:   f.id,
      mag:  f.properties.mag,
      place:f.properties.place||'Unknown',
      time: f.properties.time,
      lat:  f.geometry.coordinates[1],
      lon:  f.geometry.coordinates[0],
      depth:f.geometry.coordinates[2],
      sig:  f.properties.sig,
      url:  f.properties.url,
    })).filter(q=>q.lat&&q.lon)
    const sig = quakes.filter(q=>q.mag>=5.0).length
    return Response.json({quakes,count:quakes.length,significant:sig})
  } catch(e) {
    return Response.json({quakes:[],count:0,significant:0,error:e.message})
  }
}
