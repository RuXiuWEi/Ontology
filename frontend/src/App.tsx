import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

const LoginPage = lazy(async () => ({
  default: (await import('./pages/LoginPage')).LoginPage,
}))
const PlaceholderPage = lazy(async () => ({
  default: (await import('./pages/PlaceholderPage')).PlaceholderPage,
}))
const ForbiddenPage = lazy(async () => ({
  default: (await import('./pages/ForbiddenPage')).ForbiddenPage,
}))
const DashboardPage = lazy(async () => ({
  default: (await import('./pages/dashboard/DashboardPage')).DashboardPage,
}))
const GraphPage = lazy(async () => ({
  default: (await import('./pages/graph/GraphPage')).GraphPage,
}))
const InstanceDetailPage = lazy(async () => ({
  default: (await import('./pages/instances/InstanceDetailPage')).InstanceDetailPage,
}))
const InstanceFormPage = lazy(async () => ({
  default: (await import('./pages/instances/InstanceFormPage')).InstanceFormPage,
}))
const InstanceListPage = lazy(async () => ({
  default: (await import('./pages/instances/InstanceListPage')).InstanceListPage,
}))
const ObjectTypeDetailPage = lazy(async () => ({
  default: (await import('./pages/objectTypes/ObjectTypeDetailPage')).ObjectTypeDetailPage,
}))
const ObjectTypeFormPage = lazy(async () => ({
  default: (await import('./pages/objectTypes/ObjectTypeFormPage')).ObjectTypeFormPage,
}))
const ObjectTypeListPage = lazy(async () => ({
  default: (await import('./pages/objectTypes/ObjectTypeListPage')).ObjectTypeListPage,
}))
const RelationTypesPage = lazy(async () => ({
  default: (await import('./pages/relations/RelationTypesPage')).RelationTypesPage,
}))
const RbacPage = lazy(async () => ({
  default: (await import('./pages/rbac/RbacPage')).RbacPage,
}))
const ActionsPage = lazy(async () => ({
  default: (await import('./pages/actions/ActionsPage')).ActionsPage,
}))
const VersionsPage = lazy(async () => ({
  default: (await import('./pages/versions/VersionsPage')).VersionsPage,
}))
const ObjectSetListPage = lazy(async () => ({
  default: (await import('./pages/objectSets/ObjectSetListPage')).ObjectSetListPage,
}))
const ObjectSetFormPage = lazy(async () => ({
  default: (await import('./pages/objectSets/ObjectSetFormPage')).ObjectSetFormPage,
}))
const ObjectSetDetailPage = lazy(async () => ({
  default: (await import('./pages/objectSets/ObjectSetDetailPage')).ObjectSetDetailPage,
}))

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="route-loading">页面加载中…</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="object-types">
                  <Route index element={<ObjectTypeListPage />} />
                  <Route element={<ProtectedRoute require="canManageModel" />}>
                    <Route path="new" element={<ObjectTypeFormPage mode="create" />} />
                    <Route path=":id/edit" element={<ObjectTypeFormPage mode="edit" />} />
                  </Route>
                  <Route path=":id" element={<ObjectTypeDetailPage />} />
                </Route>
                <Route
                  path="link-types"
                  element={<RelationTypesPage />}
                />
                <Route path="instances">
                  <Route index element={<InstanceListPage />} />
                  <Route element={<ProtectedRoute require="canManageInstances" />}>
                    <Route path="new" element={<InstanceFormPage mode="create" />} />
                    <Route path=":id/edit" element={<InstanceFormPage mode="edit" />} />
                  </Route>
                  <Route path=":id" element={<InstanceDetailPage />} />
                </Route>
                <Route path="sets">
                  <Route index element={<ObjectSetListPage />} />
                  <Route element={<ProtectedRoute require="canManageInstances" />}>
                    <Route path="new" element={<ObjectSetFormPage mode="create" />} />
                    <Route path=":id/edit" element={<ObjectSetFormPage mode="edit" />} />
                  </Route>
                  <Route path=":id" element={<ObjectSetDetailPage />} />
                </Route>
                <Route path="actions" element={<ActionsPage />} />
                <Route path="graph" element={<GraphPage />} />
                <Route path="versions" element={<VersionsPage />} />
                <Route
                  path="lineage"
                  element={<PlaceholderPage title="数据血缘" subtitle="数据血缘模块将在后续批次接入。" />}
                />
                <Route element={<ProtectedRoute require="canManageRbac" />}>
                  <Route
                    path="rbac"
                    element={<RbacPage />}
                  />
                </Route>
                <Route
                  path="integration"
                  element={<PlaceholderPage title="集成" subtitle="集成模块将在后续批次接入。" />}
                />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
