import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'

interface SegmentSplitScreenProps {
  segmentIndex: number
  start: number
  stop: number
  onSplit: (splitPoint: number) => void
  onBack: () => void
}

export function SegmentSplitScreen({
  segmentIndex,
  start,
  stop,
  onSplit,
  onBack,
}: SegmentSplitScreenProps) {
  const midpoint = Math.floor((start + stop) / 2)
  const [splitPoint, setSplitPoint] = useState(midpoint)

  const handleSliderChange = ([value]: number[]) => {
    setSplitPoint(value)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > start && value < stop) {
      setSplitPoint(value)
    }
  }

  const handleSplit = () => {
    if (splitPoint > start && splitPoint < stop) {
      onSplit(splitPoint)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        title={`Split Segment ${segmentIndex + 1}`}
        subtitle={`LEDs ${start}–${stop}`}
        onBack={onBack}
      />

      <ScreenContainer className="p-4 space-y-6">
        <div className="space-y-2">
          <Label>Split Point</Label>
          <p className="text-sm text-muted-foreground">
            Choose where to split this segment
          </p>
        </div>

        {/* Visual preview */}
        <div className="relative h-10 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 left-0 bg-primary/50"
            style={{ width: `${((splitPoint - start) / (stop - start)) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-secondary/50"
            style={{ width: `${((stop - splitPoint) / (stop - start)) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-1 bg-foreground"
            style={{ left: `calc(${((splitPoint - start) / (stop - start)) * 100}% - 2px)` }}
          />
        </div>

        {/* Slider and input */}
        <div className="flex items-center gap-4">
          <Slider
            value={[splitPoint]}
            min={start + 1}
            max={stop - 1}
            step={1}
            onValueChange={handleSliderChange}
            className="flex-1"
          />
          <Input
            type="number"
            value={splitPoint}
            min={start + 1}
            max={stop - 1}
            onChange={handleInputChange}
            className="w-20 text-right"
          />
        </div>

        {/* Result preview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="font-medium">Segment A</div>
            <div className="text-muted-foreground">{start} – {splitPoint}</div>
            <div className="text-sm text-muted-foreground">{splitPoint - start} LEDs</div>
          </div>
          <div className="p-3 bg-secondary/10 rounded-lg">
            <div className="font-medium">Segment B</div>
            <div className="text-muted-foreground">{splitPoint} – {stop}</div>
            <div className="text-sm text-muted-foreground">{stop - splitPoint} LEDs</div>
          </div>
        </div>
      </ScreenContainer>

      {/* Footer */}
      <footer
        className="sticky bottom-0 border-t bg-background p-4"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSplit} className="flex-1">
            Split Segment
          </Button>
        </div>
      </footer>
    </div>
  )
}

interface HeaderProps {
  title: string
  subtitle: string
  onBack: () => void
}

function Header({ title, subtitle, onBack }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center h-14 px-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}
