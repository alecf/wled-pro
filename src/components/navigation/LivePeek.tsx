import { useEffect, useRef, useState } from 'react'
import { useControllerContext } from '@/contexts/ControllerContext'
import type { LiveFrame } from '@/lib/liveLeds'

/** How long without a frame before the strip says no data is arriving */
const NO_DATA_MS = 3000

/** Draw a frame one canvas pixel per LED; CSS scales it up without smoothing */
function drawFrame(canvas: HTMLCanvasElement, frame: LiveFrame) {
  const { width, height, rgb } = frame
  if (width === 0) return
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  canvas.dataset.leds = String(rgb.length / 3)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const image = ctx.createImageData(width, height)
  for (let i = 0, p = 0; i < rgb.length; i += 3, p += 4) {
    image.data[p] = rgb[i]
    image.data[p + 1] = rgb[i + 1]
    image.data[p + 2] = rgb[i + 2]
    image.data[p + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
}

/**
 * "Peek": what the controller's LEDs show right now, streamed while this is mounted.
 * A strip is drawn full width; a 2D matrix keeps its aspect ratio.
 */
export function LivePeek() {
  const { subscribeLive } = useControllerContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastFrameAtRef = useRef(Date.now())
  // A matrix's aspect ratio ("w / h"), or null for a strip
  const [matrixRatio, setMatrixRatio] = useState<string | null>(null)
  const [noData, setNoData] = useState(false)

  useEffect(
    () =>
      subscribeLive((frame) => {
        lastFrameAtRef.current = Date.now()
        setNoData(false)
        setMatrixRatio(frame.height > 1 ? `${frame.width} / ${frame.height}` : null)
        if (canvasRef.current) drawFrame(canvasRef.current, frame)
      }),
    [subscribeLive],
  )

  useEffect(() => {
    const id = setInterval(() => {
      setNoData(Date.now() - lastFrameAtRef.current > NO_DATA_MS)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="px-4 pb-2">
      <canvas
        ref={canvasRef}
        width={0}
        height={0}
        role="img"
        aria-label="Live LED colors"
        className={
          matrixRatio
            ? 'block mx-auto h-24 max-w-full rounded-sm bg-black [image-rendering:pixelated]'
            : 'block w-full h-2 rounded-sm bg-black [image-rendering:pixelated]'
        }
        style={matrixRatio ? { aspectRatio: matrixRatio } : undefined}
      />
      {noData && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          No live data. WLED sends it to one app at a time, so peek may be open somewhere else.
        </p>
      )}
    </div>
  )
}
