export type ApiResponse<T> = {
  code: number
  message: string
  data: T
  timestamp: string
}

export type PageResponse<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type ObjectTypeDto = {
  id: number
  code: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type ObjectInstanceDto = {
  id: number
  typeId: number
  typeCode: string
  name: string
  attributes?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type MeDto = {
  id: number
  username: string
  roles: string[]
}

export type DashboardDailyPointDto = {
  day: string
  objectTypeCreated: number
  objectInstanceCreated: number
  auditEvents: number
}

export type DashboardDimension = 'OBJECT_TYPE' | 'OBJECT_INSTANCE'

export type DashboardSummaryDto = {
  objectTypeTotal: number
  objectTypeCreatedLast7Days: number
  objectInstanceTotal: number
  objectInstanceCreatedLast7Days: number
  activeUserTotal: number
  auditEventsLast7Days: number
  dailyTrend: DashboardDailyPointDto[]
}

export type AuditLogDto = {
  id: number
  username: string | null
  action: string
  resource: string
  resourceId: string | null
  details: string | null
  createdAt: string
}

export type RoleDto = {
  id: number
  name: string
}

export type UserSummaryDto = {
  id: number
  username: string
  enabled: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
}

export type RbacRoleDto = RoleDto
export type RbacUserDto = UserSummaryDto

export type RelationCardinality =
  | 'ONE_TO_ONE'
  | 'ONE_TO_MANY'
  | 'MANY_TO_ONE'
  | 'MANY_TO_MANY'

export type RelationDirection = 'DIRECTED' | 'UNDIRECTED'

export type RelationTypeDto = {
  id: number
  code: string
  name: string
  sourceTypeId: number
  sourceTypeCode: string
  targetTypeId: number
  targetTypeCode: string
  cardinality: RelationCardinality
  direction: RelationDirection
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type RelationEdgeDto = {
  id: number
  relationTypeId: number
  relationTypeCode: string
  sourceInstanceId: number
  sourceInstanceName: string
  targetInstanceId: number
  targetInstanceName: string
  attributes?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export type RelationNeighborDto = {
  edgeId: number
  relationTypeId: number
  relationTypeCode: string
  relationTypeName: string
  sourceInstanceId: number
  sourceInstanceName: string
  sourceTypeId: number
  sourceTypeCode: string
  targetInstanceId: number
  targetInstanceName: string
  targetTypeId: number
  targetTypeCode: string
  attributes?: Record<string, unknown> | null
  createdAt: string
}

export type ActionTypeDto = {
  id: number
  code: string
  name: string
  targetTypeId: number
  targetTypeCode: string
  executorType: string
  parameterSchema?: string | null
  preconditionExpression?: string | null
  description?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type ActionExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'

export type ActionExecutionDto = {
  id: number
  actionTypeId: number
  actionTypeCode: string
  actionTypeName: string
  targetInstanceId: number
  targetInstanceName: string
  status: ActionExecutionStatus
  inputPayload?: Record<string, unknown> | null
  resultPayload?: Record<string, unknown> | null
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type ModelVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type ModelVersionDto = {
  id: number
  modelCode: string
  versionNo: number
  title: string
  content: Record<string, unknown>
  status: ModelVersionStatus
  changeLog?: string | null
  createdBy?: string | null
  publishedBy?: string | null
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type ObjectSetKind = 'DYNAMIC' | 'SNAPSHOT'

export type ObjectSetRuleSource = 'MANUAL' | 'JSON_QUERY'

export type ObjectSetDto = {
  id: number
  typeId: number
  typeCode: string
  name: string
  description?: string | null
  kind: ObjectSetKind
  ruleExpression?: string | null
  ruleSource: ObjectSetRuleSource
  snapshotAt?: string | null
  owner?: string | null
  notes?: string | null
  memberCount: number
  createdAt: string
  updatedAt: string
}
