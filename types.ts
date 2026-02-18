
export enum Role {
  OWNER = 'owner',
  OPS_MANAGER = 'operations_manager',
  PM = 'project_manager',
  CONTRACTOR = 'contractor'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: Role;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  projectManagerIds: string[];
  contractorIds: string[];
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
}

export interface Subcategory {
  id: string;
  projectId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  dueDate?: number;
}

export interface Task {
  id: string;
  subcategoryId: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'pending_review' | 'completed';
  createdBy: string;
  createdAt: number;
  dueDate?: number;
}

export interface Photo {
  id: string;
  parentType: 'project' | 'subcategory' | 'task' | 'chat';
  parentId: string;
  imageUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: number;
  comment?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  groupId?: string; 
  senderId: string;
  senderName: string;
  content: string;
  photoUrl: string | null;
  createdAt: number;
  isRead?: boolean; // Mock read status
}

export interface Notification {
  id: string;
  userId: string;
  type: 'photo_uploaded' | 'new_message' | 'project_assigned';
  message: string;
  relatedTo?: {
    type: 'task' | 'subcategory' | 'project';
    id: string;
    name: string;
  };
  isRead: boolean;
  createdAt: number;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  projects: Project[];
  subcategories: Subcategory[];
  tasks: Task[];
  photos: Photo[];
  taskComments: TaskComment[];
  messages: ChatMessage[];
  chatGroups: ChatGroup[];
  notifications: Notification[];
  uiCreateGroupModalOpen: boolean;
}
