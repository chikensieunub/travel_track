// Builds one self-contained .html holding the whole app.
//
// Run: npm run standalone
//
// To ship it with real data, press Back up in the app and save the downloaded
// file over src/store/seedData.json before building.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, statSync, existsSync } from 'node:fs'

const SEED = 'src/store/seedData.json'
const OUT = 'travel-tracker.html'

function seedSummary() {
  try {
    const seed = JSON.parse(readFileSync(SEED, 'utf8'))
    const members = seed.members?.length ?? 0
    const trips = seed.trips?.length ?? 0
    return members || trips ? `${members} members and ${trips} trips` : 'no data (it will start empty)'
  } catch {
    return 'no readable seed (it will start empty)'
  }
}

console.log('Building a standalone Travel Tracker')
console.log('  starting data:', seedSummary())

rmSync('standalone', { recursive: true, force: true })
execSync('npx tsc -b', { stdio: 'inherit' })
execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, STANDALONE: '1' } })

if (!existsSync('standalone/index.html')) {
  console.error('Build produced no index.html')
  process.exit(1)
}

let html = readFileSync('standalone/index.html', 'utf8')

// The bundle is an IIFE, but the tag it lands in still carries the module
// attributes from the original build. A page opened off disk has no origin, so a
// module script can be refused where a classic one runs.
html = html.replace(/<script type="module"[^>]*>/g, '<script>')

// A classic script runs the moment it is parsed, and these sit in the head -
// before the div the app mounts into exists. Moving them to the end of the body
// restores what the module scripts' deferral was doing for us.
const scripts = []
html = html.replace(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/g, (tag) => {
  scripts.push(tag)
  return ''
})
// A function replacer, not a string: the bundle contains $& and $` sequences,
// which a string replacement would read as substitution patterns and mangle.
html = html.replace('</body>', () => scripts.join('\n') + '\n</body>')

// A single file means no separate requests: anything left pointing at a file on
// disk would silently fail when the page is opened from a folder or an email.
// Script bodies are set aside first - their own strings are not page requests.
const markup = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
const leftovers = [...markup.matchAll(/(?:src|href)="(?!data:)([^"]+)"/g)].map((m) => m[1])
if (leftovers.length > 0) {
  console.error('Not self-contained; these would be fetched separately:', leftovers)
  process.exit(1)
}

if (html.indexOf('id="root"') > html.indexOf('<script')) {
  console.error('A script runs before the element the app mounts into; it would fail to start.')
  process.exit(1)
}

writeFileSync(OUT, html)
rmSync('standalone', { recursive: true, force: true })

const kb = Math.round(statSync(OUT).size / 1024)
console.log(`\nWrote ${OUT} (${kb} KB)`)

// Render it the way a browser would before calling it done. Everything above
// inspects the markup; this is the only step that proves the thing starts.
execSync('node scripts/check-standalone.mjs', { stdio: 'inherit' })

console.log('\nSend that one file. Opening it needs no install and no internet.')
