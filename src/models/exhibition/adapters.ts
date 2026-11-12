/**
 * Adapters for the four models of the COLOR METAL exhibition table. The model
 * files in this folder are copies of color-metal-exhibition/src/models and are
 * kept unchanged (geometry, materials, roofing and façade details preserved);
 * only their placement/orientation metadata is added here.
 */
import * as THREE from 'three'
import type { ModelModule } from '../registry'
import { Builder, mat } from '../../lib/geo'
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
 * The atlas shows the whole stadium: the exhibition half-section (unchanged) plus its
 * mirror image across the pitch centre line (the opposite long stand is approximated
 * as symmetric — stated in the model note).
 */
export const stadiumFull: ModelModule = {
  build: () => {
    const half = buildStadium() // pitch centre line at z = −35.25 in the exhibition file
    const back = mat(0, 0, 35.25)
    const full = new Builder()
    full.merge(half, back)
    full.merge(half, new THREE.Matrix4().makeScale(1, 1, -1).multiply(back))
    return full
  },
  recentre: false,
  front: [0, 1],
  materialFocus: [0, 9, 60],
  notes: 'Exhibition-table model completed to the whole stadium: the opposite stand is the mirror image of the modelled main stand.',
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
