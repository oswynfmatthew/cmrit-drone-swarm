import { Target, TargetType } from './types';
import { CELL, WIDTH, HEIGHT } from './swarmEngine';

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
      // 12 HUMAN TARGETS (Blue Highlight)
      {
        target_id: 'T1',
        x: 8,
        y: 14,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Rooftop SOS Survivor',
        description: 'Stranded civilian on apex roof waving distress marker near rising floodline.',
        found: false,
        confidence: 0.98,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 8 * CELL - 8, y: 14 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(8, 14, 'flood_city_sos'),
      },
      {
        target_id: 'T2',
        x: 8,
        y: 13,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Balcony Civilian',
        description: 'Trapped resident on 2nd-floor balcony awaiting emergency extraction.',
        found: false,
        confidence: 0.95,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 8 * CELL - 8, y: 13 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(8, 13, 'flood_city_sos'),
      },
      {
        target_id: 'T3',
        x: 9,
        y: 14,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'SOS Distress Signaler',
        description: 'Survivor on roof apex waving high-visibility orange distress banner.',
        found: false,
        confidence: 0.99,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 9 * CELL - 8, y: 14 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(9, 14, 'flood_city_sos'),
      },
      {
        target_id: 'T4',
        x: 11,
        y: 8,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Stranded Rooftop Evacuee',
        description: 'Person stranded on single-story residential structure awaiting rescue boat.',
        found: false,
        confidence: 0.97,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 11 * CELL - 8, y: 8 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(11, 8, 'flood_city_sos'),
      },
      {
        target_id: 'T5',
        x: 11,
        y: 9,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Balcony Trapped Resident',
        description: 'Citizen on covered porch surrounded by deep flood currents.',
        found: false,
        confidence: 0.94,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 11 * CELL - 8, y: 9 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(11, 9, 'flood_city_sos'),
      },
      {
        target_id: 'T6',
        x: 10,
        y: 10,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Residential Roof Survivor',
        description: 'Civilian stranded on residential roof section isolated by floodwaters.',
        found: false,
        confidence: 0.96,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 10 * CELL - 8, y: 10 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(10, 10, 'flood_city_sos'),
      },
      {
        target_id: 'T7',
        x: 10,
        y: 9,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Commercial Porch Evacuee',
        description: 'Trapped citizen on raised entry canopy above 2.5m brown flood current.',
        found: false,
        confidence: 0.98,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 10 * CELL - 8, y: 9 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(10, 9, 'flood_city_sos'),
      },
      {
        target_id: 'T8',
        x: 19,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'SOS Rooftop Survivors (Group)',
        description: 'Confirmed group of stranded civilians beside rooftop SOS ground letter signs.',
        found: false,
        confidence: 1.0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 19 * CELL - 8, y: 6 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(19, 6, 'flood_city_sos'),
      },
      {
        target_id: 'T9',
        x: 20,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Commercial Roof Evacuees',
        description: 'Civilians signaling for aerial airlift from adjoining flat commercial rooftop.',
        found: false,
        confidence: 0.99,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 20 * CELL - 8, y: 6 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(20, 6, 'flood_city_sos'),
      },
      {
        target_id: 'T10',
        x: 3,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Isolated Warehouse Survivor',
        description: 'Single isolated survivor on western warehouse perimeter roof apex.',
        found: false,
        confidence: 0.95,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 3 * CELL - 8, y: 6 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(3, 6, 'flood_city_sos'),
      },
      {
        target_id: 'T11',
        x: 19,
        y: 8,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Terrace Distress Caller',
        description: 'Stranded resident on apartment terrace overlooking flooded roadway.',
        found: false,
        confidence: 0.97,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 19 * CELL - 8, y: 8 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(19, 8, 'flood_city_sos'),
      },
      {
        target_id: 'T12',
        x: 22,
        y: 8,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Flood Shelter Rooftop Citizen',
        description: 'Evacuee on rooftop waiting for emergency food and medical supply drop.',
        found: false,
        confidence: 0.96,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 22 * CELL - 8, y: 8 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(22, 8, 'flood_city_sos'),
      },

      // 15 VEHICLE TARGETS (Purple Highlight)
      {
        target_id: 'T13',
        x: 13,
        y: 17,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Submerged Commuter Car',
        description: 'Passenger sedan submerged up to windshield in fast street floodwaters.',
        found: false,
        confidence: 0.98,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 13 * CELL - 8, y: 17 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(13, 17, 'flood_city_sos'),
      },
      {
        target_id: 'T14',
        x: 13,
        y: 14,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Marooned Transport Van',
        description: 'Commercial van trapped against flooded intersection curb.',
        found: false,
        confidence: 0.96,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 13 * CELL - 8, y: 14 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(13, 14, 'flood_city_sos'),
      },
      {
        target_id: 'T15',
        x: 26,
        y: 16,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Stranded SUV',
        description: 'Sport utility vehicle stalled at eastern flooded crossroads.',
        found: false,
        confidence: 0.97,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 26 * CELL - 8, y: 16 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(26, 16, 'flood_city_sos'),
      },
      {
        target_id: 'T16',
        x: 24,
        y: 13,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Commercial Box Truck',
        description: 'Delivery truck partially submerged and blocking secondary evacuation route.',
        found: false,
        confidence: 0.99,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 24 * CELL - 8, y: 13 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(24, 13, 'flood_city_sos'),
      },
      {
        target_id: 'T17',
        x: 27,
        y: 19,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Partially Submerged Vehicle',
        description: 'Personal commuter vehicle immobilized in south-east ditch overflow.',
        found: false,
        confidence: 0.94,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 27 * CELL - 8, y: 19 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(27, 19, 'flood_city_sos'),
      },
      {
        target_id: 'T18',
        x: 18,
        y: 11,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Swift-Water Rescue Inflatable Craft',
        description: 'First responders in red rescue boat maneuvering between submerged poles.',
        found: false,
        confidence: 1.0,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 18 * CELL - 8, y: 11 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(18, 11, 'flood_city_sos'),
      },
      {
        target_id: 'T19',
        x: 17,
        y: 10,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Waterlogged Sedan',
        description: 'Abandoned commuter car floating against safety rail.',
        found: false,
        confidence: 0.96,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 17 * CELL - 8, y: 10 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(17, 10, 'flood_city_sos'),
      },
      {
        target_id: 'T20',
        x: 16,
        y: 4,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Flooded Service Vehicle',
        description: 'Utility truck stalled in northern submerged parking lot.',
        found: false,
        confidence: 0.98,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 8, y: 4 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(16, 4, 'flood_city_sos'),
      },
      {
        target_id: 'T21',
        x: 16,
        y: 5,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Submerged Delivery Van',
        description: 'Commercial cargo van immobilized by 1.8m water inundation.',
        found: false,
        confidence: 0.97,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 8, y: 5 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(16, 5, 'flood_city_sos'),
      },
      {
        target_id: 'T22',
        x: 16,
        y: 3,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Abandoned Service Van',
        description: 'Fleet maintenance van parked on flooded access ramp.',
        found: false,
        confidence: 0.95,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 8, y: 3 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(16, 3, 'flood_city_sos'),
      },
      {
        target_id: 'T23',
        x: 16,
        y: 1,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Northern Inundated Vehicle',
        description: 'Passenger sedan trapped on northern perimeter road section.',
        found: false,
        confidence: 0.96,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 16 * CELL - 8, y: 1 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(16, 1, 'flood_city_sos'),
      },
      {
        target_id: 'T24',
        x: 17,
        y: 9,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Waterlogged Commuter Car',
        description: 'Sedan submerged to hood line with visible hazard roof beacon.',
        found: false,
        confidence: 0.97,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 17 * CELL - 8, y: 9 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(17, 9, 'flood_city_sos'),
      },
      {
        target_id: 'T25',
        x: 20,
        y: 9,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Submerged Pickup Truck',
        description: 'Heavy utility pickup truck stranded in rising commercial flood zone.',
        found: false,
        confidence: 0.95,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 20 * CELL - 8, y: 9 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(20, 9, 'flood_city_sos'),
      },
      {
        target_id: 'T26',
        x: 25,
        y: 9,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Flooded Logistics Truck',
        description: 'Large distribution truck marooned on eastern highway bypass.',
        found: false,
        confidence: 0.98,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 25 * CELL - 8, y: 9 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(25, 9, 'flood_city_sos'),
      },
      {
        target_id: 'T27',
        x: 28,
        y: 8,
        type: 'VEHICLE',
        priority: 'MEDIUM',
        label: 'Riverbank Stranded Car',
        description: 'Passenger vehicle stalled on saturated embankment bordering canal.',
        found: false,
        confidence: 0.94,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 28 * CELL - 8, y: 8 * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(28, 8, 'flood_city_sos'),
      },
      // Additional Human & Vehicle Targets
      ...(
        [
          [9, 6, 0.96, 'North Residential Rooftop Survivor', 'Stranded civilian spotted on flooded residential roof terrace.'],
          [6, 8, 0.95, 'West Floodline Porch Survivor', 'Resident waving from elevated covered porch above floodwaters.'],
        ] as [number, number, number, string, string][]
      ).map(([cx, cy, conf, label, desc], i) => ({
        target_id: `T${28 + i}`,
        x: cx,
        y: cy,
        col: cx,
        row: cy,
        cell_id: cy * 30 + cx,
        target_screen_x: cx * CELL + CELL / 2,
        target_screen_y: cy * CELL + CELL / 2,
        type: 'HUMAN' as const,
        priority: 'HIGH' as const,
        label,
        description: desc,
        found: false,
        confidence: conf,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: cx * CELL - 8, y: cy * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(cx, cy, 'flood_city_sos'),
      })),
      ...(
        [
          [13, 2, 0.97, 'North Avenue White Sedan', 'White passenger sedan stranded in deep northern flooded lane.'],
          [13, 5, 0.96, 'Flooded Corridor Grey Sedan', 'Grey sedan partially submerged along central vertical road.'],
          [13, 8, 0.98, 'Central Intersection White SUV', 'White SUV immobilized near flooded mid-town crosswalk.'],
          [13, 9, 0.97, 'Center Avenue Dark Sedan', 'Dark commuter car submerged up to door handles in flood channel.'],
          [13, 10, 0.97, 'Center Avenue Silver Sedan', 'Silver car half-submerged in central inundated street queue.'],
          [13, 11, 0.96, 'Submerged Mid-Street Vehicle', 'Marooned sedan sitting in rising murky street current.'],
          [23, 0, 0.94, 'Northeast Corner Flooded Car', 'Passenger vehicle visible along far northeast inundated road.'],
          [21, 3, 0.95, 'North Commercial Yard Vehicle', 'Service vehicle trapped beside flooded northeastern building.'],
          [18, 13, 0.99, 'Swift-Water Red Rescue Boat', 'Active rescue inflatable watercraft navigating flooded intersection.'],
          [0, 14, 0.96, 'West Perimeter White Sedan', 'White sedan stalled at far-west flooded neighborhood boundary.'],
          [18, 19, 0.97, 'South Avenue Tan SUV', 'Tan SUV partially submerged at southern street foreground edge.'],
        ] as [number, number, number, string, string][]
      ).map(([cx, cy, conf, label, desc], i) => ({
        target_id: `T${30 + i}`,
        x: cx,
        y: cy,
        col: cx,
        row: cy,
        cell_id: cy * 30 + cx,
        target_screen_x: cx * CELL + CELL / 2,
        target_screen_y: cy * CELL + CELL / 2,
        type: 'VEHICLE' as const,
        priority: 'MEDIUM' as const,
        label,
        description: desc,
        found: false,
        confidence: conf,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: cx * CELL - 8, y: cy * CELL - 8, w: 48, h: 48 },
        geoCoordinates: calculateGeoCoordinates(cx, cy, 'flood_city_sos'),
      })),
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
    objectivesSummary: '42 rooftop survivors & USAR rescuers (Cyan), 26 emergency & civilian vehicles (Purple), tectonic fault crack, orange medical tent',
    targets: [
      {
        target_id: 'T1',
        x: 15,
        y: 6,
        type: 'HUMAN',
        priority: 'HIGH',
        label: 'Survivors Waving on Upper Slab',
        description: 'Central stranded civilians atop tilted reinforced concrete slab waving for aerial hoist.',
        found: false,
        confidence: 0.99,
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
        label: 'USAR Search & Rescue Squad Lead',
        description: 'First responders in orange protective gear coordinating canine search across rubble cavity.',
        found: false,
        confidence: 0.98,
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
        description: 'Deep tectonic fault rupture splitting the multi-lane arterial road and utilities.',
        found: false,
        confidence: 0.99,
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
        description: 'Critical care ambulance stationed at intersection with rear doors open for casualties.',
        found: false,
        confidence: 0.99,
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
        description: 'Field trauma stabilization tent receiving evacuated casualties on eastern plaza.',
        found: false,
        confidence: 0.99,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: 25 * CELL - 8, y: 13 * CELL - 8, w: 48, h: 48 },
      },
      ...(
        [
          [1, 4, 0.94, 'Sidewalk Evacuee (Northwest)', 'Displaced civilian standing beside trees along northwest avenue.'],
          [2, 4, 0.95, 'Sidewalk Civilians (Northwest)', 'Residents gathered along northwest curb near emergency perimeter.'],
          [0, 6, 0.93, 'West Perimeter Pedestrian', 'Resident near damaged western storefront awaiting instruction.'],
          [20, 2, 0.92, 'North Alley Bystander', 'Person near northern damaged apartment courtyard.'],
          [25, 2, 0.94, 'Northeast Street Bystanders', 'Civilians gathered near northeast parked vehicles.'],
          [26, 4, 0.96, 'Crane Perimeter Responder', 'Safety spotter near heavy crane and emergency fire truck.'],
          [24, 5, 0.95, 'Heavy Crane Crew Member', 'Responder assisting debris lifting along eastern flank.'],
          [26, 6, 0.95, 'East Curb Responder', 'First responder coordinating traffic beside utility vans.'],
          [26, 7, 0.94, 'East Sidewalk Responder', 'Safety officer near parked white response vans.'],
          [26, 8, 0.94, 'East Storefront Pedestrian', 'Civilian beside parked silver sedan on eastern block.'],
          [27, 8, 0.93, 'East Walk Bystander', 'Pedestrian standing along eastern commercial sidewalk.'],
          [28, 10, 0.95, 'East Crosswalk Civilian', 'Person crossing eastern intersection toward medical tent.'],
          [28, 9, 0.94, 'East Corner Bystander', 'Civilian near eastern corner building entrance.'],
          [27, 10, 0.96, 'East Avenue Responders', 'Responders walking toward triage perimeter at crosswalk.'],
          [19, 10, 0.97, 'Ambulance Staging Responders', 'Paramedics staged behind open emergency ambulance doors.'],
          [16, 6, 0.99, 'Upper Slab Survivors (Right)', 'Stranded survivors waving from east edge of pancaked concrete slab.'],
          [14, 6, 0.99, 'Upper Slab Survivors (Left)', 'Stranded survivors waving from west edge of pancaked concrete slab.'],
          [15, 10, 0.98, 'Roadway USAR Scout', 'Orange-suited USAR scout moving across central intersection.'],
          [15, 11, 0.98, 'Roadway USAR Coordinator', 'Orange-suited USAR coordinator approaching central rubble field.'],
          [2, 13, 0.93, 'West Road First Responder', 'Responder inspecting pavement fault beside police cruiser.'],
          [5, 12, 0.97, 'Canine Handler on Fault Edge', 'Orange USAR handler with search dog inspecting crack line.'],
          [8, 11, 0.98, 'Rubble Ridge Spotter', 'Orange USAR responder directing search along upper rubble ridge.'],
          [8, 19, 0.95, 'South Rubble Searcher', 'Orange USAR team member probing southern debris cavity.'],
          [9, 12, 0.98, 'Upper Rubble Rescue Pair', 'USAR rescuers climbing over upper fractured concrete slabs.'],
          [9, 15, 0.97, 'Central Rubble Rescue Squad', 'Orange USAR squad conducting acoustic listening sweep.'],
          [7, 14, 0.96, 'West Rubble Rescue Specialist', 'USAR rescuer working along western collapse trench.'],
          [9, 17, 0.97, 'Lower Rubble Rescue Team', 'Rescuers in orange gear navigating lower concrete debris.'],
          [11, 17, 0.98, 'Canine Search Team (South)', 'USAR search squad and dogs scanning deep slab void.'],
          [12, 17, 0.98, 'USAR Extraction Specialists', 'Search specialists with canine units on lower slab deck.'],
          [14, 17, 0.97, 'South-East Rubble Responder', 'Orange-suited responder signaling from lower rubble zone.'],
          [17, 16, 0.96, 'East Rubble Edge Rescuer', 'Responder assisting stretcher path at east rubble perimeter.'],
          [16, 14, 0.97, 'East Debris Slope Rescuers', 'USAR personnel descending eastern concrete debris edge.'],
          [11, 13, 0.98, 'Mid-Rubble USAR Cluster', 'Three orange USAR rescuers probing fractured column void.'],
          [13, 13, 0.98, 'Center-East USAR Team', 'Orange USAR team searching eastern concrete slab opening.'],
          [21, 16, 0.96, 'Southeast Crosswalk Squad', 'Responders lined along southeast pedestrian crosswalk.'],
          [22, 16, 0.96, 'Triage Perimeter Security', 'Emergency personnel staging near southeast crosswalk.'],
          [24, 16, 0.95, 'Fire Crew Staging Team', 'First responders beside fire truck and crosswalk perimeter.'],
          [22, 12, 0.97, 'Field Hospital Triage Medics', 'Medical team loading casualty stretcher outside orange tent.'],
          [23, 12, 0.98, 'Medical Tent Intake Staff', 'Paramedics treating stabilized evacuee at tent entrance.'],
          [23, 13, 0.97, 'Trauma Stretcher Team', 'Medical personnel wheeling emergency stretcher beside tent.'],
          [21, 14, 0.97, 'Triage Staging Stretcher Crew', 'Emergency responders assisting casualties beside medical tent entrance.'],
          [18, 12, 0.97, 'Ambulance Rear Trauma Crew', 'Medical personnel staging casualty gear behind open ambulance.'],
          [19, 13, 0.96, 'Intersection Triage Responders', 'Paramedics coordinating stretcher transfer near ambulance lane.'],
          [9, 4, 0.95, 'Northwest Slab Edge Spotter', 'First responder monitoring north collapse perimeter beside rubble.'],
          [10, 13, 0.97, 'Central Rubble Searchers', 'Orange-suited USAR specialists scanning center collapse cavity.'],
          [12, 13, 0.98, 'Mid-Deck USAR Rescuers', 'Rescue squad members communicating across fractured floor slab.'],
          [13, 11, 0.97, 'Upper Rubble Edge Rescuer', 'Orange USAR responder traversing northern rubble slope.'],
          [13, 15, 0.98, 'Core Void Canine Responders', 'USAR rescuers and search dog probing lower rubble trench.'],
          [13, 18, 0.96, 'South Debris Line Responder', 'Orange-suited searcher inspecting southern collapsed roof bay.'],
          [17, 17, 0.96, 'Southeast Rubble Perimeter Team', 'Responders staging extraction equipment near southeast rubble edge.'],
        ] as [number, number, number, string, string][]
      ).map(([cx, cy, conf, label, desc], i) => ({
        target_id: `T${6 + i}`,
        x: cx,
        y: cy,
        col: cx,
        row: cy,
        cell_id: cy * 30 + cx,
        target_screen_x: cx === 26 && cy === 8 ? cx * CELL + CELL * 0.72 : cx * CELL + CELL / 2,
        target_screen_y: cx === 26 && cy === 8 ? cy * CELL + CELL * 0.65 : cy * CELL + CELL / 2,
        type: 'HUMAN' as const,
        priority: 'HIGH' as const,
        label,
        description: desc,
        found: false,
        confidence: conf,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: cx * CELL - 8, y: cy * CELL - 8, w: 48, h: 48 },
      })),
      ...(
        [
          [6, 0, 0.97, 'Northern Emergency Support Van', 'White emergency support van advancing along north avenue.'],
          [5, 1, 0.99, 'North Avenue Fire Engine', 'Red heavy fire truck deployed on northwest inbound lane.'],
          [5, 2, 0.96, 'Fire Engine Forward Cab', 'Forward section of red fire apparatus on northern roadway.'],
          [3, 1, 0.94, 'Northwest Curb Sedan', 'Parked civilian sedan facing north along avenue shoulder.'],
          [1, 5, 0.98, 'West Avenue Police Cruiser', 'White law enforcement cruiser blocking northwest lane.'],
          [0, 7, 0.96, 'West Perimeter Fire Truck', 'Red fire engine stationed at western road perimeter.'],
          [0, 11, 0.95, 'Southwest Lane Sedan', 'Silver sedan stranded beside west road curb.'],
          [1, 12, 0.98, 'Fault Line Police Cruiser', 'White police car parked beside deep diagonal fault crack.'],
          [0, 16, 0.94, 'Southwest Corner Sedan', 'White passenger car stalled at southwest intersection edge.'],
          [24, 19, 0.98, 'Southeast Police Cruiser', 'White emergency patrol car positioned at south crosswalk.'],
          [28, 17, 0.99, 'Southeast Heavy Fire Engine', 'Red fire rescue truck staged at southeast intersection.'],
          [28, 15, 0.98, 'East Crosswalk Police Cruiser', 'Police patrol cruiser parked at east crosswalk approach.'],
          [9, 1, 0.95, 'North Rubble Access Sedan', 'Civilian car parked near northern damaged apartment frontage.'],
          [8, 2, 0.97, 'North-West Emergency Cruiser', 'White police patrol unit stationed along center divider.'],
          [8, 3, 0.96, 'Rubble Perimeter White Sedan', 'White sedan stopped beside western apartment collapse zone.'],
          [28, 0, 0.93, 'Northeast Far Avenue Car', 'Civilian vehicle visible along far northeast road lane.'],
          [27, 1, 0.95, 'Northeast Lane White Sedan', 'White sedan parked along northeast residential street.'],
          [26, 2, 0.95, 'Northeast Curb White Car', 'White car positioned beside northeast tree line.'],
          [25, 3, 0.97, 'Crane Sector Patrol Van', 'White emergency vehicle parked adjacent to crane outriggers.'],
          [27, 4, 0.99, 'East Avenue Fire Engine', 'Red ladder fire truck deployed on eastern street lane.'],
          [29, 3, 0.94, 'Far-East Curb SUV', 'Dark SUV parked along far-eastern street shoulder.'],
          [29, 1, 0.92, 'Far-East North Sedan', 'Compact sedan parked near far-northeast block corner.'],
          [27, 6, 0.98, 'East Sector Utility Van', 'White commercial/rescue van stopped by east storefront.'],
          [27, 7, 0.98, 'East Sector Response Van', 'White response van staged beside eastern apartment block.'],
          [26, 8, 0.97, 'East Curb Silver Sedan', 'Silver civilian car parked at eastern storefront curb.'],
        ] as [number, number, number, string, string][]
      ).map(([cx, cy, conf, label, desc], i) => ({
        target_id: `T${56 + i}`,
        x: cx,
        y: cy,
        col: cx,
        row: cy,
        cell_id: cy * 30 + cx,
        target_screen_x: cx === 26 && cy === 8 ? cx * CELL + CELL * 0.35 : cx * CELL + CELL / 2,
        target_screen_y: cx === 26 && cy === 8 ? cy * CELL + CELL * 0.45 : cy * CELL + CELL / 2,
        type: 'VEHICLE' as const,
        priority: 'MEDIUM' as const,
        label,
        description: desc,
        found: false,
        confidence: conf,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        bbox: { x: cx * CELL - 8, y: cy * CELL - 8, w: 48, h: 48 },
      })),
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

// Ensure all calamity scenarios have exact GPS coordinates, grid indices, and calibrated probability ratings
CALAMITY_SCENARIOS.forEach((scenario) => {
  scenario.targets.forEach((target) => {
    if (target.col === undefined) target.col = target.x;
    if (target.row === undefined) target.row = target.y;
    if (target.cell_id === undefined) target.cell_id = target.row * 30 + target.col;
    if (target.target_screen_x === undefined) {
      target.target_screen_x = target.col * CELL + CELL / 2;
    }
    if (target.target_screen_y === undefined) {
      target.target_screen_y = target.row * CELL + CELL / 2;
    }
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

export interface VisionQuadrantTile {
  dataUrl: string;
  bounds: [number, number, number, number];
}

// Intelligent Automated Computer Vision & Gemini Vision Scanner for reconnaissance imagery
// Analyzes the uploaded aerial/satellite image across the discrete 600-cell coordinate grid (30x20)
// using parallel full-image + forensic submerged-vehicle + zoomed quadrant tile passes
export async function detectTargetsWithGeminiVision(
  imageData: string,
  tiles?: VisionQuadrantTile[]
): Promise<{ targets: Target[]; error?: string }> {
  try {
    const response = await fetch('/api/gemini/detect-targets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        ...(tiles && tiles.length > 0 ? { tiles } : {}),
      }),
    });

    if (!response.ok) {
      let errMessage = `Gemini Vision API error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error) errMessage = errJson.error;
      } catch {
        const errText = await response.text();
        if (errText) errMessage = errText;
      }
      console.warn('Gemini Vision API returned status', response.status, errMessage);
      return { targets: [], error: errMessage };
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.detections)) {
      return { targets: [] };
    }

    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
    const cellWidth = CELL;
    const cellHeight = CELL;

    const formatSubType = (sub?: string): string => {
      if (!sub || sub === 'other') return '';
      return sub
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    const targets: Target[] = data.detections.map((d: any, idx: number) => {
      let col = clamp(Math.floor(Number(d.col) || 0), 0, 29);
      let row = clamp(Math.floor(Number(d.row) || 0), 0, 19);
      let box2d: [number, number, number, number] | undefined;
      let target_screen_x = col * cellWidth + cellWidth / 2;
      let target_screen_y = row * cellHeight + cellHeight / 2;
      let bbox = {
        x: col * cellWidth - 4,
        y: row * cellHeight - 4,
        w: cellWidth + 8,
        h: cellHeight + 8,
      };

      if (Array.isArray(d.box_2d) && d.box_2d.length === 4) {
        const [ymin, xmin, ymax, xmax] = d.box_2d.map((n: any) =>
          clamp(Number(n) || 0, 0, 1000)
        );
        box2d = [ymin, xmin, ymax, xmax];
        const cx = (xmin + xmax) / 2;
        const cy = (ymin + ymax) / 2;
        col = clamp(Math.floor((cx / 1000) * 30), 0, 29);
        row = clamp(Math.floor((cy / 1000) * 20), 0, 19);
        target_screen_x = (cx / 1000) * WIDTH;
        target_screen_y = (cy / 1000) * HEIGHT;
        bbox = {
          x: (xmin / 1000) * WIDTH,
          y: (ymin / 1000) * HEIGHT,
          w: Math.max(12, ((xmax - xmin) / 1000) * WIDTH),
          h: Math.max(12, ((ymax - ymin) / 1000) * HEIGHT),
        };
      }

      const cell_id =
        typeof d.cell_id === 'number' && d.cell_id >= 0 && d.cell_id < 600 && !box2d
          ? d.cell_id
          : row * 30 + col;

      const rawType = String(d.type || d.label || 'human').toLowerCase();
      const rawSubType = String(d.sub_type || '').toLowerCase();
      const rawDesc = String(d.description || '');
      const formattedSub = formatSubType(d.sub_type);

      let type: TargetType = 'HUMAN';
      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
      let labelText = formattedSub || 'Rooftop Survivor';
      let descText =
        rawDesc || 'Stranded human detected via high-recall Gemini Vision SAR detector';

      if (
        rawType.includes('boat') ||
        rawSubType.includes('boat') ||
        rawSubType.includes('raft') ||
        rawSubType.includes('dinghy') ||
        rawSubType.includes('watercraft')
      ) {
        type = 'BOAT';
        priority = 'HIGH';
        labelText = formattedSub || 'Watercraft / Rescue Boat';
        descText = rawDesc || 'Rescue craft or vessel identified in water sector';
      } else if (
        rawType.includes('vehicle') ||
        rawType.includes('car') ||
        rawType.includes('truck') ||
        rawType.includes('van') ||
        rawType.includes('suv') ||
        rawType.includes('bus') ||
        rawType.includes('sedan') ||
        rawType.includes('pickup') ||
        rawType.includes('auto') ||
        rawType.includes('taxi') ||
        rawType.includes('ambulance') ||
        rawType.includes('tractor') ||
        rawSubType.includes('car') ||
        rawSubType.includes('truck') ||
        rawSubType.includes('van') ||
        rawSubType.includes('suv') ||
        rawSubType.includes('sedan') ||
        rawSubType.includes('pickup') ||
        rawSubType.includes('bus') ||
        rawSubType.includes('vehicle')
      ) {
        type = 'VEHICLE';
        priority = 'MEDIUM';
        labelText = formattedSub || 'Submerged / Stranded Vehicle';
        descText = rawDesc || 'Vehicle signature isolated in evacuation grid';
      } else if (
        rawType.includes('animal') ||
        rawType.includes('livestock') ||
        rawType.includes('cattle') ||
        rawType.includes('cow') ||
        rawType.includes('dog') ||
        rawType.includes('horse') ||
        rawType.includes('sheep')
      ) {
        type = 'ANIMAL';
        priority = 'MEDIUM';
        labelText = formattedSub || 'Stranded Animal / Livestock';
        descText = rawDesc || 'Domestic or farm animal isolated by calamity';
      } else {
        type = 'HUMAN';
        priority = 'HIGH';
        labelText = formattedSub || 'Stranded Survivor';
        descText = rawDesc || 'Person requiring urgent drone swarm extraction';
      }

      const conf =
        typeof d.confidence === 'number'
          ? Math.max(0.45, Math.min(1.0, d.confidence))
          : type === 'VEHICLE'
          ? 0.94
          : 0.96;

      return {
        target_id: `T${idx + 1}`,
        x: col,
        y: row,
        col,
        row,
        cell_id,
        target_screen_x,
        target_screen_y,
        type,
        sub_type: d.sub_type,
        priority,
        label: labelText,
        description: descText,
        found: false,
        confidence: conf,
        assigned_drone: null,
        rgbConfidence: 0,
        lidarConfidence: 0,
        kalmanFusedConfidence: 0,
        geoCoordinates: calculateGeoCoordinates(col, row),
        box_2d: box2d,
        bbox,
      };
    });

    return { targets };
  } catch (err: any) {
    console.error('Failed to run Gemini Vision detection:', err);
    return {
      targets: [],
      error: err?.message || 'Network error reaching Gemini Vision detection endpoint',
    };
  }
}

// Main image analysis entry point: invokes high-recall Gemini Vision SAR detector
// with full-frame passes + 4 overlapping high-resolution quadrant crops
export function analyzeUploadedImageForTargets(
  imgElement: HTMLImageElement,
  onComplete: (targets: Target[]) => void,
  onError?: (errMsg: string) => void
): void {
  const W = imgElement.naturalWidth || imgElement.width || 960;
  const H = imgElement.naturalHeight || imgElement.height || 640;

  // Convert img to dataURL for Gemini Vision ingestion if needed
  let dataUrl = imgElement.src;
  if (!dataUrl.startsWith('data:')) {
    try {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0, W, H);
        dataUrl = c.toDataURL('image/jpeg', 0.94);
      }
    } catch {
      // tainted canvas or cross-origin fallback
      dataUrl = imgElement.src;
    }
  }

  // Generate 4 overlapping zoomed quadrant tiles so half-submerged & small vehicles have ~2x resolution
  let tiles: VisionQuadrantTile[] | undefined;
  try {
    const normalizedQuadrants: [number, number, number, number][] = [
      [0, 0, 560, 560],
      [0, 440, 560, 1000],
      [440, 0, 1000, 560],
      [440, 440, 1000, 1000],
    ];
    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d');
    if (tileCtx && W > 0 && H > 0) {
      const builtTiles: VisionQuadrantTile[] = [];
      for (const [yMinN, xMinN, yMaxN, xMaxN] of normalizedQuadrants) {
        const sx = Math.max(0, Math.floor((xMinN / 1000) * W));
        const sy = Math.max(0, Math.floor((yMinN / 1000) * H));
        const ex = Math.min(W, Math.ceil((xMaxN / 1000) * W));
        const ey = Math.min(H, Math.ceil((yMaxN / 1000) * H));
        const sw = Math.max(1, ex - sx);
        const sh = Math.max(1, ey - sy);

        const targetW = Math.min(1400, Math.max(sw, 960));
        const targetH = Math.max(1, Math.round((sh / sw) * targetW));
        tileCanvas.width = targetW;
        tileCanvas.height = targetH;
        tileCtx.imageSmoothingEnabled = true;
        tileCtx.imageSmoothingQuality = 'high';
        tileCtx.clearRect(0, 0, targetW, targetH);
        tileCtx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, targetW, targetH);

        builtTiles.push({
          dataUrl: tileCanvas.toDataURL('image/jpeg', 0.92),
          bounds: [(sy / H) * 1000, (sx / W) * 1000, (ey / H) * 1000, (ex / W) * 1000],
        });
      }
      if (builtTiles.length === 4) {
        tiles = builtTiles;
      }
    }
  } catch {
    // Gracefully fall back to full-image passes if canvas readback is tainted
    tiles = undefined;
  }

  detectTargetsWithGeminiVision(dataUrl, tiles)
    .then(({ targets, error }) => {
      if (error) {
        onError?.(error);
      }
      onComplete(targets);
    })
    .catch((err) => {
      onError?.(err?.message || 'Failed to analyze image with Gemini Vision.');
      onComplete([]);
    });
}
