/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Para Firebase Hosting (static export)
  // Descomenta as linhas abaixo quando quiseres fazer deploy estático
  // output: 'export',
  // images: { unoptimized: true },
  
  // Configuração de imagens
  images: {
    domains: ['enzoloft.web.app', 'firebasestorage.googleapis.com'],
  },
  
  // Variáveis de ambiente públicas
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig
