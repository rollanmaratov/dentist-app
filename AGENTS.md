This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project conventions (Doctor Dent)

- **Node:** Expo SDK 58 requires Node ≥ 22.13 — run `nvm use` (`.nvmrc` pins Node 26) before any `npx expo` command.
- **Design source:** Figma file `uGS7sB6uqCHwky6CMurkWj` ("Dentist app | Study Kvo"), page "Working doc". Screens live in the **Main App** and **Sign in flow** sections; the requirements spec is the "Функциональные требования…" section. Screen files reference their Figma node IDs in a doc comment.
- **Tokens:** `src/theme/index.ts` mirrors the Figma variables (`--color-*`, `--space-*`, `--radius-*`, text styles, `shadow/*`). Never hardcode colors/spacing in screens — add a token if one is missing. Light mode only.
- **Native navigation only:** tab bar is `NativeTabs` (`expo-router/native-tabs`), every tab is a native `Stack` using `stackScreenOptions` from `src/navigation/stack-options.ts`. Do not set header backgrounds or custom back buttons — iOS 26 renders them as Liquid Glass. Use SF Symbols (`expo-symbols`) for icons, `Stack.SearchBar` for search, `Alert.alert` for confirm dialogs.
- **Page titles:** never style titles through native header options. The native header can't render SF Pro Rounded (`ui-rounded` only works in `<Text>`), so it silently falls back to regular SF Pro. Render titles in content with `<PageTitle>` (Heading 1 for Figma "Large Title" toolbars, Heading 2 for tab pages without a toolbar) and set `headerTitle: ''`. Only Figma toolbars with the "Default" style (e.g. Support Chat) use the native inline title. Tab roots with no back button (e.g. Book) hide the native header entirely and start the title 58pt below the status bar, where Figma's large-title toolbar puts it — an empty native bar doesn't reliably reserve space.
- **Scroll views** under a native header/tab bar need `contentInsetAdjustmentBehavior="automatic"`.
- **Pinned bottom buttons** use `<PinnedFooter>` (`src/components/pinned-footer.tsx`): its native `SafeAreaView` includes the floating tab bar, so the button sits above it. Reserve `PINNED_FOOTER_SPACE` at the end of the scroll content.
- **Buttons** follow Figma's Button component: `primary` / `secondary` (outline) / `danger` (outline); 56pt, 15pt semibold labels. `compact` (48pt) is for specialist cards, `large` only for sign-in "Continue".
- **Data:** screens use the React Query hooks in `src/data/queries.ts`, never `supabase` directly. `src/data/api.ts` is the only file that talks to Supabase and maps rows to camelCase types. Mutations invalidate the affected query keys.
- **Backend rules live in the database** (`supabase/migrations/`): booking window, clinic hours (Asia/Almaty), double-booking, RLS. Patients write only through the `book_appointment` / `cancel_appointment` / `leave_review` / `delete_my_account` functions. Change rules in a new migration and run `npm run test:db`.
- **Chat:** `useChatRealtime()` (mounted in the tabs layout) refetches chat queries on Supabase Realtime changes; the Chat badge is `useUnreadChatCount()`. Keyboard-following UI uses `react-native-keyboard-controller` (`KeyboardProvider` is in the root layout), not `KeyboardAvoidingView`. Support replies come from the SQL editor via `support_reply(phone, body)`.
- **Architecture overview:** `docs/ARCHITECTURE.md`.
- **Auth:** Supabase phone OTP (6 digits) via `src/features/auth/session.tsx`; `Stack.Protected` in `src/app/_layout.tsx` switches between `(auth)` and `(tabs)`. Dev test numbers are in `supabase/config.toml` → `[auth.sms.test_otp]`.
