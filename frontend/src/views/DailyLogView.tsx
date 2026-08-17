import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { DailyLogGroup, Task } from '../types';
import { api } from '../services/api';

interface DailyLogViewProps {
  onSelectTask: (task: Task) => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({ onSelectTask }) => {
  const [logData, setLogData] = useState<DailyLogGroup | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const fetchLog = async (dateStr: string) => {
    setLoading(true);
    try {
      const data = await api.getDailyLog(dateStr);
      setLogData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog(selectedDate);
  }, [selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#262a3c]/80 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
            <Clock size={16} />
            <span>Execution Timeline</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
            Daily Activity & Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated timeline generated from unified task activity — no manual duplication needed.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-2 bg-[#12141c] border border-[#262a3c] rounded-xl p-1.5">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg hover:bg-[#212433] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center space-x-2 px-2 text-xs font-semibold text-slate-200">
            <Calendar size={14} className="text-indigo-400" />
            <span>{new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <button
            onClick={handleNextDay}
            className="p-1.5 rounded-lg hover:bg-[#212433] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center items-center text-slate-400 space-x-2">
          <Loader2 size={20} className="animate-spin text-indigo-400" />
          <span className="text-xs">Generating daily timeline...</span>
        </div>
      ) : logData ? (
        <div className="space-y-6">
          
          {/* AI Executive Summary Card */}
          {logData.ai_summary && (
            <div className="p-4 rounded-xl bg-[#12141c] border border-indigo-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
                <Sparkles size={15} className="text-indigo-400" />
                <span>AI Daily Recap & Productivity Evaluation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {logData.ai_summary}
              </p>
            </div>
          )}

          {/* Completed Section */}
          <div className="p-4 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 size={15} />
                <span>Completed Tasks ({logData.completed_tasks.length})</span>
              </span>
            </div>

            {logData.completed_tasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No tasks completed on this date.</p>
            ) : (
              <div className="space-y-1.5">
                {logData.completed_tasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#181a24] hover:bg-[#212433] border border-[#262a3c] text-xs cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span className="text-slate-200 group-hover:text-white font-medium">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{t.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Event Stream */}
          <div className="p-4 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Activity size={15} className="text-indigo-400" />
              <span>Event Audit Stream</span>
            </div>

            {logData.activities.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No actions recorded for this date.</p>
            ) : (
              <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#262a3c]">
                {logData.activities.map(act => (
                  <div key={act.id} className="relative flex items-start space-x-3 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-[#12141c] mt-0.5 -ml-4 flex-shrink-0" />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-slate-300 font-medium">{act.description}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : null}

    </div>
  );
};
