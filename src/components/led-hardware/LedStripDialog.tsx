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

const LED_TYPES = [
  { id: 22, name: 'WS2812B (RGB)' },
  { id: 31, name: 'SK6812 RGBW' },
  { id: 24, name: 'WS2801' },
  { id: 25, name: 'APA102' },
  { id: 26, name: 'LPD8806' },
  { id: 27, name: 'P9813' },
  { id: 30, name: 'TM1814' },
  { id: 32, name: 'TM1829' },
  { id: 33, name: 'UCS8903' },
  { id: 34, name: 'GS8208' },
  { id: 35, name: 'WS2811 400kHz' },
  { id: 36, name: 'SK6812 WWA' },
  { id: 37, name: 'UCS8904' },
  { id: 40, name: 'PWM White' },
  { id: 41, name: 'PWM CCT' },
  { id: 42, name: 'PWM RGB' },
  { id: 43, name: 'PWM RGBW' },
  { id: 44, name: 'PWM RGB+CCT' },
]

const RGBW_MODES = [
  { id: 0, name: 'Auto (SK6812)' },
  { id: 1, name: 'Dual (RGB + White)' },
  { id: 2, name: 'White Channel Only' },
  { id: 3, name: 'Manual' },
  { id: 4, name: 'None' },
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
    const pinNumbers = pin.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p >= 0)

    if (pinNumbers.length === 0) {
      alert('Please enter at least one valid GPIO pin number')
      return
    }

    if (len <= 0) {
      alert('LED count must be at least 1')
      return
    }

    if (skip >= len) {
      alert('Skip count must be less than LED count')
      return
    }

    const updatedStrip: LedInstance = {
      start: Math.max(0, start),
      len: Math.max(1, len),
      pin: pinNumbers,
      order,
      rev,
      skip: Math.max(0, Math.min(skip, len - 1)),
      type,
      ref,
      rgbwm,
      freq: Math.max(0, freq),
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

        <div className="space-y-6 py-4">
          {/* Basic Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Basic Configuration</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start" className="text-xs">Start Index</Label>
                <Input
                  id="start"
                  type="number"
                  value={start}
                  onChange={(e) => setStart(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  max={8191}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="len" className="text-xs">LED Count</Label>
                <Input
                  id="len"
                  type="number"
                  value={len}
                  onChange={(e) => setLen(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={8192}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin" className="text-xs">GPIO Pin(s)</Label>
              <Input
                id="pin"
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="e.g., 16 or 16, 17"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated for multi-pin setups
              </p>
            </div>
          </div>

          {/* LED Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">LED Configuration</h3>
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs">LED Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(parseInt(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background text-sm"
              >
                {LED_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order" className="text-xs">Color Order</Label>
              <select
                id="order"
                value={order}
                onChange={(e) => setOrder(parseInt(e.target.value))}
                className="w-full p-2 border border-border rounded-md bg-background text-sm"
              >
                {COLOR_ORDERS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Advanced Options</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="skip" className="text-xs">Skip First LEDs</Label>
                <Input
                  id="skip"
                  type="number"
                  value={skip}
                  onChange={(e) => setSkip(Math.max(0, Math.min(len - 1, parseInt(e.target.value) || 0)))}
                  min={0}
                  max={len - 1}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rgbwm" className="text-xs">RGBW Mode</Label>
                <select
                  id="rgbwm"
                  value={rgbwm}
                  onChange={(e) => setRgbwm(parseInt(e.target.value))}
                  className="w-full p-2 border border-border rounded-md bg-background text-sm"
                >
                  {RGBW_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {type >= 40 && (
              <div className="space-y-1.5">
                <Label htmlFor="freq" className="text-xs">PWM Frequency (kHz)</Label>
                <Input
                  id="freq"
                  type="number"
                  value={freq}
                  onChange={(e) => setFreq(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  max={100000}
                />
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="rev" className="text-xs">Reversed Direction</Label>
              <Switch
                id="rev"
                checked={rev}
                onCheckedChange={setRev}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="ref" className="text-xs">Mirror/Reflect</Label>
              <Switch
                id="ref"
                checked={ref}
                onCheckedChange={setRef}
              />
            </div>
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
