// NWS Active Alerts (US) + GDACS global disasters + EONET storms
export async function GET() {
  const results = await Promise.allSettled([
    // NWS — US severe weather alerts
    fetch('https://api.weather.gov/alerts/active?status=actual&severity=Severe,Extreme', {
      headers:{'User-Agent':'sentinel-v2/2.0'},
      next:{revalidate:300},
      signal:AbortSignal.timeout(6000),
    }).then(r=>r.json()),
    // EONET severe storms
    fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=100', {
      next:{revalidate:600},
      signal:AbortSignal.timeout(6000),
    }).then(r=>r.json()),
    // EONET volcanoes
    fetch('https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes&status=open&limit=50', {
      next:{revalidate:3600},
      signal:AbortSignal.timeout(6000),
    }).then(r=>r.json()),
  ])

  const nwsData   = results[0].status==='fulfilled' ? results[0].value : null
  const stormData = results[1].status==='fulfilled' ? results[1].value : null
  const volcData  = results[2].status==='fulfilled' ? results[2].value : null

  const alerts = []

  // Parse NWS alerts
  if(nwsData?.features){
    for(const f of nwsData.features.slice(0,50)){
      const p=f.properties
      if(!p) continue
      // Get centroid from area coordinates if available
      let lat=null,lon=null
      const geo=f.geometry
      if(geo?.type==='Polygon'&&geo.coordinates?.[0]){
        const coords=geo.coordinates[0]
        lat=coords.reduce((s,c)=>s+c[1],0)/coords.length
        lon=coords.reduce((s,c)=>s+c[0],0)/coords.length
      }
      if(!lat) continue
      alerts.push({type:'weather',lat,lon,title:p.headline||p.event||'Alert',
        severity:p.severity||'Severe',event:p.event||'',src:'NWS'})
    }
  }
  // Parse storms
  if(stormData?.events){
    for(const ev of stormData.events.slice(0,30)){
      const geo=ev.geometry?.[0]
      if(!geo) continue
      alerts.push({type:'storm',lat:geo.coordinates[1],lon:geo.coordinates[0],
        title:ev.title,severity:'Severe',event:'Severe Storm',src:'EONET'})
    }
  }
  // Parse volcanoes
  if(volcData?.events){
    for(const ev of volcData.events.slice(0,20)){
      const geo=ev.geometry?.[0]
      if(!geo) continue
      alerts.push({type:'volcano',lat:geo.coordinates[1],lon:geo.coordinates[0],
        title:ev.title,severity:'Extreme',event:'Volcanic Activity',src:'EONET'})
    }
  }

  return Response.json({alerts,count:alerts.length})
}
