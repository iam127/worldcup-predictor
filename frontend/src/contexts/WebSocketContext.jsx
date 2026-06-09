import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const wsRef      = useRef(null)
  const listeners  = useRef(new Map()) // type → Set<fn>
  const [connected, setConnected] = useState(false)

  const connect = useCallback((roomId = 'global') => {
    const token = localStorage.getItem('jwt')
    if (!token) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close()
    }

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url   = `${proto}://${window.location.host}/ws?token=${token}&roomId=${roomId}`
    const ws    = new WebSocket(url)
    wsRef.current = ws

    ws.onopen    = () => setConnected(true)
    ws.onclose   = () => { setConnected(false); setTimeout(() => connect(roomId), 3000) }
    ws.onerror   = () => ws.close()
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        const fns = listeners.current.get(msg.type)
        if (fns) fns.forEach(fn => fn(msg.payload))
        const all = listeners.current.get('*')
        if (all) all.forEach(fn => fn(msg))
      } catch {}
    }
  }, [])

  function disconnect() {
    wsRef.current?.close()
  }

  function on(type, fn) {
    if (!listeners.current.has(type)) listeners.current.set(type, new Set())
    listeners.current.get(type).add(fn)
    return () => listeners.current.get(type)?.delete(fn)
  }

  useEffect(() => () => wsRef.current?.close(), [])

  return (
    <WebSocketContext.Provider value={{ connect, disconnect, on, connected }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}
