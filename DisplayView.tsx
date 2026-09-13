import React, { useEffect, useState } from 'react';
import { AppState, Counter, LastCalled } from '../types';
import { Volume2, VolumeX, ArrowLeft, Tv, Bell, Info } from 'lucide-react';
import { playChimeSound } from '../utils';

interface DisplayViewProps {
  appState: AppState;
  onEnableAudio: () => void;
  audioEnabled: boolean;
}

export const DisplayView: React.FC<DisplayViewProps> = ({
  appState,
  onEnableAudio,
  audioEnabled,
}) => {
  const [clock, setClock] = useState('');
  const [flashCall, setFlashCall] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // فلاش بصري عند صدور نداء جديد
  useEffect(() => {
    if (appState.lastCalled) {
      setFlashCall(true);
      const t = setTimeout(() => setFlashCall(false), 6000);
      return () => clearTimeout(t);
    }
  }, [appState.lastCalled?.timestamp]);

  const waitingCount = appState.tickets.filter((t) => t.status === 'waiting').length;
  const servedCount = appState.tickets.filter((t) => t.status === 'completed').length;

  return (
    <section className="flex-1 flex flex-col space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left / Main: Current Call and Counters status */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col justify-between">
          <div>
            {/* Display Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Tv className="w-6 h-6 text-brand-600" />
                  النداء الحالي والمكاتب النشطة
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playChimeSound();
                    onEnableAudio();
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                    audioEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                  }`}
                >
                  {audioEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4" /> الصوت مفعل
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" /> اضغط لتفعيل الصوت
                    </>
                  )}
                </button>
                <div className="text-base font-black text-slate-600 dark:text-slate-300 num-latin bg-slate-100 dark:bg-slate-700/60 px-3 py-1 rounded-xl">
                  {clock || '--:--:--'}
                </div>
              </div>
            </div>

            {/* Latest Called Big Card */}
            <div
              className={`mt-4 p-6 rounded-3xl border-2 transition-all duration-500 text-center ${
                flashCall
                  ? 'bg-brand-600 text-white border-brand-400 scale-[1.02] shadow-2xl animate-pulse'
                  : 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 text-slate-900 dark:text-white shadow-sm'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand-500/20 mb-2">
                <Bell className="w-3.5 h-3.5 text-brand-600 dark:text-brand-300" /> النداء الحالي المباشر
              </div>
              
              <div className="flex items-center justify-center gap-6 my-2">
                <div>
                  <span className="text-xs opacity-75 block font-bold mb-1">رقم التذكرة</span>
                  <h1 className="text-6xl sm:text-7xl font-black text-brand-600 dark:text-brand-400 num-latin tracking-wider drop-shadow-sm">
                    {appState.lastCalled ? appState.lastCalled.ticketCode : '---'}
                  </h1>
                </div>
                
                <div className="text-3xl text-brand-500 animate-pulse">
                  <ArrowLeft className="w-8 h-8" />
                </div>
                
                <div>
                  <span className="text-xs opacity-75 block font-bold mb-1">توجه فوراً إلى</span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white">
                    {appState.lastCalled ? appState.lastCalled.counterName : 'في الانتظار'}
                  </h2>
                </div>
              </div>

              <span className="text-xs font-semibold opacity-90 inline-block mt-1">
                {appState.lastCalled ? appState.lastCalled.serviceName : 'بانتظار استدعاء مراجع جديد'}
              </span>
            </div>

            {/* Counters Grid */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center justify-between">
                <span>حالة الشبابيك وشاشات المكاتب</span>
                <span className="text-[11px] font-semibold text-brand-600 num-latin">
                  {appState.counters.length} مكاتب
                </span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {appState.counters.map((c: Counter) => {
                  const activeTicket = appState.tickets.find((t) => t.id === c.activeTicketId);
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-2xl border text-center transition ${
                        activeTicket
                          ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-slate-500 block mb-1 truncate">{c.name}</span>
                      <h3 className="text-3xl font-black text-brand-600 dark:text-brand-400 num-latin">
                        {activeTicket ? activeTicket.code : 'شاغر'}
                      </h3>
                      <span className="text-[10px] text-slate-400 block mt-1 truncate">
                        {activeTicket ? activeTicket.serviceName : 'بانتظار نداء'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 text-center">
            <div>
              <span className="text-xs text-slate-400 block font-semibold">بانتظار الخدمة</span>
              <span className="text-2xl font-black text-brand-600 num-latin">{waitingCount}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">تمت خدمتهم اليوم</span>
              <span className="text-2xl font-black text-emerald-600 num-latin">{servedCount}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-semibold">متوسط الانتظار</span>
              <span className="text-2xl font-black text-amber-600 num-latin">~ 4 د</span>
            </div>
          </div>
        </div>

        {/* Right / Side: Informational & Media Box */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-600" />
                إرشادات وتعليمات الصالة
              </h3>
              <span className="text-xs text-brand-600 font-bold">بث توعوي حي</span>
            </div>

            {/* Media Screen or Slideshow */}
            {appState.settings.youtubeUrl ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
                <iframe
                  className="w-full h-full object-cover"
                  src={appState.settings.youtubeUrl}
                  title="Queue Hall Media"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-900 to-slate-900 text-white space-y-3 shadow-sm">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-500/30 text-brand-300 text-xs font-bold">
                  توجيهات المراجعين
                </span>
                <h4 className="text-lg font-bold">يرجى متابعة شاشات العرض بدقة</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  عند ظهور رقم تذكرتك مع وميض الصوت، يُرجى التوجه الفوري إلى رقم المكتب المشار إليه مع إبراز أصل الهوية الوطنية أو الإقامة.
                </p>
                <div className="pt-2 flex items-center gap-3 text-xs text-brand-200">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> الأولوية لكبار السن
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> تتبع عبر الجوال متاح
                  </span>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  يمكنك مسح رمز الاستجابة السريعة (QR) على تذكرتك لمتابعة دورك من الكافتيريا أو خارج الصالة بكل حرية.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-slate-600 dark:text-slate-300">
                  في حال فاتك النداء، يمكنك مراجعة شباك الاستقبال لإعادة إدراج تذكرتك في قائمة الأولوية.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-brand-50/50 dark:bg-brand-950/20 rounded-xl text-center border border-brand-200 dark:border-brand-900/40">
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
              {appState.settings.orgName} • {appState.settings.branchName}
            </span>
          </div>
        </div>
      </div>

      {/* Marquee ticker */}
      <div className="bg-brand-900 text-white py-2.5 px-4 rounded-2xl overflow-hidden shadow flex items-center gap-3">
        <span className="bg-brand-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 shadow-sm">
          <Bell className="w-3.5 h-3.5" /> إعلانات الصالة
        </span>
        <div className="overflow-hidden w-full whitespace-nowrap">
          <div className="inline-block animate-marquee font-medium text-xs sm:text-sm">
            {appState.settings.marqueeText}
          </div>
        </div>
      </div>
    </section>
  );
};
