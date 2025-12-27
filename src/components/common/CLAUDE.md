# Common Components

Shared UI components used across multiple features.

## Layout Components

### PageHeader

Standard page header with title, back button, and optional actions.

```tsx
import { PageHeader } from '@/components/common/PageHeader';

<PageHeader
  title="Edit Light Show"
  subtitle="Living Room"
  onBack={() => navigate(-1)}
  actions={<Button>Save</Button>}
/>
```

Props:
- `title` (string, required) - Main title text
- `subtitle` (string) - Secondary text below title
- `onBack` (() => void) - Back button callback; omit to hide back button
- `actions` (ReactNode) - Right-side action buttons
- `className` (string) - Additional CSS classes

### LoadingScreen

Centered loading spinner with optional message.

```tsx
import { LoadingScreen } from '@/components/common/LoadingScreen';

<LoadingScreen message="Loading presets..." />
```

Props:
- `message` (string) - Text to display below spinner
- `className` (string) - Additional CSS classes

### List, ListSection, ListItem

iOS-style grouped list components for settings and navigation.

```tsx
import { ListSection, ListItem } from '@/components/common/List';

<ListSection title="Settings">
  <ListItem onClick={handleClick}>Click me</ListItem>
  <ListItem active>Currently selected</ListItem>
</ListSection>
```

Props (ListSection):
- `title` (string) - Section header text
- `children` (ReactNode) - ListItem components

Props (ListItem):
- `onClick` (() => void) - Click handler
- `active` (boolean) - Highlighted state
- `children` (ReactNode) - Item content

## Form Components

### RangeInput

Labeled slider input for numeric values.

```tsx
import { RangeInput } from '@/components/common/RangeInput';

<RangeInput
  label="Brightness"
  value={brightness}
  onChange={setBrightness}
  min={0}
  max={255}
/>
```

### TextField, NumberField, SelectField

Form field wrappers with labels and descriptions.

```tsx
import { TextField, NumberField, SelectField } from '@/components/common/FormField';

<TextField label="Name" value={name} onChange={setName} />
<NumberField label="Count" value={count} onChange={setCount} min={1} max={100} />
<SelectField label="Mode" value={mode} onChange={setMode} options={modeOptions} />
```

## Display Components

### ColorSwatch, ColorSwatchRow

Display color preview squares.

```tsx
import { ColorSwatch, ColorSwatchRow } from '@/components/common/ColorSwatch';

<ColorSwatch color={[255, 128, 0]} size="lg" />
<ColorSwatchRow colors={[[255, 0, 0], [0, 255, 0], [0, 0, 255]]} />
```

### PaletteColorStrip

Renders a gradient preview from palette data.

```tsx
import { PaletteColorStrip } from '@/components/common/PaletteColorStrip';

<PaletteColorStrip palette={paletteData} height={24} />
```

### SegmentRow

Displays a segment with LED count and effect preview.

```tsx
import { SegmentRow } from '@/components/common/SegmentRow';

<SegmentRow
  segment={segment}
  effects={effects}
  palettes={palettes}
  onClick={handleClick}
/>
```

### SegmentEffectPreview

Animated preview of a segment's current effect.

```tsx
import { SegmentEffectPreview } from '@/components/common/SegmentEffectPreview';

<SegmentEffectPreview segment={segment} effects={effects} palettes={palettes} />
```

### FlagBadge, EffectFlagBadges

Display effect capability flags (1D, 2D, audio, etc.).

```tsx
import { EffectFlagBadges } from '@/components/common/FlagBadge';

<EffectFlagBadges flags={effect.flags} />
```

## Dialogs

### SplitSegmentDialog

Dialog for splitting a segment at a specific LED index.

```tsx
import { SplitSegmentDialog } from '@/components/common/SplitSegmentDialog';

<SplitSegmentDialog
  open={showDialog}
  onClose={() => setShowDialog(false)}
  segment={segment}
  onSplit={(splitPoint) => handleSplit(segment.id, splitPoint)}
/>
```

## Import Pattern

Components can be imported from the barrel export or directly:

```tsx
// From barrel (recommended)
import { PageHeader, LoadingScreen, ListSection } from '@/components/common';

// Direct import
import { PageHeader } from '@/components/common/PageHeader';
```
