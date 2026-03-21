import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { RbacPage } from '../pages/rbac/RbacPage'

vi.mock('../api/dashboard', () => ({
  getDashboardSummary: vi.fn(async () => ({
    objectTypeTotal: 3,
    objectTypeCreatedLast7Days: 1,
    objectInstanceTotal: 7,
    objectInstanceCreatedLast7Days: 2,
    activeUserTotal: 2,
    auditEventsLast7Days: 5,
    dailyTrend: [
      { day: '2026-03-15', objectTypeCreated: 1, objectInstanceCreated: 2, auditEvents: 3 },
      { day: '2026-03-16', objectTypeCreated: 0, objectInstanceCreated: 1, auditEvents: 2 },
    ],
  })),
}))

vi.mock('../api/auditLogs', () => ({
  listAuditLogsPage: vi.fn(async () => ({
    content: [
      {
        id: 1,
        username: 'admin',
        action: 'UPDATE',
        resource: 'OBJECT_TYPE',
        resourceId: '10',
        details: '{"event":"OBJECT_TYPE_UPDATED","name":"客户"}',
        createdAt: new Date().toISOString(),
      },
    ],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  })),
  exportAuditLogsCsv: vi.fn(async () => new Blob(['id'], { type: 'text/csv' })),
}))

vi.mock('../api/rbac', () => ({
  listRbacRoles: vi.fn(async () => [
    { id: 1, name: 'ADMIN' },
    { id: 2, name: 'EDITOR' },
    { id: 3, name: 'VIEWER' },
  ]),
  listRbacUsersPage: vi.fn(async () => ({
    content: [
      {
        id: 1,
        username: 'admin',
        enabled: true,
        roles: ['ADMIN'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  })),
  assignUserRoles: vi.fn(async () => ({
    id: 1,
    username: 'admin',
    enabled: true,
    roles: ['ADMIN', 'EDITOR'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
}))

vi.mock('recharts', () => {
  const Mock = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    Line: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Tooltip: Mock,
  }
})

describe('页面级回归测试', () => {
  it('Dashboard应展示资源维度切换和审计导出按钮', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('近7天趋势')).toBeInTheDocument()
    expect(screen.getByText('资源维度')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '导出CSV' })).toBeInTheDocument()
  })

  it('RBAC页应展示内置角色名', async () => {
    render(
      <MemoryRouter>
        <RbacPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('权限管理（RBAC）')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('EDITOR')).toBeInTheDocument()
    expect(screen.getByText('VIEWER')).toBeInTheDocument()
  })
})
