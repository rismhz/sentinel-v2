// NASA FIRMS active fires — past 24h, global, VIIRS SNPP
const FIRMS_KEY = '05d408c4a8ef8f3d213fb9f592996126'

export async function GET() {
  try {
    // FIRMS CSV API — VIIRS SNPP, worldwide, past 1 day
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_KEY}/VIIRS_SNPP_NRT/world/1`
    const r = await fetch(url, { next:{revalidate:1800}, signal:AbortSignal.timeout(12000) })
    if(!r.ok) throw new Error('FIRMS '+r.status)
    const csv = await r.text()
    const lines = csv.split('\n').filter(Boolean)
    if(lines.length<2) return Response.json({fires:[],count:0})
    // header: latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
    const fires = []
    for(let i=1;i<lines.length&&fires.length<2000;i++){
      const p=lines[i].split(',')
      if(p.length<7) continue
      const lat=parseFloat(p[0]),lon=parseFloat(p[1])
      if(isNaN(lat)||isNaN(lon)) continue
      const bright=parseFloat(p[2])||0
      const frp=parseFloat(p[12])||0
      fires.push({lat,lon,bright,frp,date:p[5],conf:p[9]||'nominal'})
    }
    return Response.json({fires,count:fires.length})
  } catch(e) {
    // Fallback: NASA EONET fires
    try{
      const r2=await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&limit=200',{next:{revalidate:1800}})
      const d=await r2.json()
      const fires=(d.events||[]).map(ev=>{
        const geo=ev.geometry?.[0]
        if(!geo) return null
        return {lat:geo.coordinates[1],lon:geo.coordinates[0],bright:400,frp:50,date:geo.date?.slice(0,10)||'',conf:'high',title:ev.title}
      }).filter(Boolean)
      return Response.json({fires,count:fires.length,src:'eonet'})
    }catch{
      return Response.json({fires:[],count:0,error:e.message})
    }
  }
}
