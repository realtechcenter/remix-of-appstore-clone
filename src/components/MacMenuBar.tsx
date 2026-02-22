import { useState, useEffect } from 'react';
import { Wifi, Battery, Volume2, Search } from 'lucide-react';

export const MacMenuBar = () => {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mac-menubar h-[25px] flex items-center justify-between px-4 select-none shrink-0 z-[100]">
      {/* Left — Apple menu + app name */}
      <div className="flex items-center gap-4">
        <span className="text-[13px] font-medium" style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>
          
        </span>
        <span className="text-[12px] font-semibold opacity-90">Macsofy</span>
        <div className="flex items-center gap-3 text-[12px] opacity-70">
          <span className="hover:opacity-100 cursor-default transition-opacity">File</span>
          <span className="hover:opacity-100 cursor-default transition-opacity">Edit</span>
          <span className="hover:opacity-100 cursor-default transition-opacity">View</span>
          <span className="hover:opacity-100 cursor-default transition-opacity">Window</span>
          <span className="hover:opacity-100 cursor-default transition-opacity">Help</span>
        </div>
      </div>

      {/* Right — status icons */}
      <div className="flex items-center gap-2.5 text-[11px]">
        <Volume2 className="w-3.5 h-3.5 opacity-70" />
        <Wifi className="w-3.5 h-3.5 opacity-70" />
        <Battery className="w-4 h-4 opacity-70" />
        <Search className="w-3.5 h-3.5 opacity-70" />
        <span className="opacity-80 tabular-nums">{date}</span>
        <span className="opacity-90 font-medium tabular-nums">{time}</span>
      </div>
    </div>
  );
};
