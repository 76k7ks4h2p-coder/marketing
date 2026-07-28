/** ユーザー区分。profiles.role に保存する。 */

export const USER_ROLE_VALUES = ['owner', 'admin'] as const

export type UserRole = (typeof USER_ROLE_VALUES)[number]

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'オーナー',
  admin: '運営管理者',
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLE_VALUES as readonly string[]).includes(value)
}

export function userRoleLabel(value: string): string {
  return isUserRole(value) ? USER_ROLE_LABELS[value] : value
}
