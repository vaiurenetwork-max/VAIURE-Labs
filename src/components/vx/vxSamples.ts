/**
 * Curated high-fidelity editorial sample images for VX Visual Reconstruction Engine
 * Allows instant testing of reverse-engineering and visual decomposition
 */

export interface VxSampleImage {
  id: string;
  title: string;
  category: string;
  aspectRatio: string;
  width: number;
  height: number;
  url: string;
  description: string;
}

export const VX_SAMPLE_IMAGES: VxSampleImage[] = [
  {
    id: 'sample-editorial-fashion',
    title: 'Avant-Garde Architectural Coat',
    category: 'High Fashion Editorial',
    aspectRatio: '4:5',
    width: 1200,
    height: 1500,
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
    description: 'High-contrast studio portrait featuring sculptural black garment, side raking light, and clean neutral backdrop.',
  },
  {
    id: 'sample-cinematic-interior',
    title: 'Brutalist Concrete Residence',
    category: 'Architectural / Spatial',
    aspectRatio: '16:9',
    width: 1600,
    height: 900,
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    description: 'Minimalist concrete interior with floor-to-ceiling glass, natural geometric shadow patterns, and spatial depth.',
  },
  {
    id: 'sample-night-street',
    title: 'Tokyo Rain Reflection Night',
    category: 'Cinematic Urban',
    aspectRatio: '16:9',
    width: 1600,
    height: 900,
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=85',
    description: 'Atmospheric night street with wet asphalt reflections, neon light spill, shallow focus, and anamorphic flare.',
  },
  {
    id: 'sample-dramatic-portrait',
    title: 'Monochrome Chiaroscuro Portrait',
    category: 'Fine Art Portraiture',
    aspectRatio: '1:1',
    width: 1200,
    height: 1200,
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
    description: 'Intimate close-up portrait with deep shadows, subtle rim light on cheekbone, and natural skin micro-texture.',
  },
];
