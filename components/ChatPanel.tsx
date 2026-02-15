import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Image as ImageIcon, X, MessageSquare, Users, Hash, Plus, CheckCircle2 } from 'lucide-react';
import { ChatMessage, ChatGroup } from '../types';
import { supabase } from '../services/supabaseClient';

export const ChatPanel: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [activeGroupId, setActiveGroupId] = useState<string>('general');
  const [text, setText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Group Creation State
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Supabase Realtime
  useEffect(() => {
    // 1. Subscribe to new messages
    const channel = supabase.channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // Transform Supabase record to ChatMessage
          const newMsg = payload.new as any;
          // Only add if it belongs to current active group (or general)
          // Actually, we should dispatch globally and let the filter handle display
          const mappedMessage: ChatMessage = {
            id: newMsg.id,
            groupId: newMsg.group_id,
            senderId: newMsg.sender_id,
            senderName: newMsg.sender_name || 'Unknown', // Ideally fetch user name, simplified here
            content: newMsg.content,
            photoUrl: newMsg.photo_url,
            createdAt: new Date(newMsg.created_at).getTime(),
          };
          
          // Avoid duplication if we optimistically added it? 
          // Current logic doesn't optimise, so just checking existence is good practice
          if (!state.messages.find(m => m.id === mappedMessage.id)) {
            dispatch({ type: 'ADD_MESSAGE', payload: mappedMessage });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.messages, dispatch]);


  const filteredMessages = state.messages.filter(msg => 
    activeGroupId === 'general' ? !msg.groupId : msg.groupId === activeGroupId
  );

  const activeGroup = state.chatGroups.find(g => g.id === activeGroupId);

  // Auto scroll to bottom when messages or height changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages, activeGroupId]);

  // Handle standard window resize events
  useEffect(() => {
    const handleResize = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedPhoto) return;

    if (!state.currentUser) return;

    // Use Supabase for persistence
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: activeGroupId === 'general' ? null : activeGroupId,
          sender_id: state.currentUser.id,
          sender_name: state.currentUser.name,
          content: text,
          photo_url: selectedPhoto,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
        return;
      }
      
      // Success
      setText('');
      setSelectedPhoto(null);

    } catch (err) {
      console.error('Exception sending message:', err);
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0) return;

    // 1. Check for existing private chat (if 1 member selected) or identical group
    // We treat "Private Chat" just like a group, but we check if it exists to avoid duplicates
    const proposedMembers = [...selectedMembers, state.currentUser!.id].sort();
    
    const existingGroup = state.chatGroups.find(g => {
        if (g.memberIds.length !== proposedMembers.length) return false;
        const currentMembers = [...g.memberIds].sort();
        return currentMembers.every((id, index) => id === proposedMembers[index]);
    });

    if (existingGroup) {
        setActiveGroupId(existingGroup.id);
        setNewGroupName('');
        setSelectedMembers([]);
        dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false });
        return;
    }

    // 2. Generate Name if empty
    let finalName = newGroupName.trim();
    if (!finalName) {
        const memberNames = state.users
            .filter(u => selectedMembers.includes(u.id))
            .map(u => u.name.split(' ')[0]); // First names only for brevity
        
        finalName = memberNames.join(', ');
        // If it's just one person, use their full name if available or just name
        if (selectedMembers.length === 1) {
             const u = state.users.find(u => u.id === selectedMembers[0]);
             if (u) finalName = u.name;
        }
    }

    const newGroup: ChatGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: finalName,
      memberIds: [...selectedMembers, state.currentUser!.id],
      createdBy: state.currentUser!.id,
      createdAt: Date.now()
    };

    dispatch({ type: 'CREATE_CHAT_GROUP', payload: newGroup });
    setNewGroupName('');
    setSelectedMembers([]);
    dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false });
    setActiveGroupId(newGroup.id);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const closeModal = () => {
    dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: false });
    setNewGroupName('');
    setSelectedMembers([]);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-0 relative">
      {/* Header with Groups */}
      <div className="p-3 border-b border-slate-100 shrink-0 bg-white z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-500" />
            {activeGroup ? activeGroup.name : 'General Chat'}
          </h3>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar -mx-1 px-1 items-center">
          <button
            onClick={() => setActiveGroupId('general')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeGroupId === 'general' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            General
          </button>
          {state.chatGroups.map(group => {
            const isMember = group.memberIds.includes(state.currentUser!.id) || group.createdBy === state.currentUser!.id;
            // Only show groups user is part of (or owner)
            if (!isMember) return null;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  activeGroupId === group.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <Hash size={10} />
                {group.name}
              </button>
            );
          })}
          
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CREATE_GROUP_MODAL', payload: true })}
            className="shrink-0 w-7 h-7 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all ml-1"
            title="Create New Group"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scroll-smooth">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
            <MessageSquare size={48} className="mb-2 opacity-20" />
            <p className="font-medium">
                {activeGroup ? 'Start the conversation...' : 'Welcome to General Chat'}
            </p>
            {activeGroup && (
               <div className="mt-4 flex flex-col items-center">
                 <p className="text-xs mb-2 opacity-70">Members</p>
                 <div className="flex -space-x-2">
                    {activeGroup.memberIds.map(uid => {
                    const u = state.users.find(usr => usr.id === uid);
                    if(!u) return null;
                    return (
                        <div key={uid} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500" title={u.name}>
                        {u.name.charAt(0)}
                        </div>
                    )
                    })}
                 </div>
               </div>
            )}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === state.currentUser?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{msg.senderName}</span>
                  <span className="text-[10px] text-slate-300">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                  isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {msg.photoUrl && (
                    <img src={msg.photoUrl} alt="Upload" className="rounded-lg mb-2 max-h-48 w-full object-cover border border-white/10" />
                  )}
                  {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 z-10">
        {selectedPhoto && (
          <div className="mb-3 relative inline-block">
            <img src={selectedPhoto} alt="Preview" className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${activeGroup ? activeGroup.name : 'Everyone'}...`}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-black font-bold"
          />
          <button 
            type="submit"
            disabled={!text.trim() && !selectedPhoto}
            className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-sm active:scale-95"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Create Group/Chat Modal Overlay */}
      {state.uiCreateGroupModalOpen && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
           <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
             <h3 className="font-bold text-slate-800">New Message</h3>
             <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full">
               <X size={20} className="text-slate-400" />
             </button>
           </div>
           
           <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Group Name (Optional)</label>
                <input 
                  type="text"
                  placeholder={selectedMembers.length === 1 ? "Private Chat" : "e.g. Electrical Team"}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-slate-900 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select People</label>
                <div className="space-y-2">
                  {state.users.filter(u => u.id !== state.currentUser?.id).map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => toggleMemberSelection(user.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedMembers.includes(user.id) 
                          ? 'bg-blue-50 border-blue-500 shadow-sm' 
                          : 'bg-white border-slate-200 hover:border-blue-300'
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

           <div className="p-4 border-t border-slate-100 bg-white shrink-0">
             <button 
               onClick={handleCreateGroup}
               disabled={selectedMembers.length === 0}
               className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none hover:bg-blue-700 transition-all"
             >
               {selectedMembers.length < 2 ? 'Start Chat' : `Create Group (${selectedMembers.length})`}
             </button>
           </div>
        </div>
      )}
    </div>
  );
};
