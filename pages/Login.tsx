
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LayoutDashboard, Lock, ShieldCheck, ArrowRight, AlertCircle, ChevronRight, User as UserIcon, Activity, Briefcase, HardHat } from 'lucide-react';
import { User, Role } from '../types';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const handleDemoAccess = (role: Role) => {
    // Find existing user of this role or create default one
    const existingUser = state.users.find(u => u.role === role);
    
    if (existingUser) {
      dispatch({ type: 'SET_USER', payload: existingUser });
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Demo ${role === Role.OPS_MANAGER ? 'Ops' : role === Role.PM ? 'PM' : role === Role.CONTRACTOR ? 'Contractor' : 'Owner'}`,
        username: role === Role.OPS_MANAGER ? 'ops' : role === Role.PM ? 'pm' : role === Role.CONTRACTOR ? 'contractor' : 'owner',
        password: '123',
        email: `${role}@projectmaster.com`,
        role: role,
        createdAt: Date.now()
      };
      dispatch({ type: 'REGISTER_USER', payload: newUser });
      dispatch({ type: 'SET_USER', payload: newUser });
    }
    navigate('/');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) return;

    // Find user matching username AND password
    const user = state.users.find(u => 
      u.username.toLowerCase() === username.toLowerCase().trim() && 
      u.password === password.trim()
    );

    if (user) {
      dispatch({ type: 'SET_USER', payload: user });
      navigate('/');
    } else {
      setError("Invalid credentials. Please contact your manager.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full py-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-xl mb-6 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <LayoutDashboard size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Project Master</h1>
          <p className="text-slate-500 mt-2 font-medium">Corporate Project Workspace</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
          
          {/* Hierarchy Access Section */}
          <div className="mb-8 relative z-10 space-y-3">
             <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hierarchical Access (Demo)</label>
            
            {/* Owner */}
            <button 
              onClick={() => handleDemoAccess(Role.OWNER)}
              className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-lg shadow-slate-900/10 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-amber-400">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Owner</p>
                  <p className="text-[10px] text-slate-400 font-medium">Full System Control</p>
                </div>
              </div>
              <ChevronRight className="text-slate-600 group-hover:text-white transition-colors" size={16} />
            </button>

            {/* Ops Manager */}
             <button 
              onClick={() => handleDemoAccess(Role.OPS_MANAGER)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-2xl hover:border-purple-300 hover:bg-purple-50 active:scale-[0.98] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-purple-600 border border-slate-100 shadow-sm">
                  <Activity size={16} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Ops Manager</p>
                  <p className="text-[10px] text-slate-400 font-medium group-hover:text-purple-600/70">Multi-Project Admin</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-purple-400 transition-colors" size={16} />
            </button>

            <div className="grid grid-cols-2 gap-3">
                {/* PM */}
                <button 
                onClick={() => handleDemoAccess(Role.PM)}
                className="bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-2xl hover:border-blue-300 hover:bg-blue-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 group text-center"
                >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm">
                    <Briefcase size={16} />
                </div>
                <div>
                    <p className="text-xs font-bold leading-tight">Project Mgr</p>
                    <p className="text-[9px] text-slate-400 group-hover:text-blue-500">Project Lead</p>
                </div>
                </button>

                {/* Contractor */}
                <button 
                onClick={() => handleDemoAccess(Role.CONTRACTOR)}
                className="bg-slate-50 border border-slate-200 text-slate-900 p-3 rounded-2xl hover:border-orange-300 hover:bg-orange-50 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 group text-center"
                >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-orange-600 border border-slate-100 shadow-sm">
                    <HardHat size={16} />
                </div>
                <div>
                    <p className="text-xs font-bold leading-tight">Contractor</p>
                    <p className="text-[9px] text-slate-400 group-hover:text-orange-500">Task Worker</p>
                </div>
                </button>
            </div>

          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-white px-3 text-slate-400 font-bold">Or Standard Login</span>
            </div>
          </div>

          {/* Team Login Section */}
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle size={20} className="shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base text-black font-bold placeholder:text-slate-300"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base text-black font-bold placeholder:text-slate-300"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={!username || !password}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              Sign In
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
