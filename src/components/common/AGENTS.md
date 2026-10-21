# Common Components

Shared UI components used across multiple features. Before hand-rolling a header, list row,
info box, confirmation, password field or reboot banner, use the component here.

Import each component directly from its file. There is no barrel (`index.ts`) for this folder.

```tsx
import { PageHeader } from '@/components/common/PageHeader'
```

## Layout

### PageHeader

Sticky page header with title, optional back button and actions.

```tsx
;<PageHeader
  title="Edit Light Show"
  subtitle="Living Room"
  onBack={onClose}
  actions={<Button>Save</Button>}
/>
```

- `title` (required), `subtitle`, `onBack` (omit to hide the back button), `actions`, `className`
- `belowAppHeader`: set when the screen renders under the sticky `ControllerHeader` (all
  controller routes). The header then sticks just below it, including its safe-area padding.
  Without it the header sticks at `top-0` with `pt-safe` (full-screen editors).
- `BELOW_APP_HEADER` (exported class string): the same sticky offset for custom headers such as
  the Effects search header.

A sticky header only works if no ancestor has `overflow: auto`, so render it outside
`ScreenContainer`.

### SettingsPage

Layout for settings screens: `PageHeader` (with `belowAppHeader`), a Save button while there are
unsaved edits, `LoadingScreen` while loading, and padded, spaced content.

```tsx
;<SettingsPage
  title="WiFi Setup"
  onBack={onBack}
  isLoading={isLoading}
  isDirty={isDirty}
  isSaving={mutation.isPending}
  onSave={handleSave}
>
  …sections…
</SettingsPage>
```

Pair it with `useConfigEdits` (`src/hooks/useConfigEdits.ts`) for the edit state:

```tsx
const ntp = useConfigEdits(ntpConfig) // { formData, setField, setNested, isDirty, reset }
ntp.setField('host', value)
sync.setNested('recv', 'bri', checked)
// after a successful save: await refetch(); ntp.reset()
```

### LoadingScreen

Centered spinner with an optional `message`.

## Lists

### ListSection, List, ListItem

iOS-style grouped list.

```tsx
;<ListSection title="WiFi Network" action={<Button size="sm">Scan</Button>}>
  <ListItem onClick={handleClick}>Click me</ListItem>
  <ListItem active>Currently selected</ListItem>
</ListSection>
```

- `ListSection`: `title`, `action` (shown right of the title), `className`
- `ListItem`: `onClick`, `active`, `className`. With `onClick` it is keyboard accessible
  (role=button, Enter/Space). It may contain its own controls (e.g. a Switch); stop click
  propagation on them if they must not trigger the row.

### ListItemWithIcon

The standard settings row: icon, title, subtitle and a right-side element.

```tsx
;<ListItemWithIcon
  icon={Lock}
  title="OTA Lock"
  subtitle="Require password for firmware updates"
  rightElement={<Switch checked={on} onCheckedChange={setOn} />}
/>
```

- `icon` (optional), `iconClassName`, `title` and `subtitle` (strings or nodes), `onClick`, `active`
- `rightElement` defaults to a chevron; pass `null` for nothing.

## Feedback

- **InfoBox**: `variant` `"info"` (theme `--info-*` tokens) | `"warning"` | `"muted"` (the
  "About …" boxes on settings screens); `title`, `description` (string or node), `icon`, `action`.
- **EmptyState**: `icon`, `title`, `description`, optional `action: { label, onClick }`.
- **ErrorState**: `title`, `message`, `onRetry`, `retryLabel`.
- **RebootPrompt**: banner for changes that need a device reboot. The button optionally saves
  first, reboots, then polls `/json/info` until the device is back.

  ```tsx
  <RebootPrompt baseUrl={baseUrl} show={isDirty} onSaveBeforeReboot={save}
    message="WiFi changes require a device reboot to take effect." />
  ```

  Props: `show`, `onSaveBeforeReboot` (if it throws, no reboot happens; so pass a save function
  that rethrows), `onReconnected`, `title`, `message`, `buttonLabel` (defaults to
  "Save & Reboot" or "Reboot Now"), `confirmMessage` (ask in a ConfirmationDialog first).
  `show` may go false once the save clears the edits; the banner stays up until the reboot
  flow finishes, so tie `show` to "has unsaved edits" without special-casing the save.

## Dialogs

- **ConfirmationDialog**: use instead of `window.confirm`. `open`, `onOpenChange`, `title`,
  `description`, `confirmLabel`, `cancelLabel`, `confirmVariant`, `onConfirm` (may be async; the
  dialog closes when it resolves).
- **SimpleInputDialog**: single text field dialog. `open`, `onOpenChange`, `title`,
  `fieldLabel`, `placeholder`, `defaultValue`, `onSubmit(value)` (closes after it resolves),
  `submitLabel`, `inputType`, `required`.
- **SplitSegmentDialog**: pick a split point inside a segment, with snapping to global segment
  boundaries. The split point resets to the midpoint each time it opens.

  ```tsx
  <SplitSegmentDialog
    open={open}
    segment={{ start, stop, n }} // or null
    segmentIndex={index}
    controllerId={controllerId}
    ledCount={ledCount}
    allSegments={segments.map(({ start, stop }) => ({ start, stop }))}
    onSplit={(splitPoint) => …}
    onCancel={() => setOpen(false)}
  />
  ```

## Form inputs

Use `@/components/ui/input` (shadcn `Input`) for text and number fields, not raw `<input>`s with
copied class strings.
- **PasswordInput**: password field with a show/hide toggle. `id`, `value`, `onChange(value)`,
  `currentLength` (WLED only reports the stored password's length; shown as placeholder),
  `placeholder`.
- **IpAddressInput**: four 0-255 octet fields. `label` (accessible name), `value`, `fallback`
  (shown for missing octets), `onChange([a, b, c, d])`.
- **TextField, NumberField, SelectField** (`FormField.tsx`): label + input + description.
  Each takes `id`, `label`, `value`, `onChange`, `description`; `NumberField` clamps to
  `min`/`max`; `SelectField` takes `options: { id, name }[]`.
- **RangeInput**: labeled slider. `value`, `min`, `max`, `step`, `onChange`, `label`, `showValue`.
- **ActionButtonBar**: sticky footer of buttons: `buttons: { label, onClick, variant, icon,
  disabled }[]` (labels must be unique; they are the keys).

## Display

- **ColorSwatch** (`color`, `size`, `onClick` makes it a button), **ColorSwatchRow** (`colors`,
  `size`, `onColorClick`).
- **PaletteColorStrip**: gradient preview. `colors`, `height`.
- **SegmentRow**: segment row with LED range, effect preview and split/merge/group actions.
- **SegmentEffectPreview**: `effect`, `effectName`, `colors`, `paletteId`, `palettes`.
- **FlagBadge**, **EffectFlagBadges**: effect capability badges (`flags`).

## Styling

- Use theme utilities (`bg-list-bg`, `border-list-divider`, `bg-info-bg`), not
  `bg-[var(--color-…)]`.
- Theme tokens live in `src/index.css`. Info uses tokens; warnings (yellow) and success (green)
  use Tailwind palette colors.
