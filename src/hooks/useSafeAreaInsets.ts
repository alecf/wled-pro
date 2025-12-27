/**
 * Hook providing type-safe access to safe area CSS variables.
 *
 * Safe area insets handle notched devices (iPhone X+, Android punch-holes).
 * The actual values are defined as CSS custom properties in index.css.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const insets = useSafeAreaInsets();
 *   return (
 *     <header style={{ paddingTop: insets.top }}>
 *       ...
 *     </header>
 *   );
 * }
 * ```
 *
 * @example With calc()
 * ```tsx
 * function Footer() {
 *   const insets = useSafeAreaInsets();
 *   return (
 *     <footer style={{ paddingBottom: `calc(1rem + ${insets.bottom})` }}>
 *       ...
 *     </footer>
 *   );
 * }
 * ```
 */
export function useSafeAreaInsets() {
  return {
    top: 'var(--safe-area-top)',
    bottom: 'var(--safe-area-bottom)',
    left: 'var(--safe-area-left)',
    right: 'var(--safe-area-right)',
  } as const;
}
