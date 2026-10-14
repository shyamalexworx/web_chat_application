import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Building2, Sparkles, Check } from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Electric Blue', hex: '#4F8CFF' },
  { name: 'Emerald Teal', hex: '#32C48D' },
  { name: 'Vibrant Purple', hex: '#A855F7' },
  { name: 'Amber Gold', hex: '#F5A623' },
  { name: 'Crimson Rose', hex: '#F05D6C' },
];

export const CreateWorkspaceModal: React.FC = () => {
  const { isCreateWorkspaceOpen, setIsCreateWorkspaceOpen, createWorkspace } = useChat();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4F8CFF');
  const [teamSize, setTeamSize] = useState('10-50');
  const [error, setError] = useState('');

  if (!isCreateWorkspaceOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Workspace name is required.');
      return;
    }

    createWorkspace(name.trim(), description.trim(), selectedColor);

    setName('');
    setDescription('');
    setIsCreateWorkspaceOpen(false);
  };

  return (
    <div 
      onClick={() => setIsCreateWorkspaceOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#181C25] border border-[#252B36] rounded-2xl shadow-modal overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#252B36] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: selectedColor }}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F5F7FA]">Create New Workspace</h2>
              <p className="text-[11px] text-[#929BAA]">
                Spin up a dedicated organization space for your company or team.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateWorkspaceOpen(false)}
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

          {/* Workspace Name */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Acme Systems, HyperScale AI"
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none"
              autoFocus
            />
          </div>

          {/* Workspace Slug */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Workspace URL
            </label>
            <div className="flex items-center bg-[#12151C] border border-[#252B36] rounded-xl px-3 py-2 text-xs text-[#929BAA]">
              <span>pulsechat.app/</span>
              <span className="text-[#F5F7FA] font-medium ml-0.5">
                {name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'your-team'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Team Mission & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your team build or collaborate on?"
              className="w-full bg-[#12151C] border border-[#252B36] focus:border-[#4F8CFF] rounded-xl px-3 py-2 text-xs text-[#F5F7FA] placeholder-[#929BAA] outline-none resize-none"
            />
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-2">
              Workspace Brand Color
            </label>
            <div className="flex items-center space-x-2">
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setSelectedColor(col.hex)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    selectedColor === col.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                >
                  {selectedColor === col.hex && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label className="block text-xs font-semibold text-[#F5F7FA] mb-1.5">
              Estimated Team Size
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['1-10', '10-50', '50-250', '250+'].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setTeamSize(size)}
                  className={`py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    teamSize === size
                      ? 'bg-[#4F8CFF]/20 border-[#4F8CFF] text-[#4F8CFF]'
                      : 'bg-[#12151C] border-[#252B36] text-[#929BAA] hover:text-[#F5F7FA]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-2 border-t border-[#252B36]">
            <button
              type="button"
              onClick={() => setIsCreateWorkspaceOpen(false)}
              className="px-4 py-2 bg-[#12151C] hover:bg-[#252B36] text-xs font-medium text-[#929BAA] hover:text-[#F5F7FA] rounded-xl border border-[#252B36] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4F8CFF] hover:bg-[#3D7AE8] text-xs font-semibold text-white rounded-xl shadow-accent-glow flex items-center space-x-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

