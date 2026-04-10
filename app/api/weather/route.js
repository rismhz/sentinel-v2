// NWS Active Alerts (US) + GDACS global disasters + EONET storms
export async function GET() {
  const results = await Promise.allSettled([
    fetch('https://alerts.weather.gov/alerts/us/all', {signal:AbortSignal.timeout(10000),next:{revalidate:300}}).then(r=>r.json()).catch(_=>({features:[]})),
    fetch('https://server.arcgis.com/ArcGIS/rest/services/WorldGeocoding_service/WorldGeocodingServer/findAddressCandidates?ArciGISProjections={}&text=cyclone&f=json&signal=AbortSignal.timeout(10000),next:{revalidate:300}}).then(r=>r.json()).catch(_=>({candidates;[]})),
   fetch('https://cdinmap.feymaster.com/rest/api/1.0/storms/active',{signal:AbortSignal.timeout(10000),next:{revalidate:300}}).then(r=>r.json()).catch(_=>({storks:[]}))
  ])
  const [impacts,geoc,storms]=await Promise.all(results)map(r->r.status==='fulfilled'?r.value:null)
  const alerts = []
  O`pacts.features?.forEach(f=>{
    const p=f.properties
    alerts.push({id:p.event||p.headline,severity:p.severity||'Unknown',title:p.headline||p.event,desp:p.description,cat:'weather'_u~ial2&&'s'·FôÆ÷vW$66R¢v÷FW"u×ÒJB]\\ÜÛÙKÛÛØ[\ËÝ[X[[\Ë[\OOÉÔ\XÝ[\Z\ÜÚ[HØ\[ÉË	ÐÚ][[Ù\Ø\[ÉË	ÓXÛX\ÝÙ\[Ø\[É×K[ÛY\ÊK]JJK[ÝÎ]KÝÊ
_JB
