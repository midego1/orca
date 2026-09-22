import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const mainCss = fs.readFileSync(new URL('./main.css', import.meta.url), 'utf8')
const dialogSource = fs.readFileSync(
  new URL('../components/ui/dialog.tsx', import.meta.url),
  'utf8'
)

/** Returns the z-index declared by the first main.css rule matching `selectorPattern`. */
function zIndexOf(selectorPattern: string): number {
  const match = mainCss.match(new RegExp(`${selectorPattern}\\s*{[^}]*z-index:\\s*(\\d+)`, 's'))
  expect(match, `no z-index rule for ${selectorPattern}`).not.toBeNull()
  return Number(match?.[1])
}

describe('toaster stacking', () => {
  it('stays below the z-50 native chat shell when no modal is open', () => {
    expect(zIndexOf('\\n\\[data-sonner-toaster\\]')).toBeLessThan(50)
  })

  it('rises above modal dialog layers while a modal locks body scroll', () => {
    // Regression: invalid remote path toasts were blurred behind the Add project dialog (#22107).
    expect(dialogSource).toContain('fixed inset-0 z-50')
    expect(zIndexOf('body\\[data-scroll-locked\\] \\[data-sonner-toaster\\]')).toBeGreaterThan(50)
  })
})
