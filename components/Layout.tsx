
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LogOut, Bell, LayoutDashboard, MessageSquare, X, UserPlus, Users, User as UserIcon } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { Role } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileChat, setShowMobileChat] = useState(false);

  const handleLogout = () => {
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  if (!state.currentUser) return <>{children}</>;

  const isAdmin = state.currentUser.role === Role.OWNER || state.currentUser.role === Role.OPS_MANAGER;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-blue-600 flex items-center gap-2">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <LayoutDashboard size={18} />
              </div>
              <span className="hidden sm:inline">Project Master</span>
            </Link>

            {isAdmin && (
              <Link 
                to="/members" 
                className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                    location.pathname === '/members' ? 'text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users size={18} />
                <span className="hidden sm:inline">Members</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setShowMobileChat(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <MessageSquare size={20} />
            </button>

            <div className="relative group">
              <button 
                onClick={() => dispatch({ type: 'MARK_NOTIFICATIONS_READ' })}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 hidden group-hover:block max-h-96 overflow-y-auto z-[70]">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                </div>
                {state.notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No notifications</div>
                ) : (
                  state.notifications.map(n => (
                    <div key={n.id} className={`p-4 border-b border-slate-50 text-sm hover:bg-slate-50 ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                      <p className="text-slate-800 font-medium">{n.message}</p>
                      <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{state.currentUser.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-black">{state.currentUser.role.replace('_', ' ')}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                {state.currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Mobile Chat Sidebar Overlay */}
      {showMobileChat && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMobileChat(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl animate-in slide-in-from-right h-full overflow-hidden">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between bg-slate-50 shrink-0">
                <span className="font-bold text-slate-800">Team Chat</span>
                <button onClick={() => setShowMobileChat(false)} className="p-2 text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <ChatPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
