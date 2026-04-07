export const ROLE = {
  admin: 0,
  manager: 1,
  instructor: 2
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];
