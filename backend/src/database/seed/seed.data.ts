import { Role } from '../../common/enums/role.enum';
import { StatusType } from '../../common/enums/status-type.enum';

/** Starting data. Each table is filled only while it is empty, so edits made in the app are never overwritten. */

export const SEED_CLIENTS = [
  { code: 'SAKKU', name: 'Sakku', sortOrder: 1 },
  { code: 'GOOGLE', name: 'Google', sortOrder: 2 },
];

export const SEED_PRODUCTS = [
  { code: 'HRMS', name: 'HRMS', description: 'Human resource management system', sortOrder: 1 },
  { code: 'AIBOT', name: 'AI BOT', description: 'Customer and employee chat assistant', sortOrder: 2 },
];

/**
 * [client code, product code, SLA hours agreed with that client per priority name].
 * Priorities left out use the hours from the Priority master.
 */
export const SEED_CLIENT_PRODUCTS: [string, string, Record<string, [number, number]>][] = [
  ['SAKKU', 'HRMS', { Urgent: [1, 2], High: [2, 6] }],
  ['GOOGLE', 'HRMS', {}],
  ['SAKKU', 'AIBOT', {}],
];

/** Modules per product code. */
export const SEED_MODULES: Record<string, string[]> = {
  HRMS: ['Attendance', 'Payroll', 'Payslip', 'Leave', 'Login & Access'],
  AIBOT: ['Wrong answer', 'Integration', 'Training data', 'Login & Access', 'Performance'],
};

export const SEED_TICKET_TYPES = [
  { name: 'Incident', color: '#e5484d', sortOrder: 1, isDefault: true, description: 'Something that worked has stopped working' },
  { name: 'Change Request', color: '#3b6fe0', sortOrder: 2, isDefault: false, description: 'A change to how the product works' },
  { name: 'Blocker', color: '#8e1c1c', sortOrder: 3, isDefault: false, description: 'Stops the client from working at all' },
  { name: 'Bug', color: '#f76b15', sortOrder: 4, isDefault: false, description: 'The product does not behave as designed' },
  { name: 'User Request', color: '#12a150', sortOrder: 5, isDefault: false, description: 'A question or a request for help' },
];

/** assignRolePriority: which employee role priority takes this level of ticket (1 = most senior). */
export const SEED_PRIORITIES = [
  { name: 'Urgent', responseHrs: 1, resolveHrs: 4, assignRolePriority: 1, color: '#e5484d', sortOrder: 1, isDefault: false },
  { name: 'High', responseHrs: 2, resolveHrs: 8, assignRolePriority: 1, color: '#f76b15', sortOrder: 2, isDefault: false },
  { name: 'Medium', responseHrs: 4, resolveHrs: 24, assignRolePriority: 2, color: '#d89a00', sortOrder: 3, isDefault: true },
  { name: 'Low', responseHrs: 8, resolveHrs: 72, assignRolePriority: 3, color: '#0b8ec2', sortOrder: 4, isDefault: false },
];

export const SEED_STATUSES = [
  { name: 'Open', type: StatusType.Open, color: '#3b6fe0', sortOrder: 1, isDefault: true, pausesSla: false, requiresNote: false },
  { name: 'In Progress', type: StatusType.Open, color: '#e08a00', sortOrder: 2, isDefault: false, pausesSla: false, requiresNote: false },
  { name: 'On Hold', type: StatusType.Open, color: '#8e5bd9', sortOrder: 3, isDefault: false, pausesSla: true, requiresNote: false },
  { name: 'Resolved', type: StatusType.Closed, color: '#12a150', sortOrder: 4, isDefault: false, pausesSla: false, requiresNote: true },
  { name: 'Closed', type: StatusType.Closed, color: '#6b7a75', sortOrder: 5, isDefault: false, pausesSla: false, requiresNote: false, locksTicket: true },
];

/** assignments: [client code, product code, role priority] */
export const SEED_EMPLOYEES: {
  name: string;
  email: string;
  password: string;
  role: Role;
  assignments: [string, string, number][];
}[] = [
  {
    name: 'Cogitrex',
    email: 'cogitrex@gmail.com',
    password: 'cogitrex',
    role: Role.SuperAdmin,
    assignments: [],
  },
  {
    name: 'Jaswanth',
    email: 'jaswanthpappala3@gmail.com',
    password: 'jaswanthpappala3@gmail.com',
    role: Role.Employee,
    assignments: [['SAKKU', 'AIBOT', 1]],
  },
  {
    name: 'Mohan',
    email: 'mohan123@gmail.com',
    password: 'mohan123@gmail.com',
    role: Role.Employee,
    assignments: [
      ['SAKKU', 'HRMS', 1],
      ['GOOGLE', 'HRMS', 1],
    ],
  },
];
