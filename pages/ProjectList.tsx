
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChatPanel } from '../components/ChatPanel';
import { Plus, Folder, Users, ChevronRight, Search, Calendar, Clock, Trash2, HardHat, ShieldCheck, CheckCircle2, UserPlus, AlertCircle, Image as ImageIcon, Key, User as UserIcon, Activity, Briefcase } from 'lucide-react';
import { Role, Project, User, Photo } from '../types';

export const ProjectList: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', pmName: '', pmUsername: '', pmPassword: '', dueDate: '' });
  
  // Scheme Upload State
  const [schemes, setSchemes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Invite State for Owner
  const [inviteOpsName, setInviteOpsName] = useState('');
  const [inviteOpsUsername, setInviteOpsUsername] = useState('');
  const [inviteOpsPassword, setInviteOpsPassword] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success'>('idle');

  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  
  const filteredProjects = state.projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Owners and Ops Managers see everything globally.
    // PMs and Contractors see only what they are assigned to.
    const isAssigned = isOwner || isOpsManager ||
                       p.projectManagerIds.includes(state.currentUser!.id) ||
                       p.contractorIds.includes(state.currentUser!.id);
    return matchesSearch && isAssigned;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      (Array.from(e.target.files) as File[]).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setSchemes(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeScheme = (index: number) => {
    setSchemes(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    const projectId = Math.random().toString(36).substr(2, 9);
    
    // Handle PM Assignment / Creation
    let pmIdToAssign = '';

    if (newProject.pmUsername.trim()) {
        const existingUser = state.users.find(u => u.username.toLowerCase() === newProject.pmUsername.trim().toLowerCase());
        
        if (existingUser) {
            pmIdToAssign = existingUser.id;
        } else if (newProject.pmPassword && newProject.pmName) {
            // Create new PM user
            const newPmId = Math.random().toString(36).substr(2, 9);
            const newPm: User = {
                id: newPmId,
                name: newProject.pmName,
                username: newProject.pmUsername,
                password: newProject.pmPassword,
                email: `${newProject.pmUsername}@projectmaster.com`,
                role: Role.PM,
                createdAt: Date.now()
            };
            dispatch({ type: 'REGISTER_USER', payload: newPm });
            pmIdToAssign = newPmId;
        }
    }

    const project: Project = {
      id: projectId,
      name: newProject.name,
      description: newProject.description,
      ownerId: state.currentUser!.id,
      projectManagerIds: pmIdToAssign ? [pmIdToAssign] : [],
      contractorIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueDate: newProject.dueDate ? new Date(newProject.dueDate).getTime() : undefined,
    };
    dispatch({ type: 'ADD_PROJECT', payload: project });
    
    // Add Schemes as Photos
    schemes.forEach(imageUrl => {
      const photo: Photo = {
        id: Math.random().toString(36).substr(2, 9),
        parentType: 'project',
        parentId: projectId,
        imageUrl: imageUrl,
        uploadedBy: state.currentUser!.id,
        uploadedByName: state.currentUser!.name,
        createdAt: Date.now()
      };
      dispatch({ type: 'ADD_PHOTO', payload: photo });
    });

    // Notify PM if assigned
    if (pmIdToAssign) {
       dispatch({
         type: 'ADD_NOTIFICATION',
         payload: {
           id: Math.random().toString(36).substr(2, 9),
           userId: pmIdToAssign,
           type: 'project_assigned',
           message: `You have been assigned to project: ${project.name}`,
           relatedTo: { type: 'project', id: project.id, name: project.name },
           isRead: false,
           createdAt: Date.now()
         }
       });
    }

    setShowCreateModal(false);
    setNewProject({ name: '', description: '', pmName: '', pmUsername: '', pmPassword: '', dueDate: '' });
    setSchemes([]);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove project "${name}"? This will delete all subcategories and tasks.`)) {
      dispatch({ type: 'DELETE_PROJECT', payload: id });
    }
  };

  const handleQuickCreateOps = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteOpsUsername.trim() || !inviteOpsName.trim() || !inviteOpsPassword.trim()) return;

    if (state.users.some(u => u.username.toLowerCase() === inviteOpsUsername.toLowerCase())) {
        alert('Username already exists');
        return;
    }

    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: inviteOpsName,
        username: inviteOpsUsername,
        password: inviteOpsPassword,
        email: `${inviteOpsUsername}@projectmaster.com`,
        role: Role.OPS_MANAGER,
        createdAt: Date.now()
    };

    dispatch({ type: 'REGISTER_USER', payload: newUser });

    setInviteOpsUsername('');
    setInviteOpsName('');
    setInviteOpsPassword('');
    setInviteStatus('success');
    setTimeout(() => setInviteStatus('idle'), 3000);
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'No Date';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const opsManagers = state.users.filter(u => u.role === Role.OPS_MANAGER);
  const pms = state.users.filter(u => u.role === Role.PM);
  const contractors = state.users.filter(u => u.role === Role.CONTRACTOR);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
        
        {/* DASHBOARD: Visible to Owners AND Ops Managers */}
        {(isOwner || isOpsManager) && (
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shrink-0">
             {/* Visual effects */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
             
             <div className="relative z-10 flex-1 w-full">
                <div className="flex items-center gap-3 mb-3">
                   <div className="bg-amber-500/20 p-2 rounded-xl text-amber-400">
                     <ShieldCheck size={20} />
                   </div>
                   <div>
                     <h2 className="text-lg font-bold leading-none">System Administration</h2>
                     <p className="text-xs text-slate-400 font-medium mt-1">Global User Management & Operations</p>
                   </div>
                </div>
                
                {/* Inline Invite Form (Quick Ops) - OWNER ONLY */}
                {isOwner && (
                  <form onSubmit={handleQuickCreateOps} className="bg-white/10 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 border border-white/10 backdrop-blur-sm mt-2">
                     <div className="flex-1 bg-white rounded-xl px-3 py-2 flex items-center gap-2">
                       <Users size={16} className="text-slate-400 shrink-0" />
                       <input 
                         required
                         value={inviteOpsName}
                         onChange={e => setInviteOpsName(e.target.value)}
                         placeholder="Full Name" 
                         className="bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm font-bold w-full outline-none"
                       />
                     </div>
                     <div className="flex-1 bg-white rounded-xl px-3 py-2 flex items-center gap-2">
                       <UserIcon size={16} className="text-slate-400 shrink-0" />
                       <input 
                         required
                         value={inviteOpsUsername}
                         onChange={e => setInviteOpsUsername(e.target.value)}
                         placeholder="Username" 
                         className="bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm font-bold w-full outline-none"
                       />
                     </div>
                     <div className="flex-1 bg-white rounded-xl px-3 py-2 flex items-center gap-2">
                       <Key size={16} className="text-slate-400 shrink-0" />
                       <input 
                         required
                         value={inviteOpsPassword}
                         onChange={e => setInviteOpsPassword(e.target.value)}
                         placeholder="Password" 
                         className="bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-sm font-bold w-full outline-none"
                       />
                     </div>
                     <button 
                       type="submit"
                       className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap ${
                          inviteStatus === 'success' 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                       }`}
                     >
                       {inviteStatus === 'success' ? (
                         <><CheckCircle2 size={16} /> Created!</>
                       ) : (
                         <><UserPlus size={16} /> Add Ops</>
                       )}
                     </button>
                  </form>
                )}
             </div>

             {/* System Stats - Visible to Owner & Ops */}
             <div className="relative z-10 flex flex-col gap-2 shrink-0 self-start md:self-center w-full md:w-auto mt-2 md:mt-0">
                <div className="flex gap-2">
                    <div className="bg-white/10 rounded-xl p-3 flex-1 flex flex-col items-center justify-center min-w-[70px] border border-white/5">
                        <Activity size={16} className="text-purple-400 mb-1" />
                        <span className="text-lg font-bold leading-none">{opsManagers.length}</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400">Ops</span>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 flex-1 flex flex-col items-center justify-center min-w-[70px] border border-white/5">
                        <Briefcase size={16} className="text-blue-400 mb-1" />
                        <span className="text-lg font-bold leading-none">{pms.length}</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400">PMs</span>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 flex-1 flex flex-col items-center justify-center min-w-[70px] border border-white/5">
                        <HardHat size={16} className="text-orange-400 mb-1" />
                        <span className="text-lg font-bold leading-none">{contractors.length}</span>
                        <span className="text-[8px] uppercase font-bold text-slate-400">Team</span>
                    </div>
                </div>
             </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
              <p className="text-slate-500 text-sm">Manage your ongoing tasks and projects</p>
            </div>
            {(isOwner || isOpsManager) && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Plus size={20} />
                Create Project
              </button>
            )}
          </div>

          <div className="relative mb-6 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-medium"
            />
          </div>

          <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Folder className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-slate-500 font-medium">No projects found</p>
              </div>
            ) : (
              filteredProjects.map((project) => (
                <Link 
                  key={project.id} 
                  to={`/project/${project.id}`}
                  className="group block bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Folder size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                        <p className="text-slate-500 text-sm line-clamp-1 mt-1">{project.description}</p>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3">
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <Users size={12} />
                            {project.projectManagerIds.length} PMs
                          </span>
                           {project.contractorIds.length > 0 && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <HardHat size={12} />
                              {project.contractorIds.length} Contractors
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <Clock size={12} />
                            Created: {formatDate(project.createdAt)}
                          </span>
                          {project.dueDate && (
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-wider">
                              <Calendar size={12} />
                              Due: {formatDate(project.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isOwner || isOpsManager) && (
                        <button 
                          onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      <ChevronRight className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 hidden lg:block h-full min-h-0">
        <ChatPanel />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[95vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900">New Project</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Project Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-bold"
                  placeholder="e.g. Q4 Office Renovation"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-950 font-medium"
                  placeholder="What is this project about?"
                />
              </div>
              
              {/* SCHEMES UPLOAD */}
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
                   <span>Project Schematics / Photos</span>
                   <span className="text-xs text-slate-400 font-normal">{schemes.length} selected</span>
                 </label>
                 <div className="grid grid-cols-4 gap-2 mb-2">
                    {schemes.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                         <img src={src} alt="scheme" className="w-full h-full object-cover" />
                         <button 
                           type="button"
                           onClick={() => removeScheme(i)}
                           className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-blue-500"
                    >
                       <ImageIcon size={20} className="mb-1" />
                       <span className="text-[9px] font-bold uppercase">Add</span>
                    </button>
                 </div>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileSelect} 
                   accept="image/*" 
                   multiple 
                   className="hidden" 
                 />
                 <p className="text-xs text-slate-400">Upload blueprints, initial site photos, or schematics.</p>
              </div>

              {/* CREATE PM SECTION */}
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <h3 className="text-xs font-black uppercase tracking-widest text-blue-700 mb-3 flex items-center gap-2">
                      <UserPlus size={14} /> Assign / Create Lead PM
                  </h3>
                  <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-blue-900 mb-1">Full Name</label>
                        <input 
                          value={newProject.pmName}
                          onChange={e => setNewProject({...newProject, pmName: e.target.value})}
                          className="w-full px-3 py-2 bg-white rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900"
                          placeholder="Project Manager Name"
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-blue-900 mb-1">Username</label>
                            <input 
                              value={newProject.pmUsername}
                              onChange={e => setNewProject({...newProject, pmUsername: e.target.value})}
                              className="w-full px-3 py-2 bg-white rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900"
                              placeholder="username"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-blue-900 mb-1">Password</label>
                            <input 
                              value={newProject.pmPassword}
                              onChange={e => setNewProject({...newProject, pmPassword: e.target.value})}
                              className="w-full px-3 py-2 bg-white rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900"
                              placeholder="password"
                            />
                        </div>
                      </div>
                      <p className="text-[10px] text-blue-600/70 leading-tight">
                         If username exists, the user will be assigned. If not, a new account will be created with these credentials.
                      </p>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Project Due Date</label>
                  <input 
                    type="date"
                    value={newProject.dueDate}
                    onChange={e => setNewProject({...newProject, dueDate: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-bold"
                  />
              </div>
              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
