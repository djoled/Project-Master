
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Image as ImageIcon, X, MessageSquare, Hash, Plus, CheckCircle2, Settings, UserMinus, LogOut, Edit3, Check } from 'lucide-react';
import { ChatMessage, ChatGroup, Role } from '../types';
import { supabase } from '../services/supabaseClient';

export const ChatPanel: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeGroupId, setActiveGroupId] = useState<string>('general');
  const [text, setText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState('');

  // Group Creation State
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageIdsRef = useRef(new Set<string>());

  // Track message IDs to prevent duplicates from real-time vs optimistic updates
  useEffect(() => {
    messageIdsRef.current = new Set(state.messages.map(m => m.id));
  }, [state.messages]);

  // 1. Initial Fetch of Messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        const mapped: ChatMessage[] = data.map((m: any) => ({
          id: m.id,
          groupId: m.group_id,
          senderId: m.sender_id,
          senderName: m.sender_name || 'Unknown',
          content: m.content,
          photoUrl: m.photo_url,
          createdAt: new Date(m.created_at).getTime(),
          isRead: true
        }));
        dispatch({ type: 'LOAD_DATA', payload: { messages: mapped } });
      }
    };
    fetchMessages();
  }, [dispatch]);

  // 2. Real-time Subscription
  useEffect(() => {
    const channel = supabase.channel('realtime:chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any;
        
        // Skip if we already have this message (prevents duplicate from our optimistic update)
        if (messageIdsRef.current.has(newMsg.id)) return;

        dispatch({ type: 'ADD_MESSAGE', payload: {
          id: newMsg.id,
          groupId: newMsg.group_id,
          senderId: newMsg.sender_id,
          senderName: newMsg.sender_name || 'Unknown',
          content: newMsg.content,
          photoUrl: newMsg.photo_url,
          createdAt: new Date(newMsg.created_at).getTime(),
          isRead: true
        }});
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dispatch]);

  const activeGroup = state.chatGroups.find(g => g.id === activeGroupId);
  const isAdmin = activeGroup && activeGroup.createdBy === state.currentUser?.id;

  const filteredMessages = state.messages.filter(msg => 
    activeGroupId === 'general' ? !msg.groupId : msg.groupId === activeGroupId
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [filteredMessages, activeGroupId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedPhoto) || !state.currentUser) return;

    const payload = {
        group_id: activeGroupId === 'general' ? null : activeGroupId,
        sender_id: state.currentUser.id,
        sender_name: state.currentUser.name,
        content: text,
        photo_url: selectedPhoto,
        created_at: new Date().toISOString()
    };

    try {
      // Optimistic update: Add to local state first
      const { data, error } = await supabase.from('messages').insert(payload).select().single();
      
      if (error) throw error;
      
      if (data) {
          dispatch({ type: 'ADD_MESSAGE', payload: {
            id: data.id,
            groupId: data.group_id,
            senderId: data.sender_id,
            senderName: data.sender_name,
            content: data.content,
            photoUrl: data.photo_url,
            createdAt: new Date(data.created_at).getTime(),
            isRead: false
          }});
      }
      
      setText('');
      setSelectedPhoto(null);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0 || !state.currentUser) return;

    const newGroup: ChatGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName.trim() || selectedMembers.map(id => state.users.find(u => u.id === id)?.name.split(' ')[0]).join(', '),
      memberIds: [...selectedMembers, state.currentUser.id],
      createdBy: state.currentUser.id,
      createdAt: Date.now()
    };

    dispatch({ type: 'CREATE_CHAT_GROUP', payload: newGroup });
    setNewGroupName('');
    setSelectedMembers([]);
    dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false });
    setActiveGroupId(newGroup.id);
  };

  const handleLeaveGroup = () => {
    if (!activeGroup || !state.currentUser) return;
    if (isAdmin) {
      alert("Admins cannot leave. Delete the group or transfer ownership first.");
      return;
    }
    const updatedGroup = { ...activeGroup, memberIds: activeGroup.memberIds.filter(id => id !== state.currentUser?.id) };
    dispatch({ type: 'LOAD_DATA', payload: { chatGroups: state.chatGroups.map(g => g.id === activeGroupId ? updatedGroup : g) } });
    setActiveGroupId('general');
    setShowSettings(false);
  };

  const handleRemoveMember = (memberId: string) => {
    if (!isAdmin || !activeGroup) return;
    const updatedGroup = { ...activeGroup, memberIds: activeGroup.memberIds.filter(id => id !== memberId) };
    dispatch({ type: 'LOAD_DATA', payload: { chatGroups: state.chatGroups.map(g => g.id === activeGroupId ? updatedGroup : g) } });
  };

  const handleRenameGroup = () => {
    if (!isAdmin || !activeGroup || !tempGroupName.trim()) return;
    const updatedGroup = { ...activeGroup, name: tempGroupName.trim() };
    dispatch({ type: 'LOAD_DATA', payload: { chatGroups: state.chatGroups.map(g => g.id === activeGroupId ? updatedGroup : g) } });
    setEditingName(false);
  };

  const canCreateGroups = state.currentUser?.role !== Role.CONTRACTOR;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-0 relative">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 shrink-0 bg-white z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <MessageSquare size={18} className="text-blue-500 shrink-0" />
            <h3 className="font-bold text-slate-800 truncate">
              {activeGroup ? activeGroup.name : 'General Chat'}
            </h3>
          </div>
          {activeGroup && (
            <button onClick={() => { setShowSettings(!showSettings); setTempGroupName(activeGroup.name); }} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
              <Settings size={18} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            onClick={() => setActiveGroupId('general')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeGroupId === 'general' ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            General
          </button>
          {state.chatGroups.filter(g => g.memberIds.includes(state.currentUser?.id || '')).map(group => (
            <button
              key={group.id}
              onClick={() => setActiveGroupId(group.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                activeGroupId === group.id ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Hash size={10} />
              {group.name}
            </button>
          ))}
          {canCreateGroups && (
            <button
                onClick={() => dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: true })}
                className="shrink-0 w-7 h-7 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center"
            >
                <Plus size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Group Settings Overlay */}
      {showSettings && activeGroup && (
        <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm animate-in slide-in-from-right duration-300 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50">
            <h4 className="font-black uppercase tracking-widest text-xs text-slate-500">Group Settings</h4>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Group Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input value={tempGroupName} onChange={e => setTempGroupName(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm font-bold text-black"/>
                  <button onClick={handleRenameGroup} className="p-2 bg-green-500 text-white rounded-lg"><Check size={18}/></button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-900">{activeGroup.name}</span>
                  {isAdmin && <button onClick={() => setEditingName(true)} className="text-blue-500 p-1"><Edit3 size={16}/></button>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Members ({activeGroup.memberIds.length})</label>
              <div className="space-y-2">
                {activeGroup.memberIds.map(mid => {
                  const user = state.users.find(u => u.id === mid);
                  if (!user) return null;
                  return (
                    <div key={mid} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl group/item">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.name} {user.id === activeGroup.createdBy && <span className="text-[9px] text-blue-500 font-black ml-1">ADMIN</span>}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
                        </div>
                      </div>
                      {isAdmin && user.id !== state.currentUser?.id && (
                        <button onClick={() => handleRemoveMember(user.id)} className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <UserMinus size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="p-4 border-t bg-white">
            <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors">
              <LogOut size={18} />
              Leave Group
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scroll-smooth bg-slate-50/30">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
            <MessageSquare size={48} className="mb-2 opacity-10" />
            <p>No messages in {activeGroup ? activeGroup.name : 'General'}</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === state.currentUser?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isMe && <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{msg.senderName}</span>}
                  <span className="text-[10px] text-slate-300 font-medium">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative group/msg ${
                  isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                }`}>
                  {msg.photoUrl && (
                    <img src={msg.photoUrl} alt="Shared" className="rounded-lg mb-2 max-h-48 w-full object-cover border border-white/10 shadow-sm" />
                  )}
                  {msg.content && <p className="text-sm font-medium leading-relaxed">{msg.content}</p>}
                  
                  {isMe && (
                    <div className="flex justify-end mt-1">
                      <CheckCircle2 size={10} className={msg.isRead ? 'text-blue-200' : 'text-blue-400 opacity-50'} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-20">
        {selectedPhoto && (
          <div className="mb-3 relative inline-block">
            <img src={selectedPhoto} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-xl" />
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"><X size={12} /></button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={(e) => {
             const file = e.target.files?.[0];
             if (file) {
               const r = new FileReader();
               r.onload = () => setSelectedPhoto(r.result as string);
               r.readAsDataURL(file);
             }
          }} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><ImageIcon size={20} /></button>
          <input 
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${activeGroup ? activeGroup.name : 'Everyone'}...`}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-black"
          />
          <button 
            type="submit"
            disabled={!text.trim() && !selectedPhoto}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Create Group Modal */}
      {state.uiCreateGroupModalOpen && (
        <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
             <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">New Group Message</h3>
             <button onClick={() => dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false })} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
           </div>
           <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Group Name (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Phase 1 Team"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Select Members</label>
                <div className="space-y-2">
                  {state.users.filter(u => u.id !== state.currentUser?.id).map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => setSelectedMembers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedMembers.includes(user.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'
                      }`}
                    >
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          selectedMembers.includes(user.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                       }`}>
                          {user.name.charAt(0)}
                       </div>
                       <div className="flex-1">
                         <p className={`text-sm font-bold ${selectedMembers.includes(user.id) ? 'text-blue-900' : 'text-slate-700'}`}>{user.name}</p>
                         <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
                       </div>
                       {selectedMembers.includes(user.id) && <CheckCircle2 size={16} className="text-blue-600" />}
                    </div>
                  ))}
                </div>
              </div>
           </form>
           <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
             <button 
               onClick={handleCreateGroup}
               disabled={selectedMembers.length === 0}
               className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-blue-600/20 disabled:opacity-50 transition-all active:scale-95"
             >
               Start Group Chat
             </button>
           </div>
        </div>
      )}
    </div>
  );
};
