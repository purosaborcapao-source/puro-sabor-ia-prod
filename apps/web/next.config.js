/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    '@atendimento-ia/shared',
    '@atendimento-ia/supabase',
    '@atendimento-ia/ai'
  ]
}

module.exports = nextConfig
