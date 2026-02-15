
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Plus, FolderOpen, Image as ImageIcon, CheckCircle2, MoreHorizontal, UserCog, Users, ShieldCheck, Calendar, Clock, Trash2, HardHat, Maximize2, X, UserPlus, Check, Lock, Key } from 'lucide-react';
import { Subcategory, Role, Photo, User } from '../types';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [showSubModal, setShowSubModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', description: '', dueDate: '' });
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  
  // Department Photo Upload State
  const [subSchemes, setSubSchemes] = useState<string[]>([]);
  const subFileInputRef = useRef<HTMLInputElement>(null);
  
  // Team Assignment State
  const [teamSelection, setTeamSelection] = useState<{ pms: string[], contractors: string[] }>({ pms: [], contractors: [] });
  
  // Quick Create User State (Inside Modal)
  const [inviteName, setInviteName] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  
  // ACCESS CONTROL REDEFINITION
  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  const isAssignedPM = state.projects.find(p => p.id === id)?.projectManagerIds.includes(state.currentUser?.id || '');
  
  // Permission to create PMs (Only Owner and Ops)
  const canCreatePM = isOwner || isOpsManager;

  const [inviteRole, setInviteRole] = useState<Role.PM | Role.CONTRACTOR>(canCreatePM ? Role.PM : Role.CONTRACTOR);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Reset invite role when modal opens or permission changes
  useEffect(() => {
    if (showTeamModal) {
      setInviteRole(canCreatePM ? Role.PM : Role.CONTRACTOR);
    }
  }, [showTeamModal, canCreatePM]);

  const project = state.projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-center font-bold">Project not found</div>;

  const subcategories = state.subcategories.filter(s => s.projectId === id);
  
  // PMs now have full edit rights on their projects, along with Owners/Ops
  const canEdit = isOwner || isOpsManager || isAssignedPM;
  
  const currentPMs = project.projectManagerIds.map(pmId => state.users.find(u => u.id === pmId)).filter(Boolean);
  const currentContractors = project.contractorIds.map(cId => state.users.find(u => u.id === cId)).filter(Boolean);
  
  const projectSchemes = state.photos.filter(p => p.parentId === id && p.parentType === 'project');

  const handleSubFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      (Array.from(e.target.files) as File[]).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setSubSchemes(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeSubScheme = (index: number) => {
    setSubSchemes(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name.trim()) return;

    const subId = Math.random().toString(36).substr(2, 9);

    const sub: Subcategory = {
      id: subId,
      projectId: project.id,
      name: newSub.name,
      description: newSub.description,
      createdBy: state.currentUser!.id,
      createdAt: Date.now(),
      dueDate: newSub.dueDate ? new Date(newSub.dueDate).getTime() : undefined,
    };
    dispatch({ type: 'ADD_SUBCATEGORY', payload: sub });

    // Add Department Photos
    subSchemes.forEach(imageUrl => {
      const photo: Photo = {
        id: Math.random().toString(36).substr(2, 9),
        parentType: 'subcategory',
        parentId: subId,
        imageUrl: imageUrl,
        uploadedBy: state.currentUser!.id,
        uploadedByName: state.currentUser!.name,
        createdAt: Date.now()
      };
      dispatch({ type: 'ADD_PHOTO', payload: photo });
    });

    setShowSubModal(false);
    setNewSub({ name: '', description: '', dueDate: '' });
    setSubSchemes([]);
  };

  const openTeamModal = () => {
    setTeamSelection({
      pms: [...project.projectManagerIds],
      contractors: [...project.contractorIds]
    });
    setInviteName('');
    setInviteUsername('');
    setInvitePassword('');
    setInviteSuccess(false);
    setShowTeamModal(true);
  };

  const handleUpdateTeam = (e: React.FormEvent) => {
    e.preventDefault();

    dispatch({ 
      type: 'UPDATE_PROJECT_MEMBERS', 
      payload: { 
        projectId: project.id, 
        pmIds: teamSelection.pms,
        contractorIds: teamSelection.contractors
      } 
    });

    // Notify new members
    const allNewMembers = [...teamSelection.pms, ...teamSelection.contractors];
    allNewMembers.forEach(uid => {
      if (!project.projectManagerIds.includes(uid) && !project.contractorIds.includes(uid)) {
         dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            id: Math.random().toString(36).substr(2, 9),
            userId: uid,
            type: 'project_assigned',
            message: `You have been assigned to project: ${project.name}`,
            relatedTo: { type: 'project', id: project.id, name: project.name },
            isRead: false,
            createdAt: Date.now()
          }
        });
      }
    });

    setShowTeamModal(false);
  };

  const handleCreateAndAssign = (e: React.MouseEvent) => {
      e.preventDefault();
      if(!inviteUsername.trim() || !inviteName.trim()) return;

      let userIdToAdd = '';
      const existingUser = state.users.find(u => u.username.toLowerCase() === inviteUsername.toLowerCase());

      if (existingUser) {
          userIdToAdd = existingUser.id;
          // Ensure we don't switch roles on existing users unexpectedly, but for MVP we assume correct assignment
      } else {
          if (!invitePassword) {
              alert('Password is required for new users');
              return;
          }
          // Register new User
          const newUser: User = {
              id: Math.random().toString(36).substr(2, 9),
              name: inviteName,
              username: inviteUsername,
              password: invitePassword,
              email: `${inviteUsername}@projectmaster.com`,
              role: inviteRole,
              createdAt: Date.now()
          };
          dispatch({ type: 'REGISTER_USER', payload: newUser });
          userIdToAdd = newUser.id;
      }

      // Add to selection based on role
      if (inviteRole === Role.PM) {
         if (!teamSelection.pms.includes(userIdToAdd)) {
             setTeamSelection(prev => ({...prev, pms: [...prev.pms, userIdToAdd]}));
         }
      } else {
         if (!teamSelection.contractors.includes(userIdToAdd)) {
             setTeamSelection(prev => ({...prev, contractors: [...prev.contractors, userIdToAdd]}));
         }
      }

      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      setInviteName('');
      setInviteUsername('');
      setInvitePassword('');
  };

  const toggleTeamMember = (id: string, role: 'pm' | 'contractor') => {
    setTeamSelection(prev => {
      if (role === 'pm') {
        return {
          ...prev,
          pms: prev.pms.includes(id) ? prev.pms.filter(x => x !== id) : [...prev.pms, id]
        };
      } else {
        return {
          ...prev,
          contractors: prev.contractors.includes(id) ? prev.contractors.filter(x => x !== id) : [...prev.contractors, id]
        };
      }
    });
  };

  const handleDeleteSub = (e: React.MouseEvent, subId: string, subName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove department "${subName}"? This will delete all associated tasks.`)) {
      dispatch({ type: 'DELETE_SUBCATEGORY', payload: subId });
    }
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'No Date';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            <span>Project Management Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">{project.name}</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-full -z-10" />
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Project Summary</h2>
            <p className="text-slate-500 leading-relaxed max-w-3xl mb-4">{project.description}</p>
            
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-full">
                <Clock size={12} />
                Created: {formatDate(project.createdAt)}
              </span>
              {project.dueDate && (
                <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-full">
                  <Calendar size={12} />
                  Due: {formatDate(project.dueDate)}
                </span>
              )}
            </div>

            {/* PROJECT SCHEMES */}
            {projectSchemes.length > 0 && (
              <div className="mb-6">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                    <ImageIcon size={14} /> Schematics & Blueprints
                 </h3>
                 <div className="flex flex-wrap gap-2">
                    {projectSchemes.map(photo => (
                      <div 
                        key={photo.id} 
                        className="w-20 h-20 rounded-xl overflow-hidden cursor-zoom-in relative group border border-slate-200"
                        onClick={() => setZoomedPhoto(photo)}
                      >
                         <img src={photo.imageUrl} alt="Scheme" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 size={16} className="text-white" />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-6">
              {/* Owner */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Owner</p>
                  <p className="text-sm font-bold text-slate-900">{state.users.find(u => u.id === project.ownerId)?.name}</p>
                </div>
              </div>

              {/* PMs */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Managers</p>
                  <p className="text-sm font-bold text-slate-900">
                    {currentPMs.length > 0 ? currentPMs.map(pm => pm?.name).join(', ') : 'Unassigned'}
                  </p>
                </div>
              </div>

               {/* Contractors */}
               <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm">
                  <HardHat size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Contractors</p>
                  <p className="text-sm font-bold text-slate-900">
                    {currentContractors.length > 0 ? currentContractors.map(c => c?.name).join(', ') : 'None'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {canEdit ? (
              <button 
                onClick={openTeamModal}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
              >
                <UserCog size={18} />
                Add PM / Team
              </button>
            ) : (
              <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex items-center justify-center gap-2 text-slate-400">
                 <Lock size={16} />
                 <span className="text-xs font-bold uppercase">Team Locked</span>
              </div>
            )}
            <div className="bg-blue-600 px-6 py-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Departments</span>
              <span className="text-3xl font-black">{subcategories.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen size={20} className="text-blue-600" />
          Departments
        </h3>
        {canEdit && (
          <button 
            onClick={() => setShowSubModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={20} />
            Add Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subcategories.map((sub) => (
          <Link 
            key={sub.id}
            to={`/subcategory/${sub.id}`}
            className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-3xl -z-10 group-hover:bg-blue-50 transition-colors" />
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <FolderOpen size={24} />
              </div>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <button 
                    onClick={(e) => handleDeleteSub(e, sub.id, sub.name)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button className="text-slate-300 hover:text-slate-500 transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{sub.name}</h4>
            <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">{sub.description}</p>
            
            <div className="flex flex-col gap-2 mb-6">
               <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <Clock size={12} />
                  Created: {formatDate(sub.createdAt)}
               </div>
               {sub.dueDate && (
                 <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-wider">
                    <Calendar size={12} />
                    Due: {formatDate(sub.dueDate)}
                 </div>
               )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-1.5 text-slate-400">
                <CheckCircle2 size={14} />
                <span className="text-[10px] font-black uppercase">Active</span>
              </div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">
                {state.tasks.filter(t => t.subcategoryId === sub.id).length} Tasks
              </span>
            </div>
          </Link>
        ))}
        {subcategories.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4 opacity-20" />
            <p className="text-slate-500 font-medium">No departments defined for this project.</p>
          </div>
        )}
      </div>

      {/* Team Management Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserCog className="text-blue-600" size={24} />
                Add PM / Team
              </h2>
              <button onClick={() => setShowTeamModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTeam} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                
                {/* Create/Assign User Section */}
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-700 mb-3 flex items-center gap-2">
                        <UserPlus size={14} /> Create New Account
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            {/* Role Switcher - Controlled by permissions */}
                            {canCreatePM && (
                              <button
                                type="button"
                                onClick={() => setInviteRole(Role.PM)}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${inviteRole === Role.PM ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                              >
                                  Project Manager
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setInviteRole(Role.CONTRACTOR)}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${inviteRole === Role.CONTRACTOR ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'} ${!canCreatePM ? 'w-full' : ''}`}
                            >
                                Contractor
                            </button>
                        </div>

                        <div>
                            <input 
                                placeholder="Full Name"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                className="w-full px-3 py-2 bg-white rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900"
                            />
                        </div>
                        <div className="flex gap-2">
                            <input 
                                placeholder="Username"
                                value={inviteUsername}
                                onChange={(e) => setInviteUsername(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900"
                            />
                             <input 
                                placeholder="Password"
                                value={invitePassword}
                                onChange={(e) => setInvitePassword(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white rounded-lg text-sm font-bold border-none focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleCreateAndAssign}
                            className={`w-full px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${inviteSuccess ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {inviteSuccess ? <Check size={14} /> : <Plus size={14} />}
                            {inviteSuccess ? 'Created & Assigned' : 'Create & Assign'}
                        </button>
                        <p className="text-[10px] text-blue-600/60 text-center">
                            If username exists, they will just be assigned. Otherwise, a new account is created.
                        </p>
                    </div>
                </div>

                {/* Managers Section - Only Show to those who can manage PMs */}
                {canCreatePM && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <Users size={14} /> Project Managers
                    </h3>
                    <div className="space-y-2">
                      {state.users.filter(u => u.role === Role.PM).map(pm => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => toggleTeamMember(pm.id, 'pm')}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            teamSelection.pms.includes(pm.id)
                              ? 'bg-blue-50 border-blue-500 shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              teamSelection.pms.includes(pm.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {pm.name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className={`text-sm font-bold ${teamSelection.pms.includes(pm.id) ? 'text-blue-900' : 'text-slate-700'}`}>{pm.name}</p>
                              <p className="text-[10px] text-slate-400">@{pm.username}</p>
                            </div>
                          </div>
                          {teamSelection.pms.includes(pm.id) && <CheckCircle2 size={18} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contractors Section - Visible to All with Edit Access */}
                <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                     <HardHat size={14} /> Contractors
                   </h3>
                   <div className="space-y-2">
                     {state.users.filter(u => u.role === Role.CONTRACTOR).map(c => (
                       <button
                         key={c.id}
                         type="button"
                         onClick={() => toggleTeamMember(c.id, 'contractor')}
                         className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                           teamSelection.contractors.includes(c.id)
                             ? 'bg-slate-100 border-slate-500 shadow-sm' 
                             : 'bg-white border-slate-200 hover:border-slate-300'
                         }`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                             teamSelection.contractors.includes(c.id) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                           }`}>
                             {c.name.charAt(0)}
                           </div>
                           <div className="text-left">
                             <p className={`text-sm font-bold ${teamSelection.contractors.includes(c.id) ? 'text-slate-900' : 'text-slate-700'}`}>{c.name}</p>
                             <p className="text-[10px] text-slate-400">@{c.username}</p>
                           </div>
                         </div>
                         {teamSelection.contractors.includes(c.id) && <CheckCircle2 size={18} className="text-slate-800" />}
                       </button>
                     ))}
                   </div>
                </div>
              </div>

              <div className="p-6 pt-2 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                <button 
                  type="submit" 
                  className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all"
                >
                  Save Assignments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Subcategory (Department) Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900">New Department</h2>
              <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateSub} className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newSub.name}
                  onChange={e => setNewSub({...newSub, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-bold"
                  placeholder="e.g. Electrical Phase 1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newSub.description}
                  onChange={e => setNewSub({...newSub, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-950 font-medium"
                  placeholder="Details for this department..."
                />
              </div>
              
              {/* DEPARTMENT PHOTOS UPLOAD */}
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
                   <span>Department Photos / Schematics</span>
                   <span className="text-xs text-slate-400 font-normal">{subSchemes.length} selected</span>
                 </label>
                 <div className="grid grid-cols-4 gap-2 mb-2">
                    {subSchemes.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                         <img src={src} alt="scheme" className="w-full h-full object-cover" />
                         <button 
                           type="button"
                           onClick={() => removeSubScheme(i)}
                           className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                         >
                           <Trash2 size={16} />
                         </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => subFileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-blue-500"
                    >
                       <ImageIcon size={20} className="mb-1" />
                       <span className="text-[9px] font-bold uppercase">Add</span>
                    </button>
                 </div>
                 <input 
                   type="file" 
                   ref={subFileInputRef} 
                   onChange={handleSubFileSelect} 
                   accept="image/*" 
                   multiple 
                   className="hidden" 
                 />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
                <input 
                  type="date"
                  value={newSub.dueDate}
                  onChange={e => setNewSub({...newSub, dueDate: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-bold"
                />
              </div>
              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setShowSubModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {zoomedPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          <button onClick={() => setZoomedPhoto(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <X size={32} />
          </button>
          <div className="max-w-5xl w-full flex flex-col items-center">
            <img src={zoomedPhoto.imageUrl} alt="Zoomed" className="max-h-[80vh] object-contain rounded-xl shadow-2xl mb-6" />
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-1">{zoomedPhoto.uploadedByName}</p>
              <p className="text-slate-400 text-sm">{new Date(zoomedPhoto.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
