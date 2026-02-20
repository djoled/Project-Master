
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChatPanel } from '../components/ChatPanel';
import { Plus, Folder, Users, ChevronRight, Search, Clock, Trash2, ShieldCheck, UserPlus, AlertTriangle, Image as ImageIcon, Key, Briefcase, AlertCircle, CheckCircle2, Mail, X } from 'lucide-react';
import { Role, Project, User } from '../types';

export const ProjectList: React.FC = () => {
  const { state, dbActions } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', dueDate: '' });
  const [selectedPmIds, setSelectedPmIds] = useState<string[]>([]);
  
  // Delete Confirmation State
  const [projectToDelete, setProjectToDelete] = useState<{id: string, name: string} | null>(null);

  // Scheme Upload State
  const [schemes, setSchemes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  
  const filteredProjects = state.projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isAssigned = isOwner || isOpsManager ||
                       p.projectManagerIds.includes(state.currentUser!.id) ||
                       p.contractorIds.includes(state.currentUser!.id);
    return matchesSearch && isAssigned;
  });

  const availablePMs = state.users.filter(u => u.role === Role.PM);

  const togglePm = (id: string) => {
    setSelectedPmIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    const projectId = Math.random().toString(36).substr(2, 9);

    const project: Project = {
      id: projectId,
      name: newProject.name,
      description: newProject.description,
      ownerId: state.currentUser!.id,
      projectManagerIds: selectedPmIds,
      contractorIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueDate: newProject.dueDate ? new Date(newProject.dueDate).getTime() : undefined,
    };

    try {
      await dbActions.addProject(project);
      
      for (const imageUrl of schemes) {
        const photoId = Math.random().toString(36).substr(2, 9);
        await dbActions.addPhoto({
          id: photoId,
          parentType: 'project',
          parentId: projectId,
          imageUrl: imageUrl,
          uploadedBy: state.currentUser!.id,
          uploadedByName: state.currentUser!.name,
          createdAt: Date.now()
        });
      }

      setShowCreateModal(false);
      setNewProject({ name: '', description: '', dueDate: '' });
      setSelectedPmIds([]);
      setSchemes([]);
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Error saving project. Check console.");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwner && !isOpsManager) return;
    setProjectToDelete({ id, name });
  };

  const confirmDelete = async () => {
    if (projectToDelete && (isOwner || isOpsManager)) {
      try {
        await dbActions.deleteProject(projectToDelete.id);
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
      setProjectToDelete(null);
    }
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'No Date';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      <div className="lg:col-span-8 flex flex-col gap-6 overflow-hidden">
        
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
              <p className="text-slate-500 text-sm">Real-time cloud synchronization</p>
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
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <Clock size={12} />
                            Created: {formatDate(project.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(isOwner || isOpsManager) && (
                        <button 
                          onClick={(e) => handleDeleteClick(e, project.id, project.name)}
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
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Project Managers</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {availablePMs.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-sm">No Project Managers found in directory.</div>
                  ) : (
                    availablePMs.map(pm => (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => togglePm(pm.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                          selectedPmIds.includes(pm.id) 
                            ? 'bg-blue-50 border-blue-500 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedPmIds.includes(pm.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {pm.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${selectedPmIds.includes(pm.id) ? 'text-blue-900' : 'text-slate-700'}`}>
                            {pm.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">@{pm.username}</p>
                        </div>
                        {selectedPmIds.includes(pm.id) && <CheckCircle2 size={16} className="text-blue-600" />}
                      </button>
                    ))
                  )}
                </div>
              </div>

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
              </div>

              <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
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

      {projectToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
               <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={24} />
               </div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Project?</h3>
               <p className="text-sm text-slate-500 mb-6 font-bold text-slate-900">"{projectToDelete.name}"</p>
               <div className="flex gap-3">
                 <button onClick={() => setProjectToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all">Yes</button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};
