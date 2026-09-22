import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test, expect } from './helpers/orca-app'
import { openSidebarProjectDialog } from './helpers/sidebar-project-dialog'
import { waitForSessionReady } from './helpers/store'

const tempRoots: string[] = []

test.afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

// Regression for #22107: add-project errors were blurred behind the open dialog's overlay.
test('add-project error toast renders above the open project dialog', async ({
  orcaPage
}, testInfo) => {
  await waitForSessionReady(orcaPage)
  const notARepo = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'orca-e2e-not-a-repo-')))
  tempRoots.push(notARepo)

  await openSidebarProjectDialog(orcaPage)
  // Why: "Set location" in the project location dialog calls this; a non-git path fails it with a toast.
  await orcaPage.evaluate((folderPath) => {
    const state = window.__store?.getState()
    const projectId = state?.projects[0]?.id
    if (!state || !projectId) {
      throw new Error('seeded project missing')
    }
    void state.setupProjectExistingFolder({
      projectId,
      hostId: 'local',
      path: folderPath,
      kind: 'git'
    })
  }, notARepo)

  const toast = orcaPage
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'Failed to add project' })
    .first()
  await expect(toast).toBeVisible()
  await expect(orcaPage.getByRole('dialog', { name: /Add a project/i })).toBeVisible()
  const screenshotPath = testInfo.outputPath('toast-over-dialog.png')
  // Why: hidden E2E windows don't advance enter animations; finish them so the dialog is captured.
  await orcaPage.screenshot({ path: screenshotPath, animations: 'disabled' })
  await testInfo.attach('toast-over-dialog', { path: screenshotPath, contentType: 'image/png' })

  const toastIsTopmost = await toast.evaluate((element) => {
    // Why: the modal sets body pointer-events:none, and hit-testing skips those elements.
    const previous = element.style.pointerEvents
    element.style.pointerEvents = 'auto'
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    element.style.pointerEvents = previous
    return element.contains(hit)
  })
  expect(toastIsTopmost, 'dialog overlay covers the error toast').toBe(true)
})
