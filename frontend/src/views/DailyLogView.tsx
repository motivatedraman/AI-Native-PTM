import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { DailyLogGroup, Task } from '../types';
import { api } from '../services/api';
import { todayNPT, formatDateNPT, formatTimeNPT } from '../utils/time';

interface DailyLogViewProps {
  onSelectTask: (task: Task) => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({ onSelectTask }) => {
  const [logData, setLogData] = useState<DailyLogGroup | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayNPT());
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
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString('sv-SE'));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toLocaleDateString('sv-SE'));
  };

  return (
    <div className="max-w-3xl space-y-5">
      
      {/* Header, the date is the only metadata this page needs */}
      <div className="flex items-end justify-between pb-4 border-b border-[rgb(var(--sx-border-2))] gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-100">Daily Log</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>
            {logData ? `${logData.activities.length} events · ${logData.completed_tasks.length} completed` : ''}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            title="Previous day"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-mono px-1" style={{ color: 'rgb(var(--st-600))' }}>
            {formatDateNPT(selectedDate + 'T00:00:00', { month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={handleNextDay}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            title="Next day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center items-center text-stone-400 space-x-2">
          <Loader2 size={24} className="animate-spin text-amber-400" />
          <span className="text-sm">Generating daily timeline...</span>
        </div>
      ) : logData ? (
        <div className="space-y-5">
          
          {/* Completed Section */}
          <div className="p-5 rounded-xl bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 size={17} />
                <span>Completed Tasks ({logData.completed_tasks.length})</span>
              </span>
            </div>

            {logData.completed_tasks.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No tasks completed on this date.</p>
            ) : (
              <div className="space-y-2">
                {logData.completed_tasks.map(t => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t)}
                    className="flex items-center justify-between p-3.5 rounded-lg bg-[rgb(var(--sx-header))] hover:bg-[rgb(var(--sx-chip))] border border-[rgb(var(--sx-border))] text-sm cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-stone-200 group-hover:text-stone-100 font-medium truncate">{t.title}</span>
                    </div>
                    <span className="text-xs text-stone-400 font-mono flex-shrink-0">{t.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Event Stream */}
          <div className="p-5 rounded-xl bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] space-y-3">
            <div className="flex items-center space-x-2 text-sm font-semibold text-stone-300 uppercase tracking-wider">
              <Activity size={17} className="text-amber-400" />
              <span>Event Audit Stream</span>
            </div>

            {logData.activities.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No actions recorded for this date.</p>
            ) : (
              <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[rgb(var(--sx-border))]">
                {logData.activities.map(act => (
                  <div key={act.id} className="relative flex items-start space-x-4 text-sm">
                    <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-[rgb(var(--sx-modal))] mt-1 -ml-5 flex-shrink-0" />
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="text-stone-300 font-medium">{act.description}</span>
                      <span className="text-xs text-stone-400 font-mono flex-shrink-0">
                        {formatTimeNPT(act.created_at, { hour: '2-digit', minute: '2-digit' })}
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
