import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SegmentSplitterProps {
  start: number
  stop: number
  onSplit: (splitPoint: number) => void
  onCancel: () => void
}

export function SegmentSplitter({
  start,
  stop,
  onSplit,
  onCancel,
}: SegmentSplitterProps) {
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
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="space-y-2">
        <Label>Split Point</Label>
        <p className="text-xs text-muted-foreground">
          Choose where to split this segment ({start} - {stop})
        </p>
      </div>

      {/* Visual preview */}
      <div className="relative h-8 bg-muted rounded-full overflow-hidden">
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
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 bg-primary/10 rounded">
          <div className="font-medium">Segment A</div>
          <div className="text-muted-foreground">{start} - {splitPoint}</div>
          <div className="text-xs text-muted-foreground">{splitPoint - start} LEDs</div>
        </div>
        <div className="p-2 bg-secondary/10 rounded">
          <div className="font-medium">Segment B</div>
          <div className="text-muted-foreground">{splitPoint} - {stop}</div>
          <div className="text-xs text-muted-foreground">{stop - splitPoint} LEDs</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSplit} className="flex-1">
          Split
        </Button>
      </div>
    </div>
  )
}
