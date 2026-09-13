import React, { useState } from 'react';
import { AppState, Ticket, TicketFeedback } from '../types';
import { 
  Star, HeartHandshake, CheckCircle2, Sparkles, Send, 
  MessageSquare, ThumbsUp, ArrowRight, ShieldCheck, HelpCircle,
  Clock, UserCheck, Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CustomerFeedbackFormProps {
  appState: AppState;
  ticket: Ticket;
  onSaveFeedback: (feedback: TicketFeedback) => void;
  onCancel?: () => void;
  isCompact?: boolean;
}

export const CustomerFeedbackForm: React.FC<CustomerFeedbackFormProps> = ({
  appState,
  ticket,
  onSaveFeedback,
  onCancel,
  isCompact = false,
}) => {
  const settings = appState.settings.feedbackSettings || {
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

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [speedAspect, setSpeedAspect] = useState<number>(5);
  const [receptionAspect, setReceptionAspect] = useState<number>(5);
  const [clarityAspect, setClarityAspect] = useState<number>(5);
  const [showAspects, setShowAspects] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const emojiSentiments: Record<number, { emoji: string; label: string; color: string }> = {
    5: { emoji: '🤩', label: 'راضٍ جداً وممتن (استثنائي)', color: 'text-emerald-500' },
    4: { emoji: '😊', label: 'راضٍ وسعيد (جيد جداً)', color: 'text-teal-500' },
    3: { emoji: '😐', label: 'محايد ومقبول (عادي)', color: 'text-amber-500' },
    2: { emoji: '🙁', label: 'دون المتوقع (يحتاج تحسين)', color: 'text-orange-500' },
    1: { emoji: '😡', label: 'غير راضٍ تماماً (سيء)', color: 'text-rose-500' },
  };

  const activeRating = hoverRating || rating;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newFeedback: TicketFeedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ticketId: ticket.id,
      ticketCode: ticket.code,
      serviceId: ticket.serviceId,
      serviceName: ticket.serviceName,
      counterId: ticket.counterId || 'c_unassigned',
      counterName: ticket.counterName || 'المكتب المعني',
      staffName: ticket.counterId
        ? appState.counters.find((c) => c.id === ticket.counterId)?.staffName
        : undefined,
      customerName: ticket.customerName,
      rating,
      tags: selectedTags,
      aspects: {
        speed: speedAspect,
        reception: receptionAspect,
        clarity: clarityAspect,
      },
      comment: comment.trim() || undefined,
      createdAt: Date.now(),
    };

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    onSaveFeedback(newFeedback);
    setIsSubmitted(true);
  };

  if (isSubmitted || ticket.feedback) {
    const fb = ticket.feedback || {
      rating,
      tags: selectedTags,
      comment,
    };

    return (
      <div className="p-6 bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/30 rounded-3xl text-center space-y-3">
        <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h4 className="font-black text-lg text-slate-800 dark:text-white">
          شكراً جزيلاً لتقييمك ومشاركتنا رأيك! 🌟
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          رأيك هو سر تميزنا ويساعدنا في تكريم الموظفين المتميزين والارتقاء المستمر بتجربتكم.
        </p>

        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-4 h-4 ${
                s <= (fb.rating || 5)
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-slate-300 dark:text-slate-600'
              }`}
            />
          ))}
          <span className="font-black text-xs text-slate-800 dark:text-white mr-1 num-latin">
            {fb.rating} / 5
          </span>
        </div>

        {fb.tags && fb.tags.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
            {fb.tags.map((tg, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              >
                {tg}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/5 via-white to-white dark:via-slate-800 dark:to-slate-800 p-5 sm:p-6 space-y-5 text-right shadow-sm ${
        isCompact ? 'text-xs' : ''
      }`}
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
          <HeartHandshake className="w-4 h-4" />
          <span>قياس رضا المراجع (CSAT Survey)</span>
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
          {settings.promptTitle}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          معاملة تذكرة #{ticket.code} ({ticket.serviceName}) • {ticket.counterName || 'الشباك المعني'}
        </p>
      </div>

      {/* Main Star & Emoji Rating Selector */}
      <div className="p-4 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center space-y-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
          كيف تقيم تجربتك الإجمالية اليوم معنا؟
        </span>

        {/* Emojis / Stars */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(null)}
              className="p-1 sm:p-2 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
            >
              <Star
                className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                  s <= activeRating
                    ? 'text-amber-500 fill-amber-500 drop-shadow'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Rating Mood Label */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{emojiSentiments[activeRating]?.emoji}</span>
          <span className={`font-black text-sm ${emojiSentiments[activeRating]?.color}`}>
            {emojiSentiments[activeRating]?.label}
          </span>
        </div>
      </div>

      {/* Impression Tags Multi-Select */}
      {settings.availableTags && settings.availableTags.length > 0 && (
        <div className="space-y-2">
          <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block">
            ما أكثر ما نال إعجابك في الخدمة؟ (اختر وسماً أو أكثر):
          </span>
          <div className="flex flex-wrap gap-2">
            {settings.availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs scale-105'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  {tag} {isSelected ? '✓' : '+'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Accordion: Detailed Service Quality Criteria (Speed, Reception, Clarity) */}
      <div className="border-t border-slate-200 dark:border-slate-700/60 pt-3">
        <button
          type="button"
          onClick={() => setShowAspects(!showAspects)}
          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>{showAspects ? 'إخفاء تفاصيل المعايير' : 'تقييم معايير تفصيلية (سرعة الإنجاز، حسن الاستقبال، وضوح الإجراءات) ▾'}</span>
        </button>

        {showAspects && (
          <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                سرعة الخدمة والإنجاز ⚡
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeedAspect(s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        s <= speedAspect ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                حسن الاستقبال واللباقة 🤝
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReceptionAspect(s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        s <= receptionAspect ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                وضوح الإجراءات والتوجيه 💡
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setClarityAspect(s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        s <= clarityAspect ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Free Text Comment */}
      {settings.allowComments && (
        <div className="space-y-1.5">
          <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>ملاحظات أو مقترحات إضافية (اختياري):</span>
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="يسعدنا سماع أي ملاحظة لمساعدتنا في تقديم خدمة أفضل لكم..."
            className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none font-medium"
          />
        </div>
      )}

      {/* Submit Action */}
      <div className="pt-2 flex items-center gap-3">
        <button
          type="submit"
          className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>إرسال التقييم واعتماده</span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            تخطي
          </button>
        )}
      </div>
    </form>
  );
};

// Full Screen / Dedicated Kiosk & Counter Tablet View
interface CustomerFeedbackViewProps {
  appState: AppState;
  onSaveFeedback: (feedback: TicketFeedback) => void;
  onBackToKiosk: () => void;
}

export const CustomerFeedbackView: React.FC<CustomerFeedbackViewProps> = ({
  appState,
  onSaveFeedback,
  onBackToKiosk,
}) => {
  const [searchCode, setSearchCode] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(() => {
    // Default to the most recently completed ticket if available
    const completed = appState.tickets
      .filter((t) => t.status === 'completed' && !t.feedback)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    return completed[0] || null;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    const match = appState.tickets.find(
      (t) => t.code.toLowerCase() === searchCode.trim().toLowerCase()
    );
    if (match) {
      setSelectedTicket(match);
    } else {
      alert('لم يتم العثور على تذكرة بهذا الرقم!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 px-2">
      {/* Top Bar for Tablet Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToKiosk}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" /> العودة للشاشة الرئيسية
        </button>
        <span className="text-xs text-slate-400 font-bold">
          شاشة تقييم الخدمة اللمسية (Feedback Tablet Mode)
        </span>
      </div>

      {/* Ticket Selector / Fast Entry */}
      <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-xs text-slate-800 dark:text-white">
            حدد رقم التذكرة للتقييم:
          </span>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="مثال: 101"
              className="py-1 px-3 w-28 text-center text-xs font-black num-latin bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              بحث
            </button>
          </form>
        </div>

        {/* Recently completed quick pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] whitespace-nowrap">المنجزة حديثاً:</span>
          {appState.tickets
            .filter((t) => t.status === 'completed')
            .slice(-6)
            .reverse()
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTicket(t)}
                className={`px-3 py-1 rounded-xl font-black text-xs num-latin whitespace-nowrap transition cursor-pointer ${
                  selectedTicket?.id === t.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                #{t.code} {t.feedback ? '⭐' : ''}
              </button>
            ))}
        </div>
      </div>

      {/* Main Feedback Survey */}
      {selectedTicket ? (
        <CustomerFeedbackForm
          appState={appState}
          ticket={selectedTicket}
          onSaveFeedback={onSaveFeedback}
        />
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
            يرجى اختيار تذكرة منجزة أو كتابة رقم التذكرة للبدء في التقييم
          </h4>
        </div>
      )}
    </div>
  );
};
