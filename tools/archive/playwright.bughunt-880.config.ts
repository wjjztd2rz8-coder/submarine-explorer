import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

// Repeat every suite that inherits its viewport. Specs with an explicit layout
// matrix retain it, so their carefully chosen breakpoint coverage stays intact.
export default defineConfig({
  ...base,
  projects: [
    { name: '880-desktop', use: { viewport: { width: 1280, height: 800 } } },
    {
      name: '880-portrait',
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
    {
      name: '880-landscape',
      use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true },
    },
  ],
});
