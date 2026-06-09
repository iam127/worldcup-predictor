import { useSidebar } from '../contexts/SidebarContext.jsx'

export default function MenuBtn() {
  const { toggle } = useSidebar()
  return (
    <button onClick={toggle} className="hamburger-btn" aria-label="Abrir menú">
      <span className="material-icons" style={{ fontSize: 22, color: '#1a2332' }}>menu</span>
    </button>
  )
}
