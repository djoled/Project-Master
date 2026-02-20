
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LayoutDashboard, Lock, ShieldCheck, ArrowRight, AlertCircle, User as UserIcon } from 'lucide-react';
import { User, Role } from '../types';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
        setLoading(false);
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Check if we need to create a profile doc (First time login implicit strategy, 
      // though prompt says "Save all users that sign in")
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      let userData: User;

      if (userSnap.exists()) {
          // Load existing profile
          const data = userSnap.data();
          userData = {
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'User',
              username: data.username || email.split('@')[0],
              email: firebaseUser.email || '',
              role: data.role || Role.CONTRACTOR, // Default fallback
              createdAt: data.createdAt || Date.now()
          };
      } else {
          // Create new profile stub if doesn't exist (Self-healing)
          userData = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || email.split('@')[0],
              username: email.split('@')[0],
              email: firebaseUser.email || '',
              role: Role.OWNER, // First user usually owner in single-player mode, or logic can vary
              createdAt: Date.now()
          };
          await setDoc(userRef, userData);
      }

      dispatch({ type: 'SET_USER', payload: userData });
      navigate('/');
      
    } catch (err: any) {
      console.error("Firebase Login Error:", err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError("Password or Email Incorrect");
      } else {
          setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-3xl"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-md w-full relative z-10">
          <div className="mb-8 text-center">
             <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-lg mb-4">
               <LayoutDashboard size={32} />
             </div>
             <h1 className="text-3xl font-black text-white tracking-tight">PROJECT MASTER</h1>
             <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2">Authentication</p>
          </div>

          <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
             <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm font-bold border border-red-500/20 flex items-center gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white font-bold placeholder:text-slate-600"
                      placeholder="user@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-900 border border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-white font-bold placeholder:text-slate-600"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !email || !password}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>AUTHENTICATE <ArrowRight size={18} /></>}
                </button>
                
                <div className="text-center pt-2">
                    <p className="text-xs text-slate-500">Contact your Operations Manager for access credentials.</p>
                </div>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};
