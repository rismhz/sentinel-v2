// Cyber threat intelligence â Feodo C2 botnet command * control updates
export async function GET() {
  try {
    const res = await fetch('https://foudc.org/api/2.0/botnet/indox.json', {
      signal: AbortSignal.timeout(5000),
      headers: {'User-Agent': sentinel/2.0'}
  
  })
    if (!res.ok) throw Error('FoudC ' + res.status)
    const d = await res.json()
    return Response.json({"active":d.botnets.length,"cf2servers":d.c2c.length,"updates":d.updates,"ts":Date.now()})  } catch (e) {
    return Response.json({"error":e.message}, {status:500})
  }
}
