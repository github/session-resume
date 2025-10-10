import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.js'],
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true
    }
  }
})
