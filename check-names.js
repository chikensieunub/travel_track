// Paste this whole file into the browser console (F12) with the app open.
// It reads what is actually stored and reports why names are not matching.
// Nothing is changed; it only reads and prints.
(() => {
  const BOSS = 'Nguyễn Khánh Trung'

  const clean = (s) => String(s).replace(/\p{Cf}/gu, '').normalize('NFC').trim().replace(/\s+/g, ' ')
  const key = (s) => clean(s).toLowerCase()
  const codes = (s) => [...String(s)].map((c) => c.codePointAt(0).toString(16)).join(' ')
  const plain = (s) => clean(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

  const raw = localStorage.getItem('travel-tracker/v1')
  if (!raw) {
    console.log('No data stored under travel-tracker/v1 - is the app open on this tab?')
    return
  }
  const data = JSON.parse(raw)
  const members = data.members || []

  console.log('=== travel tracker: name check ===')
  console.log('members stored:', members.length, '| trips:', (data.trips || []).length)
  console.log('app is looking for:', JSON.stringify(BOSS))

  const exact = members.filter((m) => key(m.fullName) === key(BOSS))
  console.log(
    exact.length
      ? 'MATCHED ' + exact.length + ' member(s) - the Boss tag should show'
      : 'NO MATCH for the boss in the roster',
  )

  // Names that look similar once accents are set aside, to show near misses.
  const target = plain(BOSS)
  const lastWord = target.split(' ').pop() || ' '
  const near = members.filter((m) => {
    const p = plain(m.fullName)
    return p === target || p.includes(lastWord) || target.includes(p)
  })

  console.log('--- ' + near.length + ' similar name(s) stored ---')
  for (const m of near.slice(0, 12)) {
    console.log(
      key(m.fullName) === key(BOSS) ? 'MATCH  ' : 'differs',
      JSON.stringify(m.fullName),
      '| active:',
      m.active,
      '| boss:',
      JSON.stringify(m.directBoss),
    )
    console.log('         codepoints:', codes(m.fullName))
  }
  console.log('         expected   :', codes(clean(BOSS)))

  // Anyone stored twice under the same name - the duplicate-leaver symptom.
  const groups = {}
  for (const m of members) {
    const k = key(m.fullName)
    groups[k] = groups[k] || []
    groups[k].push(m)
  }
  const doubled = Object.values(groups).filter((g) => g.length > 1)
  console.log('--- ' + doubled.length + ' duplicated name(s) ---')
  for (const g of doubled.slice(0, 15)) {
    console.log(JSON.stringify(g[0].fullName), '->', g.map((m) => (m.active ? 'active' : 'left')).join(', '))
  }

  // How many people on trips are not current staff, which is what fills Left.
  const onTrips = new Set((data.assignments || []).map((a) => a.memberId))
  const leavers = members.filter((m) => onTrips.has(m.id) && !m.active)
  console.log('--- ' + leavers.length + ' people on trips are marked as having left ---')
  console.log(leavers.slice(0, 15).map((m) => m.fullName).join(' | '))
})()
