import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = resolve(root, 'dist')
const landing = resolve(root, 'landing')
const landingDist = resolve(dist, 'landing')

if (!existsSync(dist)) throw new Error(`Missing production output: ${dist}`)
rmSync(landingDist, { recursive: true, force: true })
cpSync(landing, landingDist, { recursive: true })
