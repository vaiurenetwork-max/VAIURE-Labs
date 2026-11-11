/**
 * Frontend types & default continuity presets for the Slide 4 PosBot AI Creative Studio
 */

import { PosBotCategory, PosBotStudioSectionId } from '../../../server/posbotSchema';

export interface PosBotCatalogModel {
  key: string;
  name: string;
  category: PosBotCategory;
  studioSection: PosBotStudioSectionId;
  documentedCostGenerate: number;
  documentedCostIdr: number;
  cost_generate: number;
  cost_idr: number;
  available: boolean;
  pricingSource: 'live_api' | 'documented_reference';
  maxPromptLength: number;
  minPromptLength: number;
  requiredFields: string[];
  optionalFields: string[];
  maxImages?: number;
  aspectRatios?: string[];
  voiceOptions?: string[];
  notes: string;
  isSeedance25?: boolean;
  seedanceDurationSeconds?: 15 | 30;
  isR2V?: boolean;
}

export interface PosBotHealthData {
  ok: boolean;
  service?: string;
  version?: string;
  time?: string;
  serverKeyConfigured: boolean;
  serverKeyStatus: string;
  baseUrl: string;
  error?: string;
}

export interface PosBotBalanceData {
  ok: boolean;
  user_id?: number | string;
  balance_generate: number;
  balance_idr_equivalent: number;
  unit_value_idr: number;
  error?: string;
}

export interface PosBotJobRecord {
  id: string;
  job_code: string;
  model: string;
  model_name: string;
  category: string;
  prompt: string;
  parameters: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | string;
  cost_generate: number;
  remaining_balance_generate?: number;
  result_url?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SEEDANCE 2.5 SPECIALIZED STUDIO TYPES
// ============================================================================

export type SeedancePromptMode = 'quick' | 'cinematic' | 'precision';

export interface SeedanceShotItem {
  id: string;
  shotNumber: number;
  startSec: number;
  endSec: number;
  shotSize: string;
  cameraMovement: string;
  subjectAction: string;
  lightingAndAtmosphere: string;
  audioCue: string;
}

export interface SeedanceCharacterProfile {
  id: string;
  name: string;
  roleTag: string; // e.g. "[Character A]"
  appearance: string;
  wardrobe: string;
  accessories: string;
  referenceImageUrl?: string;
}

export interface SeedanceVehicleConstraint {
  enabled: boolean;
  vehicleName: string;
  drivingSide: 'LHD (Left-Hand Drive)' | 'RHD (Right-Hand Drive)';
  driverPosition: string;
  passengerPosition: string;
  steeringWheelSide: 'Left Cabin Side' | 'Right Cabin Side';
  exteriorPaintAndBody: string;
  wheelAndTrimDetails: string;
  interiorCabinDetails: string;
  referenceImageUrl?: string;
}

export const DEFAULT_SEEDANCE_CHARACTERS: SeedanceCharacterProfile[] = [
  {
    id: 'char-kael',
    name: 'Kael Vance',
    roleTag: '@Character_1 (Driver)',
    appearance: 'Late 20s East Asian male, sharp jawline, calm focused expression, short textured black hair',
    wardrobe: 'Matte charcoal technical bomber jacket over black crew-neck tee, silver chronograph watch on left wrist',
    accessories: 'Rimless titanium driving glasses',
    referenceImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'char-elena',
    name: 'Elena Rostova',
    roleTag: '@Character_2 (Co-Driver)',
    appearance: 'Late 20s woman, auburn shoulder-length hair, expressive green eyes',
    wardrobe: 'Tailored ivory leather trench coat, minimal gold ear cuffs',
    accessories: 'Tactical telemetry tablet in right hand',
    referenceImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  },
];

export const DEFAULT_VEHICLE_CONSTRAINT: SeedanceVehicleConstraint = {
  enabled: false,
  vehicleName: '2026 Porsche 911 GT3 RS (992)',
  drivingSide: 'LHD (Left-Hand Drive)',
  driverPosition: 'Front-left bucket seat (Driver strictly on left side)',
  passengerPosition: 'Front-right bucket seat (Passenger strictly on right side)',
  steeringWheelSide: 'Left Cabin Side',
  exteriorPaintAndBody: 'Ice Grey Metallic paint, exposed carbon-fiber hood vents and swan-neck rear wing',
  wheelAndTrimDetails: '20/21-inch forged magnesium center-lock satin black wheels with yellow ceramic brake calipers',
  interiorCabinDetails: 'Black Race-Tex Alcantara cabin, yellow 12-o-clock steering wheel marker, left-side cockpit cluster',
};
