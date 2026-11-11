/**
 * VAIURE Studio — Shot Prompt Builder
 * Combines structured cinematography parameters into professional AI film prompts without overwriting manual customizations.
 */

import { StoryboardShot, StudioCharacter, StudioLocation } from '../types/studio';

export const buildShotPromptFromStructuredFields = (
  shot: Partial<StoryboardShot>,
  characters: StudioCharacter[] = [],
  location?: StudioLocation
): string => {
  const parts: string[] = [];

  // 1. Shot Size & Framing
  const shotSizeLabels: Record<string, string> = {
    EXTREME_WIDE: 'Extreme wide establishing shot',
    WIDE: 'Wide cinematic shot',
    MEDIUM: 'Medium shot',
    MEDIUM_CLOSE_UP: 'Medium close-up shot',
    CLOSE_UP: 'Intimate close-up shot',
    EXTREME_CLOSE_UP: 'Extreme macro close-up shot',
  };
  const sizeLabel = shot.shotSize ? shotSizeLabels[shot.shotSize] || 'Cinematic shot' : 'Cinematic shot';
  parts.push(sizeLabel);

  // 2. Camera Movement & Optics
  const movementLabels: Record<string, string> = {
    STATIC: 'static lock-off camera',
    PAN: 'smooth horizontal panning motion',
    TILT: 'slow vertical tilt motion',
    DOLLY_IN: 'slow dolly-in push toward subject',
    DOLLY_OUT: 'slow dolly-out revealing space',
    TRACKING: 'steadicam tracking movement following motion',
    CRANE: 'high-angle crane descent',
    HANDHELD: 'tactile subtle handheld camera movement',
    ORBIT: 'slow 360 orbit camera arc',
  };
  if (shot.cameraMovement) {
    parts.push(`with ${movementLabels[shot.cameraMovement] || 'smooth camera motion'}`);
  }

  // 3. Characters & Appearance
  const assignedCharacters = characters.filter((c) => shot.characterIds?.includes(c.id));
  if (assignedCharacters.length > 0) {
    const charDescriptions = assignedCharacters
      .map((c) => `${c.name} (${c.appearance}, wearing ${c.wardrobe})`)
      .join(' and ');
    parts.push(`featuring ${charDescriptions}`);
  }

  // 4. Blocking / Subject Action
  if (shot.blockingNotes) {
    parts.push(shot.blockingNotes);
  }

  // 5. Location & Environment
  if (location) {
    parts.push(`set in ${location.name}. ${location.description}`);
  }

  // 6. Lighting & Time of Day
  if (shot.lighting || shot.timeOfDay) {
    const light = [shot.timeOfDay, shot.lighting].filter(Boolean).join(', ');
    parts.push(`Atmospheric lighting: ${light}`);
  }

  // 7. Optical Lens & Composition
  if (shot.lens || shot.composition) {
    const optics = [shot.lens, shot.composition].filter(Boolean).join(', ');
    parts.push(`Optics & Composition: ${optics}`);
  }

  // 8. Quality & Film Grade Token
  parts.push('Kodak 5219 film stock texture, 35mm anamorphic bokeh, authentic 24fps cinematic shutter angle.');

  return parts.filter(Boolean).join('. ');
};
