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
| `npm run standalone` | Build the one-file `travel-tracker.html` to send to people |

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
- **Boss** - one person gets their own panel at the top of every trip card they
  are on, above the team columns, with their confirmed or tentative state shown
  as a tag. They still count in the headcount and can still be moved between
  confirmed and tentative. **Who this is comes from `BOSS_NAME` in
  `src/store/boss.ts`** - matched on full name, which is deliberately temporary:
  two people can share a name, and the proper fix is a flag on the member record.
  Change that one value to point the panel at someone else. He needs no direct
  boss of his own — having nobody above him is the normal case — and he is tagged
  **Boss** in the Members list, which doubles as a check: if that tag is missing,
  the name stored in the roster does not match `BOSS_NAME`. He is never shown as
  having left: his own panel claims him whatever his "currently on the team" flag
  says, and a trip import never records him as a leaver.
- **Left the company** - a third panel appears on a card when someone on that
  trip is marked as having left. It is worked out from the roster rather than
  stored, so unticking "Currently on the team" moves that person on every trip
  they were ever on, and their history stays intact. They still count in the
  headcount.
- **Confirmed and tentative** - each trip card holds two panels. **Confirmed**
  are the people who are going; **Tentative** are the ones still under
  discussion. Anyone you add starts confirmed. To move someone, click their name
  to select them, then use the **Move down** button that appears on their card
  (**Move up** to bring them back). You can also drag someone straight into
  either panel. The headcount at the top counts both panels together.
- **Who is on a trip** - each panel splits its people into a column per direct
  boss, each column in its own colour, so you can scan the board and see whose
  team is covering what. Anyone with no boss recorded gets a grey column, last.
- **Team colours** - a colour follows the boss's name, so a team looks the same
  from card to card. Past the eighth manager the palette starts over, and if two
  teams on one card would land on the same colour, one shifts to the next free
  one: no column is ever colourless, and no two teams on a card look alike. With
  more than eight teams on a single card a repeat becomes unavoidable. Every
  column is headed by its boss's name, so colour is a convenience and never the
  only way to read it - the palette is validated for colour-vision deficiency
  against both the light and dark card surfaces.
- **Team coverage** - in **Confirmed**, a column's heading reads as a ratio,
  `2/3 · 67%`, with a matching bar: two of the three people under that boss are
  confirmed on this trip. The denominator is the boss's whole current team in the
  roster, not just the people on this trip, so it answers "how much of that team
  is going". Leavers drop out of the team size unless they are still on the trip,
  so the figure never reads above 100%. **Tentative** keeps a plain count, since a
  coverage ratio only means something for people who are actually going.
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

## Importing trips from Excel

**Import trips**, above the board, reads a sheet laid out as one block per trip:
the trip's name above a `Full name` column, with the names listed beneath.
Blocks can sit side by side with any gap between them, which is how a year's
worth of trips usually ends up in one sheet. `sample-trips.xlsx` in this folder
shows the shape. `No.` and `Sex` columns are ignored.

People are matched on **full name**, ignoring case and stray spacing but keeping
accents significant — in Vietnamese names they distinguish different people, so
stripping them would merge two colleagues into one.

Accented text has more than one valid Unicode encoding, and spreadsheets written
on different machines use different ones, so every name is brought to a single
encoding before comparing. Without that, the same visible name in two files does
not match, and someone already in the roster is wrongly taken for a leaver.

**A name the roster does not know is taken to be someone who has left**: they are
added with "Currently on the team" unticked, and appear on the trip card under
**Left the company**. Their domain name starts as their full name, since the file
does not carry one; correct it later if they come back.

The file has no dates, so the dialog lists every trip it found with a date and
duration box, pre-filled to 1 January of the year in the trip's name where there
is one. Correct what matters, then import — nothing changes until you do. A trip
already on the board is matched by name: its people are refreshed from the file
and **its dates are left as you set them**, so re-importing never undoes your
work.

## Exporting to Excel

**Export to Excel** writes one sheet, one row per person per trip: the trip's
destination, then the person's name, domain name, direct boss and location, and
where they stand on that trip — Boss, Confirmed, Tentative or Left the company.

The rows are built from everyone assigned to a trip rather than panel by panel,
so nobody can fall between the panels' rules and be missing from the report.

That shape is deliberately flat rather than a picture of the board, because it is
the one Excel is good at — sort it, filter it, or pivot it into headcount by
destination, by team, or by month. A trip with nobody on it still gets a row with
the people columns blank, so an empty trip cannot quietly disappear.

It always exports everything, whatever the on-screen filters are showing, so an
export is never silently missing trips you had filtered out.

## Sending it to someone

`npm run standalone` writes **`travel-tracker.html`**: the whole app in one file,
about 400 KB. Email it, or drop it on a shared drive. Opening it needs no
install, no server and no internet.

To ship it carrying your current board, press **Back up** in the app and save the
downloaded file over `src/store/seedData.json`, then build. Whoever opens it
starts from that data. The build prints what it is about to bake in, and then
checks that every one of those trips is really on screen before writing the file.

That seed file is **not committed** - it holds real people's names. A fresh clone
starts from `seedData.example.json`, which is empty.

The build checks its own output before finishing: it loads the file the way a
browser would and confirms the app comes up, once normally and once with storage
refused, which is what a page opened straight off disk can hit. If either fails
it refuses to write the file.

**Everyone who opens it gets their own copy.** Their edits stay on their machine
and never come back to you, which is right for "here is the picture, have a
look" and wrong for keeping a shared list up to date. That needs a real backend.

If a browser refuses storage for a file opened off disk, the app still works and
says so plainly at the top - it just cannot remember anything between openings,
so Back up and Export to Excel are the way out.

## Your data

Everything lives in your browser's local storage under `travel-tracker/v1`.
Nothing is sent anywhere.

The toolbar keeps its buttons apart by what they do, not by file type:

| Button | Format | Effect |
| --- | --- | --- |
| **Export to Excel** | `.xlsx` | Read-only report of everything, for sharing |
| **Back up** | `.json` | Complete copy: members, trips and who is on them |
| **Restore** | `.json` | **Replaces everything** with a backup — asks first |
| **Import members** (Members panel) | `.xlsx` | Merges people into the roster |
| **Import trips** (above the board) | `.xlsx` | Adds or refreshes trips and who was on them |

Back up is what you keep; it is also how you move to a hosted version later.
Restore is the only button that can lose data, so it names what it is about to
load and waits for you to confirm.

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
    readTripBlocks.ts    Finds trip blocks laid out across a sheet
    importTrips.ts       Matches names and folds trips in
    boss.ts              Who gets the Boss panel (by name, for now)
    names.ts             One canonical form for every name comparison
    exportRows.ts        Flattens everything to one row per person per trip
    writeWorkbook.ts     Turns those rows into spreadsheet cells
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
    ImportTripsDialog.tsx    Trips found, their dates, and what will change
    BossPanel.tsx        The boss, alone above the team columns
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

No component changes; the existing data moves across via Back up / Restore.
