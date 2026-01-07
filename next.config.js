/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // NOTA: API routes requerem servidor Node.js
  // Removido 'output: export' para permitir API routes (Resend emails)
  // Para deploy no Firebase, use Firebase Functions + Firebase Hosting
  
  images: { 
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'enzoloft.web.app',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  
  // Variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig
