import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { WebSocketProvider } from './contexts/WebSocketContext.jsx'
import { SidebarProvider } from './contexts/SidebarContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Room from './pages/Room.jsx'
import GlobalLeaderboard from './pages/GlobalLeaderboard.jsx'
import Admin from './pages/Admin.jsx'

function AuthCallback() {
  const [params] = useSearchParams()
  const { setUser } = useAuth()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      localStorage.setItem('jwt', token)
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({ id: payload.userId, email: payload.email, isAdmin: payload.isAdmin })
    }
    window.location.href = '/'
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', gap: 12 }}>
      <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #e5e7eb', borderTopColor: '#00c853' }} />
      <p style={{ color: '#64748b', fontSize: 14 }}>Iniciando sesión…</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <SidebarProvider>
          <div style={{ background: '#f4f6f9', minHeight: '100vh' }}>
            <Routes>
              <Route path="/login"         element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route element={
                <>
                  <Sidebar />
                  <main className="main-content">
                    <ProtectedRoute />
                  </main>
                </>
              }>
                <Route path="/"            element={<Dashboard />} />
                <Route path="/room/:id"    element={<Room />} />
                <Route path="/leaderboard" element={<GlobalLeaderboard />} />
                <Route path="/admin"       element={<Admin />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </SidebarProvider>
      </WebSocketProvider>
    </AuthProvider>
  )
}
