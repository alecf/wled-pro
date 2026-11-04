import { useEffect, useRef, useState } from 'react'
import { useControllerContext } from '@/contexts/ControllerContext'
import type { LiveFrame } from '@/lib/liveLeds'

/** How long without a frame before the strip says no data is arriving */
const NO_DATA_MS = 3000

/** Height of a matrix's canvas, in rem (it's narrowed to fit, keeping its aspect ratio) */
const MATRIX_HEIGHT_REM = 6

/** Draw a frame one canvas pixel per LED; CSS scales it up without smoothing */
function drawFrame(
  canvas: HTMLCanvasElement,
  frame: LiveFrame,
  imageRef: { current: ImageData | null },
) {
  const { width, height, rgb } = frame
  canvas.dataset.leds = String(rgb.length / 3)
  if (width === 0 || height === 0) {
    // No LEDs: clear the previous frame (resizing a canvas clears it)
    canvas.width = 0
    canvas.height = 0
    return
  }
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // Reuse the ImageData while the size stays the same: frames arrive ~25 times a second
  let image = imageRef.current
  if (!image || image.width !== width || image.height !== height) {
    image = ctx.createImageData(width, height)
    imageRef.current = image
  }
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
  const { subscribeLive, isConnected } = useControllerContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<ImageData | null>(null)
  const lastFrameAtRef = useRef(Date.now())
  // A matrix's size, or null for a strip
  const [matrix, setMatrix] = useState<{ width: number; height: number } | null>(null)
  const matrixRef = useRef(matrix)
  const [noData, setNoData] = useState(false)
  const noDataRef = useRef(noData)

  useEffect(
    () =>
      subscribeLive((frame) => {
        lastFrameAtRef.current = Date.now()
        // Only touch React state when something shown changes, not on every frame
        if (noDataRef.current) {
          noDataRef.current = false
          setNoData(false)
        }
        const next = frame.height > 1 ? { width: frame.width, height: frame.height } : null
        const prev = matrixRef.current
        if (next?.width !== prev?.width || next?.height !== prev?.height) {
          matrixRef.current = next
          setMatrix(next)
        }
        if (canvasRef.current) drawFrame(canvasRef.current, frame, imageRef)
      }),
    [subscribeLive],
  )

  useEffect(() => {
    const id = setInterval(() => {
      const next = Date.now() - lastFrameAtRef.current > NO_DATA_MS
      if (next !== noDataRef.current) {
        noDataRef.current = next
        setNoData(next)
      }
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
          matrix
            ? 'block mx-auto rounded-sm bg-black [image-rendering:pixelated]'
            : 'block w-full h-2 rounded-sm bg-black [image-rendering:pixelated]'
        }
        style={
          matrix
            ? {
                // Width capped by the container; the height follows from the aspect ratio
                aspectRatio: `${matrix.width} / ${matrix.height}`,
                width: `min(100%, ${(MATRIX_HEIGHT_REM * matrix.width) / matrix.height}rem)`,
              }
            : undefined
        }
      />
      {noData && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isConnected
            ? 'No live data. WLED sends it to one app at a time, so peek may be open somewhere else.'
            : 'No live data: the controller is offline.'}
        </p>
      )}
    </div>
  )
}
