# Daya's Tea — Mobile (local-only)

Fully on-device Expo app: no server, no account, $0 forever. Tea records
live in a local SQLite database (`expo-sqlite`) and photos live in the
app's private document storage (`expo-file-system`) — nothing leaves the
phone unless you export it.

This step adds the full product flow on top of the storage layer: camera
capture, the bilingual add/edit form, and the gallery screen with search,
filter, sort, and an on-device Excel export. UI is plain React Native
components with custom `StyleSheet` styling — see "On gluestack-ui" below
for why it isn't a dependency after all.

## On gluestack-ui

An earlier pass added gluestack-ui (`@gluestack-ui/themed`) as the UI
library. Installing it for real surfaced a problem invisible from its
docs alone: its dependency tree pulls in Adobe's `@react-spectrum`
ecosystem (~80 packages, a **web** design system) and `@react-native-aria`
packages that require React 16/17, conflicting with this project's React
18 and breaking `npm install`/`expo start` outright (a missing
`expo-asset` module error traced back to this). Nothing in the app's
screens had actually started using its components yet, so it was removed
with zero functional loss — the screens already stand on plain React
Native + `StyleSheet`, which is what's here now.

## Why local instead of the FastAPI/Postgres backend

The `backend/` folder from an earlier step is no longer part of the plan
— per your call, everything runs on-device instead. It's left in place in
case you ever want multi-device sync later; it isn't used by this app.

## Folder structure

```
mobile/
├── app.json                    # Expo config: camera/photo permissions, plugins
├── babel.config.js
├── package.json
├── tsconfig.json
├── App.tsx                     # Opens DB, runs seed import, renders navigation
└── src/
    ├── types/
    │   └── tea.ts                # Tea, TeaInput, TeaQuery, TeaCategory, etc.
    ├── db/
    │   ├── schema.ts             # CREATE TABLE + versioned migrations
    │   ├── client.ts             # opens/memoizes the SQLite connection
    │   ├── rowMapping.ts         # snake_case DB row -> camelCase Tea
    │   ├── teaRepository.ts      # createTea/getTea/updateTea/deleteTea/listTeas
    │   └── index.ts
    ├── data/
    │   ├── seedTeas.json          # 446-item bundled catalog (from your PDF)
    │   ├── seedCatalog.ts         # one-time import of seedTeas.json on first launch
    │   ├── photoStorage.ts        # persist/delete a tea's photo file
    │   └── exportXlsx.ts          # builds + shares the .xlsx export
    ├── navigation/
    │   ├── types.ts               # RootStackParamList
    │   └── RootNavigator.tsx      # Library -> Camera -> TeaForm stack
    ├── theme/
    │   └── gluestackConfig.ts     # single import point for the UI theme
    ├── utils/
    │   └── rtl.ts                 # RTL styling helper for Hebrew fields
    ├── components/
    │   ├── TeaCard.tsx            # gallery grid item
    │   ├── CategoryBadge.tsx      # category pill / filter chip
    │   ├── RatingStars.tsx        # 1-5 stars, read-only or interactive
    │   └── FormInput.tsx          # labeled text input (RTL-aware)
    └── screens/
        ├── LibraryScreen.tsx      # gallery + search/filter/sort/export + FAB
        ├── CameraScreen.tsx       # expo-camera capture (+ pick from library)
        └── TeaFormScreen.tsx      # add/edit details form
```

## Setup

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (or run `npm run ios` / `npm run android`
with a simulator). First launch opens the database, imports the 446-item
catalog, and lands on the library.

**Note on installed versions:** dependencies were installed from this
sandboxed session, which could reach the npm registry but not Expo's own
compatibility API (`npx expo install`'s version-resolution step), so
versions were pinned by hand to match Expo SDK 52 rather than
auto-resolved. Run `npx expo install --check` on your own machine once to
confirm everything lines up with your exact SDK patch version, and `npx
expo-doctor` if `expo start` complains about anything.

## The product flow, screen by screen

1. **LibraryScreen** — gallery grid (`FlatList`, 2 columns) of `TeaCard`s.
   Search box (debounced, searches every bilingual text field), a filter
   panel (category chips, minimum-rating chips, sort field + direction),
   and a share/export button in the header. Refetches whenever the screen
   regains focus, so saving a tea and navigating back updates the grid.
2. **CameraScreen** — `expo-camera`'s `CameraView` with a shutter button,
   front/back flip, and a "choose from library" fallback via
   `expo-image-picker`. Requests permission on demand with a friendly
   prompt if not yet granted.
3. **TeaFormScreen** — doubles as both **add** (arrives with a fresh
   `photoUri`) and **edit** (arrives with a `teaId`, loads the existing
   record). Every bilingual field has an English input plus a Hebrew
   input rendered right-to-left (`utils/rtl.ts`). Category is a row of
   selectable pills; rating is tap-to-set stars. Saving a new tea copies
   the photo into permanent storage first (`photoStorage.saveTeaPhoto`)
   using a client-generated id, then inserts the record with that same
   id — one DB write, no orphaned photo if something fails in between.
   Edit mode adds a Delete button (confirms, then removes the DB row and
   its photo file).
4. **Export** — `data/exportXlsx.ts` builds the workbook client-side with
   SheetJS (`xlsx`), honoring whatever search/filter is currently active
   in the library, writes it to the cache directory, and opens the native
   share sheet (`expo-sharing`) so you can AirDrop/email/save it wherever
   you like. Columns mirror the original backend export (bilingual
   name/brand/series, category, rating, origin, ingredients, description,
   notes) with a "Has Photo" column instead of an image URL, since a
   local `file://` path is meaningless once it leaves the phone.

## Data quality note (unchanged from the storage-layer step)

Name/Brand/Series/Category came through the source PDF reliably for
effectively every row. Ingredients/Description/Origin are populated only
where the PDF's text layer extracted cleanly (roughly a third of rows) —
blank otherwise, fillable by hand in the form.

## Verification

- `npm run typecheck` (`tsc --noEmit`) passes clean against the real
  installed `expo-sqlite`/`expo-camera`/`expo-image-picker`/
  `@react-navigation`/`@gluestack-ui` types — including that every
  `MaterialIcons` name used is a real glyph (the library's types reject
  invalid names).
- The SQL layer (schema, seed import, search/filter/sort, the rating
  CHECK constraint, update, delete) was exercised against a real SQLite
  engine in the storage-layer step and is unchanged here.
- Not yet done: an actual on-device run through Expo Go/a simulator —
  that needs your machine's camera/simulator, so give it a run and let me
  know if anything looks off.

## What's next (optional polish, not required to use the app)

- Empty/loading states are minimal — could add nicer skeleton loading for
  the gallery.
- No pull-to-refresh spinner styling beyond the default `FlatList`
  behavior.
- No image compression/resizing before saving — photos are stored at
  whatever quality `expo-camera` captures (quality: 0.7); fine for a
  personal collection, but worth revisiting if storage becomes a concern
  with hundreds of your own photos.
