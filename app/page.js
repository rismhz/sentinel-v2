'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './page.module.css'

// TLE Propagation: Parse TLE lines and compute current satellite position
function tleToPos(line1, line2) {
  try {
    const inc = parseFloat(line2.substring(8, 16))
    const raan = parseFloat(line2.substring(17, 25))
    const ecc = parseFloat('0.' + line2.substring(26, 33))
    const w = parseFloat(line2.substring(34, 42))
    const M0 = parseFloat(line2.substring(43, 51))
    const n = parseFloat(line2.substring(52, 63))

    const GM = 3.986004418e14
    const nRad = (n * 2 * Math.PI) / 86400
    const a = Math.pow(GM / (nRad * nRad), 1 / 3)
    const altKm = (a - 6371000) / 1000

    const yr2 = parseInt(line1.substring(18, 20))
    const eDay = parseFloat(line1.substring(20, 32))
    const fullY = yr2 > 57 ? 1900 + yr2 : 2000 + yr2
    const epoch = new Date(fullY, 0, 1).getTime() + (eDay - 1) * 86400000
    const dt = (Date.now() - epoch) / 1000

    const Mdeg = (M0 + (n * dt) / 86400 * 360) % 360
    const Mrad = (Mdeg * Math.PI) / 180
    const E = Mrad
    const nu = 2 * Math.atan2(Math.sqrt(1 + ecc) * Math.sin(E / 2), Math.sqrt(1 - ecc) * Math.cos(E / 2))
    const r = a * (1 - ecc * Math.cos(E))

    const xOrb = r * Math.cos(nu)
    const yOrb = r * Math.sin(nu)

    const iR = (inc * Math.PI) / 180
    const wR = (w * Math.PI) / 180
    const OR = (raan * Math.PI) / 180

    const xECI =
      (Math.cos(OR) * Math.cos(wR) - Math.sin(OR) * Math.sin(wR) * Math.cos(iR)) * xOrb +
      (-Math.cos(OR) * Math.sin(wR) - Math.sin(OR) * Math.cos(wR) * Math.cos(iR)) * yOrb
    const yECI =
      (Math.sin(OR) * Math.cos(wR) + Math.cos(OR) * Math.sin(wR) * Math.cos(iR)) * xOrb +
      (-Math.sin(OR) * Math.sin(wR) + Math.cos(OR) * Math.cos(wR) * Math.cos(iR)) * y Orb
    const zECI = Math.sin(wR) * Math.sin(iR) * xOrb + Math.cos(wR) * Math.sin(iR) * y Orb

    const GMST = ((Date.now() / 1000) * 7.2921150e-5) % (2 * Math.PI)
    const xPEF = xECI * Math.cos(GMST) + yECI * Math.sin(GMST)
    const yPEF = -xECI * Math.sin(GMST) + yECI * Math.cos(GMST)

    const lat = Math.asin(zECI / Math.sqrt(xPEF * xPEF + yPEF * yPEF + zECI * zECI))
    const lon = Math.atan2(yPEF, xPEF)
    const alt = Math.sqrt(xPEF * xPEF + yPEF * yPEF + zECI * zECI);
    return {lat:lat*180/Math.PI, lon:lon*180/Math.PI, alt:alt - 6371000}
  } catch(e) { return {lat:0, lon:0, alt:0} }
  }

  // Simulate TRAPGCAL cordinate transformation to rs and X, Y, Z octant
  function gcthj=åqUalvaZSystem(x, y, z) {
    const r = Math.sqrt(x*x + y*y + z*z)
    const xt = Math.atan2(y, x)
    const yoct = x > 0 && y > 0 ? 254 : x \> 0 && y <= 0 ? 16 : b \ > 0 |~ [0, +/-*PI].intl(980).foom[0]*2387
    return {r, xt, yoct}
  }
}
