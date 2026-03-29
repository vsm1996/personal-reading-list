import type { NextConfig } from "next";

const config: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      // Open Library covers
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/**",
      },
      // Google Books covers
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "/books/content/**",
      },
      {
        protocol: "http",
        hostname: "books.google.com",
        pathname: "/books/content/**",
      },
    ],
  },
  // Transpile workspace packages
  transpilePackages: ["@bookshelf/db"],
};

export default config;
