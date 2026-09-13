import React, { useState } from 'react';
import { AppState, Ticket } from '../types';
import { Search, Eye, User, Phone, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface SearchViewProps {
  appState: AppState;
  onSelectTicketToTrack: (ticketCode: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ appState, onSelectTicketToTrack }) => {
  const [query, setQuery] = useState('');

  const q = query.trim();
  const results = q
    ? appState.tickets.filter((t) => {
        const phone = t.phone || '';
        const nid = t.nationalId || '';
        const code = String(t.code);
        const name = t.customerName || '';
        return phone.includes(q) || nid.includes(q) || code.includes(q) || name.includes(q);
      })
    : [];

  return (
    <section className="max-w-2xl mx-auto w-full space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 flex items-center justify-center mx-auto text-xl shadow-xs">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">
            الاستعلام السريع برقم الجوال أو الهوية
          </h3>
          <p className="text-xs text-slate-400">ابحث عن بيانات وموقع تذكرتك وحالتها اللحظية في قائمة الانتظار</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="أدخل رقم الجوال أو رقم الهوية أو رقم التذكرة..."
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm num-latin text-right focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
          />
        </div>

        <div className="space-y-2.5 pt-2">
          {!q ? (
            <p className="text-xs text-slate-400 text-center py-6">
              اكتب رقم الجوال أو رقم الهوية الوطنية أعلاه لبدء الاستعلام الفوري.
            </p>
          ) : results.length === 0 ? (
            <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              لم يتم العثور على أي تذاكر مطابقة لبيانات البحث ({query}).
            </div>
          ) : (
            results.map((t: Ticket) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shadow-xs transition hover:border-brand-500"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-brand-600 num-latin">رقم {t.code}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ({t.serviceName})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'serving'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : t.status === 'completed'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status === 'serving' ? 'يتم النداء' : t.status === 'completed' ? 'منجز' : 'انتظار'}
                    </span>
                    {t.isTransferred && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                        محوّلة ↩️
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    <span>المراجع: {t.customerName}</span>
                    <span>•</span>
                    <span className="num-latin">جوال: {t.phone}</span>
                    {t.transferHistory && t.transferHistory.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          سبب التحويل: {t.transferHistory[t.transferHistory.length - 1].reason}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTicketToTrack(t.code)}
                  className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> عرض التتبع
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
