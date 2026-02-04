import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckSquare, Monitor, Save, MousePointer, Github } from 'lucide-react';
import { useAuth } from './hooks/useAuth';

export function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/app');
    }
  }, [session, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#586A7A] flex items-center justify-center">
        <div className="text-white font-mono animate-pulse">LOADING SYSTEM...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#586A7A] font-mono text-black p-4 md:p-8">
      
      {/* Main Window Container */}
      <div className="max-w-6xl mx-auto bg-[#E0EBDD] border-2 border-black shadow-[8px_8px_0px_black]">
        
        {/* Navbar / Menu */}
        <div className="border-b-2 border-black bg-[#E0EBDD] p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-bold text-xl">K</div>
            <span className="font-bold text-lg tracking-tight uppercase hidden md:inline">Vibecodé Systems Inc.</span>
          </div>
          <Link to="/app" className="bg-[#89CFF0] hover:bg-[#7bc0e0] text-black font-bold py-2 px-6 border-2 border-black shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-none flex items-center gap-2">
            <Monitor size={18} />
            LAUNCH APP
          </Link>
        </div>

        {/* HERO SECTION */}
        <div className="p-8 md:p-20 flex flex-col items-center text-center border-b-2 border-black bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
          <div className="inline-block bg-[#FFC8A2] border-2 border-black px-4 py-1 mb-6 font-bold text-sm shadow-[4px_4px_0px_black] rotate-2">
            NEW! VERSION 2.0
          </div>
          <h1 className="text-4xl md:text-7xl font-black mb-6 uppercase tracking-tighter leading-none">
            Manage your life<br/>with a super OS.
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl font-bold text-gray-700">
            No more soft and round modern software. Discover the raw power of Neo-Retro Kanban.
            Organize your Pro and Personal tasks with a style that rocks.
          </p>
          <div className="flex flex-col md:flex-row gap-6">
             <Link to="/app" className="bg-[#88D8B0] text-black text-xl font-bold py-4 px-10 border-2 border-black shadow-[6px_6px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-[#75cba0] transition-none">
               START NOW {'>'}
             </Link>
             <a href="https://github.com/Philippe-arnd/KanbanVibecoded" target="_blank" rel="noopener noreferrer" className="bg-[#E0EBDD] text-black text-xl font-bold py-4 px-10 border-2 border-black shadow-[6px_6px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:bg-white transition-none">
               LEARN MORE
             </a>
          </div>
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
          
          <div className="p-10 hover:bg-[#FFFFE1] transition-colors group">
            <div className="w-16 h-16 bg-[#FFB7C5] border-2 border-black mb-6 flex items-center justify-center shadow-[4px_4px_0px_black] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
              <CheckSquare size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-3 uppercase">Dual Space</h3>
            <p className="text-gray-700 leading-relaxed">
              Switch between <strong>PRO</strong> and <strong>PERSONAL</strong> mode as fast as a floppy disk. No more mixing groceries and deadlines.
            </p>
          </div>

          <div className="p-10 hover:bg-[#FFFFE1] transition-colors group">
            <div className="w-16 h-16 bg-[#FFDF91] border-2 border-black mb-6 flex items-center justify-center shadow-[4px_4px_0px_black] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
              <MousePointer size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-3 uppercase">Drag & Drop</h3>
            <p className="text-gray-700 leading-relaxed">
              Cutting-edge "Drag and Drop" technology. Tactile sensation guaranteed. Click, hold, move. It's magic.
            </p>
          </div>

          <div className="p-10 hover:bg-[#FFFFE1] transition-colors group">
            <div className="w-16 h-16 bg-[#89CFF0] border-2 border-black mb-6 flex items-center justify-center shadow-[4px_4px_0px_black] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
              <Save size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-3 uppercase">Cloud Sync</h3>
            <p className="mt-4 text-gray-400">
              Your data is saved in the cloud. Accessible from any connected terminal.
            </p>
          </div>

        </div>

        {/* TESTIMONIAL / TERMINAL */}
        <div className="bg-black text-green-400 p-8 font-mono border-t-2 border-black">
          <p className="mb-2">{'>'} RUNNING USER_REVIEWS.EXE...</p>
          <p className="mb-4">{'>'} LOADING...</p>
          <div className="border border-green-700 p-4 bg-gray-900 mb-4">
            "Finally an app that doesn't look like all the others. The Windows 95 style is incredible and it really helps me get organized."
            <br/><span className="text-white mt-2 block">- Marie, Project Manager</span>
          </div>
           <p className="animate-pulse">{'>'} _</p>
        </div>

        {/* FOOTER */}
        <div className="bg-[#E0EBDD] p-6 text-center border-t-2 border-black text-sm font-bold uppercase flex flex-col items-center gap-2">
          <p>© 2026 Vibecodé Systems. All rights reserved.</p>
          <a
            href="https://github.com/Philippe-arnd/KanbanVibecoded"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-black/60 transition-colors"
          >
            Kanban Vibecodé <Github size={16} />
          </a>
          <p className="opacity-50">Optimized for Netscape Navigator and Internet Explorer 4.0.</p>
        </div>

      </div>
    </div>
  );
}