import { useState, useEffect, useRef } from 'react'
import {
  Monitor, Maximize2, Minimize2, ExternalLink, RefreshCw,
  X, AlertCircle, ShieldCheck
} from 'lucide-react'
import Button from './ui/Button'
import { createConsoleSession } from '../api/vms'

export default function VMConsoleModal({ isOpen, onClose, vm }) {
  const [sessionUrl, setSessionUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  const loadSession = async () => {
    if (!vm?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await createConsoleSession(vm.id)
      if (res?.client_url) {
        setSessionUrl(res.client_url)
      } else {
        setError("Réponse de console invalide reçue du serveur.")
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Impossible de contacter la passerelle Guacamole."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && vm?.id) {
      loadSession()
    } else {
      setSessionUrl(null)
      setError(null)
      setIsFullscreen(false)
    }
  }, [isOpen, vm?.id])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        ref={containerRef}
        className={`flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-screen h-screen rounded-none border-none' : 'w-full max-w-6xl h-[85vh]'
        }`}
        style={{ backgroundColor: 'var(--card, #0f172a)' }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Monitor size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm font-mono text-white">
                  {vm?.name}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live VRDE
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} className="text-primary" /> Session sécurisée via Apache Guacamole
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={loadSession}
              disabled={loading}
              title="Réinitialiser la session de console"
            >
              Actualiser
            </Button>

            {sessionUrl && (
              <a
                href={sessionUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink size={16} />
              </a>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Fermer la console (la VM continue de tourner)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Console display viewport */}
        <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center animate-fade-in">
              <RefreshCw size={32} className="animate-spin text-primary" />
              <p className="text-sm font-medium">Négociation de la session Guacamole en cours...</p>
              <p className="text-xs text-slate-500">Connexion sécurisée au port VRDE de la machine virtuelle</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-slate-300 p-6 text-center max-w-md animate-fade-in">
              <AlertCircle size={36} className="text-rose-500" />
              <p className="text-sm font-semibold text-rose-400">Échec d'ouverture de la console</p>
              <p className="text-xs text-slate-400">{error}</p>
              <Button size="sm" variant="ghost" onClick={loadSession} className="mt-2">
                Réessayer
              </Button>
            </div>
          )}

          {sessionUrl && !loading && !error && (
            <iframe
              src={sessionUrl}
              title={`Console ${vm?.name}`}
              className="w-full h-full border-none"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          )}
        </div>

        {/* Footer info banner */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-400 border-t border-slate-800 bg-slate-950/50"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span>Fermer cette fenêtre n'interrompt pas la machine virtuelle.</span>
          <span className="font-mono">RDP: 127.0.0.1:{vm?.vrde_port || 'Auto'}</span>
        </div>
      </div>
    </div>
  )
}
