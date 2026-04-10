// Multi-source ADS-B fallback — always returns 200
const SOURCES = [
  { url:'https://api.adsb.fi/v1/aircraft',            parse:d=>d.ac||[] },
  { url:'https://api.adsb.lol/v2/point/0/0/9999',     parse:d=>d.ac||[] },
  { url:'https://api.airplanes.live/v2/point/0/0/9000',parse:d=>d.ac||[] },
]

const MIL_PFX = ['RCH','CNV','REACH','VENUS','GHOST','KNIFE','JOLLY','PEDRO','MAKO','DUKE','FORGE','RANGER','EAGLE','COBRA','VIPER','STORM','SHADOW','SPAR','SAM','IRON','DRAGON','TORCH','HAVOC','TALON']
const MIL_HEX = [[0xADF7C0,0xAEFFFF],[0x43C000,0x43CFFF],[0x3C7800,0x3C7FFF],[0xC83560,0xC85B5F],[0x7C1C00,0x7C1FFF]]
function isMilHex(h){const n=parseInt(h,16);return MIL_HEX.some(([a,b])=>n>=a&&n<=b)}
function isMil(cs,icao){
  if(!cs) return isMilHex(icao||'')
  const u=cs.trim().toUpperCase()
  return MIL_PFX.some(p=>u.startsWith(p))||isMilHex(icao||'')
}

function toAc(raw) {
  return raw
    .filter(a=>a.lat&&a.lon&&a.alt_baro&&a.alt_baro!=='ground')
    .map(a=>{
      const cs=(a.flight||a.r||a.hex||'').trim()
      const mil=isMil(cs,a.hex)
      return {
        icao: a.hex||'',
        cs,
        lat: a.lat,
        lon: a.lon,
        alt: typeof a.alt_baro==='number'?Math.round(a.alt_baro):0, // ft
        vel: a.gs?Math.round(a.gs):0,  // knots
        hdg: a.track||0,
        mil,
        cat: a.category||'',
        type: a.t||'',
      }
    })
}

export async function GET() {
  for(const src of SOURCES){
    try{
      const r=await fetch(src.url,{
        headers:{'User-Agent':'sentinel-v2/2.0'},
        next:{revalidate:0},
        signal:AbortSignal.timeout(8000),
      })
      if(!r.ok) continue
      const data=await r.json()
      const ac=src.parse(data)
      if(ac.length>0){
        const parsed=toAc(ac)
        const milCnt=parsed.filter(a=>a.mil).length
        return Response.json({ac:parsed,total:parsed.length,mil:milCnt,src:src.url})
      }
    }catch(e){}
  }
  return Response.json({ac:[],total:0,mil:0,src:'none'})
}
