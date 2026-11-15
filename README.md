# ARES — Autonomous Reconnaissance & Exploration System

An educational Mars exploration decision-support prototype for the NASA Space Apps Challenge 2026, focused on Jezero Crater.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Create a production build:

```bash
npm run build
npm run preview
```

No account, API key, or backend is required for the demonstration. Internet access is needed for NASA Mars Trek map tiles and Google Fonts. If map tiles are unavailable, the interface remains usable, but the map background may be blank.

## What's implemented

- React + TypeScript + Vite application with responsive mission-control interface.
- Interactive Mars map using Leaflet, NASA Mars Trek WMTS layers, clickable coordinates, landmark markers, and route overlays.
- NASA Viking global color mosaic and MOLA color-shaded relief layer switch.
- Jezero landing-site reference at 18.4446°N, 77.4509°E.
- Route planner with great-circle distance calculations and two notional waypoint-chain options.
- Hazard intelligence panel with explicit heuristic and data-gap disclosure.
- Mission Commander simulation with action-based power, water, oxygen, time, event log, and debrief.
- Data & methodology register with official NASA/PDS links.

## Scientific integrity / limitations

**Observed / source-backed**
- NASA Mars Trek WMTS imagery layers are requested directly from NASA's service.
- The Perseverance landing-site coordinate and Jezero context are taken from NASA/JPL mission material.
- MOLA MEGDR is an archived global topography dataset from the PDS Geosciences Node.

**Not yet implemented**
- The app does not download or sample a local MOLA raster at clicked coordinates. Elevation and slope are therefore shown as unavailable.
- The prototype does not fetch raw Perseverance instrument products or rover telemetry.
- The waypoint anchors other than the landing site are illustrative ARES planning points, not certified science targets or actual rover stops.
- Route lines are simplified waypoint chains, not obstacle-aware navigation.
- The hazard index is an educational heuristic and does not ingest measured slope, rock abundance, dust opacity, or solar irradiance.
- Commander resource quantities and action costs are fictional scenario parameters, not astronaut operating limits or a life-support model.

The NASA WMTS tile URL follows the Mars Trek published WMTS REST pattern. Tile availability, layer naming, and CORS/network behavior are controlled by the upstream service. If a layer does not load, consult the official Mars Trek API catalogue and update the tile URL in `src/App.tsx`.

## Dataset and source register

| Dataset / reference | Provider | Purpose | Official source |
|---|---|---|---|
| Viking MDIM21 global color mosaic | NASA Mars Trek | Surface basemap | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars |
| MGS MOLA global color-shaded relief | NASA Mars Trek / MGS | Topographic context | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars |
| MOLA MEGDR topographic maps | NASA PDS Geosciences Node | Topography source/methodology | https://pds-geosciences.wustl.edu/missions/mgs/megdr.html |
| Perseverance landing site | NASA/JPL-Caltech | Landing coordinate and site context | https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission/landing_site/ |
| Perseverance landing image | NASA Science | Visual/science context | https://science.nasa.gov/resource/perseverances-landing-spot-in-jezero-crater/ |

Units:
- Latitude/longitude: degrees.
- Route distance: kilometres, calculated on a spherical Mars radius of 3,389.5 km.
- Traverse time: hours, using an illustrative 0.08 km/h average progress assumption.
- Mission resources: normalized percentages, simulated only.
- Hazard index: dimensionless 0–100 heuristic, simulated/derived only.

## Three-minute judge demo

1. **Overview (20 sec):** Introduce ARES as a bridge from planetary observations to exploration decisions.
2. **Mars Explorer (35 sec):** Open Jezero, toggle the NASA surface mosaic and MOLA shaded-relief layer, click the Perseverance landing marker, and explain that elevation/slope are not claimed until a raster sample is connected.
3. **Route Planner (35 sec):** Choose the landing site and Western Delta Approach. Compare the compact route with the science detour; explain the great-circle calculation and assumptions.
4. **Hazard Intelligence (25 sec):** Show the relative score and explicitly call out unresolved slope/rock/dust data.
5. **Commander Mode (45 sec):** Run a science stop, then a systems check, watch the resource ledger and event stream change, and generate the debrief.
6. **Data & Method (20 sec):** Show the NASA/PDS source register and observed/derived/simulated labels.

## Competition description

**ARES — Autonomous Reconnaissance & Exploration System** transforms open planetary science context into an accessible Mars mission-planning experience. Focused on Jezero Crater, ARES combines NASA Mars Trek orbital basemaps, MOLA topographic context, Perseverance landing-site references, interactive route comparison, transparent hazard reasoning, and a fictional crew-resource simulator. The prototype makes the evidence chain visible: source observations are separated from derived estimates and educational scenario values. Its goal is to help audiences understand how scientific data can inform — but never replace — engineering validation and human mission judgment.

## Deployment

This is a standard Vite static frontend and can be deployed to Netlify, Vercel, or GitHub Pages. Build with `npm run build` and publish the `dist/` directory. No deployment credentials are included in this project, so a public URL has not been created.
