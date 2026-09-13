import React, { useState } from 'react';
import { AppState, TicketFeedback } from '../types';
import { calculateCSATStats } from '../utils';
import { 
  Star, HeartHandshake, Award, ThumbsUp, ThumbsDown, MessageSquare, 
  Download, Filter, Sparkles, CheckCircle2, AlertTriangle, Building2, 
  Users, UserCheck, ShieldCheck, Tag, HelpCircle
} from 'lucide-react';

interface FeedbackAnalyticsTabProps {
  appState: AppState;
  onUpdateSettings: (settings: AppState['settings']) => void;
}

export const FeedbackAnalyticsTab: React.FC<FeedbackAnalyticsTabProps> = ({
  appState,
  onUpdateSettings,
}) => {
  const feedbacks = appState.feedbacks || [];
  const stats = calculateCSATStats(feedbacks);

  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | 'critical' | 'with_comments'>('all');
  const [selectedCounterFilter, setSelectedCounterFilter] = useState<string>('all');
  const [newTagInput, setNewTagInput] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const feedbackSettings = appState.settings.feedbackSettings || {
    enabled: true,
    promptTitle: 'رأيكم يهمنا لتطوير جودة الخدمة وقياس الرضا',
    allowComments: true,
    lowRatingAlertThreshold: 2,
    availableTags: [
      'سرعة فائقة ⚡',
      'تعامل راقٍ ومحترم 🤝',
      'شرح واضح وميسّر 💡',
      'بيئة انتظار مريحة 🛋️',
      'تنظيم وانسيابية 🎯',
      'إنجاز شامل دون تأخير ✨',
    ],
  };

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedCounterFilter !== 'all' && fb.counterId !== selectedCounterFilter) return false;
    if (ratingFilter === '5') return fb.rating === 5;
    if (ratingFilter === '4') return fb.rating === 4;
    if (ratingFilter === 'critical') return fb.rating <= 2;
    if (ratingFilter === 'with_comments') return Boolean(fb.comment && fb.comment.trim().length > 0);
    return true;
  });

  // Export Feedback to CSV
  const handleExportCSV = () => {
    if (feedbacks.length === 0) {
      alert('لا توجد تقييمات لتصديرها حالياً.');
      return;
    }

    const headers = [
      'رقم التذكرة',
      'المراجع',
      'الخدمة',
      'المكتب',
      'الموظف',
      'التقييم (من 5)',
      'الوسوم والانطباعات',
      'سرعة الخدمة',
      'حسن الاستقبال',
      'وضوح الإجراءات',
      'ملاحظات المراجع',
      'التاريخ والوقت',
    ];

    const rows = feedbacks.map((fb) => [
      fb.ticketCode,
      fb.customerName || 'مراجع',
      fb.serviceName,
      fb.counterName,
      fb.staffName || '-',
      fb.rating,
      `"${(fb.tags || []).join(' | ').replace(/"/g, '""')}"`,
      fb.aspects?.speed || '-',
      fb.aspects?.reception || '-',
      fb.aspects?.clarity || '-',
      `"${(fb.comment || '').replace(/"/g, '""')}"`,
      new Date(fb.createdAt).toLocaleString('ar-SA'),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقارير_رضا_المراجعين_CSAT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleEnabled = () => {
    const updated = {
      ...appState.settings,
      feedbackSettings: {
        ...feedbackSettings,
        enabled: !feedbackSettings.enabled,
      },
    };
    onUpdateSettings(updated);
    setSaveMessage('تم تحديث إعدادات استطلاع الرضا بنجاح!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleToggleComments = () => {
    const updated = {
      ...appState.settings,
      feedbackSettings: {
        ...feedbackSettings,
        allowComments: !feedbackSettings.allowComments,
      },
    };
    onUpdateSettings(updated);
  };

  const handleUpdatePromptTitle = (title: string) => {
    const updated = {
      ...appState.settings,
      feedbackSettings: {
        ...feedbackSettings,
        promptTitle: title,
      },
    };
    onUpdateSettings(updated);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const updatedTags = [...feedbackSettings.availableTags, newTagInput.trim()];
    const updated = {
      ...appState.settings,
      feedbackSettings: {
        ...feedbackSettings,
        availableTags: updatedTags,
      },
    };
    onUpdateSettings(updated);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = feedbackSettings.availableTags.filter((t) => t !== tagToRemove);
    const updated = {
      ...appState.settings,
      feedbackSettings: {
        ...feedbackSettings,
        availableTags: updatedTags,
      },
    };
    onUpdateSettings(updated);
  };

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className="p-3.5 bg-emerald-500 text-white rounded-2xl text-xs font-bold text-center shadow flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Header Banner & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-emerald-500/10 border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              منظومة قياس رضا المراجعين (CSAT & Customer Feedback)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مؤشرات الرضا اللحظية، تقييمات الشبابيك والموظفين، واستطلاعات المراجعين بعد كل خدمة.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" /> تصدير تقارير الرضا (Excel / CSV)
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall CSAT Score */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">مؤشر الرضا العام (CSAT)</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold">
              <Star className="w-5 h-5 fill-amber-500" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white num-latin">
              {stats.satisfactionPercentage}%
            </span>
            <span className="text-xs font-bold text-emerald-600">
              ({stats.averageRating} من 5 نجوم)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>نسبة التقييمات الإيجابية (4-5 نجوم)</span>
          </div>
        </div>

        {/* Total Feedback Responses */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي التقييمات</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 font-bold">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white num-latin">
              {stats.totalCount}
            </span>
            <span className="text-xs font-bold text-slate-400">استطلاع مسجل</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            من إجمالي {appState.tickets.filter((t) => t.status === 'completed').length} تذكرة منجزة
          </div>
        </div>

        {/* Top Positive Sentiment */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">التقييمات الممتازة (5★)</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
              <ThumbsUp className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 num-latin">
              {stats.starCounts[5] || 0}
            </span>
            <span className="text-xs text-slate-400">
              ({stats.totalCount ? Math.round(((stats.starCounts[5] || 0) / stats.totalCount) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold">
            أعلى فئة رضا وامتنان بين المراجعين
          </div>
        </div>

        {/* Low Rating / Attention Needed */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">تتطلب متابعة (1-2★)</span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 num-latin">
              {(stats.starCounts[1] || 0) + (stats.starCounts[2] || 0)}
            </span>
            <span className="text-xs text-slate-400">ملاحظات وفرص تحسين</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {((stats.starCounts[1] || 0) + (stats.starCounts[2] || 0)) === 0
              ? 'ممتاز! لا توجد شكاوى أو ملاحظات متدنية'
              : 'يرجى مراجعة تفاصيل الشكاوى بالأسفل'}
          </div>
        </div>
      </div>

      {/* Breakdown: Star Distribution & Quality Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Star Rating Distribution Progress Bars */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> توزيع درجات الرضا (5 نجوم)
            </h4>
            <span className="text-xs text-slate-400 font-bold num-latin">
              {stats.averageRating} / 5.0
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.starCounts[star] || 0;
              const pct = stats.totalCount > 0 ? Math.round((count / stats.totalCount) * 100) : 0;
              const starLabels: Record<number, string> = {
                5: '5 نجوم (ممتاز وراضي جداً 🤩)',
                4: '4 نجوم (جيد جداً 😊)',
                3: '3 نجوم (مقبول ومحايد 😐)',
                2: 'نجمتان (دون المتوقع 🙁)',
                1: 'نجمة واحدة (غير راضٍ 😡)',
              };

              const barColors: Record<number, string> = {
                5: 'bg-emerald-500',
                4: 'bg-teal-500',
                3: 'bg-amber-500',
                2: 'bg-orange-500',
                1: 'bg-rose-500',
              };

              return (
                <div key={star} className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    <span>{starLabels[star]}</span>
                    <span className="num-latin">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColors[star]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aspects Averages (Speed, Reception, Clarity) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600" /> أبعاد معايير جودة الخدمة
            </h4>
            <span className="text-xs text-slate-400">متوسط الدرجة من 5</span>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  سرعة الإنجاز وزمن الانتظار ⚡
                </span>
                <span className="text-[11px] text-slate-400">مدى رضا المراجع عن سرعة النداء وإتمام المعاملة</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-800 dark:text-white num-latin">
                  {stats.aspectAverages.speed}
                </span>
                <span className="text-[10px] text-slate-400 block">/ 5</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  حسن الاستقبال والتعامل الراقي 🤝
                </span>
                <span className="text-[11px] text-slate-400">لباقة الموظفين واحترافية التواصل</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-800 dark:text-white num-latin">
                  {stats.aspectAverages.reception}
                </span>
                <span className="text-[10px] text-slate-400 block">/ 5</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  وضوح الإجراءات والشفافية 💡
                </span>
                <span className="text-[11px] text-slate-400">سهولة فهم الخطوات والتوجيه السليم</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-800 dark:text-white num-latin">
                  {stats.aspectAverages.clarity}
                </span>
                <span className="text-[10px] text-slate-400 block">/ 5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff and Counters Honor Board (Ranking) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              لوحة تميز المكاتب والموظفين (Staff & Counter Performance Ranking)
            </h4>
          </div>
          <span className="text-xs text-slate-400">مرتبة تنازلياً حسب تقييم المراجعين</span>
        </div>

        {stats.counterStats.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            لا توجد تقييمات مخصصة للمكاتب بعد.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {stats.counterStats.map((cs, idx) => {
              const rankBadge = idx === 0 ? '🥇 المركز الأول' : idx === 1 ? '🥈 المركز الثاني' : idx === 2 ? '🥉 المركز الثالث' : `#${idx + 1}`;
              const isHigh = cs.avgRating >= 4.5;
              return (
                <div
                  key={cs.counterId}
                  className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      {rankBadge}
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="num-latin">{cs.avgRating}</span>
                    </span>
                  </div>

                  <h5 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {cs.counterName}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    الموظف: {cs.staffName || 'غير محدد'}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">عدد التقييمات:</span>
                    <span className="font-black text-slate-700 dark:text-slate-200 num-latin">
                      {cs.count} تقييم
                    </span>
                  </div>

                  {isHigh && (
                    <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> تميز وامتياز في الأداء
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Feedback Comments Stream & Filter */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              سجل استطلاعات وآراء المراجعين الحية ({filteredFeedbacks.length})
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Filter className="w-3.5 h-3.5" /> تصفية:
            </span>

            <select
              value={selectedCounterFilter}
              onChange={(e) => setSelectedCounterFilter(e.target.value)}
              className="py-1 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
            >
              <option value="all">جميع المكاتب</option>
              {appState.counters.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.staffName})</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setRatingFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                ratingFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setRatingFilter('5')}
              className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                ratingFilter === '5'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              5★ فقط
            </button>
            <button
              type="button"
              onClick={() => setRatingFilter('critical')}
              className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                ratingFilter === 'critical'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              1-2★ ملاحظات
            </button>
            <button
              type="button"
              onClick={() => setRatingFilter('with_comments')}
              className={`px-3 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
                ratingFilter === 'with_comments'
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              تعليقات مكتوبة
            </button>
          </div>
        </div>

        {filteredFeedbacks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            لا توجد تقييمات مطابقة لخيارات التصفية المحددة.
          </div>
        ) : (
          <div className="space-y-3 pt-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 space-y-2 text-right text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-600/10 text-brand-600 dark:text-brand-400 font-black num-latin">
                      تذكرة #{fb.ticketCode}
                    </span>
                    <span className="font-extrabold text-slate-800 dark:text-white">
                      {fb.customerName || 'مراجع'}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {fb.serviceName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {fb.counterName} {fb.staffName ? `(${fb.staffName})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= fb.rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                    <span className="font-black text-slate-800 dark:text-white mr-1 num-latin">
                      {fb.rating}.0
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {fb.tags && fb.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {fb.tags.map((tg, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment Text */}
                {fb.comment && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs italic">
                    "{fb.comment}"
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                  <span className="num-latin">
                    {new Date(fb.createdAt).toLocaleString('ar-SA')}
                  </span>
                  {fb.aspects && (
                    <span className="num-latin text-slate-400">
                      سرعة: {fb.aspects.speed || '-'}/5 • استقبال: {fb.aspects.reception || '-'}/5 • وضوح: {fb.aspects.clarity || '-'}/5
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CSAT Settings Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-700/60 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
              إعدادات استطلاع الرضا وتخصيص الوسوم (Feedback Customization)
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Toggle Enable */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-white block">
                تفعيل استطلاع الرضا بعد الخدمة
              </span>
              <span className="text-[11px] text-slate-400">
                إظهار شاشة التقييم للمراجع في شاشة التتبع والتابليت فور إنجاز تذكرته
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleEnabled}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                feedbackSettings.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  feedbackSettings.enabled ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle Comments */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-white block">
                السماح بكتابة تعليقات وملاحظات نصية
              </span>
              <span className="text-[11px] text-slate-400">
                إتاحة صندوق اختياري لكتابة اقتراحات أو ملاحظات المراجع
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleComments}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                feedbackSettings.allowComments ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  feedbackSettings.allowComments ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Prompt Title */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-700 dark:text-slate-300 block">
            عنوان استطلاع الرضا المعروض للمراجع:
          </label>
          <input
            type="text"
            value={feedbackSettings.promptTitle}
            onChange={(e) => handleUpdatePromptTitle(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            placeholder="رأيكم يهمنا لتطوير جودة الخدمة وقياس الرضا"
          />
        </div>

        {/* Available Tags Management */}
        <div className="space-y-3 pt-2">
          <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
            الوسوم والانطباعات السريعة المتاحة للمراجعين:
          </label>

          <div className="flex items-center gap-2 flex-wrap">
            {feedbackSettings.availableTags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="حذف هذا الوسم"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddTag} className="flex gap-2 max-w-md pt-1">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="إضافة وسم انطباع جديد..."
              className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              إضافة وسم
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
