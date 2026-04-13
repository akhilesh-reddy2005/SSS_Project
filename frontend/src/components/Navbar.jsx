import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Wallet, LogOut, UserCircle2, Clock3 } from 'lucide-react';
import UserProfileModal from './UserProfileModal';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [showProfile, setShowProfile] = useState(false);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const displayName = (user?.name || user?.email?.split('@')[0] || 'User').trim();

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <>
    <nav className="fixed top-0 w-full z-40 glass-panel border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center group cursor-pointer" onClick={() => navigate('/')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <Wallet className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="ml-3 font-bold text-xl tracking-tight hidden sm:block font-['Outfit'] text-slate-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-cyan-400 transition-all duration-300">
              Nexus<span className="font-light text-slate-400">Expense</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
              <Clock3 className="w-4 h-4 text-indigo-300" />
              <span className="text-xs text-slate-300 font-medium">
                {now.toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
                {' '}
                {now.toLocaleTimeString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            <button
              onClick={() => setShowProfile(true)}
              title={displayName}
              className="flex items-center text-slate-400 hover:text-cyan-300 transition-colors px-3 py-2 rounded-lg hover:bg-cyan-400/10 active:scale-95"
            >
              <UserCircle2 className="w-5 h-5 sm:mr-2" />
              <span className="hidden md:inline font-medium text-sm max-w-[140px] truncate">{displayName}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center text-slate-400 hover:text-rose-400 transition-colors px-3 py-2 rounded-lg hover:bg-rose-400/10 active:scale-95"
            >
              <LogOut className="w-5 h-5 sm:mr-2" />
              <span className="hidden md:inline font-medium text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    {showProfile && <UserProfileModal user={user} onClose={() => setShowProfile(false)} />}
    </>
  );
};

export default Navbar;
