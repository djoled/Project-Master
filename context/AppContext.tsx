
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, User, Project, Subcategory, Task, Photo, ChatMessage, Notification, Role, ChatGroup, TaskComment } from '../types';
import { useFirestoreSync } from '../hooks/useFirebase';

// Action types
type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'TOGGLE_CREATE_GROUP_MODAL'; payload: boolean }
  | { type: 'MARK_NOTIFICATIONS_READ' }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'SET_CHAT_GROUPS'; payload: ChatGroup[] }
  | { type: 'ADD_CHAT_GROUP'; payload: ChatGroup };

const initialState: AppState = {
  currentUser: null,
  users: [],
  projects: [],
  subcategories: [],
  tasks: [],
  photos: [],
  taskComments: [],
  messages: [],
  chatGroups: [],
  notifications: [],
  uiCreateGroupModalOpen: false,
};

// Extend Context to include DB Actions
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  dbActions: {
      addProject: (p: Project) => Promise<void>;
      deleteProject: (id: string) => Promise<void>;
      addSubcategory: (s: Subcategory) => Promise<void>;
      addTask: (t: Task) => Promise<void>;
      updateTask: (t: Task) => Promise<void>;
      addPhoto: (p: Photo) => Promise<void>;
      updateProjectTeam: (pid: string, pms: string[], cons: string[]) => Promise<void>;
      deleteUser: (id: string) => Promise<void>;
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'TOGGLE_CREATE_GROUP_MODAL':
      return { ...state, uiCreateGroupModalOpen: action.payload };
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, isRead: true })) };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_CHAT_GROUPS':
      return { ...state, chatGroups: action.payload };
    case 'ADD_CHAT_GROUP':
      return { ...state, chatGroups: [...state.chatGroups, action.payload] };
    default:
      return state;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Sync Data Hook
  const { 
      projects, 
      subcategories, 
      tasks, 
      photos, 
      users,
      addProject, 
      deleteProject, 
      addSubcategory,
      addTask,
      updateTask,
      addPhoto,
      updateProjectTeam,
      deleteUser
  } = useFirestoreSync(state.currentUser);

  // Derived state update when firebase data changes
  const combinedState = {
      ...state,
      users,
      projects,
      subcategories,
      tasks,
      photos
  };

  useEffect(() => {
    const saved = localStorage.getItem('project_master_firebase_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentUser) {
           dispatch({ type: 'SET_USER', payload: parsed.currentUser });
        }
      } catch (e) {
        console.error("Failed to load session", e);
      }
    }
  }, []);

  useEffect(() => {
    if (state.currentUser) {
        localStorage.setItem('project_master_firebase_session', JSON.stringify({ currentUser: state.currentUser }));
    } else {
        localStorage.removeItem('project_master_firebase_session');
    }
  }, [state.currentUser]);

  const dbActions = {
      addProject,
      deleteProject,
      addSubcategory,
      addTask,
      updateTask,
      addPhoto,
      updateProjectTeam,
      deleteUser
  };

  return (
    <AppContext.Provider value={{ state: combinedState, dispatch, dbActions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
