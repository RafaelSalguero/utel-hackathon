import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  experimental: {
    // StockIA's screens read data that exists only in the browser (React Context),
    // so the server can never prerender them. Validate only segments that opt in
    // with `export const instant` instead of every page.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      // Only the global stylesheet goes through Tailwind. A "*.css" glob would also
      // match *.module.css and `as: "*.css"` turns those into global CSS, which
      // breaks CSS Modules.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
