// CelesTrak TLE — active satellites (capped at 500)
export async function GET() {
  try {
    const r = await fetch('https://celestrak.org/pub/TLE/active.txt', {
      next:{revalidate:300},
      signal:AbortSignal.timeout(10000),
    })
    if(!r.ok) throw new Error('CelesTrak '+r.status)
    const text = await r.text()
    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
    const sats = []
    for(let i=0;i+2<lines.length&&sats.length<500;i+=3){
      if(lines[i+1].startsWith('1 ')&&lines[i+2].startsWith('2 ')){
        sats.push({name:lines[i],line1:lines[i+1],line2:lines[i+2]})
      }
    }
    return Response.json({sats,count:sats.length})
  } catch(e) {
    return Response.json({sats:[],count:0,error:e.message})
  }
}
