// DEFCON threat assessment from Bulletin of Atomic Scientists RSS + geopolitical feeds
const HIGH_KW  = ['nuclear launch','missile launch','ballistic missile','nuclear detonation','nuclear war','nuclear strike','ICBM launch','nuclear explosion']
const MED_KW   = ['nuclear test','nuclear alert','radiation leak','missile test','nuclear threat','nuclear submarine','nuclear escalation','radioactive','dirty bomb']
const LOW_KW   = ['nuclear deal','nuclear talks','doomsday','nuclear power plant','Zaporizhzhia','reactor','plutonium','uranium enrichment']

function scoreText(t){
  const txt=t.toLowerCase()
  let s=0
  HIGH_KW.forEach(k=>{if(txt.includes(k))s+=4})
  MED_KW.forEach(k=>{if(txt.includes(k))s+=2})
  LOW_KW.forEach(k=>{if(txt.includes(k))s+=1})
  return s
}
function defcon(score){
  if(score>=8) return{level:1,label:'NUCLEAR WAR IMMINENT',color:'#ff0000'}
  if(score>=5) return{level:2,label:'ARMED FORCES READY',color:'#ff3300'}
  if(score>=3) return{level:3,label:'ELEVATED TENSION',color:'#ff8800'}
  if(score>=1) return{level:4,label:'INCREASED READINESS',color:'#ffcc00'}
  return           {level:5,label:'NORMAL READINESS',color:'#00ff88'}
}
function extractTag(str,tag){
  const open=str.indexOf('<'+tag+'>')
  const close=str.indexOf('</'+tag+'>')
  if(open===-1||close===-1)return''
  return str.slice(open+tag.length+2,close).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,'').trim()
}

const FEEDS=[
  'https://thebulletin.org/feed/',
  'https://www.armscontrol.org/rss.xml',
]

export async function GET(){
  let totalScore=0
  const alerts=[]
  for(const url of FEEDS){
    try{
      const r=await fetch(url,{next:{revalidate:600},signal:AbortSignal.timeout(8000)})
      if(!r.ok)continue
      const xml=await r.text()
      let cursor=0
      while(true){
        const start=xml.indexOf('<item>',cursor)
        if(start===-1)break
        const end=xml.indexOf('</item>',start)
        if(end===-1)break
        const block=xml.slice(start,end+7)
        cursor=end+7
        const title=extractTag(block,'title')
        const desc=extractTag(block,'description')
        const pubDate=extractTag(block,'pubDate')
        const link=extractTag(block,'link')
        if(!title)continue
        const score=scoreText(title+' '+desc)
        totalScore+=score
        if(score>0){
          alerts.push({title,link,score,date:pubDate,source:url.includes('thebulletin')?'Bulletin of Atomic Scientists':'Arms Control Assoc.'})
        }
      }
    }catch(e){}
  }
  const d=defcon(totalScore)
  return Response.json({defcon:d,score:totalScore,alerts:alerts.slice(0,10),ts:Date.now()})
}
