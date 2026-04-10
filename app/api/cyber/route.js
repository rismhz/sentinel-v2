// Cyber threat intelligence — Feodo C2 botnet servers + CISA KEV + URLhaus
function extractXmlTag(xml, tag) {
  const open = xml.indexOf('<' + tag + '>')
  const close = xml.indexOf('</' + tag + '>')
  if(open===-1||close===-1) return ''
  return xml.slice(open+tag.length+2, close).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim()
}

export async function GET() {
  const results = await Promise.allSettled([
    // Feodo Tracker C2 botnet — JSON list
    fetch('https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json', {
      next:{revalidate:3600}, signal:AbortSignal.timeout(8000),
    }).then(r=>r.json()),
    // CISA KEV RSS feed
    fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      next:{revalidate:3600}, signal:AbortSignal.timeout(8000),
    }).then(r=>r.json()),
  ])

  const threats = []

  // Feodo C2 servers (IP + country + ASN)
  if(results[0].status==='fulfilled'){
    const d=results[0].value
    const servers=Array.isArray(d)?d:(d.blocklist||d.data||[])
    for(const s of servers.slice(0,200)){
      // No lat/lon from Feodo — we'll show in threat list only
      threats.push({
        type:'c2',
        ip:s.ip_address||s.ip||'',
        country:s.country||'',
        asn:s.as_number||'',
        malware:s.malware||'Botnet C2',
        lastSeen:s.last_online||'',
        status:s.status||'online',
      })
    }
  }

  // CISA KEV — recent critical CVEs
  const kevAlerts = []
  if(results[1].status==='fulfilled'){
    const d=results[1].value
    const vulns=(d.vulnerabilities||[]).slice(0,20)
    for(const v of vulns){
      kevAlerts.push({
        id:v.cveID,
        vendor:v.vendorProject,
        product:v.product,
        desc:v.shortDescription,
        added:v.dateAdded,
        due:v.dueDate,
      })
    }
  }

  return Response.json({
    threats,
    c2count:threats.filter(t=>t.status==='online').length,
    kev:kevAlerts,
    kevCount:kevAlerts.length,
  })
}
