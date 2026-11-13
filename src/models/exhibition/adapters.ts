/**
 * Adapters for the four models of the COLOR METAL exhibition table. The model
 * files in this folder are copies of color-metal-exhibition/src/models and are
 * kept unchanged (geometry, materials, roofing and façade details preserved);
 * only their placement/orientation metadata is added here.
 */
import type { ModelModule } from '../registry'
import { buildStadium } from './stadium'
import { buildChurch } from './church'
import { buildManor } from './manor'
import { buildGarage } from './garage'

export const stadium: ModelModule = {
  build: buildStadium,
  // origin = centre of the pitch, so the real stadium centre is the anchor (the model is a half-section)
  recentre: false,
  front: [0, 1],
  materialFocus: [0, 9, 60],
  notes: 'Exhibition-table model: half-section with the main stand and the zinc-clad pavilion.',
}

/**
 * The atlas shows the whole stadium: full pitch and end stands, the main stand with the
 * zinc-clad pavilion (as on the exhibition table) and the plain opposite long stand — dark
 * cladding on exposed steel frames, like the end stands (photographs).
 */
export const stadiumFull: ModelModule = {
  build: () => buildStadium({ full: true }),
  recentre: false,
  front: [0, 1],
  materialFocus: [0, 9, 60],
  notes: 'Exhibition-table model completed to the whole stadium: the opposite long stand is plain (dark cladding on exposed steel frames), like the end stands.',
}

export const church: ModelModule = {
  build: buildChurch,
  recentre: true,
  front: [-1, 0],
  materialFocus: [0, 16, 3],
  notes: 'Exhibition-table model.',
}

export const manor: ModelModule = {
  build: buildManor,
  recentre: true,
  front: [0, 1],
  materialFocus: [0, 16, 6],
  notes: 'Exhibition-table model.',
}

export const garage: ModelModule = {
  build: buildGarage,
  recentre: true,
  front: [0, 1],
  materialFocus: [10, 8, 17],
  notes: 'Exhibition-table model.',
}
