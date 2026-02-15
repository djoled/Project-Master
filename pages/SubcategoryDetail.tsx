
import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Plus, ClipboardList, Camera, Image as ImageIcon, CheckCircle, Clock, ChevronRight, Maximize2, Calendar, Trash2 } from 'lucide-react';
import { Task, Photo, Role } from '../types';

export const SubcategoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', description: '', dueDate: '' });
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sub = state.subcategories.find(s => s.id === id);
  if (!sub) return <div className="p-8 text-center font-bold text-slate-900">Department not found</div>;

  const project = state.projects.find(p => p.id === sub.projectId);
  const tasks = state.tasks.filter(t => t.subcategoryId === id);
  const photos = state.photos.filter(p => p.parentId === id).sort((a, b) => b.createdAt - a.createdAt);

  // ACCESS CONTROL REDEFINITION
  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  const isAssignedPM = project?.projectManagerIds.includes(state.currentUser?.id || '');
  
  // Only Owners, Ops Managers, and assigned PMs can edit structure (Tasks)
  const canEdit = isOwner || isOpsManager || isAssignedPM;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name.trim()) return;

    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      subcategoryId: sub.id,
      name: newTask.name,
      description: newTask.description,
      status: 'pending',
      createdBy: state.currentUser!.id,
      createdAt: Date.now(),
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).getTime() : undefined,
    };
    dispatch({ type: 'ADD_TASK', payload: task });
    setShowTaskModal(false);
    setNewTask({ name: '', description: '', dueDate: '' });
  };

  const handleDeleteTask = (e: React.MouseEvent, taskId: string, taskName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove task "${taskName}"?`)) {
      dispatch({ type: 'DELETE_TASK', payload: taskId });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photo: Photo = {
          id: Math.random().toString(36).substr(2, 9),
          parentType: 'subcategory',
          parentId: sub.id,
          imageUrl: reader.result as string,
          uploadedBy: state.currentUser!.id,
          uploadedByName: state.currentUser!.name,
          createdAt: Date.now(),
        };
        dispatch({ type: 'ADD_PHOTO', payload: photo });

        if (project) {
          const stakeholders = [project.ownerId, ...project.projectManagerIds].filter(uid => uid !== state.currentUser!.id);
          stakeholders.forEach(userId => {
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: Math.random().toString(36).substr(2, 9),
                userId,
                type: 'photo_uploaded',
                message: `${state.currentUser!.name} uploaded a photo to department: ${sub.name}`,
                relatedTo: { type: 'subcategory', id: sub.id, name: sub.name },
                isRead: false,
                createdAt: Date.now()
              }
            });
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (ts?: number) => {
    if (!ts) return 'No Date';
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Link to="/" className="hover:text-blue-600 transition-colors">Projects</Link>
        <ChevronRight size={12} />
        <Link to={`/project/${project?.id}`} className="hover:text-blue-600 transition-colors truncate max-w-[150px]">{project?.name}</Link>
        <ChevronRight size={12} />
        <span className="text-slate-900">{sub.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/project/${sub.projectId}`)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900">{sub.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. Department Photos (Documentation Gallery) - COMPACT VERSION */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Camera size={16} className="text-blue-600" />
                Documentation
              </h3>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
                Quick Add
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all group"
              >
                <Camera size={18} className="group-hover:scale-110 transition-transform" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />

              {photos.map(photo => (
                <div 
                  key={photo.id} 
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 relative group border border-slate-50 cursor-zoom-in shadow-sm"
                  onClick={() => setZoomedPhoto(photo)}
                >
                  <img src={photo.imageUrl} alt="Progress" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="text-white" size={16} />
                  </div>
                </div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-6 mt-2 text-slate-400 text-[10px] bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                <p>No documentation uploaded yet.</p>
              </div>
            )}
          </div>

          {/* 2. Department Overview */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
               <h2 className="text-lg font-bold text-slate-800">Department Description</h2>
               <div className="flex items-center gap-3">
                 <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">
                   <Clock size={12} />
                   Created: {formatDate(sub.createdAt)}
                 </span>
                 {sub.dueDate && (
                   <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded-md">
                     <Calendar size={12} />
                     Due: {formatDate(sub.dueDate)}
                   </span>
                 )}
               </div>
            </div>
            <p className="text-slate-500 leading-relaxed text-sm">{sub.description}</p>
          </div>

          {/* 3. Work Items (Tasks) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList size={22} className="text-blue-600" />
                Work Items
              </h3>
              {canEdit && (
                <button 
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                >
                  <Plus size={16} />
                  Create Task
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {tasks.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                  <ClipboardList size={40} className="mx-auto mb-4 opacity-10" />
                  <p className="font-medium text-slate-500">No work items defined yet</p>
                </div>
              ) : (
                tasks.map(task => (
                  <Link 
                    key={task.id} 
                    to={`/task/${task.id}`}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {task.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors text-sm">{task.name}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                            <ImageIcon size={10} />
                            {state.photos.filter(p => p.parentId === task.id).length} Docs
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            task.status === 'completed' ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 uppercase">
                              <Calendar size={10} />
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       {canEdit && (
                        <button 
                          onClick={(e) => handleDeleteTask(e, task.id, task.name)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                       )}
                      <ChevronLeft size={18} className="rotate-180 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-2xl p-4 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full translate-x-4 -translate-y-4" />
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 relative z-10 opacity-80">Quick Stats</h4>
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="text-center">
                <span className="block text-2xl font-black">{tasks.length}</span>
                <span className="text-[9px] uppercase font-bold opacity-60">Total</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-black">{tasks.filter(t => t.status === 'completed').length}</span>
                <span className="text-[9px] uppercase font-bold opacity-60">Done</span>
              </div>
              <div className="flex-1">
                 <div className="w-full bg-blue-800 h-2 rounded-full overflow-hidden border border-blue-500/30">
                  <div 
                    className="bg-white h-full transition-all duration-1000 ease-out" 
                    style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">New Work Item</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newTask.name}
                  onChange={e => setNewTask({...newTask, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-bold"
                  placeholder="e.g. Rough-in Inspection"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                  required
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none text-slate-950 font-medium"
                  placeholder="Specific requirements for this task..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Task Due Date</label>
                <input 
                  type="date"
                  value={newTask.dueDate}
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-950 font-bold"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setZoomedPhoto(null)}>
          <button onClick={() => setZoomedPhoto(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <Plus size={32} className="rotate-45" />
          </button>
          <div className="max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
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
