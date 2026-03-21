import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { InstanceDetailPage } from './pages/instances/InstanceDetailPage'
import { InstanceFormPage } from './pages/instances/InstanceFormPage'
import { InstanceListPage } from './pages/instances/InstanceListPage'
import { ObjectTypeDetailPage } from './pages/objectTypes/ObjectTypeDetailPage'
import { ObjectTypeFormPage } from './pages/objectTypes/ObjectTypeFormPage'
import { ObjectTypeListPage } from './pages/objectTypes/ObjectTypeListPage'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="object-types">
                <Route index element={<ObjectTypeListPage />} />
                <Route path="new" element={<ObjectTypeFormPage mode="create" />} />
                <Route path=":id" element={<ObjectTypeDetailPage />} />
                <Route path=":id/edit" element={<ObjectTypeFormPage mode="edit" />} />
              </Route>
              <Route
                path="link-types"
                element={<PlaceholderPage title="关联类型" subtitle="关联类型模块将在后续批次接入。" />}
              />
              <Route path="instances">
                <Route index element={<InstanceListPage />} />
                <Route path="new" element={<InstanceFormPage mode="create" />} />
                <Route path=":id" element={<InstanceDetailPage />} />
                <Route path=":id/edit" element={<InstanceFormPage mode="edit" />} />
              </Route>
              <Route
                path="sets"
                element={<PlaceholderPage title="对象集合" subtitle="对象集合模块将在后续批次接入。" />}
              />
              <Route
                path="actions"
                element={<PlaceholderPage title="动作" subtitle="动作模块将在后续批次接入。" />}
              />
              <Route
                path="graph"
                element={<PlaceholderPage title="图谱" subtitle="图谱模块将在后续批次接入。" />}
              />
              <Route
                path="versions"
                element={<PlaceholderPage title="版本" subtitle="版本模块将在后续批次接入。" />}
              />
              <Route
                path="lineage"
                element={<PlaceholderPage title="数据血缘" subtitle="数据血缘模块将在后续批次接入。" />}
              />
              <Route
                path="rbac"
                element={<PlaceholderPage title="权限" subtitle="权限模块将在后续批次接入。" />}
              />
              <Route
                path="integration"
                element={<PlaceholderPage title="集成" subtitle="集成模块将在后续批次接入。" />}
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
