'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './page.module.css'

// TLE Propagation: Parse TLE lines and compute current satellite position
function tleToPos(line1, line2) {
  try {
    const inc = parseFloat(line2.substring(8, 16))
    const raan = parseFloat(line2.substring(17, 25))
    const ecc = parseFloat('0.' + line2.substring(26, 33))
    const w = parseFloat(line2.substring(34, 42))
    const M0 = parseFloat(line2.substring(43, 51))
    const n = parseFloat(line2.substring(52, 63))

    const GM = 3.986004418e14
    const nRad = (n * 2 * Math.PI) / 86400
    const a = Math.pow(GM / (nRad * nRad), 1 / 3)
    const altKm = (a - 6371000) / 1000

    const yr2 = parseInt(line1.substring(18, 20))
    const eDay = parseFloat(line1.substring(20, 32))
    const fullY = yr2 > 57 ? 1900 + yr2 : 2000 + yr2
    const epoch = new Date(fullY, 0, 1).getTime() + (eDay - 1) * 86400000
    const dt = (Date.now() - epoch) / 1000

    const Mdeg = (M0 + (n * dt) / 86400 * 360) % 360
    const Mrad = (Mdeg * Math.PI) / 180
    const E = Mrad
    const nu = 2 * Math.atan2(Math.sqrt(1 + ecc) * Math.sin(E / 2), Math.sqrt(1 - ecc) * Math.cos(E / 2))
    const r = a * (1 - ecc * Math.cos(E))

    const xOrb = r * Math.cos(nu)
    const yOrb = r * Math.sin(nu)

    const iR = (inc * Math.PI) / 180
    const wR = (w * Math.PI) / 180
    const OR = (raan * Math.PI) / 180

    const xECI =
      (Math.cos(OR) * Math.cos(wR) - Math.sin(OR) * Math.sin(wR) * Math.cos(iR)) * xOrb +
      (-Math.cos(OR) * Math.sin(wR) - Math.sin(OR) * Math.cos(wR) * Math.cos(iR)) * yOrb
    const yECI =
      (Math.sin(OR) * Math.cos(wR) + Math.cos(OR) * Math.sin(wR) * Math.cos(iR)) * xOrb +
      (-Math.sin(OR) * Math.sin(wR) + Math.cos(OR) * Math.cos(wR) * Math.cos(iR)) * yOrb
    const zECI = Math.sin(wR) * Math.sin(iR) * xOrb + Math.cos(wR) * Math.sin(iR) * yOrb

    const GMST = ((Date.now() / 1000) * 7.2921150e-5) % (2 * Math.PI)
    const xEF = xECI * Math.cos(GMST) + yECI * Math.sin(GMST)
    const yEF = -xECI * Math.sin(GMST) + yECI * Math.cos(GMST)

    const lat = Math.atan2(zECI, Math.sqrt(xEF * xEF + yEF * yEF)) * (180 / Math.PI)
    const lon = Math.atan2(yEF, xEF) * (180 / Math.PI)

    if (isNaN(lat) || isNaN(lon) || isNaN(altKm) || altKm < 160 || altKm > 50000) return null
    return { lat, lon, altKm: Math.round(altKm) }
  } catch {
    return null
  }
}

// Create a canvas-based icon for Cesium billboards
function makeIcon(char, color, size = 32) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  ctx.fillStyle = color + '33'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = color
  ctx.font = `bold ${size * 0.5}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, size / 2, size / 2)

  return c.toDataURL()
}

// Loading screen component
function LoadingScreen({ loadPct, loadMsg }) {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingTitle}>SENTINEL V2</div>
        <div className={styles.loadingText}>{loadMsg}</div>
        <div className={styles.loadingBar}>
          <div className={styles.loadingFill} style={{ width: `${loadPct}%` }} />
        </div>
        <div className={styles.loadingPct}>{loadPct}%</div>
      </div>
    </div>
  )
}

// Event timeline item
function EventItem({ event }) {
  return (
    <div className={styles.eventItem} style={{ borderLeftColor: event.color }}>
      <div className={styles.eventTime}>{event.time}</div>
      <div className={styles.eventMsg}>{event.msg}</div>
    </div>
  )
}

// Layer toggle item
function LayerToggle({ id, label, count, enabled, onToggle }) {
  return (
    <div className={styles.layerRow}>
      <label className={styles.layerLabel}>
        <input type="checkbox" checked={enabled} onChange={() => onToggle(id)} />
        <span className={styles.layerName}>{label}</span>
        <span className={styles.layerCount}>{count}</span>
      </label>
    </div>
  )
}

// News panel component
function NewsPanel({ items, onClose }) {
  return (
    <div className={styles.overlayPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>INTEL FEED</div>
        <button className={styles.closeBtn} onClick={onClose}>
          X
        </button>
      </div>
      <div className={styles.panelBody}>
        {items.slice(0, 20).map((item, i) => (
          <div key={i} className={styles.newsItem}>
            <div className={styles.newsTime}>{item.time}</div>
            <div className={styles.newsTitle}>{item.title}</div>
            <div className={styles.newsText}>{item.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Live feed panel
function LivePanel({ feed, onClose }) {
  return (
    <div className={styles.overlayPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>LIVE EVENTS</div>
        <button className={styles.closeBtn} onClick={onClose}>
          X
        </button>
      </div>
      <div className={styles.panelBody}>
        {feed.map((ev, i) => (
          <EventItem key={i} event={ev} />
        ))}
      </div>
    </div>
  )
}

// Markets panel
function MarketsPanel({ markets, onClose }) {
  return (
    <div className={styles.overlayPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>MARKETS</div>
        <button className={styles.closeBtn} onClick={onClose}>
          X
        </button>
      </div>
      <div className={styles.panelBody}>
        {markets ? (
          Object.entries(markets).map(([sym, data]) => (
            <div key={sym} className={styles.mktRow}>
              <div className={styles.mktSym}>{sym}</div>
              <div className={styles.mktPrice}>${data.price.toFixed(2)}</div>
              <div className={data.change >= 0 ? styles.mktUp : styles.mktDown}>{data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%</div>
            </div>
          ))
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </div>
  )
}

// Nuclear panel (top-right)
function NuclearPanel({ nuclear }) {
  if (!nuclear) return null
  return (
    <div className={styles.nuclearPanel}>
      <div className={styles.nuclearTitle}>DEFCON</div>
      <div className={styles.nuclearStatus}>{nuclear.defcon}</div>
      <div className={styles.nuclearFacilities}>Arsenals: {nuclear.facilities}</div>
      <div className={styles.nuclearWarheads}>Warheads: {nuclear.warheads}</div>
    </div>
  )
}

// Notification banner
function NotifBanner({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={styles.notifBanner}>
      <div className={styles.notifContent}>{message}</div>
      <button className={styles.notifClose} onClick={onClose}>
        X
      </button>
    </div>
  )
}

// Main page component
export default function Page() {
  const mapRef = useRef(null)
  const viewerRef = useRef(null)
  const dsRefs = useRef({})
  const aircraftMap = useRef({})
  const vesselMap = useRef({})
  const satData = useRef([])
  const wsRef = useRef(null)
  const updateTimersRef = useRef({})

  const [loaded, setLoaded] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [loadMsg, setLoadMsg] = useState('INITIALIZING...')
  const [clock, setClock] = useState('--:--:--')
  const [clockDate, setClockDate] = useState('')
  const [layers, setLayers] = useState({
    aircraft: true,
    military: true,
    vessels: true,
    satellites: true,
    earthquakes: true,
    wildfires: true,
    weather: true,
    bases: true,
    nuclear: false,
    chokepoints: true
  })
  const [counts, setCounts] = useState({
    aircraft: 0,
    military: 0,
    vessels: 0,
    satellites: 0,
    earthquakes: 0,
    wildfires: 0,
    weather: 0
  })
  const [selected, setSelected] = useState(null)
  const [feed, setFeed] = useState([])
  const [newsItems, setNewsItems] = useState([])
  const [markets, setMarkets] = useState(null)
  const [nuclear, setNuclear] = useState(null)
  const [newsOpen, setNewsOpen] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)
  const [mktOpen, setMktOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('layers')
  const [vision, setVision] = useState('normal')
  const [notifBanner, setNotifBanner] = useState(null)
  const [search, setSearch] = useState('')
  const [ticker, setTicker] = useState([])

  // Add event to feed
  const addEvent = (type, message, color) => {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', { hour12: false })
    setFeed((prev) => [{ type, msg: message, color, time }, ...prev].slice(0, 50))
  }

  // Initialize Cesium viewer
  useEffect(() => {
    let checkInterval = null

    const initCesium = async () => {
      if (!window.Cesium) return

      clearInterval(checkInterval)
      setLoadMsg('LOADING GLOBE...')
      setLoadPct(20)

      try {
        const Cesium = window.Cesium
        Cesium.Ion.defaultAccessToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYTdkMjA5Yi0wMGMxLTQ3ODEtYTQ0MC1jNjIxMDU4MDMzZWMiLCJpZCI6NDE0OTY1LCJpYXQiOjE3NzU1NzQ4NzV9.8NpmZZvxtFAgR5KLZy2jYrqPIUn8aWQETQgMsijUnnE'

        const terrain = await Cesium.Terrain.fromWorldTerrain()

        const viewer = new Cesium.Viewer(mapRef.current, {
          terrain: terrain,
          animation: true,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          terrainShadows: Cesium.ShadowMode.ENABLED,
          shadows: true
        })

        viewer.scene.globe.enableLighting = true
        viewer.scene.sunBloom = false

        viewerRef.current = viewer

        // Create data sources for each layer
        const layerIds = ['aircraft', 'military', 'vessels', 'satellites', 'earthquakes', 'wildfires', 'weather', 'bases', 'nuclear', 'chokepoints']
        layerIds.forEach((id) => {
          const ds = new Cesium.CustomDataSource(id)
          viewer.dataSources.add(ds)
          dsRefs.current[id] = ds
        })

        setLoadPct(50)
        setLoadMsg('LOADING DATA SOURCES...')

        // Load static data
        await loadStaticData()

        setLoadPct(75)
        setLoadMsg('STARTING STREAMS...')

        // Start polling streams
        pollAircraft()
        pollSatellites()
        pollEarthquakes()
        pollWildfires()
        pollWeather()
        initVessels()

        // Clock tick
        const clockInterval = setInterval(() => {
          const now = new Date()
          const h = String(now.getHours()).padStart(2, '0')
          const m = String(now.getMinutes()).padStart(2, '0')
          const s = String(now.getSeconds()).padStart(2, '0')
          setClock(`${h}:${m}:${s}`)
          setClockDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
        }, 1000)

        // Ticker rotation
        let tickIdx = 0
        const tickerInterval = setInterval(() => {
          const items = [
            `AIRCRAFT: ${counts.aircraft}`,
            `MILITARY: ${counts.military}`,
            `VESSELS: ${counts.vessels}`,
            `EARTHQUAKES: ${counts.earthquakes}`,
            `WILDFIRES: ${counts.wildfires}`,
            newsItems.length > 0 ? `HEADLINE: ${newsItems[0]?.title || 'No news'}` : 'DEFCON: STABLE'
          ]
          setTicker(items[tickIdx % items.length])
          tickIdx++
        }, 5000)

        updateTimersRef.current.clock = clockInterval
        updateTimersRef.current.ticker = tickerInterval

        setLoadPct(100)
        setLoadMsg('ONLINE')
        setTimeout(() => setLoaded(true), 500)
      } catch (err) {
        console.error('Cesium init error:', err)
        setLoadMsg('ERROR INITIALIZING')
      }
    }

    checkInterval = setInterval(initCesium, 100)

    return () => {
      clearInterval(checkInterval)
      Object.values(updateTimersRef.current).forEach(clearInterval)
    }
  }, [])

  // Load static data
  const loadStaticData = async () => {
    try {
      const [basesRes, nuclearRes, chokepointsRes] = await Promise.all([
        fetch('/data/bases.json'),
        fetch('/data/nuclear.json'),
        fetch('/data/chokepoints.json')
      ])

      const bases = await basesRes.json()
      const nuclearData = await nuclearRes.json()
      const chokepoints = await chokepointsRes.json()

      if (mapRef.current && viewerRef.current) {
        placeStaticLayer('bases', bases, '⚙', '#ff3333', (b) => b.name)
        placeStaticLayer('chokepoints', chokepoints, '🔒', '#00ffff', (c) => c.name)
        placeStaticLayer('nuclear', nuclearData.facilities || [], '☢', '#ffff44', (n) => n.name)

        setNuclear({
          defcon: nuclearData.defcon || 'STABLE',
          facilities: nuclearData.facilities?.length || 0,
          warheads: nuclearData.warheads || 15000
        })
      }
    } catch (err) {
      console.error('Static data load error:', err)
    }
  }

  // Place static layer entities
  const placeStaticLayer = (layerId, data, iconChar, color, getLabel) => {
    if (!viewerRef.current || !dsRefs.current[layerId]) return

    const Cesium = window.Cesium
    const ds = dsRefs.current[layerId]
    const iconUrl = makeIcon(iconChar, color, 32)

    data.forEach((item) => {
      const entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat),
        billboard: {
          image: iconUrl,
          scale: 1,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER
        },
        name: getLabel(item),
        properties: {
          type: layerId,
          data: item
        }
      })

      entity.polyline = new Cesium.PolylineGraphics({
        positions: Cesium.Cartesian3.fromDegreesArray([item.lon, item.lat, item.lon, item.lat]),
        width: 0
      })

      entity.addEventListener = () => {
        setSelected({ type: layerId, ...item })
      }
    })

    setCounts((prev) => ({ ...prev, [layerId]: data.length }))
  }

  // Poll aircraft data
  const pollAircraft = async () => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/aircraft')
        if (!res.ok) throw new Error('Aircraft fetch failed')
        const data = await res.json()

        placeAircraft(data.aircraft || [])
        setCounts((prev) => ({
          ...prev,
          aircraft: data.aircraft?.length || 0,
          military: data.aircraft?.filter((a) => a.mil).length || 0
        }))

        addEvent('aircraft_update', `${data.aircraft?.length || 0} aircraft tracked`, '#00ff88')
      } catch (err) {
        console.error('Aircraft poll error:', err)
      }

      updateTimersRef.current.aircraft = setTimeout(fetchData, 15000)
    }

    fetchData()
  }

  // Place aircraft entities
  const placeAircraft = (aircraftList) => {
    if (!viewerRef.current || !dsRefs.current.aircraft || !dsRefs.current.military) return

    const Cesium = window.Cesium
    const acDs = dsRefs.current.aircraft
    const milDs = dsRefs.current.military

    aircraftList.forEach((ac) => {
      const key = ac.icao
      const color = ac.mil ? '#ff4444' : '#00ff88'
      const ds = ac.mil ? milDs : acDs
      const iconUrl = makeIcon('✈', color, 28)

      let entity = aircraftMap.current[key]

      if (!entity) {
        entity = ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, ac.alt * 0.3048),
          billboard: {
            image: iconUrl,
            scale: 1,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            rotation: Cesium.Math.toRadians(-(ac.heading || 0))
          },
          name: ac.callsign || ac.icao,
          properties: {
            type: 'aircraft',
            icao: ac.icao,
            callsign: ac.callsign,
            speed: ac.speed,
            heading: ac.heading,
            altitude: ac.alt,
            military: ac.mil
          }
        })

        aircraftMap.current[key] = entity
      } else {
        entity.position = Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, ac.alt * 0.3048)
        entity.billboard.rotation = Cesium.Math.toRadians(-(ac.heading || 0))
        entity.properties.speed = ac.speed
        entity.properties.heading = ac.heading
        entity.properties.altitude = ac.alt
      }
    })
  }

  // Poll satellite data
  const pollSatellites = async () => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/satellites')
        if (!res.ok) throw new Error('Satellites fetch failed')
        const data = await res.json()

        satData.current = data.satellites || []
        placeSatellites(satData.current)

        setCounts((prev) => ({ ...prev, satellites: satData.current.length }))
      } catch (err) {
        console.error('Satellites poll error:', err)
      }

      updateTimersRef.current.satellites = setTimeout(fetchData, 300000)
    }

    fetchData()
  }

  // Place satellite entities
  const placeSatellites = (satellites) => {
    if (!viewerRef.current || !dsRefs.current.satellites) return

    const Cesium = window.Cesium
    const ds = dsRefs.current.satellites
    ds.entities.removeAll()

    satellites.forEach((sat) => {
      const pos = tleToPos(sat.line1, sat.line2)
      if (!pos) return

      const iconUrl = makeIcon('◆', '#ffaa00', 24)

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.altKm * 1000),
        billboard: {
          image: iconUrl,
          scale: 1,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER
        },
        name: sat.name,
        properties: {
          type: 'satellite',
          name: sat.name,
          altitude: pos.altKm
        }
      })
    })
  }

  // Poll earthquakes
  const pollEarthquakes = async () => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/earthquakes')
        if (!res.ok) throw new Error('Earthquakes fetch failed')
        const data = await res.json()

        placeQuakes(data.earthquakes || [])
        setCounts((prev) => ({ ...prev, earthquakes: data.earthquakes?.length || 0 }))
      } catch (err) {
        console.error('Earthquakes poll error:', err)
      }

      updateTimersRef.current.earthquakes = setTimeout(fetchData, 120000)
    }

    fetchData()
  }

  // Place earthquake entities
  const placeQuakes = (quakes) => {
    if (!viewerRef.current || !dsRefs.current.earthquakes) return

    const Cesium = window.Cesium
    const ds = dsRefs.current.earthquakes
    ds.entities.removeAll()

    quakes.forEach((q) => {
      let color = '#00ff00'
      if (q.magnitude >= 6) color = '#ff4444'
      else if (q.magnitude >= 5) color = '#ff8800'
      else if (q.magnitude >= 4) color = '#ffaa00'

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(q.lon, q.lat),
        point: {
          pixelSize: Math.max(4, q.magnitude * 3),
          color: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1
        },
        name: `Magnitude ${q.magnitude}`,
        properties: {
          type: 'earthquake',
          magnitude: q.magnitude,
          depth: q.depth,
          location: q.location
        }
      })

      addEvent('earthquake', `${q.magnitude} earthquake at ${q.location}`, color)
    })
  }

  // Poll wildfires
  const pollWildfires = async () => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/wildfires')
        if (!res.ok) throw new Error('Wildfires fetch failed')
        const data = await res.json()

        placeFires(data.wildfires || [])
        setCounts((prev) => ({ ...prev, wildfires: data.wildfires?.length || 0 }))
      } catch (err) {
        console.error('Wildfires poll error:', err)
      }

      updateTimersRef.current.wildfires = setTimeout(fetchData, 1800000)
    }

    fetchData()
  }

  // Place wildfire entities
  const placeFires = (fires) => {
    if (!viewerRef.current || !dsRefs.current.wildfires) return

    const Cesium = window.Cesium
    const ds = dsRefs.current.wildfires
    ds.entities.removeAll()

    fires.forEach((fire) => {
      const sizeScale = Math.min(Math.max(1, fire.frp / 10), 10)

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(fire.lon, fire.lat),
        point: {
          pixelSize: 6 * sizeScale,
          color: Cesium.Color.fromCssColorString('#ff5500'),
          outlineColor: Cesium.Color.fromCssColorString('#ff8800'),
          outlineWidth: 1
        },
        name: `Fire FRP: ${fire.frp}`,
        properties: {
          type: 'wildfire',
          frp: fire.frp,
          location: fire.location
        }
      })

      if (fire.frp > 100) {
        addEvent('wildfire', `Large wildfire detected at ${fire.location}`, '#ff5500')
      }
    })
  }

  // Poll weather
  const pollWeather = async () => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/weather')
        if (!res.ok) throw new Error('Weather fetch failed')
        const data = await res.json()

        placeWeather(data.alerts || [])
        setCounts((prev) => ({ ...prev, weather: data.alerts?.length || 0 }))
      } catch (err) {
        console.error('Weather poll error:', err)
      }

      updateTimersRef.current.weather = setTimeout(fetchData, 300000)
    }

    fetchData()
  }

  // Place weather entities
  const placeWeather = (alerts) => {
    if (!viewerRef.current || !dsRefs.current.weather) return

    const Cesium = window.Cesium
    const ds = dsRefs.current.weather
    ds.entities.removeAll()

    alerts.forEach((alert) => {
      let char = '⛈'
      if (alert.type === 'volcano') char = '🌋'
      else if (alert.type === 'storm') char = '⛈'
      else if (alert.type === 'tornado') char = '🌪'

      const iconUrl = makeIcon(char, '#cc44ff', 28)

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(alert.lon, alert.lat),
        billboard: {
          image: iconUrl,
          scale: 1,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER
        },
        name: alert.type,
        properties: {
          type: 'weather',
          alertType: alert.type,
          severity: alert.severity,
          location: alert.location
        }
      })

      addEvent('weather', `${alert.type} alert at ${alert.location}`, '#cc44ff')
    })
  }

  // Initialize vessels (AISstream WebSocket)
  const initVessels = async () => {
    try {
      const cfgRes = await fetch('/api/vessels')
      if (!cfgRes.ok) throw new Error('Vessels config fetch failed')
      const cfg = await cfgRes.json()

      const ws = new WebSocket(cfg.wsUrl)

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            APIKey: cfg.apiKey,
            BoundingBoxes: cfg.bboxes,
            FilterMessageTypes: cfg.msgTypes
          })
        )
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          const pos = msg.Message?.PositionReport
          const meta = msg.MetaData

          if (!pos || !meta) return

          const mmsi = String(meta.MMSI)
          const lat = pos.Latitude
          const lon = pos.Longitude
          const heading = pos.Course || 0
          const speed = pos.Speed || 0
          const name = meta.ShipName || `MMSI ${mmsi}`
          const type = meta.ShipType || 'CARGO'

          placeVessel(mmsi, lat, lon, name, type, heading, speed)

          setCounts((prev) => ({
            ...prev,
            vessels: Math.max(prev.vessels, Object.keys(vesselMap.current).length)
          }))
        } catch (err) {
          console.error('Vessel message parse error:', err)
        }
      }

      ws.onerror = () => {
        console.error('Vessel WS error')
      }

      ws.onclose = () => {
        setTimeout(initVessels, 5000)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Vessels init error:', err)
      updateTimersRef.current.vessels = setTimeout(initVessels, 5000)
    }
  }

  // Place vessel entity
  const placeVessel = (mmsi, lat, lon, name, type, heading, speed) => {
    if (!viewerRef.current || !dsRefs.current.vessels) return

    const Cesium = window.Cesium
    const ds = dsRefs.current.vessels

    let char = '🚢'
    if (type.includes('TANKER')) char = '⛽'
    else if (type.includes('CONTAINER')) char = '📦'
    else if (type.includes('WARSHIP') || type.includes('MILITARY')) char = '⚔'

    const iconUrl = makeIcon(char, '#00aaff', 28)

    let entity = vesselMap.current[mmsi]

    if (!entity) {
      entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        billboard: {
          image: iconUrl,
          scale: 1,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          rotation: Cesium.Math.toRadians(-(heading || 0))
        },
        name: name,
        properties: {
          type: 'vessel',
          mmsi: mmsi,
          name: name,
          shipType: type,
          speed: speed,
          heading: heading
        }
      })

      vesselMap.current[mmsi] = entity
    } else {
      entity.position = Cesium.Cartesian3.fromDegrees(lon, lat)
      entity.billboard.rotation = Cesium.Math.toRadians(-(heading || 0))
      entity.properties.speed = speed
      entity.properties.heading = heading
    }
  }

  // Toggle layer visibility
  const handleLayerToggle = (id) => {
    setLayers((prev) => {
      const newLayers = { ...prev, [id]: !prev[id] }
      if (dsRefs.current[id]) {
        dsRefs.current[id].show = newLayers[id]
      }
      return newLayers
    })
  }

  // Change vision mode
  const handleVisionChange = (mode) => {
    setVision(mode)
    if (typeof document !== 'undefined') {
      document.body.classList.remove('vision-normal', 'vision-nvg', 'vision-flir')
      if (mode !== 'normal') {
        document.body.classList.add(`vision-${mode}`)
      }
    }
  }

  // Entity click handler (placeholder - would integrate with Cesium viewer)
  const handleEntitySelect = (entity) => {
    const props = entity.properties
    if (props) {
      setSelected({
        type: props.type,
        ...Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v._value || v]))
      })
    }
  }

  // Mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (!loaded) {
    return <LoadingScreen loadPct={loadPct} loadMsg={loadMsg} />
  }

  return (
    <>
      {/* Globe */}
      <div ref={mapRef} className={styles.map} />

      {/* Visual effects */}
      <div className={styles.scanlines} />
      <div className={styles.vignette} />
      <div className={`${styles.corner} ${styles.tl}`} />
      <div className={`${styles.corner} ${styles.tr}`} />
      <div className={`${styles.corner} ${styles.bl}`} />
      <div className={`${styles.corner} ${styles.br}`} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>SENTINEL V2</div>
        </div>

        <div className={styles.headerCenter}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>AC</span>
            <span className={styles.statValue}>{counts.aircraft}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>MIL</span>
            <span className={styles.statValue}>{counts.military}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>VESSELS</span>
            <span className={styles.statValue}>{counts.vessels}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>QUAKES</span>
            <span className={styles.statValue}>{counts.earthquakes}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>FIRES</span>
            <span className={styles.statValue}>{counts.wildfires}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.clock}>
            <div className={styles.clockTime}>{clock}</div>
            <div className={styles.clockDate}>{clockDate}</div>
          </div>
          <button className={styles.menuBtn} onClick={() => setMobileOpen(!mobileOpen)}>
            ☰
          </button>
        </div>
      </header>

      {/* Left panel */}
      {!isMobile && (
        <div className={styles.panelLeft}>
          {nuclear && <NuclearPanel nuclear={nuclear} />}

          <div className={styles.layersSection}>
            <div className={styles.sectionTitle}>LAYERS</div>
            <LayerToggle id="aircraft" label="Aircraft" count={counts.aircraft} enabled={layers.aircraft} onToggle={handleLayerToggle} />
            <LayerToggle id="military" label="Military" count={counts.military} enabled={layers.military} onToggle={handleLayerToggle} />
            <LayerToggle id="vessels" label="Vessels" count={counts.vessels} enabled={layers.vessels} onToggle={handleLayerToggle} />
            <LayerToggle id="satellites" label="Satellites" count={counts.satellites} enabled={layers.satellites} onToggle={handleLayerToggle} />
            <LayerToggle id="earthquakes" label="Earthquakes" count={counts.earthquakes} enabled={layers.earthquakes} onToggle={handleLayerToggle} />
            <LayerToggle id="wildfires" label="Wildfires" count={counts.wildfires} enabled={layers.wildfires} onToggle={handleLayerToggle} />
            <LayerToggle id="weather" label="Weather" count={counts.weather} enabled={layers.weather} onToggle={handleLayerToggle} />
            <LayerToggle id="bases" label="Bases" count={counts.bases || 0} enabled={layers.bases} onToggle={handleLayerToggle} />
            <LayerToggle id="nuclear" label="Nuclear" count={nuclear?.facilities || 0} enabled={layers.nuclear} onToggle={handleLayerToggle} />
            <LayerToggle id="chokepoints" label="Chokepoints" count={counts.chokepoints || 0} enabled={layers.chokepoints} onToggle={handleLayerToggle} />
          </div>

          <div className={styles.timelineSection}>
            <div className={styles.sectionTitle}>EVENTS</div>
            <div className={styles.timeline}>
              {feed.slice(0, 8).map((event, i) => (
                <EventItem key={i} event={event} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right panel */}
      {!isMobile && (
        <div className={styles.panelRight}>
          {selected && (
            <div className={styles.targetLock}>
              <div className={styles.lockTitle}>TARGET LOCK</div>
              <div className={styles.lockType}>{selected.type.toUpperCase()}</div>
              <div className={styles.lockData}>
                {selected.name && <div>NAME: {selected.name}</div>}
                {selected.speed && <div>SPEED: {selected.speed} kts</div>}
                {selected.heading && <div>HEADING: {selected.heading}°</div>}
                {selected.altitude && <div>ALT: {selected.altitude} ft</div>}
                {selected.magnitude && <div>MAGNITUDE: {selected.magnitude}</div>}
                {selected.location && <div>LOCATION: {selected.location}</div>}
              </div>
              <button className={styles.clearBtn} onClick={() => setSelected(null)}>
                CLEAR
              </button>
            </div>
          )}

          <div className={styles.visionModes}>
            <div className={styles.sectionTitle}>VISION</div>
            <button
              className={`${styles.visionBtn} ${vision === 'normal' ? styles.active : ''}`}
              onClick={() => handleVisionChange('normal')}
            >
              NORMAL
            </button>
            <button
              className={`${styles.visionBtn} ${vision === 'nvg' ? styles.active : ''}`}
              onClick={() => handleVisionChange('nvg')}
            >
              NVG
            </button>
            <button
              className={`${styles.visionBtn} ${vision === 'flir' ? styles.active : ''}`}
              onClick={() => handleVisionChange('flir')}
            >
              FLIR
            </button>
          </div>

          {markets && (
            <div className={styles.miniMarkets}>
              <div className={styles.sectionTitle}>MARKETS</div>
              {Object.entries(markets)
                .slice(0, 3)
                .map(([sym, data]) => (
                  <div key={sym} className={styles.mktMini}>
                    <span className={styles.mktSym}>{sym}</span>
                    <span className={data.change >= 0 ? styles.mktUp : styles.mktDown}>{data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}%</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="SEARCH TARGETS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Overlay panels */}
      {newsOpen && <NewsPanel items={newsItems} onClose={() => setNewsOpen(false)} />}
      {liveOpen && <LivePanel feed={feed} onClose={() => setLiveOpen(false)} />}
      {mktOpen && <MarketsPanel markets={markets} onClose={() => setMktOpen(false)} />}

      {/* Notification banner */}
      {notifBanner && <NotifBanner message={notifBanner} onClose={() => setNotifBanner(null)} />}

      {/* Mobile bottom sheet */}
      <div className={`${styles.mobileSheet} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.sheetTabs}>
          <button
            className={`${styles.sheetTab} ${mobileTab === 'layers' ? styles.active : ''}`}
            onClick={() => setMobileTab('layers')}
          >
            LAYERS
          </button>
          <button
            className={`${styles.sheetTab} ${mobileTab === 'events' ? styles.active : ''}`}
            onClick={() => setMobileTab('events')}
          >
            EVENTS
          </button>
          <button
            className={`${styles.sheetTab} ${mobileTab === 'markets' ? styles.active : ''}`}
            onClick={() => setMobileTab('markets')}
          >
            MARKETS
          </button>
          <button
            className={`${styles.sheetTab} ${mobileTab === 'info' ? styles.active : ''}`}
            onClick={() => setMobileTab('info')}
          >
            INFO
          </button>
        </div>

        <div className={styles.sheetContent}>
          {mobileTab === 'layers' && (
            <div>
              {Object.entries(layers).map(([id, enabled]) => (
                <LayerToggle key={id} id={id} label={id} count={counts[id] || 0} enabled={enabled} onToggle={handleLayerToggle} />
              ))}
            </div>
          )}

          {mobileTab === 'events' && (
            <div>
              {feed.map((event, i) => (
                <EventItem key={i} event={event} />
              ))}
            </div>
          )}

          {mobileTab === 'markets' && markets && (
            <div>
              {Object.entries(markets).map(([sym, data]) => (
                <div key={sym} className={styles.mktRow}>
                  <div className={styles.mktSym}>{sym}</div>
                  <div className={styles.mktPrice}>${data.price.toFixed(2)}</div>
                  <div className={data.change >= 0 ? styles.mktUp : styles.mktDown}>{data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          )}

          {mobileTab === 'info' && (
            <div className={styles.infoTab}>
              <div>SENTINEL V2 - Global Surveillance</div>
              <div>Real-time tracking of aircraft, vessels, seismic activity</div>
              {nuclear && (
                <div>
                  <div>DEFCON: {nuclear.defcon}</div>
                  <div>NUCLEAR FACILITIES: {nuclear.facilities}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`${styles.mobileOverlay} ${mobileOpen ? styles.open : ''}`} onClick={() => setMobileOpen(false)} />

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <div className={styles.tickLabel}>◉ LIVE</div>
        <div className={styles.ticker}>{ticker}</div>
        <div className={styles.bottomButtons}>
          <button className={styles.bottomBtn} onClick={() => setNewsOpen(true)}>
            INTEL
          </button>
          <button className={styles.bottomBtn} onClick={() => setLiveOpen(true)}>
            LIVE
          </button>
          <button className={styles.bottomBtn} onClick={() => setMktOpen(true)}>
            MARKETS
          </button>
          <button className={styles.bottomBtn} onClick={() => setNotifBanner('ALERT: Unauthorized intrusion detected')}>
            ALERTS
          </button>
        </div>
      </div>
    </>
  )
}
