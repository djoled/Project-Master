
import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Plus, FolderOpen, CheckCircle2, UserCog, Users, ShieldCheck, X, UserPlus, Lock, Camera, Maximize2 } from 'lucide-react';
import { Subcategory, Role, Photo } from '../types';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dbActions } = useAppContext();
  const [showSubModal, setShowSubModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', description: '', dueDate: '' });
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  
  // Department Photo Upload State
  const [subSchemes, setSubSchemes] = useState<string[]>([]);
  const subFileInputRef = useRef<HTMLInputElement>(null);
  
  // Team Assignment State
  const [teamSelection, setTeamSelection] = useState<{ pms: string[], contractors: string[] }>({ pms: [], contractors: [] });

  const project = state.projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-center font-bold">Project not found</div>;

  const subcategories = state.subcategories.filter(s => s.projectId === id);
  
  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  const isAssignedPM = project.projectManagerIds.includes(state.currentUser?.id || '');
  const canEdit = isOwner || isOpsManager || isAssignedPM;

  const currentPMs = project.projectManagerIds.map(pmId => state.users.find(u => u.id === pmId)).filter(Boolean);
  
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

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name.trim()) return;

    const subId = Math.random().toString(36).substr(2, 9);
    
    try {
      await dbActions.addSubcategory({
        id: subId,
        projectId: project.id,
        name: newSub.name,
        description: newSub.description,
        createdBy: state.currentUser!.id,
        createdAt: Date.now(),
        dueDate: newSub.dueDate ? new Date(newSub.dueDate).getTime() : undefined,
      });

      for (const imageUrl of subSchemes) {
        await dbActions.addPhoto({
          id: Math.random().toString(36).substr(2, 9),
          parentType: 'subcategory',
          parentId: subId,
          imageUrl: imageUrl,
          uploadedBy: state.currentUser!.id,
          uploadedByName: state.currentUser!.name,
          createdAt: Date.now()
        });
      }

      setShowSubModal(false);
      setNewSub({ name: '', description: '', dueDate: '' });
      setSubSchemes([]);
    } catch (err) {
      console.error("Failed to create subcategory:", err);
    }
  };

  const openTeamModal = () => {
    setTeamSelection({
      pms: [...project.projectManagerIds],
      contractors: [...project.contractorIds]
    });
    setShowTeamModal(true);
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbActions.updateProjectTeam(project.id, teamSelection.pms, teamSelection.contractors);
      setShowTeamModal(false);
    } catch (err) {
      console.error("Failed to update team:", err);
    }
  };

  const toggleTeamMember = (id: string, role: 'pm' | 'contractor') => {
    setTeamSelection(prev => {
      if (role === 'pm') {
        return { ...prev, pms: prev.pms.includes(id) ? prev.pms.filter(x => x !== id) : [...prev.pms, id] };
      } else {
        return { ...prev, contractors: prev.contractors.includes(id) ? prev.contractors.filter(x => x !== id) : [...prev.contractors, id] };
      }
    });
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
          <h1 className="text-3xl font-extrabold text-slate-900">{project.name}</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Project Summary</h2>
            <p className="text-slate-500 leading-relaxed mb-4">{project.description}</p>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-slate-400">Created: {formatDate(project.createdAt)}</span>
              {project.dueDate && <span className="bg-blue-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-blue-600">Due: {formatDate(project.dueDate)}</span>}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm"><ShieldCheck size={20} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase">Owner</p><p className="text-sm font-bold text-slate-900">{state.users.find(u => u.id === project.ownerId)?.name}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm"><Users size={20} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase">Managers</p><p className="text-sm font-bold text-slate-900">{currentPMs.length > 0 ? currentPMs.map(pm => pm?.name).join(', ') : 'Unassigned'}</p></div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            {canEdit ? (
              <button onClick={openTeamModal} className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"><UserCog size={18} /> Add Team</button>
            ) : <div className="bg-slate-50 px-5 py-3 rounded-2xl text-slate-400 flex items-center gap-2"><Lock size={16} /><span className="text-xs font-bold uppercase">Locked</span></div>}
            <div className="bg-blue-600 px-6 py-4 rounded-2xl flex flex-col items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Departments</span>
              <span className="text-3xl font-black">{subcategories.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FolderOpen size={20} className="text-blue-600" /> Departments</h3>
        {canEdit && <button onClick={() => setShowSubModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg active:scale-95"><Plus size={20} /> Add Dept</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subcategories.map((sub) => (
          <Link key={sub.id} to={`/subcategory/${sub.id}`} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><FolderOpen size={24} /></div>
            <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors mt-4">{sub.name}</h4>
            <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">{sub.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-1.5 text-slate-400"><CheckCircle2 size={14} /><span className="text-[10px] font-black uppercase">Active</span></div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">{state.tasks.filter(t => t.subcategoryId === sub.id).length} Tasks</span>
            </div>
          </Link>
        ))}
      </div>

      {showTeamModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><UserCog className="text-blue-600" size={24} /> Add Team</h2>
              <button onClick={() => setShowTeamModal(false)}><Plus size={24} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleUpdateTeam} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Users size={14} /> Contractors</h3>
                  <div className="space-y-2">
                    {state.users.filter(u => u.role === Role.CONTRACTOR).map(c => (
                      <button key={c.id} type="button" onClick={() => toggleTeamMember(c.id, 'contractor')} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${teamSelection.contractors.includes(c.id) ? 'bg-slate-100 border-slate-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${teamSelection.contractors.includes(c.id) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{c.name.charAt(0)}</div><div className="text-left"><p className={`text-sm font-bold ${teamSelection.contractors.includes(c.id) ? 'text-slate-900' : 'text-slate-700'}`}>{c.name}</p><p className="text-[10px] text-slate-400">@{c.username}</p></div></div>
                        {teamSelection.contractors.includes(c.id) && <CheckCircle2 size={18} className="text-slate-800" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 pt-2 border-t bg-white shrink-0 flex gap-3">
                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                <button type="submit" className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl active:scale-95">Save Team</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">New Dept</h2><button onClick={() => setShowSubModal(false)}><Plus size={24} className="rotate-45" /></button></div>
            <form onSubmit={handleCreateSub} className="p-6 space-y-5">
              <input autoFocus required type="text" value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-950" placeholder="Dept Name" />
              <textarea required rows={3} value={newSub.description} onChange={e => setNewSub({...newSub, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none text-slate-950" placeholder="Description" />
              <input type="date" value={newSub.dueDate} onChange={e => setNewSub({...newSub, dueDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-950" />
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setShowSubModal(false)} className="flex-1 py-3 text-slate-600 font-bold">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
