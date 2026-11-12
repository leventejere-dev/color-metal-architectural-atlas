/**
 * Oblique stereographic projection on the sphere, origin 46°N 25°E, k0 = 0.99975
 * (spherical form of Romania's Stereo 70). Identical to scripts/build-geodata.py.
 * Scene units are kilometres: X = east, Z = south (north = -Z).
 */
const LAT0 = (46 * Math.PI) / 180
const LON0 = (25 * Math.PI) / 180
const R = 6371
const K0 = 0.99975
const sin0 = Math.sin(LAT0)
const cos0 = Math.cos(LAT0)

export function project(lat: number, lon: number): { x: number; z: number } {
  const phi = (lat * Math.PI) / 180
  const dl = (lon * Math.PI) / 180 - LON0
  const k = (2 * R * K0) / (1 + sin0 * Math.sin(phi) + cos0 * Math.cos(phi) * Math.cos(dl))
  const x = k * Math.cos(phi) * Math.sin(dl)
  const y = k * (cos0 * Math.sin(phi) - sin0 * Math.cos(phi) * Math.cos(dl))
  return { x, z: -y }
}

export function unproject(x: number, z: number): { lat: number; lon: number } {
  const y = -z
  const rho = Math.hypot(x, y)
  if (rho < 1e-9) return { lat: 46, lon: 25 }
  const c = 2 * Math.atan(rho / (2 * R * K0))
  const phi = Math.asin(Math.cos(c) * sin0 + (y * Math.sin(c) * cos0) / rho)
  const lam = LON0 + Math.atan2(x * Math.sin(c), rho * cos0 * Math.cos(c) - y * sin0 * Math.sin(c))
  return { lat: (phi * 180) / Math.PI, lon: (lam * 180) / Math.PI }
}

/** Local grid convergence: angle (rad) between grid north (-Z) and true north at a point. */
export function convergence(lat: number, lon: number): number {
  const a = project(lat, lon)
  const b = project(lat + 0.01, lon)
  return Math.atan2(b.x - a.x, -(b.z - a.z))
}
