# Travel Tracker

Keeps track of who travelled where, and helps plan who goes next.

Add your people to the roster, add trips with a destination and dates, then drag
people onto trips. If someone is dragged onto a trip that clashes with another
trip they are already on, the app says so — but never stops you.

## Running it

**Double-click `start-travel-tracker.cmd`.** It installs dependencies the first
time, starts the server, and opens the app in your browser. Leave the black
window open while you use the app; closing it stops the server.

From a terminal, `npm start` does the same thing.

| Command | What it does |
| --- | --- |
| `npm start` | Start the app and open it in your browser |
| `npm run start:fast` | Build first, then serve - snappier, but no live reload |
| `npm run dev` | Dev server without opening a browser |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests as you edit |
| `npm run build` | Typecheck and produce `dist/` |
| `npm run lint` | Lint the source |

The app runs at http://localhost:5173.

## Using it

- **Members** — the left panel. Search by name, team or role; filter by team.
  Unticking "Currently on the team" keeps a leaver's travel history but greys
  them out and drops them from the add-to-trip menus.
- **Trips** — sorted into *Upcoming* and *Past*, worked out from today's date, so
  trips move to *Past* on their own. Filter by destination, purpose or status.
- **Assigning people** — drag a name onto a trip card. Drag a person from one
  trip card to another to move them; drag them back to the roster to take them
  off. Every trip card also has an **+ Add member** menu, so nothing depends on
  being able to drag.
- **Keyboard** — tab to a person's ⠿ handle, press space to lift, arrow keys to
  move, space to drop.
- **Clashes** — dropping someone onto a trip that overlaps another of their trips
  raises a warning with an Undo, and marks the person on the card with an amber
  dot. Two trips that merely touch — one ending the day the next begins — count
  as a clash, because nobody is in two places that day.

## Your data

Everything lives in your browser's local storage under `travel-tracker/v1`.
Nothing is sent anywhere.

**Export** writes a JSON file — that is your backup, and how you hand the data to
someone else or move it to a hosted version later. **Import** replaces everything
with the contents of such a file.

If the stored data is ever unreadable, the app starts empty and offers the
unreadable text as a download rather than overwriting it.

## Layout

```
src/
  store/
    types.ts             Member, Trip, Assignment, TravelData
    derive.ts            Pure date logic: end dates, overlaps, past/upcoming
    operations.ts        Immutable CRUD; deletes cascade to assignments
    LocalStorageStore.ts TravelStore interface + browser-storage implementation
    context.ts           Store context and the useStore hook
    StoreProvider.tsx    Wires operations to persistence
  components/
    Board.tsx            Layout, filters, drag handling, clash warnings
    RosterPanel.tsx      Member list, search, drop-to-unassign target
    TripCard.tsx         One trip, its people, and its drop target
    MemberChip.tsx       Draggable people, in the roster and on trips
    MemberForm.tsx       Add/edit a member
    TripForm.tsx         Add/edit a trip
```

Trips store a **start date and a duration**; the end date is always derived, and
durations are inclusive — a one-day trip starts and ends the same day.

## Sharing it with the team later

All reads and writes go through the `TravelStore` interface in
`store/LocalStorageStore.ts`. To move from one machine to a shared server, write
an `ApiStore` implementing that same interface and pass it to `StoreProvider`:

```tsx
<StoreProvider store={new ApiStore('https://…')}>
```

No component changes; the existing data moves across via Export/Import.
