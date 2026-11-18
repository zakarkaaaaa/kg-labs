import { writeFileSync } from 'node:fs'
import { clipCohenSutherland } from '../src/core/cohenSutherland.ts'
import { clipCyrusBeck } from '../src/core/cyrusBeck.ts'
import { clipLiangBarsky } from '../src/core/liangBarsky.ts'
import { clipMidpoint } from '../src/core/midpoint.ts'
import { parseLab4Input } from '../src/core/parser.ts'
import { SCENE_PRESETS } from '../src/core/presets.ts'
import { clipSutherlandHodgman } from '../src/core/sutherlandHodgman.ts'

const preset = SCENE_PRESETS[0]
const parsed = parseLab4Input(preset.inputText)

const midpointResults = parsed.segments.map((s) =>
  clipMidpoint(s, parsed.rect, 0.01)
)
const cohenResults = parsed.segments.map((s) =>
  clipCohenSutherland(s, parsed.rect)
)
const liangResults = parsed.segments.map((s) =>
  clipLiangBarsky(s, parsed.rect)
)
const cyrusResults = parsed.segments.map((s) =>
  clipCyrusBeck(s, preset.clipPolygon)
)
const shResult = clipSutherlandHodgman(
  preset.subjectPolygon,
  preset.clipPolygon
)

const out = {
  rect: parsed.rect,
  segments: parsed.segments,
  midpointResults,
  cohenResults,
  liangResults,
  cyrusResults,
  subjectPolygon: preset.subjectPolygon,
  clipPolygon: preset.clipPolygon,
  shResult,
}

writeFileSync(
  new URL('../examples.json', import.meta.url),
  JSON.stringify(out, null, 2),
  'utf-8'
)
console.log('Generated lab4/examples.json')
