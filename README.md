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

- **Members** - the left panel. Each person has a **domain name** (their network
  account, the unique key), **full name**, **direct boss** and **location**.
  Search across all four; filter by location or by boss. Unticking "Currently on
  the team" keeps a leaver's travel history but greys them out and drops them
  from the add-to-trip menus.
- **Trips** - sorted into *Upcoming* and *Past*, worked out from today's date, so
  trips move to *Past* on their own. Filter by destination, purpose or status.
- **Assigning people** - drag a name onto a trip card. Drag a person from one
  trip card to another to move them; drag them back to the roster to take them
  off. Every trip card also has an **+ Add member** menu, so nothing depends on
  being able to drag.
- **Confirmed and tentative** - each trip card holds two panels. **Confirmed**
  are the people who are going; **Tentative** are the ones still under
  discussion. Anyone you add starts confirmed. To move someone, click their name
  to select them, then use the **Move down** button that appears on their card
  (**Move up** to bring them back). You can also drag someone straight into
  either panel. The headcount at the top counts both panels together.
- **Who is on a trip** - each panel splits its people into a column per direct
  boss, each column in its own colour. In **Confirmed**, a column's heading reads
  as a ratio - `2/3 - 67%`, with a matching bar - meaning two of the three people
  under that boss are confirmed on this trip. The denominator is the boss's whole
  current team in the roster, not just the people on this trip, so it answers
  "how much of that team is going". Leavers drop out of the team size, unless
  they are still on the trip, so the figure never reads above 100%. The
  **Tentative** panel keeps a plain count, since a ratio only means something for
  people who are actually going. A boss keeps the same colour on every card, so you can scan the
  board and see whose team is covering what. Anyone with no boss recorded gets a
  grey column, last. Every column is headed by the boss's name, so the colours
  are a convenience, never the only way to read it - the palette is validated for
  colour-vision deficiency in both light and dark themes, and past eight bosses
  the ninth takes a neutral grey rather than repeating a colour.
- **Keyboard** - tab to a person's handle, press space to lift, arrow keys to
  move, space to drop.
- **Clashes** - dropping someone onto a trip that overlaps another of their trips
  raises a warning with an Undo, and marks the person on the card with an amber
  dot. Two trips that merely touch - one ending the day the next begins - count
  as a clash, because nobody is in two places that day.

## Importing members from Excel

**Members → Import members** reads an `.xlsx` file. Row one must be your column
headings; `sample-members.xlsx` in this folder shows the shape.

Headings are matched for you - `Domain Name`, `Username`, `Manager`, `Office`
and many similar spellings are all understood. Anything unrecognised you map by
hand from a dropdown. You then see a preview and a count of what will change,
and **nothing touches the roster until you press Import**.

**Domain name identifies people**, compared ignoring case. So:

- someone already in the roster has their details refreshed, keeping their id and
  therefore all their trip history;
- someone new is added;
- **anyone in the roster but missing from the file is left alone** - a partial
  file can never wipe people out;
- rows with no domain name are skipped and counted;
- if a domain name repeats inside one file, the last row wins and you are told.

Whether someone is marked as having left is a decision made in the app, so an
import never silently reactivates them.

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
    readSheet.ts         Reads an .xlsx into headers plus rows
    importMembers.ts     Header matching and row normalisation, pure
    mergeMembers.ts      Folds imported rows in, keyed on domain name
    migrate.ts           Brings older stored data up to the current schema
    groupByBoss.ts       Boss columns, colour slots, and card width
    teamCoverage.ts      How much of a boss's team is confirmed on a trip
    LocalStorageStore.ts TravelStore interface + browser-storage implementation
    context.ts           Store context and the useStore hook
    StoreProvider.tsx    Wires operations to persistence
  components/
    Board.tsx            Layout, filters, drag handling, clash warnings
    RosterPanel.tsx      Member list, search, drop-to-unassign target
    TripCard.tsx         One trip, its two panels, and member selection
    MemberPanel.tsx      Confirmed or tentative: the same component twice
    MemberChip.tsx       Draggable people, in the roster and on trips
    MemberForm.tsx       Add/edit a member
    ImportMembersDialog.tsx  File picker, column mapping, preview, confirm
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
