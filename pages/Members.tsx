
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Role } from '../types';
import { Trash2, User, ShieldCheck, Activity, Briefcase, HardHat, Search, Users, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Members: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const currentUser = state.currentUser;
  
  // Access Control Check
  if (!currentUser || (currentUser.role !== Role.OWNER && currentUser.role !== Role.OPS_MANAGER)) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-200">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-full mb-4">
            <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Restricted Access</h2>
        <p className="text-slate-500 mb-6">Only Owners and Ops Managers can view the member directory.</p>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Return to Dashboard</button>
      </div>
    );
  }

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to remove ${userName}? This will remove them from all projects and chat groups.`)) {
      dispatch({ type: 'DELETE_USER', payload: userId });
    }
  };

  const canDelete = (targetRole: Role) => {
    if (currentUser.id === targetRole) return false; // Safety check, though IDs usually differ
    
    // Owner can delete anyone (except potentially themselves, handled by ID check usually)
    if (currentUser.role === Role.OWNER) return true;

    // Ops Manager can delete PMs and Contractors
    if (currentUser.role === Role.OPS_MANAGER) {
        return targetRole === Role.PM || targetRole === Role.CONTRACTOR;
    }

    return false;
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.OWNER: return <ShieldCheck size={18} className="text-amber-500" />;
      case Role.OPS_MANAGER: return <Activity size={18} className="text-purple-500" />;
      case Role.PM: return <Briefcase size={18} className="text-blue-500" />;
      case Role.CONTRACTOR: return <HardHat size={18} className="text-orange-500" />;
      default: return <User size={18} className="text-slate-500" />;
    }
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.OWNER: return 'bg-amber-50 text-amber-700 border-amber-100';
      case Role.OPS_MANAGER: return 'bg-purple-50 text-purple-700 border-purple-100';
      case Role.PM: return 'bg-blue-50 text-blue-700 border-blue-100';
      case Role.CONTRACTOR: return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const filteredUsers = state.users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.username.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <Users size={14} />
            <span>Directory</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Member List</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search members by name or username..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-bold shadow-sm"
                />
            </div>
        </div>

        {/* User List */}
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-400 tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Member</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Joined</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                                No members found matching your search.
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                            user.id === currentUser.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                        }`}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 flex items-center gap-2">
                                                {user.name}
                                                {user.id === currentUser.id && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase border border-slate-200">You</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium">@{user.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getRoleBadgeColor(user.role)}`}>
                                        {getRoleIcon(user.role)}
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {canDelete(user.role) && user.id !== currentUser.id && (
                                        <button 
                                            onClick={() => handleDeleteUser(user.id, user.name)}
                                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove User"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
