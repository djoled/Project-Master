
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, User, Project, Subcategory, Task, Photo, ChatMessage, Notification, Role, ChatGroup, TaskComment } from '../types';

type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'REGISTER_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'UPDATE_PROJECT_MEMBERS'; payload: { projectId: string; pmIds: string[]; contractorIds: string[] } }
  | { type: 'ADD_SUBCATEGORY'; payload: Subcategory }
  | { type: 'DELETE_SUBCATEGORY'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_PHOTO'; payload: Photo }
  | { type: 'UPDATE_PHOTO_COMMENT'; payload: { photoId: string; comment: string } }
  | { type: 'ADD_TASK_COMMENT'; payload: TaskComment }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CREATE_CHAT_GROUP'; payload: ChatGroup }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATIONS_READ' }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: Task['status'] } }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> }
  | { type: 'TOGGLE_CREATE_GROUP_MODAL'; payload: boolean };

// Start with empty arrays for a fresh production-like start
const initialUsers: User[] = [];
const seedProjects: Project[] = [];

const initialState: AppState = {
  currentUser: null,
  users: initialUsers,
  projects: seedProjects,
  subcategories: [],
  tasks: [],
  photos: [],
  taskComments: [],
  messages: [],
  chatGroups: [],
  notifications: [],
  uiCreateGroupModalOpen: false,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'REGISTER_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload),
        projects: state.projects.map(p => ({
          ...p,
          projectManagerIds: p.projectManagerIds.filter(id => id !== action.payload),
          contractorIds: p.contractorIds.filter(id => id !== action.payload)
        })),
        chatGroups: state.chatGroups.map(g => ({
          ...g,
          memberIds: g.memberIds.filter(id => id !== action.payload)
        }))
      };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'DELETE_PROJECT': {
      const subcategoryIds = state.subcategories
        .filter(s => s.projectId === action.payload)
        .map(s => s.id);
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        subcategories: state.subcategories.filter(s => s.projectId !== action.payload),
        tasks: state.tasks.filter(t => !subcategoryIds.includes(t.subcategoryId)),
        photos: state.photos.filter(p => p.parentId !== action.payload && !subcategoryIds.includes(p.parentId)),
        taskComments: state.taskComments.filter(c => !state.tasks.find(t => t.id === c.taskId && subcategoryIds.includes(t.subcategoryId))) // Ideally deeper clean but this is fine for MVP
      };
    }
    case 'UPDATE_PROJECT_MEMBERS':
      return {
        ...state,
        projects: state.projects.map(p => 
          p.id === action.payload.projectId 
            ? { 
                ...p, 
                projectManagerIds: action.payload.pmIds, 
                contractorIds: action.payload.contractorIds,
                updatedAt: Date.now() 
              } 
            : p
        )
      };
    case 'ADD_SUBCATEGORY':
      return { ...state, subcategories: [...state.subcategories, action.payload] };
    case 'DELETE_SUBCATEGORY':
      return {
        ...state,
        subcategories: state.subcategories.filter(s => s.id !== action.payload),
        tasks: state.tasks.filter(t => t.subcategoryId !== action.payload),
        photos: state.photos.filter(p => p.parentId !== action.payload)
      };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'DELETE_TASK':
      return { 
        ...state, 
        tasks: state.tasks.filter(t => t.id !== action.payload),
        photos: state.photos.filter(p => p.parentId !== action.payload),
        taskComments: state.taskComments.filter(c => c.taskId !== action.payload)
      };
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };
    case 'UPDATE_PHOTO_COMMENT':
      return {
        ...state,
        photos: state.photos.map(p => 
          p.id === action.payload.photoId 
            ? { ...p, comment: action.payload.comment }
            : p
        )
      };
    case 'ADD_TASK_COMMENT':
      return { ...state, taskComments: [...state.taskComments, action.payload] };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'CREATE_CHAT_GROUP':
      return { ...state, chatGroups: [...state.chatGroups, action.payload] };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, isRead: true })) };
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.taskId ? { ...t, status: action.payload.status } : t)
      };
    case 'TOGGLE_CREATE_GROUP_MODAL':
      return { ...state, uiCreateGroupModalOpen: action.payload };
    case 'LOAD_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // Changed key to project_master_v3 to ensure a clean slate for schema change
    const saved = localStorage.getItem('project_master_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ 
          type: 'LOAD_DATA', 
          payload: {
            ...parsed,
            users: parsed.users || initialUsers,
            chatGroups: parsed.chatGroups || [],
            taskComments: parsed.taskComments || [],
            uiCreateGroupModalOpen: false,
            // Migration for old projects
            projects: (parsed.projects || seedProjects).map((p: any) => ({
              ...p,
              projectManagerIds: p.projectManagerIds || [],
              contractorIds: p.contractorIds || [],
              // opsManagerIds is deliberately removed/ignored
            }))
          } 
        });
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  useEffect(() => {
    const { currentUser, uiCreateGroupModalOpen, ...persistentState } = state;
    localStorage.setItem('project_master_v3', JSON.stringify(persistentState));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
