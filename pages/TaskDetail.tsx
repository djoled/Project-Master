
import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Camera, History, CheckCircle2, Clock, Sparkles, X, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Photo, Role, Task } from '../types';
import { GoogleGenAI } from "@google/genai";

export const TaskDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dbActions } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);

  const task = state.tasks.find(t => t.id === id);
  const sub = state.subcategories.find(s => s.id === task?.subcategoryId);
  const project = state.projects.find(p => p.id === sub?.projectId);
  
  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  const isAssignedPM = project?.projectManagerIds.includes(state.currentUser?.id || '');
  const isAssignedContractor = project?.contractorIds.includes(state.currentUser?.id || '');
  
  const hasAccess = isOwner || isOpsManager || isAssignedPM || isAssignedContractor;

  if (!task) return <div className="p-8 text-center font-bold">Task not found</div>;

  if (!hasAccess) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 mb-6">You are not assigned to this project's team.</p>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Go Home</button>
      </div>
    );
  }

  const photos = state.photos.filter(p => p.parentId === id).sort((a, b) => b.createdAt - a.createdAt);
  const isManagement = isOwner || isOpsManager || isAssignedPM;
  const isContractor = state.currentUser?.role === Role.CONTRACTOR;

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Task: ${task.name}. Description: ${task.description}. Status: ${task.status}. Documentation: ${photos.length} photos. Provide a concise, professional progress summary.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAnalysisResult(response.text || "Analysis complete.");
    } catch (err) {
      setAnalysisResult("AI Analysis currently unavailable.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoId = Math.random().toString(36).substr(2, 9);
        const imageUrl = reader.result as string;

        try {
          await dbActions.addPhoto({
            id: photoId,
            parentType: 'task',
            parentId: task.id,
            imageUrl,
            uploadedBy: state.currentUser!.id,
            uploadedByName: state.currentUser!.name,
            createdAt: Date.now()
          });
        } catch (err) {
          console.error("Upload failed:", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleStatus = async () => {
    let nextStatus: Task['status'] = task.status;
    if (isManagement) {
        nextStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    } else if (isContractor) {
        if (task.status === 'pending') nextStatus = 'in_progress';
        else if (task.status === 'in_progress') nextStatus = 'pending_review';
        else return;
    }

    try {
      await dbActions.updateTask({ ...task, status: nextStatus });
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const formatDate = (ts?: number) => ts ? new Date(ts).toLocaleDateString() : 'No Date';

  const getStatusButtonConfig = () => {
    if (task.status === 'completed') return { label: 'Completed', icon: <CheckCircle2 size={18} />, color: 'bg-green-600 text-white' };
    if (task.status === 'pending_review') return { label: isManagement ? 'Approve' : 'Reviewing', icon: <Clock size={18} />, color: isManagement ? 'bg-indigo-600 text-white animate-pulse' : 'bg-indigo-50 text-indigo-700' };
    if (task.status === 'in_progress') return { label: isContractor ? 'Finish' : 'In Progress', icon: <Clock size={18} />, color: isContractor ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700' };
    return { label: 'Start', icon: <Clock size={18} />, color: 'bg-slate-100 text-slate-700' };
  };

  const statusConfig = getStatusButtonConfig();

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
        <Link to="/" className="hover:text-blue-600">Projects</Link>
        <ChevronRight size={12} />
        <Link to={`/project/${project?.id}`} className="hover:text-blue-600 truncate max-w-[100px]">{project?.name}</Link>
        <ChevronRight size={12} />
        <Link to={`/subcategory/${sub?.id}`} className="hover:text-blue-600 truncate max-w-[100px]">{sub?.name}</Link>
        <ChevronRight size={12} />
        <span className="text-slate-900">{task.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/subcategory/${task.subcategoryId}`)} className="p-2 hover:bg-white rounded-lg border text-slate-500"><ChevronLeft size={24} /></button>
        <div className="flex-1"><h1 className="text-3xl font-extrabold text-slate-900">{task.name}</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Task Description</h2>
                <p className="text-slate-500 leading-relaxed mb-6">{task.description}</p>
                <div className="flex flex-wrap items-center gap-3">
                   <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2.5 py-1.5 rounded-lg border">Created: {formatDate(task.createdAt)}</span>
                   {task.dueDate && <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2.5 py-1.5 rounded-lg border">Due: {formatDate(task.dueDate)}</span>}
                </div>
              </div>
              <button onClick={toggleStatus} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </button>
            </div>

            {analysisResult && (
              <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 animate-in slide-in-from-top">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm"><Sparkles size={16} /> AI Status Analysis</div>
                  <button onClick={() => setAnalysisResult(null)}><X size={16} className="text-blue-300" /></button>
                </div>
                <div className="text-sm text-blue-900 leading-relaxed space-y-1">{analysisResult}</div>
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t border-slate-50">
              <button onClick={handleAIAnalysis} disabled={analyzing} className="flex items-center gap-2 bg-slate-900 text-white rounded-xl py-2 px-3 text-xs font-bold hover:bg-blue-600">
                {analyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />} AI Insights
              </button>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><History size={20} className="text-blue-600" /> Evidence</h3>
                <div className="flex gap-2">
                   <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20"><Camera size={16} /> Snap</button>
                   <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white border text-slate-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm"><ImageIcon size={16} /> Gallery</button>
                   <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                   <input type="file" ref={cameraInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
                </div>
             </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">No documentation photos yet.</div>
              ) : (
                photos.map((photo) => (
                  <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                    <div className="relative aspect-video cursor-zoom-in" onClick={() => setZoomedPhoto(photo)}>
                        <img src={photo.imageUrl} alt="Progress" className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex gap-2">
                           <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">{photo.uploadedByName}</div>
                           <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">{new Date(photo.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {zoomedPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md" onClick={() => setZoomedPhoto(null)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white"><X size={32} /></button>
          <img src={zoomedPhoto.imageUrl} alt="Zoomed" className="max-h-[80vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
};
