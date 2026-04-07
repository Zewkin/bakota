import { ROLE, type RoleType } from '@/types';

export const isAdmin = (type: RoleType) => type === ROLE.admin;
export const isManager = (type: RoleType) => type === ROLE.manager;
export const isInstructor = (type: RoleType) => type === ROLE.instructor;
export const canCreateBooking = (type: RoleType) => type === ROLE.admin || type === ROLE.manager;
export const canSeeFinancials = (type: RoleType) => type === ROLE.admin || type === ROLE.manager;
