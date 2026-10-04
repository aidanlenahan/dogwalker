import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate icons after editing public/logo.svg: `npm run generate-icons`
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1f6f5c' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1f6f5c' } },
  },
  images: ['public/logo.svg'],
})
