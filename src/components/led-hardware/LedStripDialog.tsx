import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RangeInput, ListSection } from '@/components/common'
import type { LedInstance } from '@/types/wled'

interface LedStripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strip: LedInstance | null
  onSave: (strip: LedInstance) => void
  stripIndex: number
}

const COLOR_ORDERS = [
  { id: 0, name: 'GRB' },
  { id: 1, name: 'RGB' },
  { id: 2, name: 'BRG' },
  { id: 3, name: 'RBG' },
  { id: 4, name: 'GBR' },
  { id: 5, name: 'BGR' },
  { id: 6, name: 'WRGB' },
  { id: 7, name: 'WRBG' },
  { id: 8, name: 'WGRB' },
  { id: 9, name: 'WGBR' },
  { id: 10, name: 'WBRG' },
  { id: 11, name: 'WBGR' },
  { id: 12, name: 'RGBW' },
  { id: 13, name: 'RBGW' },
  { id: 14, name: 'GRBW' },
  { id: 15, name: 'GBRW' },
  { id: 16, name: 'BRGW' },
  { id: 17, name: 'BGRW' },
]

export function LedStripDialog({ open, onOpenChange, strip, onSave, stripIndex }: LedStripDialogProps) {
  const [start, setStart] = useState(0)
  const [len, setLen] = useState(150)
  const [pin, setPin] = useState('16')
  const [order, setOrder] = useState(0)
  const [rev, setRev] = useState(false)
  const [skip, setSkip] = useState(0)
  const [type, setType] = useState(22)
  const [ref, setRef] = useState(false)
  const [rgbwm, setRgbwm] = useState(0)
  const [freq, setFreq] = useState(0)

  // Sync with strip prop
  useEffect(() => {
    if (strip) {
      setStart(strip.start)
      setLen(strip.len)
      setPin(strip.pin.join(', '))
      setOrder(strip.order)
      setRev(strip.rev)
      setSkip(strip.skip)
      setType(strip.type)
      setRef(strip.ref)
      setRgbwm(strip.rgbwm)
      setFreq(strip.freq)
    } else if (open && stripIndex === -1) {
      // Reset to defaults when adding a new strip
      setStart(0)
      setLen(150)
      setPin('16')
      setOrder(0)
      setRev(false)
      setSkip(0)
      setType(22)
      setRef(false)
      setRgbwm(0)
      setFreq(0)
    }
  }, [strip, open, stripIndex])

  const handleSave = () => {
    // Parse pin numbers from comma-separated string
    const pinNumbers = pin.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))

    if (pinNumbers.length === 0) {
      alert('Please enter at least one valid GPIO pin number')
      return
    }

    const updatedStrip: LedInstance = {
      start,
      len,
      pin: pinNumbers,
      order,
      rev,
      skip,
      type,
      ref,
      rgbwm,
      freq,
    }

    onSave(updatedStrip)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {stripIndex === -1 ? 'Add LED Strip' : `Edit LED Strip ${stripIndex + 1}`}
          </DialogTitle>
          <DialogDescription>
            Configure the LED strip settings. Changes require a device reboot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Start Index */}
          <div className="space-y-2">
            <Label htmlFor="start">Start Index</Label>
            <Input
              id="start"
              type="number"
              value={start}
              onChange={(e) => setStart(parseInt(e.target.value) || 0)}
              min={0}
              max={8191}
            />
            <p className="text-xs text-muted-foreground">
              First LED index for this strip
            </p>
          </div>

          {/* LED Count */}
          <div className="space-y-2">
            <Label htmlFor="len">LED Count</Label>
            <Input
              id="len"
              type="number"
              value={len}
              onChange={(e) => setLen(parseInt(e.target.value) || 0)}
              min={1}
              max={8192}
            />
            <p className="text-xs text-muted-foreground">
              Number of LEDs in this strip
            </p>
          </div>

          {/* GPIO Pins */}
          <div className="space-y-2">
            <Label htmlFor="pin">GPIO Pin(s)</Label>
            <Input
              id="pin"
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g., 16 or 16, 17 for multi-pin"
            />
            <p className="text-xs text-muted-foreground">
              GPIO pin number(s), comma-separated for multi-pin setups
            </p>
          </div>

          {/* Color Order */}
          <ListSection title="Color Order">
            <div className="p-4 space-y-2">
              <select
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {COLOR_ORDERS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Color channel order for this LED type
              </p>
            </div>
          </ListSection>

          {/* LED Type */}
          <div className="space-y-2">
            <Label htmlFor="type">LED Type ID</Label>
            <Input
              id="type"
              type="number"
              value={type}
              onChange={(e) => setType(parseInt(e.target.value) || 22)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              LED chipset type (22 = WS2812B, 31 = SK6812 RGBW, etc.)
            </p>
          </div>

          {/* Skip First N LEDs */}
          <div className="space-y-2">
            <Label htmlFor="skip">Skip First LEDs</Label>
            <Input
              id="skip"
              type="number"
              value={skip}
              onChange={(e) => setSkip(parseInt(e.target.value) || 0)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Number of LEDs to skip at the beginning of this strip
            </p>
          </div>

          {/* PWM Frequency */}
          {type >= 40 && (
            <div className="space-y-2">
              <Label htmlFor="freq">PWM Frequency (kHz)</Label>
              <Input
                id="freq"
                type="number"
                value={freq}
                onChange={(e) => setFreq(parseInt(e.target.value) || 0)}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                PWM frequency for analog LED strips (only for PWM types)
              </p>
            </div>
          )}

          {/* RGBW Mode */}
          <div className="space-y-2">
            <Label htmlFor="rgbwm">RGBW Mode</Label>
            <RangeInput
              label={rgbwm.toString()}
              value={rgbwm}
              onChange={setRgbwm}
              min={0}
              max={4}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              RGBW mode (0=Auto, 1=Dual, 2=White, 3=Manual, 4=None)
            </p>
          </div>

          {/* Reversed */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="rev">Reversed Direction</Label>
              <p className="text-xs text-muted-foreground">
                Reverse the LED data direction
              </p>
            </div>
            <Switch
              id="rev"
              checked={rev}
              onCheckedChange={setRev}
            />
          </div>

          {/* Mirror/Reflect */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="ref">Mirror/Reflect</Label>
              <p className="text-xs text-muted-foreground">
                Mirror the second half of the strip
              </p>
            </div>
            <Switch
              id="ref"
              checked={ref}
              onCheckedChange={setRef}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Strip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
