import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { InstancesPage } from './pages/InstancesPage'
import { LoginPage } from './pages/LoginPage'
import { ObjectTypesPage } from './pages/ObjectTypesPage'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route
                index
                element={<Navigate to="/object-types" replace />}
              />
              <Route path="object-types" element={<ObjectTypesPage />} />
              <Route path="instances" element={<InstancesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
