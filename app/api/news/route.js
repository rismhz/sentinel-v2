// Multi-source intelligence RSS aggregator — scored & deduplicated
const FEEDS = [
  {name:'Aviation Herald',   url:'https://avherald.com/feed',                            cat:'aviation'},
  {name:'Breaking Defense',  url:'https://breakingdefense.com/feed',                     cat:'military'},
  {name:'The War Zone',      url:'https://www.twz.com/feed',                              cat:'military'},
  {name:'Reuters World',     url:'https://feeds.reuters.com/reuters/worldNews',           cat:'world'},
  {name:'BBC World',         url:'https://feeds.bbci.co.uk/news/world/rss.xml',           cat:'world'},
  {name:'Al Jazeera',        url:'https://www.aljazeera.com/xml/rss/all.xml',             cat:'world'},
  {name:'Bulletin AtomSci',  url:'https://thebulletin.org/feed/',                        cat:'nuclear'},
  {name:'Arms Control',      url:'https://www.armscontrol.org/rss.xml',                  cat:'nuclear'},
  {name:'Jane\'s Defence',   url:'https://www.janes.com/feeds/news',                     cat:'military'},
  {name:'FlightGlobal',      url:'https://www.flightglobal.com/rss/news',                cat:'aviation'},
  {name:'CISA Alerts',       url:'https://www.cisa.gov/cybersecurity-advisories/all.xml',cat:'cyber'},
  {name:'Krebs Security',    url:'https://krebsonsecurity.com/feed/',                    cat:'cyber'},
]

const URGENT=[
  'missile launch','nuclear strike','ballistic missile','nuclear detonation',
  'shot down','hijack','crash','mayday','explosion','attack','invasion',
  'war declared','airspace closed','emergency','detonation',
]
const HIGH=[
  'military exercise','drone strike','no-fly zone','scrambled','intercept',
  'nuclear test','sanctions','ceasefire','offensive','troops deployed',
  'cyber attack','data breach','ransomware','zero-day','critical infrastructure',
]

function score(txt){
  const t=txt.toLowerCase()
  let s=0
  URGENT.forEach(k=>{if(t.includes(k))s+=3})
  HIGH.forEach(k=>{if(t.includes(k))s+=1})
  return s
}

function extractTag(str,tag){
  const open=str.indexOf('<'+tag+'>')
  const close=str.indexOf('</'+tag+'>')
  if(open===-1||close===-1)return''
  return str.slice(str.indexOf('>',str.indexOf('<'+tag))+1,close)
    .replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim()
}

function parseItems(xml,name,cat){
  const items=[]
  let cursor=0
  while(true){
    const start=xml.indexOf('<item>',cursor)
    if(start===-1)break
    const end=xml.indexOf('</item>',start)
    if(end===-1)break
    const block=xml.slice(start,end+7)
    cursor=end+7
    const title=extractTag(block,'title')
    const link=extractTag(block,'link')||extractTag(block,'guid')
    const desc=extractTag(block,'description')
    const pubDate=extractTag(block,'pubDate')
    if(!title)continue
    const s=score(title+' '+desc)
    const date=pubDate?new Date(pubDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''
    items.push({id:title.slice(0,50),title,link,source:name,cat,date,urgent:s>=3,score:s})
  }
  return items
}

export async function GET(){
  const all=[]
  const results=await Promise.allSettled(
    FEEDS.map(feed=>
      fetch(feed.url,{
        headers:{'User-Agent':'sentinel-v2/2.0','Accept':'application/rss+xml,application/xml,text/xml,*/*'},
        signal:AbortSignal.timeout(6000),
        next:{revalidate:0},
      })
      .then(r=>r.ok?r.text():Promise.reject(r.status))
      .then(xml=>parseItems(xml,feed.name,feed.cat))
      .catch(()=>[])
    )
  )
  results.forEach(r=>{if(r.status==='fulfilled')all.push(...r.value)})
  const seen=new Set()
  const items=all
    .sort((a,b)=>b.score-a.score)
    .filter(i=>{
      const k=i.title.slice(0,50).toLowerCase()
      if(seen.has(k))return false
      seen.add(k)
      return true
    })
    .slice(0,60)
  return Response.json({items,urgent:items.filter(i=>i.urgent).length,ts:Date.now()})
}
