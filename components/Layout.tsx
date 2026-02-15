import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LogOut, Bell, LayoutDashboard, MessageSquare, X, UserPlus, Check, Key, User as UserIcon, ChevronDown, ShieldCheck, Activity, Briefcase, HardHat, Users } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { Role, User } from '../types';
import { supabase } from '../services/supabaseClient';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // User Creation State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', username: '', password: '' });
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CONTRACTOR);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleLogout = () => {
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };

  const getCreatableRoles = (currentRole: Role): Role[] => {
    switch (currentRole) {
      case Role.OWNER: return [Role.OPS_MANAGER, Role.PM, Role.CONTRACTOR];
      case Role.OPS_MANAGER: return [Role.PM, Role.CONTRACTOR];
      case Role.PM: return [Role.CONTRACTOR];
      default: return [];
    }
  };

  const creatableRoles = state.currentUser ? getCreatableRoles(state.currentUser.role) : [];

  // Reset selected role when modal opens
  useEffect(() => {
    if (showCreateUserModal && creatableRoles.length > 0) {
      setSelectedRole(creatableRoles[0]);
    }
  }, [showCreateUserModal]); // Only depend on modal open state

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.name || !newUserData.password || !selectedRole) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { 
          email: `${newUserData.username}@company.com`, 
          password: newUserData.password, 
          role: selectedRole,
          full_name: newUserData.name,
          username: newUserData.username
        }
      });

      if (error) {
        throw error;
      }

      setCreateSuccess(true);
      setTimeout(() => {
        setCreateSuccess(false);
        setShowCreateUserModal(false);
        setNewUserData({ name: '', username: '', password: '' });
      }, 2000);

    } catch (err: any) {
      alert(`Failed to create user: ${err.message}`);
      console.error(err);
    }
  };

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  const getRoleIcon = (r: Role) => {
    switch (r) {
      case Role.OPS_MANAGER: return <Activity size={18} />;
      case Role.PM: return <Briefcase size={18} />;
      case Role.CONTRACTOR: return <HardHat size={18} />;
      default: return <UserIcon size={18} />;
    }
  };

  const getRoleLabel = (r: Role) => {
     switch (r) {
      case Role.OPS_MANAGER: return 'Ops Manager';
      case Role.PM: return 'Project Manager';
      case Role.CONTRACTOR: return 'Contractor';
      default: return r;
    }
  };

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

            {/* Admin Members Navigation */}
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
            {creatableRoles.length > 0 && (
               <button 
                 onClick={() => setShowCreateUserModal(true)}
                 className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
               >
                 <UserPlus size={16} />
                 <span>Create {creatableRoles.length > 1 ? 'User' : getRoleLabel(creatableRoles[0])}</span>
               </button>
            )}

            <button 
              onClick={() => setShowMobileChat(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
              title="Open Chat"
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

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={24} />
                Create User
              </h2>
              <button onClick={() => setShowCreateUserModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createSuccess ? (
                <div className="py-8 text-center animate-in zoom-in">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">User Created!</h3>
                  <p className="text-slate-500 text-sm">Credentials have been set for {newUserData.name}.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                    {creatableRoles.length > 1 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {creatableRoles.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => setSelectedRole(role)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                        selectedRole === role 
                                        ? 'bg-blue-50 border-blue-500 shadow-sm' 
                                        : 'bg-white border-slate-200 hover:border-blue-300'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedRole === role ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {getRoleIcon(role)}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${selectedRole === role ? 'text-blue-900' : 'text-slate-700'}`}>{getRoleLabel(role)}</p>
                                    </div>
                                    {selectedRole === role && <Check size={16} className="ml-auto text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    ) : (
                         <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-slate-500">
                             {getRoleIcon(selectedRole)}
                             <span className="font-bold text-sm">{getRoleLabel(selectedRole)}</span>
                         </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={newUserData.name}
                      onChange={e => setNewUserData({...newUserData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black font-bold"
                      placeholder="e.g. Sarah Connor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                    <div className="relative">
                       <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         required
                         type="text" 
                         value={newUserData.username}
                         onChange={e => setNewUserData({...newUserData, username: e.target.value})}
                         className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black font-bold"
                         placeholder="username"
                       />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                    <div className="relative">
                       <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                         required
                         type="text" // Visible for creation
                         value={newUserData.password}
                         onChange={e => setNewUserData({...newUserData, password: e.target.value})}
                         className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-black font-bold"
                         placeholder="password"
                       />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button 
                        type="submit"
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        <UserPlus size={18} />
                        Create Account
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
