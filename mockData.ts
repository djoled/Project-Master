import { Role, User, Project, Subcategory, Task, Photo } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'owner-1',
    name: 'Bruce Wayne',
    username: 'owner',
    email: 'bruce@wayne.com',
    role: Role.OWNER,
    createdAt: Date.now(),
    password: '123'
  },
  {
    id: 'ops-1',
    name: 'Lucius Fox',
    username: 'ops',
    email: 'lucius@wayne.com',
    role: Role.OPS_MANAGER,
    createdAt: Date.now(),
    password: '123'
  },
  {
    id: 'pm-1',
    name: 'Dick Grayson',
    username: 'pm',
    email: 'dick@wayne.com',
    role: Role.PM,
    createdAt: Date.now(),
    password: '123'
  },
  {
    id: 'contractor-1',
    name: 'Selina Kyle',
    username: 'contractor',
    email: 'selina@wayne.com',
    role: Role.CONTRACTOR,
    createdAt: Date.now(),
    password: '123'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Wayne Tower Renovation',
    description: 'Complete overhaul of the penthouse security systems and executive suites.',
    ownerId: 'owner-1',
    projectManagerIds: ['pm-1'],
    contractorIds: ['contractor-1'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dueDate: Date.now() + 86400000 * 30 // 30 days
  }
];

export const MOCK_SUBCATEGORIES: Subcategory[] = [
  {
    id: 'sub-1',
    projectId: 'proj-1',
    name: 'Security Systems',
    description: 'Installation of biometric scanners and reinforced glazing.',
    createdBy: 'pm-1',
    createdAt: Date.now(),
    dueDate: Date.now() + 86400000 * 7
  },
  {
    id: 'sub-2',
    projectId: 'proj-1',
    name: 'Electrical Infrastructure',
    description: 'Main server room power redundancy implementation.',
    createdBy: 'pm-1',
    createdAt: Date.now(),
    dueDate: Date.now() + 86400000 * 14
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    subcategoryId: 'sub-1',
    name: 'Biometric Scanner Wiring',
    description: 'Run Cat6 shielded cables to all entry points on the 50th floor.',
    status: 'in_progress',
    createdBy: 'pm-1',
    createdAt: Date.now(),
    dueDate: Date.now() + 86400000
  },
  {
    id: 'task-2',
    subcategoryId: 'sub-1',
    name: 'Camera Mount Installation',
    description: 'Mount bracket hardware for PTZ cameras in the north corridor.',
    status: 'pending',
    createdBy: 'pm-1',
    createdAt: Date.now(),
    dueDate: Date.now() + 86400000 * 2
  }
];

export const MOCK_PHOTOS: Photo[] = [
  {
    id: 'photo-1',
    parentType: 'task',
    parentId: 'task-1',
    imageUrl: 'https://images.unsplash.com/photo-1558402529-d2638a7023e9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    uploadedBy: 'contractor-1',
    uploadedByName: 'Selina Kyle',
    createdAt: Date.now(),
    comment: 'Wiring completed for the north entrance.'
  }
];
