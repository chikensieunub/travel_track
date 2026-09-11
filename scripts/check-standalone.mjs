// Renders the standalone file the way a browser would, twice: with storage
// working, and with storage refused the way a page opened off disk can be.
import { readFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'

const html = readFileSync('travel-tracker.html', 'utf8')

async function boot(blockStorage) {
  const vc = new VirtualConsole()
  const errors = []
  vc.on('jsdomError', (e) => errors.push(e.message.slice(0, 160)))

  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole: vc,
  })

  if (blockStorage) {
    Object.defineProperty(dom.window, 'localStorage', {
      configurable: true,
      get() {
        throw new dom.window.DOMException('denied', 'SecurityError')
      },
    })
  }

  dom.window.document.open()
  dom.window.document.write(html)
  dom.window.document.close()
  await new Promise((r) => setTimeout(r, 1200))

  return { text: dom.window.document.getElementById('root')?.textContent ?? '', errors }
}

let ok = true
const must = (label, condition) => {
  if (!condition) ok = false
  console.log(`  ${condition ? 'ok  ' : 'FAIL'}  ${label}`)
}

for (const blocked of [false, true]) {
  const { text, errors } = await boot(blocked)
  console.log(blocked ? '\nOpened where storage is refused:' : '\nOpened normally:')
  must('starts without errors', errors.length === 0)
  must('the app is on screen', text.includes('Travel Tracker'))
  must('the roster is there', text.includes('Members'))
  must('the trip board is there', text.includes('Upcoming trips'))
  must('the Excel export is there', text.includes('Export to Excel'))
  must(
    blocked ? 'it warns that nothing can be saved' : 'it does not cry wolf about saving',
    /cannot be saved/i.test(text) === blocked,
  )
  if (errors.length) console.log('  errors:', errors.join(' | '))
}

if (!ok) {
  console.error('\nThe standalone file does not work. Not shipping it.')
  process.exit(1)
}
console.log('\nIt starts and works in both cases.')
