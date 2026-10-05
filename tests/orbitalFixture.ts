import type { Page } from '@playwright/test'

const orbitalSave = {
  schemaVersion: 2,
  entities: [{
    id: 'station-horizon',
    kind: 'station',
    definitionId: 'Horizon Fortizar',
    name: '地平线 · 铁壁',
    starId: 'Star0041',
    position: { x: 0.12, y: -4.45 },
    orbit: 2,
    ownerFactionId: 'Player',
    status: 'online',
    tasks: []
  }]
}

export async function mockOrbitalSave(page: Page) {
  await page.route('**/api/save/orbital-objects', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(route.request().method() === 'GET' ? orbitalSave : { saved: true })
  }))
}
