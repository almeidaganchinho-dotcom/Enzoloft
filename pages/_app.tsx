import '../styles/globals.css'
import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import { initAnalytics } from '../lib/firebase'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    initAnalytics().catch((error) => {
      console.error('Erro ao inicializar Firebase Analytics:', error)
    })
  }, [])

  return (
    <>
      <Component {...pageProps} />
    </>
  )
}