import '../styles/globals.css'
import { useEffect, useState } from 'react'
import type { AppProps } from 'next/app'
import { initAnalytics } from '../lib/firebase'
import {
  TRACKING_CONSENT_CHANGED_EVENT,
  getTrackingConsentStatus,
  setTrackingConsentStatus,
  type TrackingConsentStatus,
} from '../lib/consent'

export default function App({ Component, pageProps }: AppProps) {
  const [consentStatus, setConsentStatus] = useState<TrackingConsentStatus>(() => getTrackingConsentStatus())

  useEffect(() => {
    if (consentStatus === 'granted') {
      initAnalytics().catch((error) => {
        console.error('Erro ao inicializar Firebase Analytics:', error)
      })
    }
  }, [consentStatus])

  useEffect(() => {
    const updateConsentFromStorage = () => {
      setConsentStatus(getTrackingConsentStatus())
    }

    window.addEventListener(TRACKING_CONSENT_CHANGED_EVENT, updateConsentFromStorage)
    window.addEventListener('storage', updateConsentFromStorage)

    return () => {
      window.removeEventListener(TRACKING_CONSENT_CHANGED_EVENT, updateConsentFromStorage)
      window.removeEventListener('storage', updateConsentFromStorage)
    }
  }, [])

  const handleConsentChoice = (status: Exclude<TrackingConsentStatus, 'unknown'>) => {
    setConsentStatus(status)
    setTrackingConsentStatus(status)

    if (status === 'granted') {
      initAnalytics().catch((error) => {
        console.error('Erro ao inicializar Firebase Analytics:', error)
      })
    }
  }

  return (
    <>
      <Component {...pageProps} />

      {consentStatus === 'unknown' && (
        <div className="fixed bottom-0 inset-x-0 z-[9999] p-3 md:p-4">
          <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white shadow-2xl p-4 md:p-5">
            <p className="text-sm text-gray-700 leading-relaxed">
              Usamos cookies e tecnologias semelhantes para analíticas e melhoria do serviço.
              Pode aceitar ou recusar o tracking não essencial.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={() => handleConsentChoice('denied')}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Recusar
              </button>
              <button
                onClick={() => handleConsentChoice('granted')}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-all"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}