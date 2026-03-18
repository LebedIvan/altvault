/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "c1.scryfall.com" },
      { protocol: "https", hostname: "steamcommunity-a.akamaihd.net" },
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "img.brickset.com" },
      { protocol: "https", hostname: "images.brickset.com" },
      { protocol: "https", hostname: "cdn.rebrickable.com" },
    ],
  },
};

module.exports = nextConfig;
