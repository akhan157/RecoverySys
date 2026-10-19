// Public commercial feeds. Engineering specifications are never merged here.
export const SUPPLIERS = Object.freeze({
  fruity: { name: 'Fruity Chutes', baseUrl: 'https://shop.fruitychutes.com' },
  rocketman: { name: 'Rocketman', baseUrl: 'https://www.the-rocketman.com' },
  spherachutes: { name: 'Spherachutes', baseUrl: 'https://www.spherachutes.com' },
})
export const MANUFACTURER_SHOPS = Object.freeze({
  Rocketman: SUPPLIERS.rocketman.baseUrl,
  Spherachutes: SUPPLIERS.spherachutes.baseUrl,
  'Fruity Chutes': SUPPLIERS.fruity.baseUrl,
  'Jolly Logic': 'https://jollylogic.com',
  Perfectflite: 'https://www.perfectflite.com',
  'Top Flight Recovery': 'https://topflightrecoveryllc.homestead.com',
})
