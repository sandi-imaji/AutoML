const path = require("path")
const dotenv = require("dotenv")

/**
 * Load env dari 1 level di atas root project
 * contoh: ../.env.global
 */
const envPath = path.resolve(process.cwd(), "..", ".env")

const result = dotenv.config({ path: envPath })

if (result.error) {
  console.warn("[WARN] Failed to load env file:", envPath)
} else {
  console.log("[ENV] Loaded from:", envPath)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  images: {
    unoptimized: true,
  },

  experimental: {
    // HANYA jika memang perlu (App Router + mongodb native)
    serverComponentsExternalPackages: ["mongodb"],
  },

  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules"],
      }
    }
    return config
  },

  // ❗ onDemandEntries hanya relevan untuk Pages Router
  // Jika kamu pakai App Router penuh, ini bisa dihapus
  onDemandEntries: {
    maxInactiveAge: 10_000,
    pagesBufferLength: 2,
  },

  async headers() {
    const corsOrigins = process.env.CORS_ORIGINS || "*"

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: corsOrigins },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
