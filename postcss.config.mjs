/**
 * Local PostCSS config so Vite does not walk up to
 * C:\Users\Asif\postcss.config.mjs (parent monorepo / other app).
 * Tailwind v4 is handled by @tailwindcss/vite — no PostCSS plugin needed here.
 */
export default {
  plugins: [],
}
