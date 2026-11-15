import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Circle } from 'react-leaflet'
import L from 'leaflet'
import {
  Activity, ArrowUpRight, BatteryCharging, ChevronDown, CircleHelp, Compass, Crosshair,
  Database, Flag, Gauge, Globe2, Layers3, Map as MapIcon, Menu, Mountain, Navigation,
  Orbit, Play, RotateCcw, ShieldAlert, Sparkles, Target, Timer, Trophy, Wind, X,
  Droplets, Footprints, CheckCircle2, AlertTriangle, BookOpen, Radio, Route as RouteIcon
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar
} from 'recharts'

type Point = { id: string; name: string; lat: number; lon: number; kind: string; description: string; provenance: string }
type Tab = 'overview' | 'explorer' | 'routes' | 'hazards' | 'commander' | 'data'

const landing: Point = {
  id: 'landing', name: 'Octavia E. Butler Landing', lat: 18.4446, lon: 77.4509, kind: 'NASA mission site',
  description: 'Perseverance touched down here on 18 February 2021. The landing site lies within Jezero Crater, an ancient lake-and-delta system.',
  provenance: 'NASA/JPL mission reference'
}
const points: Point[] = [
  landing,
  { id: 'delta', name: 'Western Delta Approach', lat: 18.455, lon: 77.485, kind: 'Planning waypoint', description: 'A notional waypoint toward the western edge of the delta front. Use it to discuss sedimentary environments; it is not a surveyed rover stop.', provenance: 'ARES illustrative waypoint' },
  { id: 'fan', name: 'Fan Surface Traverse', lat: 18.425, lon: 77.425, kind: 'Planning waypoint', description: 'A notional traverse anchor for comparing shorter, lower-complexity exploration legs.', provenance: 'ARES illustrative waypoint' },
  { id: 'rim', name: 'Crater Margin Viewpoint', lat: 18.535, lon: 77.515, kind: 'Planning waypoint', description: 'A hypothetical high-level destination near the crater margin. This is not a certified route or rover target.', provenance: 'ARES illustrative waypoint' },
  { id: 'north', name: 'Northern Fan Edge', lat: 18.49, lon: 77.46, kind: 'Planning waypoint', description: 'A notional point for exploring route trade-offs around the fan margin.', provenance: 'ARES illustrative waypoint' }
]
const marsTiles = 'https://trek.nasa.gov/tiles/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg'
const molaTiles = 'https://trek.nasa.gov/tiles/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg'
const km = (a: Point, b: Point) => {
  const R = 3389.5, rad = Math.PI / 180
  const dLat = (b.lat-a.lat)*rad, dLon=(b.lon-a.lon)*rad
  const q = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2
  return 2*R*Math.asin(Math.sqrt(q))
}
const fmt = (n:number) => n.toFixed(2)
const Icon = ({children}:{children:React.ReactNode}) => <span className="icon">{children}</span>
function MapClick({onPick}:{onPick:(p:Point)=>void}) {
  useMapEvents({ click(e) { onPick({id:'custom',name:'Custom map selection',lat:e.latlng.lat,lon:e.latlng.lng,kind:'User-selected coordinate',description:'A coordinate selected interactively on the map. Local MOLA sampling is not connected in this prototype.',provenance:'User interaction'}) } })
  return null
}
function makeIcon(color:string, label:string) {
  return L.divIcon({className:'ares-marker-wrap',html:`<div class="ares-marker ${color}"><span>${label}</span></div>`,iconSize:[30,30],iconAnchor:[15,15]})
}
const icons = {
  landing: makeIcon('marker-red','P'), waypoint: makeIcon('marker-gold','◇'), custom: makeIcon('marker-blue','+')
}

function App() {
  const [tab,setTab] = useState<Tab>('overview')
  const [selected,setSelected] = useState<Point>(landing)
  const [layer,setLayer] = useState<'surface'|'mola'>('surface')
  const [showPOI,setShowPOI] = useState(true)
  const [showRoute,setShowRoute] = useState(true)
  const [start,setStart] = useState('landing')
  const [end,setEnd] = useState('delta')
  const [routeMode,setRouteMode] = useState<'balanced'|'science'>('balanced')
  const [missionStarted,setMissionStarted] = useState(false)
  const [hours,setHours] = useState(48)
  const [power,setPower] = useState(100)
  const [water,setWater] = useState(100)
  const [oxygen,setOxygen] = useState(100)
  const [sol,setSol] = useState(1)
  const [visited,setVisited] = useState<string[]>([])
  const [eventLog,setEventLog] = useState<string[]>([])
  const [debrief,setDebrief] = useState(false)
  const [objective,setObjective] = useState('Investigate delta sediments')
  const [mobileNav,setMobileNav] = useState(false)

  const getPoint = (id:string) => points.find(p=>p.id===id) || landing
  const from = getPoint(start), to = getPoint(end)
  const directKm = km(from,to)
  const routeA = [from, ...(end==='delta'?[getPoint('north')]:[getPoint('fan')]), to]
  const routeB = [from, ...(end==='rim'?[getPoint('north'),getPoint('delta')]:[getPoint('rim')]), to]
  const distanceA = routeA.slice(1).reduce((s,p,i)=>s+km(routeA[i],p),0)
  const distanceB = routeB.slice(1).reduce((s,p,i)=>s+km(routeB[i],p),0)
  const chosenRoute = routeMode==='balanced'?routeA:routeB
  const chosenDistance = routeMode==='balanced'?distanceA:distanceB
  const routeCoordinates = chosenRoute.map(p=>[p.lat,p.lon] as [number,number])
  const hazardScore = Math.min(92, Math.round(18 + Math.abs(selected.lat-18.4446)*115 + Math.abs(selected.lon-77.4509)*58 + (selected.id==='rim'?22:0)))
  const riskLabel = hazardScore<35?'LOWER RELATIVE EXPOSURE':hazardScore<60?'MODERATE RELATIVE EXPOSURE':'HIGHER RELATIVE EXPOSURE'
  const totalHours = Math.max(1,chosenDistance/0.08)
  const data = [{name:'Sol 1',elevation:0},{name:'Sol 2',elevation:12},{name:'Sol 3',elevation:8},{name:'Sol 4',elevation:17},{name:'Sol 5',elevation:13},{name:'Sol 6',elevation:22}]
  const navItems: {id:Tab,label:string,icon:React.ReactNode}[] = [
    {id:'overview',label:'Mission overview',icon:<Orbit size={16}/>},
    {id:'explorer',label:'Mars explorer',icon:<MapIcon size={16}/>},
    {id:'routes',label:'Route planner',icon:<RouteIcon size={16}/>},
    {id:'hazards',label:'Hazard intelligence',icon:<ShieldAlert size={16}/>},
    {id:'commander',label:'Commander mode',icon:<Radio size={16}/>},
    {id:'data',label:'Data & methodology',icon:<Database size={16}/>}
  ]
  const setTabAndClose = (t:Tab) => {setTab(t);setMobileNav(false)}
  const goTo = (p:Point) => {setSelected(p);setTab('explorer')}
  const startMission = () => {setMissionStarted(true);setDebrief(false);setTab('commander')}
  const consume = (kind:'science'|'rest'|'return') => {
    if(!missionStarted) setMissionStarted(true)
    if(kind==='science'){
      const nextPower=Math.max(0,power-18), nextWater=Math.max(0,water-8), nextOxygen=Math.max(0,oxygen-12), nextHours=hours-6
      setPower(nextPower);setWater(nextWater);setOxygen(nextOxygen);setHours(nextHours);setVisited(v=>v.includes(end)?v:[...v,end])
      setEventLog(l=>[`Sol ${sol}: Conducted a 6-hour science stop at ${to.name}.`,...l]);setSol(s=>s+1)
    } else if(kind==='rest') {
      setPower(Math.max(0,power-5));setWater(Math.max(0,water-4));setOxygen(Math.max(0,oxygen-6));setHours(hours-4)
      setEventLog(l=>[`Sol ${sol}: Conserved mobility power during a rest and systems check.`,...l]);setSol(s=>s+1)
    } else {
      setPower(Math.max(0,power-10));setWater(Math.max(0,water-5));setOxygen(Math.max(0,oxygen-8));setHours(hours-8)
      setEventLog(l=>[`Sol ${sol}: Commander ordered a return-to-habitat leg.`,...l]);setSol(s=>s+1);setDebrief(true)
    }
  }
  const outcome = useMemo(()=>{
    if(visited.length===0) return 'Mission objectives not completed'
    const score=(visited.length*28)+(power>15?18:0)+(water>10?12:0)+(oxygen>10?12:0)+(hours>0?10:0)
    return score>=78?'Mission completed successfully':score>=40?'Mission completed with limited objectives':'Mission objectives not completed'
  },[visited,power,water,oxygen,hours])
  const resetMission = () => {setMissionStarted(false);setHours(48);setPower(100);setWater(100);setOxygen(100);setSol(1);setVisited([]);setEventLog([]);setDebrief(false)}
  const mapBlock = (height='500px') => (
    <div className="map-frame" style={{height}}>
      <MapContainer center={[18.4446,77.4509]} zoom={8} minZoom={2} maxZoom={15} scrollWheelZoom className="mars-map" crs={L.CRS.EPSG4326}>
        <TileLayer url={layer==='surface'?marsTiles:molaTiles} attribution='NASA/JPL-Caltech · NASA Mars Trek / PDS' eventHandlers={{tileerror:()=>{}}}/>
        {showPOI && points.map(p=><Marker key={p.id} position={[p.lat,p.lon]} icon={p.id==='landing'?icons.landing:icons.waypoint} eventHandlers={{click:()=>setSelected(p)}}><Popup><b>{p.name}</b><br/>{p.kind}<br/><button className="popup-btn" onClick={()=>goTo(p)}>Inspect location →</button></Popup></Marker>)}
        {selected.id==='custom' && <Marker position={[selected.lat,selected.lon]} icon={icons.custom}><Popup>Custom selection</Popup></Marker>}
        {showRoute && <Polyline positions={routeCoordinates} pathOptions={{color:'#ff784f',weight:3,dashArray:'8 7',opacity:.95}}/>}
        <Circle center={[18.4446,77.4509]} radius={9500} pathOptions={{color:'#ff9b65',fillColor:'#ff9b65',fillOpacity:.035,weight:1,dashArray:'4 6'}}/>
        <MapClick onPick={setSelected}/>
      </MapContainer>
      <div className="map-legend"><span><i className="dot red"/> Perseverance landing</span><span><i className="dot gold"/> Planning waypoint</span><span><i className="line"/> ARES route</span></div>
      <div className="map-coords"><Crosshair size={12}/> {selected.lat.toFixed(4)}°N · {selected.lon.toFixed(4)}°E</div>
    </div>
  )
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Orbit size={22}/></div><div><div className="brand-name">ARES<span> / 01</span></div><div className="brand-sub">PLANETARY INTELLIGENCE</div></div><button className="close-nav" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="mission-tag"><span className="live-dot"/> SIMULATION ENVIRONMENT</div>
      <div className="nav-caption">MISSION SYSTEMS</div>
      <nav>{navItems.map(n=><button key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>setTabAndClose(n.id)}>{n.icon}<span>{n.label}</span>{tab===n.id&&<span className="nav-active"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="side-status"><div className="status-row"><span>DATA LINK</span><b><i className="green-dot"/> DEMO READY</b></div><div className="status-row"><span>MISSION CLOCK</span><b>00:00:00</b></div><div className="status-row"><span>REGION</span><b>JEZERO / MARS</b></div></div>
        <div className="side-foot">NASA SPACE APPS CHALLENGE 2026<br/>INDEPENDENT EDUCATIONAL PROTOTYPE</div>
      </div>
    </aside>
    {mobileNav&&<div className="mobile-scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">ARES <span>/</span> {navItems.find(n=>n.id===tab)?.label.toUpperCase()}</div><div className="top-right"><span className="orbital-status"><i className="green-dot"/> SYSTEM NOMINAL</span><span className="top-divider"/><span className="mission-id">MISSION ID <b>ARES-JZ-026</b></span></div></header>
      {tab==='overview'&&<section className="content">
        <div className="hero-row"><div><div className="eyebrow"><span className="eyebrow-line"/> AUTONOMOUS RECONNAISSANCE & EXPLORATION SYSTEM</div><h1>Make the next<br/><em>Martian decision.</em></h1><p className="hero-copy">Turn planetary science into mission intelligence. Explore the terrain, weigh the risks, and plan a human expedition across Jezero Crater.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>setTab('explorer')}><MapIcon size={16}/> ENTER MARS EXPLORER <ArrowUpRight size={15}/></button><button className="secondary-btn" onClick={startMission}><Play size={15}/> START SIMULATION</button></div></div>
          <div className="hero-visual"><div className="planet-glow"/><div className="planet"><div className="planet-texture"/></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="planet-label label-a">MARS / 01</div><div className="planet-label label-b">18.44°N<br/>77.45°E</div><div className="radar-cross">+</div></div></div>
        <div className="section-heading"><div><span className="section-kicker">LIVE MISSION CONTEXT</span><h2>Jezero field operations</h2></div><span className="tag-outline">PRIMARY AREA OF INTEREST</span></div>
        <div className="metric-grid"><Metric icon={<Globe2/>} label="TARGET BODY" value="MARS" sub="Terrestrial planet / 4th from Sun"/><Metric icon={<Target/>} label="STUDY REGION" value="JEZERO" sub="~45 km diameter impact crater"/><Metric icon={<Navigation/>} label="ROVER LANDING" value="18.4446°N" sub="77.4509°E · 18 Feb 2021"/><Metric icon={<Database/>} label="DATA FOUNDATION" value="NASA / PDS" sub="Orbital basemaps + mission context"/></div>
        <div className="overview-grid"><div className="panel map-panel"><div className="panel-head"><div><span className="section-kicker">AREA RECONNAISSANCE</span><h3>Jezero crater / orbital view</h3></div><button className="text-link" onClick={()=>setTab('explorer')}>OPEN EXPLORER <ArrowUpRight size={13}/></button></div>{mapBlock('360px')}</div>
          <div className="panel decision-panel"><div className="panel-head"><div><span className="section-kicker">DATA → DECISION</span><h3>Why Jezero?</h3></div><span className="mini-icon"><Sparkles size={16}/></span></div><div className="story-block"><div className="story-number">01</div><div><b>Ancient water system</b><p>Orbital observations reveal an ancient lake basin and preserved river delta — a compelling setting to investigate past habitability.</p></div></div><div className="story-block"><div className="story-number">02</div><div><b>Geological diversity</b><p>Deltaic sediments and crater-floor materials offer contrasting records of Mars’ early surface environment.</p></div></div><div className="story-block"><div className="story-number">03</div><div><b>Operational trade-offs</b><p>Scientific value must be balanced against traverse distance, terrain uncertainty, power, and crew consumables.</p></div></div><div className="source-note"><BookOpen size={14}/> Context: NASA/JPL Mars 2020 landing-site documentation</div></div></div>
        <div className="bottom-callout"><div className="callout-icon"><Activity/></div><div><b>From observation to exploration strategy</b><p>ARES separates measured mission facts from calculated route estimates and hypothetical crew-simulation values.</p></div><button className="secondary-btn" onClick={()=>setTab('data')}>VIEW DATA METHOD <ArrowUpRight size={14}/></button></div>
      </section>}
      {tab==='explorer'&&<section className="content">
        <PageTitle kicker="MODULE 01 / PLANETARY GIS" title="Mars explorer" subtitle="Navigate the Jezero region, inspect mission landmarks, and switch between NASA orbital and topographic context."/>
        <div className="explorer-layout"><div className="panel map-panel"><div className="map-toolbar"><div className="layer-label"><Layers3 size={15}/> MAP LAYERS</div><div className="layer-buttons"><button className={layer==='surface'?'selected':''} onClick={()=>setLayer('surface')}>SURFACE MOSAIC</button><button className={layer==='mola'?'selected':''} onClick={()=>setLayer('mola')}>MOLA SHADE</button><button className={showPOI?'selected':''} onClick={()=>setShowPOI(!showPOI)}>LANDMARKS</button><button className={showRoute?'selected':''} onClick={()=>setShowRoute(!showRoute)}>ROUTE</button></div></div>{mapBlock('min(67vh,650px)')}<div className="map-footnote"><span>MAP SERVICE: NASA MARS TREK WMTS</span><span>CLICK MAP TO DROP A COORDINATE</span><span>ZOOM / PAN ENABLED</span></div></div>
          <div className="panel intel-panel"><div className="panel-head"><div><span className="section-kicker">TARGET INTELLIGENCE</span><h3>Selected location</h3></div><span className="live-pill">INSPECT</span></div><div className="selected-name">{selected.name}</div><div className="selected-kind">{selected.kind}</div><div className="coord-pair"><div><small>LATITUDE</small><b>{selected.lat.toFixed(4)}° N</b></div><div><small>LONGITUDE</small><b>{selected.lon.toFixed(4)}° E</b></div></div><p className="selected-desc">{selected.description}</p><div className="intel-divider"/><div className="data-field"><span>ELEVATION</span><b className="muted-value">NOT SAMPLED</b></div><div className="data-field"><span>SLOPE / INCLINATION</span><b className="muted-value">NOT SAMPLED</b></div><div className="data-field"><span>TERRAIN CLASS</span><b>{selected.id==='landing'?'CRATER / DELTA SETTING':'UNCLASSIFIED'}</b></div><div className="data-field"><span>PROVENANCE</span><b>{selected.provenance}</b></div><div className="science-note"><AlertTriangle size={15}/><span>Local MOLA raster sampling and HiRISE pixel analysis are not yet wired into this prototype. No point elevation or slope is invented.</span></div><button className="primary-btn full" onClick={()=>{const nextStart=selected.id==='custom'?'landing':selected.id;setStart(nextStart);if(end===nextStart)setEnd(points.find(p=>p.id!==nextStart)?.id||'delta');setTab('routes')}}><RouteIcon size={15}/> PLAN FROM THIS LOCATION</button></div></div>
        <div className="poi-strip"><span className="section-kicker">FIELD REFERENCE POINTS</span>{points.map(p=><button key={p.id} className={`poi-chip ${selected.id===p.id?'active':''}`} onClick={()=>setSelected(p)}><i className={p.id==='landing'?'dot red':'dot gold'}/>{p.name}</button>)}</div>
      </section>}
      {tab==='routes'&&<section className="content">
        <PageTitle kicker="MODULE 03 / TRAVERSE DESIGN" title="Mission route planner" subtitle="Compare notional traverse options. Distances are great-circle estimates on a spherical Mars model — not rover-grade pathfinding."/>
        <div className="route-layout"><div className="panel route-controls"><div className="panel-head"><div><span className="section-kicker">ROUTE CONFIGURATION</span><h3>Define your traverse</h3></div><Compass size={18}/></div><label>STARTING POINT</label><select value={start} onChange={e=>setStart(e.target.value)}>{points.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><label>DESTINATION</label><select value={end} onChange={e=>setEnd(e.target.value)}>{points.filter(p=>p.id!==start).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><label>ROUTE PRIORITY</label><div className="segmented"><button className={routeMode==='balanced'?'on':''} onClick={()=>setRouteMode('balanced')}>LOWER DISTANCE</button><button className={routeMode==='science'?'on':''} onClick={()=>setRouteMode('science')}>SCIENCE REACH</button></div><div className="route-note"><CircleHelp size={15}/><span>Option A uses a shorter waypoint chain. Option B adds a wider science detour. Both are illustrative polylines and ignore local obstacles, slope rasters, and rover mobility constraints.</span></div><button className="primary-btn full" onClick={()=>setTab('hazards')}><ShieldAlert size={15}/> ASSESS ROUTE EXPOSURE</button></div>
          <div className="panel map-panel"><div className="panel-head"><div><span className="section-kicker">TRAVERSE PREVIEW</span><h3>{routeMode==='balanced'?'Option A / compact traverse':'Option B / science detour'}</h3></div><span className="tag-outline">NOT NAVIGATION-GRADE</span></div>{mapBlock('440px')}<div className="map-footnote"><span>START: {from.name.toUpperCase()}</span><span>END: {to.name.toUpperCase()}</span></div></div></div>
        <div className="compare-grid"><RouteCard title="OPTION A" label="Compact traverse" distance={distanceA} active={routeMode==='balanced'} onClick={()=>setRouteMode('balanced')} stops={2} risk="Lower assumed exposure" /><RouteCard title="OPTION B" label="Science detour" distance={distanceB} active={routeMode==='science'} onClick={()=>setRouteMode('science')} stops={3} risk="More terrain uncertainty" /></div>
        <div className="panel estimate-panel"><div className="estimate-cell"><small>SELECTED DISTANCE</small><strong>{fmt(chosenDistance)} <i>km</i></strong></div><div className="estimate-cell"><small>TRAVERSE TIME*</small><strong>{fmt(totalHours)} <i>hours</i></strong></div><div className="estimate-cell"><small>WAYPOINTS</small><strong>{chosenRoute.length} <i>nodes</i></strong></div><div className="estimate-cell"><small>MODEL STATUS</small><strong className="gold-text">ESTIMATED</strong></div><p>*Time estimate assumes 0.08 km/h average progress including pauses; a scenario parameter, not an engineering mobility prediction. Route scores are intentionally not called safe.</p></div>
      </section>}
      {tab==='hazards'&&<section className="content">
        <PageTitle kicker="MODULE 04 / ENVIRONMENTAL RISK" title="Hazard intelligence" subtitle="Separate known context from unresolved terrain and scenario-based exposure. Relative scores are transparent educational heuristics, not safety certification."/>
        <div className="hazard-layout"><div className="panel hazard-map">{mapBlock('430px')}<div className="map-footnote"><span>SELECT A POINT TO UPDATE RELATIVE EXPOSURE</span><span>ILLUSTRATIVE ASSESSMENT</span></div></div><div className="panel hazard-summary"><div className="panel-head"><div><span className="section-kicker">LOCATION ASSESSMENT</span><h3>{selected.name}</h3></div><ShieldAlert size={18}/></div><div className="risk-meter"><div className="risk-number">{hazardScore}<small>/100</small></div><div><b>{riskLabel}</b><p>ARES relative exposure index · heuristic only</p></div></div><div className="risk-track"><div style={{width:`${hazardScore}%`}}/></div><div className="hazard-list"><HazardRow icon={<Mountain/>} title="Steep terrain" status="UNRESOLVED" detail="Requires local slope raster / HiRISE DEM sampling."/><HazardRow icon={<Footprints/>} title="Rock abundance" status="UNRESOLVED" detail="No quantitative rock-density layer is connected."/><HazardRow icon={<Wind/>} title="Dust / visibility" status="SCENARIO" detail="Dust opacity and local visibility are not inferred from this map."/><HazardRow icon={<BatteryCharging/>} title="Solar availability" status="SCENARIO" detail="Power penalty can be explored in Commander Mode; not a forecast."/><HazardRow icon={<AlertTriangle/>} title="Surface obstacles" status="UNRESOLVED" detail="No obstacle detection or high-resolution image classifier is active." /></div></div></div>
        <div className="method-banner"><b>How the score works</b><p>The 0–100 index is a deliberately simple location-relative heuristic using distance from the landing-site anchor and a small hand-authored penalty for the notional crater-margin waypoint. It does not use measured slope, rock abundance, weather, or solar irradiance. It is useful for demonstrating data provenance — not for mission certification.</p></div>
      </section>}
      {tab==='commander'&&<section className="content">
        <PageTitle kicker="MODULE 05 / HUMAN EXPLORATION SIMULATION" title="Mission commander" subtitle="A fictional crewed expedition. Make trade-offs between science return, time, and consumables — all values are educational simulation parameters."/>
        <div className="commander-top"><div className="panel mission-brief"><div className="brief-top"><span className="live-pill">SIMULATION / NOT OPERATIONAL</span><span className="mission-code">ARES-SIM-07</span></div><div className="section-kicker">MISSION OBJECTIVE</div><h3>{objective}</h3><p>Conduct a short reconnaissance traverse from the Jezero landing region, investigate a selected geological setting, and return with enough resources to complete the scenario.</p><div className="brief-controls"><label>SCIENCE PRIORITY</label><select value={objective} onChange={e=>setObjective(e.target.value)}><option>Investigate delta sediments</option><option>Compare crater-floor materials</option><option>Survey a hypothetical rim viewpoint</option></select></div><div className="brief-meta"><span><Timer size={14}/> 48 HOUR SCENARIO WINDOW</span><span><Target size={14}/> {to.name.toUpperCase()}</span></div></div>
          <div className="resource-panel"><div className="panel-head"><div><span className="section-kicker">CREW SYSTEMS</span><h3>Resource telemetry</h3></div><span className="sim-tag">SIMULATED</span></div><Resource label="POWER" value={power} icon={<BatteryCharging/>} unit="%" /><Resource label="WATER" value={water} icon={<Droplets/>} unit="%" /><Resource label="OXYGEN" value={oxygen} icon={<Activity/>} unit="%" /><div className="time-remaining"><div><small>MISSION TIME REMAINING</small><b>{Math.max(0,hours)} <i>hours</i></b></div><div><small>MISSION SOL</small><b>{sol}</b></div></div></div></div>
        <div className="commander-grid"><div className="panel action-panel"><div className="panel-head"><div><span className="section-kicker">COMMAND DECISIONS</span><h3>Choose your next action</h3></div><Flag size={18}/></div><div className="action-card"><div className="action-icon orange"><Target/></div><div className="action-copy"><b>Conduct science stop</b><p>Spend 6 hours investigating the destination. High science value, moderate resource use.</p><small>−18 POWER · −8 WATER · −12 OXYGEN · −6 H</small></div><button className="action-btn" disabled={hours<6||power<18||water<8||oxygen<12} onClick={()=>consume('science')}>EXECUTE <ArrowUpRight size={13}/></button></div><div className="action-card"><div className="action-icon blue"><BatteryCharging/></div><div className="action-copy"><b>Conserve / systems check</b><p>Pause mobility and perform a systems check. Lower consumption, but science time is lost.</p><small>−5 POWER · −4 WATER · −6 OXYGEN · −4 H</small></div><button className="action-btn" disabled={hours<4||power<5||water<4||oxygen<6} onClick={()=>consume('rest')}>EXECUTE <ArrowUpRight size={13}/></button></div><div className="action-card"><div className="action-icon green"><Navigation/></div><div className="action-copy"><b>Return to habitat</b><p>End the traverse and secure the crew. Debrief is generated from decisions so far.</p><small>−10 POWER · −5 WATER · −8 OXYGEN · −8 H</small></div><button className="action-btn" disabled={!missionStarted||debrief} onClick={()=>consume('return')}>RETURN <ArrowUpRight size={13}/></button></div><div className="action-footer"><button className="secondary-btn" onClick={resetMission}><RotateCcw size={14}/> RESET SCENARIO</button><button className="primary-btn" onClick={()=>setDebrief(true)} disabled={!missionStarted}>GENERATE DEBRIEF <ArrowUpRight size={14}/></button></div></div>
          <div className="panel log-panel"><div className="panel-head"><div><span className="section-kicker">MISSION EVENT STREAM</span><h3>Commander log</h3></div><span className="event-count">{eventLog.length.toString().padStart(2,'0')} EVENTS</span></div>{eventLog.length===0?<div className="empty-log"><Radio size={24}/><b>Awaiting first command</b><p>Execute an action to populate the event stream.</p></div>:<div className="event-list">{eventLog.map((e,i)=><div className="event" key={i}><span className="event-dot"/><p>{e}</p></div>)}</div>}<div className="objective-progress"><div><small>SCIENCE TARGETS VISITED</small><b>{visited.length} / 1</b></div><div className="progress-track"><span style={{width:visited.length?'100%':'0%'}}/></div><small>{visited.length?'Destination investigation recorded':'No science stop recorded yet'}</small></div></div></div>
        {debrief&&<div className="panel debrief"><div className="debrief-head"><div><span className="section-kicker">POST-MISSION ANALYSIS</span><h3>Mission debrief</h3></div><span className="tag-outline">SCENARIO REPORT</span></div><div className="outcome"><Trophy size={20}/><b>{outcome}</b></div><div className="debrief-grid"><div><small>ROUTE SELECTED</small><b>{routeMode==='balanced'?'Option A · Compact':'Option B · Science detour'}</b></div><div><small>SCIENCE DESTINATIONS</small><b>{visited.length?visited.map(id=>getPoint(id).name).join(', '):'None'}</b></div><div><small>RESOURCES REMAINING</small><b>Power {power}% · Water {water}% · O₂ {oxygen}%</b></div><div><small>TIME REMAINING</small><b>{Math.max(0,hours)} hours</b></div></div><p className="debrief-explain">{visited.length?'The crew completed at least one science stop. Remaining resource margins and time determine whether the outcome is full or limited success.':'No science destination was investigated. The crew preserved resources but did not meet the primary science objective.'} This result is generated from the transparent scenario rules shown above; it is not an astronaut life-support model.</p><button className="secondary-btn" onClick={resetMission}><RotateCcw size={14}/> RUN NEW SCENARIO</button></div>}
      </section>}
      {tab==='data'&&<section className="content">
        <PageTitle kicker="SCIENTIFIC TRANSPARENCY / TRACEABILITY" title="Data & methodology" subtitle="Know what is observed, what is calculated, and what is only a scenario. ARES keeps the evidence chain visible."/>
        <div className="transparency-grid"><div className="panel transparency-card"><div className="trans-icon actual"><Database/></div><div><span className="source-type actual-text">OBSERVED / SOURCE DATA</span><h3>NASA Mars Trek orbital basemaps</h3><p>Global Viking color mosaic and MOLA color-shaded relief are requested from NASA’s Mars Trek WMTS service. Tile availability and service access depend on network connectivity.</p><a href="https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars" target="_blank" rel="noreferrer">Official layer catalogue <ArrowUpRight size={13}/></a></div></div>
          <div className="panel transparency-card"><div className="trans-icon actual"><Mountain/></div><div><span className="source-type actual-text">OBSERVED / ARCHIVED DATA</span><h3>MOLA MEGDR topography</h3><p>Global topographic grids derived from Mars Global Surveyor laser altimetry. This prototype does not sample a local raster cell, so point elevation and slope remain unavailable.</p><a href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noreferrer">PDS Geosciences Node archive <ArrowUpRight size={13}/></a></div></div>
          <div className="panel transparency-card"><div className="trans-icon derived"><Crosshair/></div><div><span className="source-type derived-text">DERIVED ESTIMATE</span><h3>Traverse distance</h3><p>Great-circle distance using a spherical Mars radius of 3,389.5 km. Route polylines are simplified waypoint chains; no obstacle, slope, or wheel-slip model is applied.</p><span className="formula">d = 2R · asin(√haversine)</span></div></div>
          <div className="panel transparency-card"><div className="trans-icon simulated"><Activity/></div><div><span className="source-type simulated-text">SIMULATED PARAMETERS</span><h3>Mission resources & hazards</h3><p>Power, water, oxygen, duration, and hazard index are invented for the educational scenario. They are not NASA astronaut limits, engineering requirements, or environmental forecasts.</p><span className="formula">Scenario ledger · fixed action costs</span></div></div></div>
        <div className="panel dataset-table"><div className="panel-head"><div><span className="section-kicker">DATA REGISTER</span><h3>Traceable sources</h3></div><span className="tag-outline">OPEN / PUBLIC</span></div><div className="table-wrap"><table><thead><tr><th>DATASET / SOURCE</th><th>PROVIDER</th><th>USE IN ARES</th><th>STATUS</th></tr></thead><tbody><tr><td>Mars Viking MDIM21 Color Mosaic</td><td>NASA Mars Trek</td><td>Global surface basemap</td><td><span className="status-chip actual-text">LIVE TILE REQUEST</span></td></tr><tr><td>MGS MOLA Color-Shaded Relief</td><td>NASA Mars Trek / MGS</td><td>Topographic context layer</td><td><span className="status-chip actual-text">LIVE TILE REQUEST</span></td></tr><tr><td>MOLA MEGDR</td><td>NASA PDS Geosciences Node</td><td>Elevation methodology / archive reference</td><td><span className="status-chip derived-text">NOT SAMPLED</span></td></tr><tr><td>Perseverance landing site</td><td>NASA/JPL-Caltech</td><td>Verified landing-site coordinate / context</td><td><span className="status-chip actual-text">REFERENCE FACT</span></td></tr><tr><td>ARES waypoint anchors</td><td>ARES prototype</td><td>Route comparison only</td><td><span className="status-chip simulated-text">ILLUSTRATIVE</span></td></tr></tbody></table></div></div>
        <div className="citation-panel"><div><b>Key scientific references</b><p>Perseverance landed in Jezero Crater at 18.4446°N, 77.4509°E on 18 February 2021. Jezero is approximately 45 km across and preserves evidence of an ancient lake and delta system.</p></div><div className="citation-links"><a href="https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/" target="_blank" rel="noreferrer">NASA/JPL landing-site overview <ArrowUpRight size={13}/></a><a href="https://science.nasa.gov/resource/perseverances-landing-spot-in-jezero-crater/" target="_blank" rel="noreferrer">NASA Perseverance landing image <ArrowUpRight size={13}/></a></div></div>
      </section>}
      <footer className="app-footer"><span>ARES // AUTONOMOUS RECONNAISSANCE & EXPLORATION SYSTEM</span><span>EDUCATIONAL PROTOTYPE · NOT FOR FLIGHT / CREW OPERATIONS</span></footer>
    </main>
  </div>
}

function Metric({icon,label,value,sub}:{icon:React.ReactNode,label:string,value:string,sub:string}) {return <div className="metric-card"><div className="metric-top"><Icon>{icon}</Icon><span>{label}</span></div><strong>{value}</strong><small>{sub}</small></div>}
function PageTitle({kicker,title,subtitle}:{kicker:string,title:string,subtitle:string}) {return <div className="page-title"><div className="eyebrow"><span className="eyebrow-line"/>{kicker}</div><h1>{title}</h1><p>{subtitle}</p></div>}
function RouteCard({title,label,distance,active,onClick,stops,risk}:{title:string,label:string,distance:number,active:boolean,onClick:()=>void,stops:number,risk:string}) {return <button className={`route-card ${active?'chosen':''}`} onClick={onClick}><div className="route-card-top"><span>{title}</span>{active&&<span className="chosen-label"><CheckCircle2 size={13}/> SELECTED</span>}</div><b>{label}</b><div className="route-card-stats"><span><Navigation size={13}/>{distance.toFixed(2)} km</span><span><Flag size={13}/>{stops} waypoints</span></div><small>{risk}</small></button>}
function HazardRow({icon,title,status,detail}:{icon:React.ReactNode,title:string,status:string,detail:string}) {return <div className="hazard-row"><span className="hazard-icon">{icon}</span><div><b>{title}</b><p>{detail}</p></div><span className={`hazard-status ${status==='SCENARIO'?'scenario':''}`}>{status}</span></div>}
function Resource({label,value,icon,unit}:{label:string,value:number,icon:React.ReactNode,unit:string}) {return <div className="resource-row"><div className="resource-label">{icon}<span>{label}</span><b>{value}{unit}</b></div><div className="resource-track"><span className={value<25?'critical':''} style={{width:`${value}%`}}/></div></div>}
export default App
