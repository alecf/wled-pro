export const COLOR_ORDERS = [
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

export const LED_TYPES = [
  { id: 22, name: 'WS2812B (RGB)', hasWhite: false },
  { id: 31, name: 'SK6812 RGBW', hasWhite: true },
  { id: 24, name: 'WS2801', hasWhite: false },
  { id: 25, name: 'APA102', hasWhite: false },
  { id: 26, name: 'LPD8806', hasWhite: false },
  { id: 27, name: 'P9813', hasWhite: false },
  { id: 30, name: 'TM1814', hasWhite: true },
  { id: 32, name: 'TM1829', hasWhite: false },
  { id: 33, name: 'UCS8903', hasWhite: false },
  { id: 34, name: 'GS8208', hasWhite: false },
  { id: 35, name: 'WS2811 400kHz', hasWhite: false },
  { id: 36, name: 'SK6812 WWA', hasWhite: true },
  { id: 37, name: 'UCS8904', hasWhite: true },
  { id: 40, name: 'PWM White', hasWhite: true },
  { id: 41, name: 'PWM CCT', hasWhite: true },
  { id: 42, name: 'PWM RGB', hasWhite: false },
  { id: 43, name: 'PWM RGBW', hasWhite: true },
  { id: 44, name: 'PWM RGB+CCT', hasWhite: true },
]

export const RGBW_MODES = [
  { id: 0, name: 'Auto (SK6812)' },
  { id: 1, name: 'Dual (RGB + White)' },
  { id: 2, name: 'White Channel Only' },
  { id: 3, name: 'Manual' },
  { id: 4, name: 'None' },
]

export function getLedTypeName(typeId: number): string {
  return LED_TYPES.find((t) => t.id === typeId)?.name || `Type ${typeId}`
}

export function getColorOrderName(orderId: number): string {
  return COLOR_ORDERS.find((o) => o.id === orderId)?.name || `Order ${orderId}`
}
