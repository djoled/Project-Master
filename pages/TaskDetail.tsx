
import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ChevronLeft, Camera, History, User as UserIcon, CheckCircle2, Clock, Calendar, Sparkles, X, Maximize2, ChevronRight, Image as ImageIcon, Send, MessageSquare } from 'lucide-react';
import { Photo, Role, TaskComment } from '../types';
import { GoogleGenAI } from "@google/genai";

export const TaskDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);

  // Comment State
  const [newComment, setNewComment] = useState('');

  const task = state.tasks.find(t => t.id === id);
  if (!task) return <div className="p-8 text-center font-bold">Task not found</div>;

  const sub = state.subcategories.find(s => s.id === task.subcategoryId);
  const project = state.projects.find(p => p.id === sub?.projectId);
  
  // Permission Check
  const isOwner = state.currentUser?.role === Role.OWNER;
  const isOpsManager = state.currentUser?.role === Role.OPS_MANAGER;
  const isAssignedPM = project?.projectManagerIds.includes(state.currentUser?.id || '');
  const isAssignedContractor = project?.contractorIds.includes(state.currentUser?.id || '');
  
  // Ops Managers and Owners have implicit global access
  const hasAccess = isOwner || isOpsManager || isAssignedPM || isAssignedContractor;

  if (!hasAccess) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">You are not assigned to this project.</p>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Go Home</button>
      </div>
    );
  }

  const photos = state.photos.filter(p => p.parentId === id).sort((a, b) => b.createdAt - a.createdAt);
  const comments = state.taskComments.filter(c => c.taskId === id).sort((a, b) => a.createdAt - b.createdAt);

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are a professional project analyst. Based on the following task information, provide a concise, high-impact status update (3-4 bullet points) for stakeholders.
      Task: ${task.name}
      Description: ${task.description}
      Status: ${task.status}
      Documentation: ${photos.length} photos uploaded.
      Last Update: ${photos.length > 0 ? new Date(photos[0].createdAt).toLocaleString() : 'No updates yet'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAnalysisResult(response.text || "Analysis complete.");
    } catch (err) {
      console.error("AI Analysis failed", err);
      setAnalysisResult("AI Analysis currently unavailable. Please check your API configuration.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photo: Photo = {
          id: Math.random().toString(36).substr(2, 9),
          parentType: 'task',
          parentId: task.id,
          imageUrl: reader.result as string,
          uploadedBy: state.currentUser!.id,
          uploadedByName: state.currentUser!.name,
          createdAt: Date.now(),
          comment: ''
        };
        dispatch({ type: 'ADD_PHOTO', payload: photo });

        // Update task status if it was pending
        if (task.status === 'pending') {
          dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId: task.id, status: 'in_progress' } });
        }

        // Notify Stakeholders
        if (project) {
          const stakeholders = [project.ownerId, ...project.projectManagerIds].filter(uid => uid !== state.currentUser!.id);
          stakeholders.forEach(userId => {
            dispatch({
              type: 'ADD_NOTIFICATION',
              payload: {
                id: Math.random().toString(36).substr(2, 9),
                userId,
                type: 'photo_uploaded',
                message: `${state.currentUser!.name} documented progress on task: ${task.name}`,
                relatedTo: { type: 'task', id: task.id, name: task.name },
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

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: TaskComment = {
        id: Math.random().toString(36).substr(2, 9),
        taskId: task.id,
        userId: state.currentUser!.id,
        userName: state.currentUser!.name,
        content: newComment,
        createdAt: Date.now()
    };

    dispatch({ type: 'ADD_TASK_COMMENT', payload: comment });
    setNewComment('');
  };

  const updateComment = (photoId: string, comment: string) => {
    dispatch({ type: 'UPDATE_PHOTO_COMMENT', payload: { photoId, comment }});
  };

  const toggleStatus = () => {
    const nextStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId: task.id, status: nextStatus } });
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
        <Link to={`/project/${project?.id}`} className="hover:text-blue-600 transition-colors truncate max-w-[100px]">{project?.name}</Link>
        <ChevronRight size={12} />
        <Link to={`/subcategory/${sub?.id}`} className="hover:text-blue-600 transition-colors truncate max-w-[100px]">{sub?.name}</Link>
        <ChevronRight size={12} />
        <span className="text-slate-900">{task.name}</span>
      </nav>

      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/subcategory/${task.subcategoryId}`)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold text-slate-900">{task.name}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Task Description</h2>
                <p className="text-slate-500 leading-relaxed mb-6">{task.description}</p>
                
                <div className="flex flex-wrap items-center gap-3">
                   <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                     <Clock size={12} />
                     Created: {formatDate(task.createdAt)}
                   </span>
                   {task.dueDate && (
                     <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
                       <Calendar size={12} />
                       Due: {formatDate(task.dueDate)}
                     </span>
                   )}
                </div>
              </div>
              <button 
                onClick={toggleStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0 ${
                  task.status === 'completed' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {task.status === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                {task.status === 'completed' ? 'Completed' : 'Active'}
              </button>
            </div>

            {analysisResult && (
              <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 animate-in slide-in-from-top duration-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                    <Sparkles size={16} />
                    AI Status Analysis
                  </div>
                  <button onClick={() => setAnalysisResult(null)} className="text-blue-300 hover:text-blue-500">
                    <X size={16} />
                  </button>
                </div>
                <div className="text-sm text-blue-900 leading-relaxed space-y-1">
                  {analysisResult.split('\n').filter(l => l.trim()).map((line, i) => (
                    <p key={i} className="flex gap-2">
                      <span className="text-blue-400">•</span>
                      {line.replace(/^[*-]\s*/, '')}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</span>
                <span className={`text-sm font-bold capitalize ${task.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assignee Role</span>
                <span className="text-sm font-bold text-slate-700 capitalize">{state.users.find(u => u.id === task.createdBy)?.role.replace('_', ' ')}</span>
              </div>
              <button 
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl py-2 px-3 text-xs font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {analyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={14} />}
                {analyzing ? 'Analyzing...' : 'AI Insights'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <History size={20} className="text-blue-600" />
                  Progress History
                </h3>
                <div className="flex gap-2">
                   {/* Direct Camera Button */}
                   <button 
                     onClick={() => cameraInputRef.current?.click()}
                     className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                   >
                     <Camera size={16} />
                     <span className="hidden sm:inline">Take Photo</span>
                   </button>
                   {/* Standard Upload */}
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                   >
                     <ImageIcon size={16} />
                     <span className="hidden sm:inline">Gallery</span>
                   </button>
                   <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                   <input type="file" ref={cameraInputRef} onChange={handlePhotoUpload} accept="image/*" capture="environment" className="hidden" />
                </div>
             </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Camera size={48} className="mx-auto text-slate-300 mb-4 opacity-20" />
                  <p className="text-slate-500 font-medium">No photos uploaded yet</p>
                </div>
              ) : (
                photos.map((photo) => (
                  <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 flex flex-col">
                    {/* Photo Area */}
                    <div 
                        className="relative aspect-video bg-slate-900 cursor-zoom-in group"
                        onClick={() => setZoomedPhoto(photo)}
                    >
                        <img src={photo.imageUrl} alt="Progress" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2 left-2 flex items-center gap-2">
                           <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                               <UserIcon size={10} />
                               {photo.uploadedByName}
                           </div>
                           <div className="bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                               {new Date(photo.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </div>
                        </div>
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="text-white drop-shadow-md" size={24} />
                        </div>
                    </div>

                    {/* Comment Area */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex-1 flex flex-col">
                        <div className="flex items-start gap-2 w-full">
                            <MessageSquare size={14} className="text-slate-400 mt-2 shrink-0" />
                            <textarea
                                placeholder="Add a comment..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 placeholder:text-slate-400 resize-none py-1.5 px-0 min-h-[40px]"
                                rows={2}
                                defaultValue={photo.comment || ''}
                                onBlur={(e) => updateComment(photo.id, e.target.value)}
                            />
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Task Comments Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mt-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <MessageSquare size={20} className="text-blue-600" />
                Task Comments
            </h3>

            {/* Comments List */}
            <div className="space-y-6 mb-8">
                {comments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                        No general comments yet.
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                {comment.userName.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-900 text-sm">{comment.userName}</span>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(comment.createdAt).toLocaleDateString([], {month:'short', day:'numeric'})} {new Date(comment.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-100 text-slate-700 text-sm font-medium">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handlePostComment} className="flex gap-3 items-start bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 ml-1 mt-1">
                    {state.currentUser?.name.charAt(0)}
                </div>
                <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..." 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-sm font-bold min-h-[40px] resize-none py-2"
                    rows={1}
                />
                <button 
                    type="submit"
                    disabled={!newComment.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-sm"
                >
                    <Send size={16} />
                </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           {/* Timeline / Activity - Could be expanded */}
           <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
               <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <Clock size={16} className="text-blue-500" />
                   Activity Log
               </h3>
               <div className="relative pl-4 space-y-6 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                   {/* Created */}
                   <div className="relative">
                       <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 border-2 border-white" />
                       <p className="text-xs font-bold text-slate-800">Task Created</p>
                       <p className="text-[10px] text-slate-400">{new Date(task.createdAt).toLocaleString()}</p>
                   </div>
                   {/* Photos */}
                   {photos.slice().reverse().map(p => (
                       <div key={p.id} className="relative">
                           <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                           <p className="text-xs font-bold text-slate-800">Photo Uploaded</p>
                           <p className="text-[10px] text-slate-500 font-medium">by {p.uploadedByName}</p>
                           <p className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleString()}</p>
                       </div>
                   ))}
                   {/* Comments */}
                    {comments.slice().reverse().map(c => (
                       <div key={c.id} className="relative">
                           <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                           <p className="text-xs font-bold text-slate-800">Comment Added</p>
                           <p className="text-[10px] text-slate-500 font-medium">by {c.userName}</p>
                           <p className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</p>
                       </div>
                   ))}
               </div>
           </div>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setZoomedPhoto(null)}>
          <button onClick={() => setZoomedPhoto(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <X size={32} />
          </button>
          <div className="max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={zoomedPhoto.imageUrl} alt="Zoomed" className="max-h-[70vh] object-contain rounded-xl shadow-2xl mb-6" />
            
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                            {zoomedPhoto.uploadedByName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">{zoomedPhoto.uploadedByName}</p>
                            <p className="text-white/50 text-xs">{new Date(zoomedPhoto.createdAt).toLocaleString()}</p>
                        </div>
                     </div>
                </div>
                {zoomedPhoto.comment && (
                    <div className="bg-black/20 rounded-xl p-3">
                        <p className="text-white text-sm">{zoomedPhoto.comment}</p>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
