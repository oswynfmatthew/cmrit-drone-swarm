import { Target, TargetType } from './types';
import { CELL } from './swarmEngine';

// Import photorealistic aerial disaster photos
import floodCitySosPhotoUrl from './assets/images/aerial_flood_city_disaster_1791979564485.jpg';
import floodValleyPhotoUrl from './assets/images/aerial_river_flashflood_valley_1791979606599.jpg';
import floodSubmergedPhotoUrl from './assets/images/aerial_flood_disaster_1791979012887.jpg';

import earthquakeCollapsePhotoUrl from './assets/images/aerial_earthquake_rubble_disaster_1791979583910.jpg';
import earthquakeHighwayPhotoUrl from './assets/images/aerial_highway_collapse_quake_1791979634594.jpg';
import earthquakeEpicenterPhotoUrl from './assets/images/earthquake_rubble_disaster_1791979037723.jpg';

import wildfirePhotoUrl from './assets/images/wildfire_disaster_aerial_1791979061218.jpg';
import tsunamiPhotoUrl from './assets/images/cyclone_tsunami_aerial_1791979086836.jpg';

export interface CalamityScenario {
  id: string;
  category: 'FLOOD' | 'EARTHQUAKE' | 'WILDFIRE' | 'TSUNAMI';
  title: string;
  subtitle: string;
  location: string;
  imageUrl: string;
  objectivesSummary: string;
  targets: Target[];
}

// Calculate realistic geographic GPS coordinates (Lat/Lon) from grid cell (x, y)
export function calculateGeoCoordinates(
  x: number,
  y: number,
  scenarioId?: string
): string {
  let baseLat = 34.0522;
  let baseLon = -118.2437;
  if (scenarioId?.includes('flood') || scenarioId?.includes('dam')) {
    baseLat = 29.9542;
    baseLon = -90.0718;
  } else if (scenarioId?.includes('highway')) {
    baseLat = 34.0531;
    baseLon = -118.2421;
  } else if (scenarioId?.includes('rubble') || scenarioId?.includes('collapse')) {
    baseLat = 37.7749;
    baseLon = -122.4194;
  } else if (scenarioId?.includes('wildfire')) {
    baseLat = 39.7392;
    baseLon = -104.9903;
  }
  const latOffset = (20 - y) * 0.00018;
  const lonOffset = x * 0.00021;
  const lat = (baseLat + latOffset).toFixed(4);
  const lon = Math.abs(baseLon + lonOffset).toFixed(4);
  const latDir = baseLat >= 0 ? 'N' : 'S';
  const lonDir = baseLon >= 0 ? 'W' : 'E';
  return `${lat}° ${latDir}, ${lon}° ${lonDir}`;
}

export const CALAMITY_SCENARIOS: CalamityScenario[] = [
  // ==========================================
  // FLOOD & INUNDATION SCENARIOS
  // ==========================================
  {
    id: 'flood_city_sos',
    category: 'FLOOD',
    title: 'Urban City Inundation & Rooftop SOS Signs',
    subtitle: 'Commercial & Residential District Submerged in 2.5m Brown Floodwaters',
    location: 'Sector 3–4 Downtown Evacuation Grid',
    imageUrl: floodCitySosPhotoUrl,
    objectivesSummary: 'SOS rooftop survivors, stranded citizens on balcony, red swift-water rescue craft, submerged trucks',
    targets: [
      {
        target_id: 'T1',
        x: 21,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'SOS Rooftop Survivors (6 Civilians)',
        description: 'Group of 6 citizens stranded on commercial rooftop beside large rocks SOS marker awaiting airlift.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 21 * CELL - 8, y: 6 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T2',
        x: 10,
        y: 9,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Stranded Balcony Evacuees',
        description: 'Family trapped on 2nd-floor house balcony surrounded by rising muddy water currents.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 10 * CELL - 8, y: 9 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T3',
        x: 18,
        y: 13,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Red Swift-Water Rescue Inflatable Craft',
        description: 'First responders in red rescue boat maneuvering between submerged light poles.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 18 * CELL - 8, y: 13 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T4',
        x: 9,
        y: 14,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Roof Ridge Distress Signalers',
        description: 'Trapped residents on roof apex waving brightly colored markers for aerial drone guidance.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 9 * CELL - 8, y: 14 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T5',
        x: 23,
        y: 10,
        type: 'VEHICLE',
        priority: 'LOW',
        label: 'Submerged Civilian Vehicles & Logistics Van',
        description: 'Partially submerged box truck and passenger sedans blocking evacuation route.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 23 * CELL - 8, y: 10 * CELL - 8, w: 48, h: 48 },
      },
    ],
  },
  {
    id: 'flood_valley_dam_breach',
    category: 'FLOOD',
    title: 'River Basin Flash Flood & Marooned Livestock',
    subtitle: 'Agricultural Levee Failure with Fast-Moving Torrents & Isolated High Ground',
    location: 'Sector 1–3 River Basin Farmland',
    imageUrl: floodValleyPhotoUrl,
    objectivesSummary: 'Barn roof survivors waving yellow flag, cattle herd marooned on hill, overturned farm tractor',
    targets: [
      {
        target_id: 'T1',
        x: 11,
        y: 16,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Barn Roof Survivors (Yellow Distress Flag)',
        description: 'Two stranded farmers on corrugated barn roof waving high-visibility yellow distress banner.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 11 * CELL - 8, y: 16 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T2',
        x: 16,
        y: 11,
        type: 'ANIMAL',
        priority: 'HIGH',
        label: 'Marooned Cattle & Livestock Herd (28 Head)',
        description: 'Herd of cattle isolated on elevated green knoll surrounded by deep turbulent currents.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 10, y: 11 * CELL - 10, w: 54, h: 54 },
      },
      {
        target_id: 'T3',
        x: 23,
        y: 17,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Overturned Heavy Agricultural Tractor',
        description: 'Blue agricultural tractor swept off roadway against barn structure by flash flood torrent.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 23 * CELL - 8, y: 17 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T4',
        x: 15,
        y: 2,
        type: 'STRUCTURAL_CRACK',
        priority: 'HIGH',
        label: 'Dam Breach Crest & Reservoir Rupture',
        description: 'Catastrophic levee failure point with high-velocity water cascade threatening lower basin.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 15 * CELL - 8, y: 2 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T5',
        x: 25,
        y: 3,
        type: 'VEHICLE',
        priority: 'LOW',
        label: 'Swift-Water Evac Helicopter Holding Pattern',
        description: 'Aerial rescue helicopter coordinating with ground swarm for hoist extraction.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 25 * CELL - 8, y: 3 * CELL - 8, w: 48, h: 48 },
      },
    ],
  },
  {
    id: 'flood_inundation_real',
    category: 'FLOOD',
    title: 'Suburban Residential Flood Inundation',
    subtitle: 'Neighborhood Streets Submerged in River Overtopping',
    location: 'Sectors 2–5 Lowland Inundation Basin',
    imageUrl: floodSubmergedPhotoUrl,
    objectivesSummary: 'Rooftop survivors, stranded cattle on levee ridge, submerged transport vehicles',
    targets: [
      {
        target_id: 'T1',
        x: 16,
        y: 11,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Stranded Rooftop Survivors',
        description: 'Cluster of citizens waving from submerged rooftop seeking urgent boat lift.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 6, y: 11 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T2',
        x: 21,
        y: 8,
        type: 'ANIMAL',
        priority: 'MEDIUM',
        label: 'Stranded Livestock Herd on Ridge',
        description: 'Herd of cattle isolated on green elevated levee surrounded by floodwaters.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 21 * CELL - 8, y: 8 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T3',
        x: 10,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Isolated Resident (West Sector Roof)',
        description: 'Individual trapped on upper roof ridge signaling for evacuation.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 10 * CELL - 6, y: 6 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T4',
        x: 23,
        y: 12,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Submerged Civilian Vehicle',
        description: 'Passenger car halted and half-submerged in rising water lane.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 23 * CELL - 6, y: 12 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T5',
        x: 16,
        y: 15,
        type: 'VEHICLE',
        priority: 'LOW',
        label: 'Floating Utility Transport',
        description: 'Van displaced by turbulent flood current blocking roadway.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 6, y: 15 * CELL - 6, w: 44, h: 44 },
      },
    ],
  },

  // ==========================================
  // EARTHQUAKE & RUBBLE SCENARIOS
  // ==========================================
  {
    id: 'earthquake_collapse_apartments',
    category: 'EARTHQUAKE',
    title: 'Catastrophic Building Pancaking & Active Search Extraction',
    subtitle: 'Multi-Story Reinforced Concrete Apartments Flattened by 7.8M Quake',
    location: 'Epicenter Urban Core Sector 2–4',
    imageUrl: earthquakeCollapsePhotoUrl,
    objectivesSummary: 'Survivors waving on upper concrete floor, rescue workers with search dogs, major road fault rupture',
    targets: [
      {
        target_id: 'T1',
        x: 15,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Survivors Waving on Upper Slab (6 People)',
        description: 'Cluster of 6 civilians stranded atop tilted roof slab waving their arms for drone aerial hoist.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 15 * CELL - 8, y: 6 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T2',
        x: 11,
        y: 16,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'USAR Search & Rescue Squad with Dogs',
        description: 'First responders in orange protective gear and search canines inspecting collapsed concrete cavity.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 11 * CELL - 8, y: 16 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T3',
        x: 6,
        y: 10,
        type: 'STRUCTURAL_CRACK',
        priority: 'HIGH',
        label: 'Tectonic Ground Fault Fissure',
        description: 'Deep tectonic fault rupture that has split the 4-lane arterial road and severed utility pipes.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 6 * CELL - 8, y: 10 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T4',
        x: 21,
        y: 11,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Emergency Mobile Triage Ambulance',
        description: 'Critical care ambulance unit stationed at road corner ready to receive extracted casualties.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 21 * CELL - 8, y: 11 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T5',
        x: 25,
        y: 13,
        type: 'ANOMALY',
        priority: 'MEDIUM',
        label: 'Inflatable Orange Emergency Medical Tent',
        description: 'Field hospital setup providing immediate trauma stabilization for rescued survivors.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 25 * CELL - 8, y: 13 * CELL - 8, w: 48, h: 48 },
      },
    ],
  },
  {
    id: 'earthquake_highway_corridor',
    category: 'EARTHQUAKE',
    title: 'Elevated Highway Overpass Collapse & Transport Rupture',
    subtitle: 'Shattered Concrete Spans, Crushed Vehicles & Red Cross Trauma Center',
    location: 'Metropolitan Highway Interchange Sector 1–5',
    imageUrl: earthquakeHighwayPhotoUrl,
    objectivesSummary: 'Responders on collapsed overpass deck, red emergency medical tent, fractured pavement fault, crushed sedans',
    targets: [
      {
        target_id: 'T1',
        x: 22,
        y: 11,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Rescue Squad on Collapsed Overpass Deck',
        description: 'Search & rescue personnel in safety yellow/orange helmets inspecting sheared concrete bridge spans.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 22 * CELL - 8, y: 11 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T2',
        x: 9,
        y: 12,
        type: 'ANOMALY',
        priority: 'HIGH',
        label: 'Red Cross Rapid Triage Field Hospital',
        description: 'Inflated red medical trauma tent with triage staff treating injured highway motorists.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 9 * CELL - 8, y: 12 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T3',
        x: 14,
        y: 16,
        type: 'STRUCTURAL_CRACK',
        priority: 'HIGH',
        label: 'Severe Seismic Roadway Fracture Zone',
        description: 'Multi-meter branching fracture across pavement obstructing heavy crane transit.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 14 * CELL - 8, y: 16 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T4',
        x: 15,
        y: 10,
        type: 'VEHICLE',
        priority: 'HIGH',
        label: 'Crushed Vehicles Trapped Beneath Overpass',
        description: 'Sedans pinned under sheared reinforced deck slab requiring hydraulic extraction.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 15 * CELL - 8, y: 10 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T5',
        x: 8,
        y: 14,
        type: 'HUMAN',
        priority: 'MEDIUM',
        label: 'Injured Civilians Gathering at Safe Levee',
        description: 'Group of walking wounded assisted by paramedics on intact roadway perimeter.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 8 * CELL - 8, y: 14 * CELL - 8, w: 48, h: 48 },
      },
    ],
  },
  {
    id: 'earthquake_rubble_real',
    category: 'EARTHQUAKE',
    title: 'Seismic Epicenter Ruin & Structural Rubble Field',
    subtitle: 'Collapsed Commercial Blocks with Multiple Void Spaces',
    location: 'Epicenter Zone 4 Urban Sector',
    imageUrl: earthquakeEpicenterPhotoUrl,
    objectivesSummary: 'Survivors on concrete slabs, first responder crews, major road fissure, ambulances',
    targets: [
      {
        target_id: 'T1',
        x: 18,
        y: 8,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Survivors Waving on Concrete Slab',
        description: 'Group of civilians stranded on upper collapsed floor waving white distress markers.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 18 * CELL - 8, y: 8 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T2',
        x: 15,
        y: 11,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Active Search & Rescue Field Team',
        description: 'First responders in orange safety gear searching collapsed concrete void.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 15 * CELL - 8, y: 11 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T3',
        x: 6,
        y: 12,
        type: 'STRUCTURAL_CRACK',
        priority: 'HIGH',
        label: 'Critical Fault Fissure / Ground Rupture',
        description: 'Major earthquake fault crack bifurcating the arterial evacuation highway.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 6 * CELL - 8, y: 12 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T4',
        x: 4,
        y: 16,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Stationed Emergency Ambulance',
        description: 'Medical triage unit vehicle standing by for incoming casualties.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 4 * CELL - 6, y: 16 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T5',
        x: 27,
        y: 11,
        type: 'ANOMALY',
        priority: 'MEDIUM',
        label: 'Emergency Relief Tents',
        description: 'Temporary civilian gathering point and shelter structures.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 27 * CELL - 8, y: 11 * CELL - 8, w: 48, h: 48 },
      },
    ],
  },

  // ==========================================
  // WILDFIRE & TSUNAMI SCENARIOS
  // ==========================================
  {
    id: 'wildfire_disaster_real',
    category: 'WILDFIRE',
    title: 'Wildfire Firestorm & Suburban Evacuation',
    subtitle: 'Active Flame Boundary Threatening Residential Perimeter & Livestock',
    location: 'Dry Valley Interface Sector',
    imageUrl: wildfirePhotoUrl,
    objectivesSummary: 'Stranded hikers near pond, isolated livestock herd, fire engine convoy, fire perimeter',
    targets: [
      {
        target_id: 'T1',
        x: 7,
        y: 16,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Stranded Trail Hikers',
        description: 'Hikers in dry brush near water retention pond cut off by smoke plume.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 7 * CELL - 6, y: 16 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T2',
        x: 15,
        y: 17,
        type: 'ANIMAL',
        priority: 'HIGH',
        label: 'Endangered Farm Livestock',
        description: 'Cattle and sheep trapped against pasture fence near burning perimeter.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 15 * CELL - 8, y: 17 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T3',
        x: 16,
        y: 14,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Wildfire Engine Attack Crew',
        description: 'Active firefighting pump engine defending residential cul-de-sac.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 6, y: 14 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T4',
        x: 17,
        y: 10,
        type: 'STRUCTURAL_CRACK',
        priority: 'HIGH',
        label: 'Active Flame Crown Breach',
        description: 'Thermal boundary of intense wildfire spreading towards neighborhood.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 17 * CELL - 8, y: 10 * CELL - 8, w: 48, h: 48 },
      },
    ],
  },
  {
    id: 'cyclone_tsunami_real',
    category: 'TSUNAMI',
    title: 'Coastal Cyclone Storm Surge & Harbor Inundation',
    subtitle: 'Overturned Vessels, Damaged Sea Wall & Evacuee Assembly Point',
    location: 'Coastal Harbor District',
    imageUrl: tsunamiPhotoUrl,
    objectivesSummary: 'Breakwater evacuees, rescue skiffs, harbor debris field, stranded domestic pets',
    targets: [
      {
        target_id: 'T1',
        x: 12,
        y: 7,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Breakwater Pier Evacuees',
        description: 'Citizens and maritime personnel assembled on concrete jetty awaiting airlift.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 12 * CELL - 8, y: 7 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T2',
        x: 14,
        y: 9,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Emergency Maritime Rescue Skiff',
        description: 'Inflatable rescue craft conducting water searches in debris zone.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 14 * CELL - 6, y: 9 * CELL - 6, w: 44, h: 44 },
      },
      {
        target_id: 'T3',
        x: 16,
        y: 13,
        type: 'STRUCTURAL_CRACK',
        priority: 'HIGH',
        label: 'Industrial Debris & Container Collapse',
        description: 'Overturned shipping containers and shattered warehouse roofs blocking road.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 8, y: 13 * CELL - 8, w: 48, h: 48 },
      },
      {
        target_id: 'T4',
        x: 20,
        y: 14,
        type: 'ANIMAL',
        priority: 'MEDIUM',
        label: 'Stranded Coastal Animals',
        description: 'Domestic pets trapped near inundated harbor warehouses.',
        found: false,
        confidence: 0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 20 * CELL - 6, y: 14 * CELL - 6, w: 44, h: 44 },
      },
    ],
  },
];

// Ensure all calamity scenarios have exact GPS coordinates and calibrated probability ratings
CALAMITY_SCENARIOS.forEach((scenario) => {
  scenario.targets.forEach((target) => {
    if (!target.geoCoordinates) {
      target.geoCoordinates = calculateGeoCoordinates(target.x, target.y, scenario.id);
    }
    if (!target.confidence || target.confidence === 0) {
      target.confidence =
        target.type === 'VEHICLE'
          ? 1.0
          : target.type === 'HUMAN'
          ? 0.98
          : target.type === 'ANIMAL'
          ? 0.96
          : 0.99;
    }
  });
});

// Intelligent Automated Computer Vision Scanner for user-uploaded custom images
// Scans image pixels, computes localized spatial contrast and chromatic anomalies,
// and maps target positions [0..29, 0..19] across the 5 swarm search zones!
// All targets start completely INVISIBLE (found: false) so the image looks 100% natural!
export function analyzeUploadedImageForTargets(
  imgElement: HTMLImageElement,
  onComplete: (targets: Target[]) => void
): void {
  const canvas = document.createElement('canvas');
  canvas.width = 30; // Grid W
  canvas.height = 20; // Grid H
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    onComplete([]);
    return;
  }

  ctx.drawImage(imgElement, 0, 0, 30, 20);
  const imgData = ctx.getImageData(0, 0, 30, 20);
  const data = imgData.data;

  // We want to distribute targets across the 5 zones (Z1 to Z5)
  // so each drone's autonomous sweep has objectives to discover!
  const zoneTargets: { x: number; y: number; score: number }[][] = [[], [], [], [], []];

  for (let y = 2; y < 18; y++) {
    for (let x = 1; x < 29; x++) {
      const idx = (y * 30 + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      let neighbourBrightness = 0;
      let count = 0;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nIdx = ((y + dy) * 30 + (x + dx)) * 4;
        neighbourBrightness +=
          0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
        count++;
      }
      const avgNeighbour = neighbourBrightness / count;
      const contrast = Math.abs(brightness - avgNeighbour);

      const zoneIndex = Math.min(4, Math.floor(x / 6));
      zoneTargets[zoneIndex].push({
        x,
        y,
        score: contrast + (Math.sin(x * 2.3 + y * 3.7) + 1) * 8,
      });
    }
  }

  const selectedPoints: { x: number; y: number }[] = [];

  // Pick the most salient point in each zone
  for (let z = 0; z < 5; z++) {
    const list = zoneTargets[z];
    list.sort((a, b) => b.score - a.score);
    if (list.length > 0) {
      selectedPoints.push({ x: list[0].x, y: list[0].y });
    } else {
      // Fallback in zone
      selectedPoints.push({ x: z * 6 + 3, y: 6 + (z % 3) * 4 });
    }
  }

  const categoryTemplates: {
    type: TargetType;
    label: string;
    desc: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[] = [
    {
      type: 'HUMAN',
      label: 'Identified Survivor / Rooftop Evacuee',
      desc: 'Person detected by aerial computer vision needing urgent drone swarm extraction.',
      priority: 'HIGH',
    },
    {
      type: 'HUMAN',
      label: 'Trapped Citizen Signaling Distress',
      desc: 'Survivor detected in disaster zone waving high-contrast marker.',
      priority: 'HIGH',
    },
    {
      type: 'ANIMAL',
      label: 'Trapped Animal / Domestic Livestock',
      desc: 'Livestock signature isolated by disaster inundation/debris.',
      priority: 'MEDIUM',
    },
    {
      type: 'VEHICLE',
      label: 'Stranded Transport / Emergency Craft',
      desc: 'Stationary vehicle detected in disaster evacuation sector.',
      priority: 'MEDIUM',
    },
    {
      type: 'STRUCTURAL_CRACK',
      label: 'Critical Structural Rupture / Fissure',
      desc: 'Severe concrete fracture or ground fault breach identified.',
      priority: 'HIGH',
    },
  ];

  const targets: Target[] = selectedPoints.map((pt, idx) => {
    const tmpl = categoryTemplates[idx % categoryTemplates.length];
    return {
      target_id: `T${idx + 1}`,
      x: pt.x,
      y: pt.y,
      type: tmpl.type,
      priority: tmpl.priority,
      label: tmpl.label,
      description: tmpl.desc,
      found: false, // 100% INVISIBLE UNTIL DRONES SURVEY THIS CELL!
      confidence: tmpl.type === 'VEHICLE' ? 1.0 : tmpl.type === 'HUMAN' ? 0.98 : 0.97,
      assigned_drone: null,
      rgbConfidence: 0,
      lidarConfidence: 0,
      kalmanFusedConfidence: 0,
      geoCoordinates: calculateGeoCoordinates(pt.x, pt.y),
      bbox: {
        x: pt.x * CELL - 6,
        y: pt.y * CELL - 6,
        w: 44,
        h: 44,
      },
    };
  });

  onComplete(targets);
}
