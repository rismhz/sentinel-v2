// Live markets: crypto (CoinGecko) + defense stocks (Yahoo Finance JSON) + commodities
const ALPHA_KEY = 'PPDGM261S0NUGYSX'

// Yahoo Finance v8 chart API (no auth required for basic quotes)
async function yahooQuote(symbol) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      { headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(5000), next:{revalidate:300} }
    )
    if(!r.ok) return null
    const d = await r.json()
    const meta = d?.chart?.result?.[0]?.meta
    if(!meta) return null
    const price = meta.regularMarketPrice
    const prev  = meta.previousClose || meta.chartPreviousClose
    const chg   = prev ? ((price-prev)/prev*100) : 0
    return { symbol, price, chg: +chg.toFixed(2), currency: meta.currency||'USD' }
  } catch { return null }
}

export async function GET() {
  const [cryptoRes, ...stockResults] = await Promise.allSettled([
    // CoinGecko — top crypto (no key)
    fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,xrp&order=market_cap_desc&per_page=4&sparkline=false',
      { next:{revalidate:120}, signal:AbortSignal.timeout(6000) }).then(r=>r.json()),
    // Defense stocks
    yahooQuote('LMT'),  // Lockheed Martin
    yahooQuote('RTX'),  // Raytheon
    yahooQuote('NOC'),  // Northrop Grumman
    yahooQuote('GD'),   // General Dynamics
    yahooQuote('BA'),   // Boeing
    // Commodities ETF proxies
    yahooQuote('USO'),  // Oil ETF
    yahooQuote('GLD'),  // Gold ETF
    yahooQuote('DXY'),  // Dollar index
  ])

  const crypto = cryptoRes.status==='fulfilled' ? (cryptoRes.value||[]).map(c=>({
    symbol:  c.symbol?.toUpperCase(),
    name:    c.name,
    price:   c.current_price,
    chg:     +(c.price_change_percentage_24h||0).toFixed(2),
    mktCap:  c.market_cap,
  })) : []

  const stocks = stockResults
    .map(r=>r.status==='fulfilled'?r.value:null)
    .filter(Boolean)

  // Fear & Greed proxy: BTC 24h change as sentiment
  const btc = crypto.find(c=>c.symbol==='BTC')
  let sentiment = 'NEUTRAL'
  if(btc) {
    if(btc.chg>5) sentiment='GREED'
    else if(btc.chg>2) sentiment='BULLISH'
    else if(btc.chg<-5) sentiment='FEAR'
    else if(btc.chg<-2) sentiment='BEARISH'
  }

  return Response.json({ crypto, stocks, sentiment })
}
