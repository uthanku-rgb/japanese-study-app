import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/japanese-study-app" : "",
  assetPrefix: isProd ? "/japanese-study-app/" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
