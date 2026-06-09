import { createContext, useContext, useState, useCallback } from 'react'

const Ctx = createContext({ isOpen: false, toggle: () => {}, close: () => {} })

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen(v => !v), [])
  const close  = useCallback(() => setIsOpen(false), [])
  return <Ctx.Provider value={{ isOpen, toggle, close }}>{children}</Ctx.Provider>
}

export const useSidebar = () => useContext(Ctx)
