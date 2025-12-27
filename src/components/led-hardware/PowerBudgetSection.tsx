import { RangeInput } from '@/components/common/RangeInput'
import { ListSection } from '@/components/common/List'
import { Zap } from 'lucide-react'

interface PowerBudgetSectionProps {
  maxPower: number
  onMaxPowerChange: (value: number) => void
  maPerLed: number
  onMaPerLedChange: (value: number) => void
  totalLeds: number
}

export function PowerBudgetSection({
  maxPower,
  onMaxPowerChange,
  maPerLed,
  onMaPerLedChange,
  totalLeds,
}: PowerBudgetSectionProps) {
  const estimatedPower = totalLeds * maPerLed
  const powerBudgetPercent = maxPower > 0 ? Math.round((estimatedPower / maxPower) * 100) : 0

  return (
    <ListSection title="Power Budget">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Max Power (mA)</div>
          <RangeInput
            label={`${maxPower} mA`}
            value={maxPower}
            onChange={onMaxPowerChange}
            min={0}
            max={65000}
            step={50}
          />
          <div className="text-xs text-muted-foreground">
            Maximum power budget for the LED strip (0 = unlimited)
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">mA per LED</div>
          <RangeInput
            label={`${maPerLed} mA`}
            value={maPerLed}
            onChange={onMaPerLedChange}
            min={0}
            max={255}
            step={1}
          />
          <div className="text-xs text-muted-foreground">
            Estimated power consumption per LED (typically 35-60mA)
          </div>
        </div>

        {maxPower > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Estimated usage:</span>
              <span
                className={
                  powerBudgetPercent > 100 ? 'text-destructive' : 'text-muted-foreground'
                }
              >
                {estimatedPower} mA ({powerBudgetPercent}% of budget)
              </span>
            </div>
            {powerBudgetPercent > 100 && (
              <div className="text-xs text-destructive mt-1">
                Warning: Estimated power exceeds budget. WLED will limit brightness to stay
                within budget.
              </div>
            )}
          </div>
        )}
      </div>
    </ListSection>
  )
}
