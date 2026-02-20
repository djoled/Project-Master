
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Image as ImageIcon, X, MessageSquare, Hash, Plus, Settings } from 'lucide-react';
import { ChatMessage, ChatGroup, Role } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';

export const ChatPanel: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeGroupId, setActiveGroupId] = useState<string>('general');
  const [text, setText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  
  // Group Creation State
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Sync Chat Groups
  useEffect(() => {
    const q = query(collection(db, 'chat_groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const groups = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                name: d.name,
                memberIds: d.memberIds || [],
                createdBy: d.createdBy,
                createdAt: d.createdAt
            } as ChatGroup;
        });
        dispatch({ type: 'SET_CHAT_GROUPS', payload: groups });
    });
    return () => unsubscribe();
  }, [dispatch]);

  // 2. Sync Messages for Active Channel
  useEffect(() => {
    // Mobile app uses 'global' for General Chat, Web was using 'general'.
    // Mapping 'general' -> 'global' for compatibility.
    const channelId = activeGroupId === 'general' ? 'global' : activeGroupId;
    
    const q = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                groupId: activeGroupId, // Map back to local state ID
                senderId: d.senderId,
                senderName: d.senderName,
                content: d.content,
                photoUrl: d.photoUrl,
                createdAt: d.timestamp?.toMillis() || Date.now(),
                isRead: true
            } as ChatMessage;
        });
        dispatch({ type: 'SET_MESSAGES', payload: msgs });
    });

    return () => unsubscribe();
  }, [activeGroupId, dispatch]);

  const activeGroup = state.chatGroups.find(g => g.id === activeGroupId);
  const isAdmin = activeGroup && activeGroup.createdBy === state.currentUser?.id;

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.messages, activeGroupId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedPhoto) || !state.currentUser) return;

    const channelId = activeGroupId === 'general' ? 'global' : activeGroupId;

    try {
      await addDoc(collection(db, 'messages'), {
        channelId: channelId,
        senderId: state.currentUser.id,
        senderName: state.currentUser.name,
        content: text,
        photoUrl: selectedPhoto,
        timestamp: serverTimestamp()
      });
      
      setText('');
      setSelectedPhoto(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Error sending message. Check console.');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0 || !state.currentUser) return;

    const groupId = Math.random().toString(36).substr(2, 9);
    const groupName = newGroupName.trim() || 'New Channel';

    const newGroup: ChatGroup = {
        id: groupId,
        name: groupName,
        memberIds: [...selectedMembers, state.currentUser.id],
        createdBy: state.currentUser.id,
        createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, `chat_groups/${groupId}`), newGroup);
      
      setNewGroupName('');
      setSelectedMembers([]);
      dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false });
      setActiveGroupId(groupId);
    } catch (err) {
      console.error("Group creation failed:", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup || !state.currentUser) return;
    if (isAdmin) {
      alert("Admins cannot leave.");
      return;
    }
    const updatedMembers = activeGroup.memberIds.filter(id => id !== state.currentUser?.id);
    try {
      await updateDoc(doc(db, `chat_groups/${activeGroup.id}`), { memberIds: updatedMembers });
      setActiveGroupId('general');
      setShowSettings(false);
    } catch (err) { console.error(err); }
  };

  const canCreateGroups = state.currentUser?.role !== Role.CONTRACTOR;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-0 relative">
      <div className="p-3 border-b border-slate-100 shrink-0 bg-white z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <MessageSquare size={18} className="text-blue-500 shrink-0" />
            <h3 className="font-bold text-slate-800 truncate">{activeGroup ? activeGroup.name : 'General Chat'}</h3>
          </div>
          {activeGroup && <button onClick={() => { setShowSettings(!showSettings); }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><Settings size={18} /></button>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button onClick={() => setActiveGroupId('general')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeGroupId === 'general' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-500'}`}>General</button>
          {state.chatGroups.filter(g => g.memberIds.includes(state.currentUser?.id || '')).map(group => (
            <button key={group.id} onClick={() => setActiveGroupId(group.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${activeGroupId === group.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}><Hash size={10} />{group.name}</button>
          ))}
          {canCreateGroups && <button onClick={() => dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: true })} className="shrink-0 w-7 h-7 rounded-full border border-dashed text-slate-400 flex items-center justify-center"><Plus size={14} /></button>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-50/30">
        {state.messages.map((msg) => {
          const isMe = msg.senderId === state.currentUser?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-1 px-1">
                {!isMe && <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{msg.senderName}</span>}
                <span className="text-[10px] text-slate-300">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                {msg.photoUrl && <img src={msg.photoUrl} alt="Shared" className="rounded-lg mb-2 max-h-48 w-full object-cover" />}
                {msg.content && <p className="text-sm font-medium leading-relaxed">{msg.content}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-20">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               const r = new FileReader();
               r.onload = () => setSelectedPhoto(r.result as string);
               r.readAsDataURL(file);
             }
          }} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><ImageIcon size={20} /></button>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message team..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-black" />
          <button type="submit" disabled={!text.trim() && !selectedPhoto} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50"><Send size={20} /></button>
        </form>
      </div>

      {state.uiCreateGroupModalOpen && (
        <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="p-4 border-b flex items-center justify-between bg-slate-50">
             <h3 className="font-black text-xs uppercase text-slate-500">New Channel</h3>
             <button onClick={() => dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false })}><X size={20} /></button>
           </div>
           <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 space-y-6">
              <input type="text" placeholder="Channel Name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-black" />
              <div className="space-y-2">
                {state.users.filter(u => u.id !== state.currentUser?.id).map(user => (
                  <div key={user.id} onClick={() => setSelectedMembers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${selectedMembers.includes(user.id) ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}>
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedMembers.includes(user.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{user.name.charAt(0)}</div>
                     <div className="flex-1"><p className="text-sm font-bold text-slate-900">{user.name}</p><p className="text-[10px] text-slate-400 uppercase">{user.role}</p></div>
                  </div>
                ))}
              </div>
           </form>
           <div className="p-4 border-t bg-white">
             <button onClick={handleCreateGroup} disabled={selectedMembers.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-600/20">Create Channel</button>
           </div>
        </div>
      )}
    </div>
  );
};
