/// <reference types="vite/client" />

// Custom build-time env vars. All must be prefixed with VITE_ to be
// exposed to client code.
interface ImportMetaEnv {
  readonly VITE_GBP_USD_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
