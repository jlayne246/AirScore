That’s a reasonable proof-of-concept branch.

The key is to treat facial gestures as an **input controller**, not as reader logic.

Your reader already has actions like:

```ts
goToPage(currentPage + pageStep)
goToPage(currentPage - pageStep)
onNextScoreFromPageTurn?.()
onPreviousScoreFromPageTurn?.()
toggleChrome()
```

So the facial gesture layer should only do this:

```text
detect gesture
→ map gesture to reader action
→ call existing function
```

For a branch, I’d structure it like:

```text
feature/facial-gesture-poc
```

## Minimal POC target

Do not start with full facial expression recognition. Start with one reliable gesture:

```text
Head turn right → next page
Head turn left → previous page
```

or:

```text
Mouth open → toggle controls
```

The POC should prove:

```text
camera can run inside Reader
gesture can be detected
false positives are manageable
reader action can be triggered
battery/performance is tolerable
```

## Suggested architecture

Create a controller component:

```tsx
<FacialGestureController
  enabled={settings.performanceMode && settings.gestureControls}
  onNextPage={handleNextPage}
  onPreviousPage={handlePreviousPage}
  onToggleControls={toggleChrome}
/>
```

Then inside `BufferedPDFViewer`, your existing tap-zone logic and gesture controller both call the same handlers:

```ts
const handleNextPage = () => {
  const nextPage = currentPage + pageStep;

  if (nextPage > totalPages) {
    onNextScoreFromPageTurn?.();
    return;
  }

  goToPage(nextPage, { showChrome: false });
};
```

```ts
const handlePreviousPage = () => {
  const previousPage = currentPage - pageStep;

  if (previousPage < 1) {
    onPreviousScoreFromPageTurn?.();
    return;
  }

  goToPage(previousPage, { showChrome: false });
};
```

Then:

```tsx
{settings.gestureControls && (
  <FacialGestureController
    enabled
    onNextPage={handleNextPage}
    onPreviousPage={handlePreviousPage}
    onToggleControls={toggleChrome}
  />
)}
```

## Important POC constraints

Use a cooldown:

```ts
const GESTURE_COOLDOWN_MS = 1200;
```

so one head turn does not trigger five page turns.

Use explicit enablement:

```text
Performance Mode → Gesture Controls → Enable
```

Use an on-screen indicator:

```text
Gesture controls active
```

and maybe a calibration status.

## What not to do yet

Do not wire it into global settings first.

Do not build a full calibration UI first.

Do not support many gestures first.

Do not make it default.

Start with:

```text
one gesture
one reader action
one branch
one tablet test
```

If it feels usable, then bring it back into the settings architecture later.

---

Yes — a wink is a better candidate than head turns for your use case.

As an organist, head movement is too natural:

```text
look at conductor
look at choir
look at manuals
look at stops
look at pedals
look back to score
```

So head-turn detection could create accidental page turns unless it’s heavily gated.

A wink is more intentional because it is less likely to happen during normal playing. I’d test something like:

```text
right wink → next page
left wink → previous page
mouth open / eyebrow raise → toggle controls
```

But I’d still design safeguards:

```text
Require one eye closed while the other remains open
Require gesture duration of maybe 250–600ms
Ignore normal blinks where both eyes close
Cooldown after trigger: 1000–1500ms
Optional calibration
On-screen “gesture armed” indicator
```

The logic would be roughly:

```ts
if (
  rightEyeClosed &&
  leftEyeOpen &&
  heldLongEnough &&
  cooldownExpired
) {
  onNextPage();
}
```

The important distinction:

```text
blink = both eyes close briefly
wink = one eye closes while the other remains open
```

So you’d need eye-open probability or facial landmark data.

I’d still do it after Settings, because then the branch can plug into:

```text
Performance Mode
  → Input Method
    → Facial Gestures
      → Right wink: Next page
      → Left wink: Previous page
      → Sensitivity
      → Cooldown
```

That makes the proof of concept feel like a natural extension of the app instead of a hardcoded experiment.

