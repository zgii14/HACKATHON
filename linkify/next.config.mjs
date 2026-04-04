/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    webpack: (config, { dev }) => {
        if (dev) {
            config.cache = false; // prevent gzip OOM when writing webpack cache
        }
        return config;
    },
};

export default nextConfig;

