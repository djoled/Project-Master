
import React, { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Plus, ClipboardList, Camera, CheckCircle, Clock, ChevronRight, Maximize2, X } from 'lucide-react';
import { Photo, Role } from '../types';

export const SubcategoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dbActions } = useAppContext();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', description: '', dueDate: '' });
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sub = state.subcategories.find(s => s.id === id);
  if (!sub) return <div className="p-8 text-center font-bold text-slate-900">Department not found</div>;

  const project = state.projects.find(p => p.id === sub.projectId);
  const tasks = state.tasks.filter(t => t.subcategoryId === id);
  const photos = state.photos.filter(p => p.parentId === id).sort((a, b) => b.createdAt - a.createdAt);

  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  const isAssignedPM = project?.projectManagerIds.includes(state.currentUser?.id || '');
  const canEdit = isOwner || isOpsManager || isAssignedPM;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name.trim()) return;

    const taskId = Math.random().toString(36).substr(2, 9);
    
    try {
      await dbActions.addTask({
        id: taskId,
        subcategoryId: sub.id,
        name: newTask.name,
        description: newTask.description,
        status: 'pending',
        createdBy: state.currentUser!.id,
        createdAt: Date.now(),
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).getTime() : undefined,
      });
      setShowTaskModal(false);
      setNewTask({ name: '', description: '', dueDate: '' });
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoId = Math.random().toString(36).substr(2, 9);
        const imageUrl = reader.result as string;

        try {
          await dbActions.addPhoto({
            id: photoId,
            parentType: 'subcategory',
            parentId: sub.id,
            imageUrl: imageUrl,
            uploadedBy: state.currentUser!.id,
            uploadedByName: state.currentUser!.name,
            createdAt: Date.now(),
          });
        } catch (err) {
          console.error("Photo upload failed:", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
        <Link to="/" className="hover:text-blue-600">Projects</Link>
        <ChevronRight size={12} />
        <Link to={`/project/${project?.id}`} className="hover:text-blue-600 truncate max-w-[150px]">{project?.name}</Link>
        <ChevronRight size={12} />
        <span className="text-slate-900">{sub.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/project/${sub.projectId}`)} className="p-2 hover:bg-white rounded-lg border text-slate-500"><ChevronLeft size={24} /></button>
        <div className="flex-1"><h1 className="text-3xl font-extrabold text-slate-900">{sub.name}</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><Camera size={16} className="text-blue-600" /> Documentation</h3>
              <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-blue-600 flex items-center gap-1"><Plus size={14} /> Add Photo</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:text-blue-500 transition-all"><Camera size={18} /></button>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
              {photos.map(photo => (
                <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100 relative group cursor-zoom-in" onClick={() => setZoomedPhoto(photo)}>
                  <img src={photo.imageUrl} alt="Progress" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 className="text-white" size={16} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><ClipboardList size={22} className="text-blue-600" /> Work Items</h3>
              {canEdit && <button onClick={() => setShowTaskModal(true)} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg active:scale-95"><Plus size={16} /> Create Task</button>}
            </div>
            <div className="grid grid-cols-1 gap-3">
               {tasks.length === 0 ? <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">No work items yet</div> : 
               tasks.map(task => (
                <Link key={task.id} to={`/task/${task.id}`} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>{task.status === 'completed' ? <CheckCircle size={20} /> : <Clock size={20} />}</div>
                    <div><h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600">{task.name}</h4><div className="flex items-center gap-3 mt-1"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${task.status === 'completed' ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-700'}`}>{task.status.replace('_', ' ')}</span></div></div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">New Task</h2><button onClick={() => setShowTaskModal(false)}><Plus size={24} className="rotate-45" /></button></div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-5">
              <input autoFocus required type="text" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-950" placeholder="Task Name" />
              <textarea required rows={3} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none text-slate-950" placeholder="Description" />
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-950" />
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 py-3 text-slate-600 font-bold">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95">Add Task</button></div>
            </form>
          </div>
        </div>
      )}

      {zoomedPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md" onClick={() => setZoomedPhoto(null)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white"><X size={32} /></button>
          <img src={zoomedPhoto.imageUrl} alt="Zoomed" className="max-h-[80vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
};
