/**
 * Close-range finishing: screen-space ambient occlusion (N8AO) for the
 * architectural inspection and walk views — contact shadows in eaves, window
 * reveals, roof valleys and seams — with ACES tone mapping to match the normal
 * renderer. Mounted only when needed (desktop, close to a building), because the
 * composer takes over rendering while mounted.
 */
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useStore } from '../state/store'

export function PostFX({ quality }: { quality: 'high' | 'low' }) {
  const mode = useStore((s) => s.mode)
  const walk = useStore((s) => s.walk.active)
  const d = useStore((s) => s.camDistance)
  const reduced = useStore((s) => s.reducedMotion)
  const on = quality === 'high' && (mode === 'inspect' || walk) && d < 2.5
  if (!on) return null
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO aoRadius={walk ? 60 : 38} distanceFalloff={1.2} intensity={walk ? 2.2 : 2.6} screenSpaceRadius quality={reduced ? 'low' : 'medium'} halfRes={false} color="#2a241c" />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
