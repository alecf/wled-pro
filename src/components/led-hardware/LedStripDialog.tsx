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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { LedInstance } from '@/types/wled'
import { NumberField, SelectField, TextField } from './FormField'
import { COLOR_ORDERS, LED_TYPES, RGBW_MODES } from './constants'

interface LedStripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  strip: LedInstance | null
  onSave: (strip: LedInstance) => void
  stripIndex: number
}

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

  // Check if RGBW mode is relevant based on LED type and color order
  const isRgbwRelevant = () => {
    // Check if LED type supports white channel
    const ledType = LED_TYPES.find(t => t.id === type)
    if (ledType?.hasWhite) return true

    // Check if color order has white channel (4-channel orders: 6-17)
    if (order >= 6 && order <= 17) return true

    return false
  }

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
              <NumberField
                id="start"
                label="Start Index"
                value={start}
                onChange={setStart}
                min={0}
                max={8191}
              />
              <NumberField
                id="len"
                label="LED Count"
                value={len}
                onChange={setLen}
                min={1}
                max={8192}
              />
            </div>
            <TextField
              id="pin"
              label="GPIO Pin(s)"
              value={pin}
              onChange={setPin}
              placeholder="e.g., 16 or 16, 17"
              description="Comma-separated for multi-pin setups"
            />
          </div>

          {/* LED Configuration */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">LED Configuration</h3>
            <SelectField
              id="type"
              label="LED Type"
              value={type}
              onChange={setType}
              options={LED_TYPES}
            />
            <SelectField
              id="order"
              label="Color Order"
              value={order}
              onChange={setOrder}
              options={COLOR_ORDERS}
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Advanced Options</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="skip"
                label="Skip First LEDs"
                value={skip}
                onChange={(val) => setSkip(Math.min(len - 1, val))}
                min={0}
                max={len - 1}
              />
              {isRgbwRelevant() && (
                <SelectField
                  id="rgbwm"
                  label="RGBW Mode"
                  value={rgbwm}
                  onChange={setRgbwm}
                  options={RGBW_MODES}
                />
              )}
            </div>
            {type >= 40 && (
              <NumberField
                id="freq"
                label="PWM Frequency (kHz)"
                value={freq}
                onChange={setFreq}
                min={0}
                max={100000}
              />
            )}
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="rev" className="text-xs">
                Reversed Direction
              </Label>
              <Switch id="rev" checked={rev} onCheckedChange={setRev} />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="ref" className="text-xs">
                Mirror/Reflect
              </Label>
              <Switch id="ref" checked={ref} onCheckedChange={setRef} />
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
