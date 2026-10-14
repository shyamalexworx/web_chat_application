import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Hash, Lock, Globe } from 'lucide-react';

export const CreateChannelModal: React.FC = () => {
  const { isCreateChannelOpen, setIsCreateChannelOpen, createChannel } = useChat();

  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');

  if (!isCreateChannelOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a channel name.');
      return;
    }
    createChannel(name, topic, description, isPrivate);
    setName('');
    setTopic('');
    setDescription('');
    setIsPrivate(false);
    setError('');
    setIsCreateChannelOpen(false);
  };

  return (
    <div 
      onClick={() => setIsCreateChannelOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#12151C] rounded-lg border border-[#252B36] text-[#4F8CFF]">
              {isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">Create a Channel</h2>
              <p className="text-[11px] text-[#929BAA]">
                Channels are where team discussions happen around projects and topics.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateChannelOpen(false)}
            className="p-1.5 text-[#929BAA] hover:text-[#F5F7FA] hover:bg-[#252B36] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-[#F05D6C]/10 border border-[#F05D6C]/30 text-[#F05D6C] text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-mono text-[#929BAA]">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  setError('');
                }}
                placeholder="e.g. mobile-release, sprint-planning"
                className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl pl-8 pr-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Topic <span className="text-[#929BAA] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Description <span className="text-[#929BAA] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context or guidelines for this channel"
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none resize-none"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-3 bg-[#12151C] border border-[#252B36] rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-[#181C25] text-[#4F8CFF] mt-0.5">
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#F5F7FA]">
                    Make Private Channel
                  </div>
                  <div className="text-[11px] text-[#929BAA]">
                    {isPrivate
                      ? 'Only invited members can view and access this channel.'
                      : 'Anyone in your workspace can view and join this channel.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isPrivate ? 'bg-[#4F8CFF]' : 'bg-[#252B36]'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isPrivate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#252B36]">
            <button
              type="button"
              onClick={() => setIsCreateChannelOpen(false)}
              className="px-4 py-2 bg-[#12151C] hover:bg-[#252B36] text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] rounded-xl border border-[#252B36] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-xs font-semibold text-white rounded-xl shadow-accent-glow transition-all"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

