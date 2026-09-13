import React, { useMemo } from 'react';
import { Ticket, Service } from '../types';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Clock, TrendingUp, AlertTriangle, Users, CheckCircle, BarChart3 } from 'lucide-react';
import { formatTicketCount, formatMinutes } from '../utils';

interface WaitTimeAnalyticsProps {
  tickets: Ticket[];
  services: Service[];
  congestionLimit: number;
}

export const WaitTimeAnalytics: React.FC<WaitTimeAnalyticsProps> = ({
  tickets,
  services,
  congestionLimit,
}) => {
  // تجميع وتحليل البيانات حسب ساعات اليوم من 08:00 صباحاً حتى 06:00 مساءً (أو الساعات الفعلية)
  const hourlyData = useMemo(() => {
    // تعريف الساعات النموذجية ليوم العمل (من 8 صباحاً إلى 6 مساءً)
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

    // خريطة لتجميع تذاكر كل ساعة
    const hourMap: Record<number, {
      issued: number;
      served: number;
      totalWaitMinutes: number;
      waitingCount: number;
      maxWait: number;
      samples: number;
    }> = {};

    hours.forEach((h) => {
      hourMap[h] = {
        issued: 0,
        served: 0,
        totalWaitMinutes: 0,
        waitingCount: 0,
        maxWait: 0,
        samples: 0,
      };
    });

    // فرز وتحليل التذاكر الحقيقية
    tickets.forEach((t) => {
      const issueDate = new Date(t.createdAt);
      const h = issueDate.getHours();

      if (hourMap[h]) {
        hourMap[h].issued += 1;
        if (t.status === 'waiting') {
          hourMap[h].waitingCount += 1;
        }
      }

      if (t.calledAt) {
        const callHour = new Date(t.calledAt).getHours();
        const waitMin = Math.max(1, Math.round((t.calledAt - t.createdAt) / 60000));
        if (hourMap[callHour]) {
          hourMap[callHour].served += 1;
          hourMap[callHour].totalWaitMinutes += waitMin;
          hourMap[callHour].samples += 1;
          if (waitMin > hourMap[callHour].maxWait) {
            hourMap[callHour].maxWait = waitMin;
          }
        }
      }
    });

    // إذا لم تكن هناك تذاكر في النظام بعد، نوفر مؤشرات استرشادية لنمط الذروة المعتاد
    const hasData = tickets.length > 0;

    return hours.map((h) => {
      const entry = hourMap[h];
      const hourLabel = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'م' : 'ص'}`;
      
      let avgWait = entry.samples > 0 ? Math.round(entry.totalWaitMinutes / entry.samples) : 0;
      let ticketCount = entry.issued;
      let servedCount = entry.served;

      // محاكاة إحصائية ذكية إذا كانت القائمة فارغة تماماً لعرض التوزيع للمسؤول
      if (!hasData) {
        // ذروة نموذجية الساعة 10-12 ظهراً والساعة 4 عصراً
        const peakFactor = (h >= 10 && h <= 12) ? 2.5 : (h >= 16 && h <= 17) ? 2.0 : 1.0;
        ticketCount = Math.round(4 * peakFactor);
        avgWait = Math.round(6 * peakFactor);
        servedCount = Math.round(3.5 * peakFactor);
      }

      return {
        hour: hourLabel,
        hourNumber: h,
        avgWaitMinutes: avgWait,
        ticketCount: ticketCount,
        servedCount: servedCount,
        isPeak: avgWait > 12 || ticketCount > (hasData ? 6 : 8),
      };
    });
  }, [tickets]);

  // إحصائيات تحليلية لخدمات النظام
  const serviceStats = useMemo(() => {
    return services.map((s) => {
      const sTickets = tickets.filter((t) => t.serviceId === s.id);
      const sCompleted = sTickets.filter((t) => t.status === 'completed' && t.calledAt);
      
      let totalWait = 0;
      sCompleted.forEach((t) => {
        if (t.calledAt) totalWait += (t.calledAt - t.createdAt) / 60000;
      });

      const avgWait = sCompleted.length > 0 ? Math.round(totalWait / sCompleted.length) : s.avgDuration;

      return {
        name: s.name.length > 18 ? s.name.substring(0, 18) + '...' : s.name,
        fullName: s.name,
        total: sTickets.length || 3, // fallback display
        avgWait: avgWait,
        waiting: sTickets.filter((t) => t.status === 'waiting').length,
      };
    });
  }, [tickets, services]);

  // العثور على أوقات الذروة القصوى
  const peakHour = useMemo(() => {
    if (hourlyData.length === 0) return null;
    return [...hourlyData].sort((a, b) => b.avgWaitMinutes - a.avgWaitMinutes)[0];
  }, [hourlyData]);

  const busiestHour = useMemo(() => {
    if (hourlyData.length === 0) return null;
    return [...hourlyData].sort((a, b) => b.ticketCount - a.ticketCount)[0];
  }, [hourlyData]);

  return (
    <div className="space-y-6">
      {/* Header Summary & KPI Badges */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div>
          <h4 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            تحليلات ذروة وقت الانتظار وتوزيع الضغط اليومي
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            رصد أوقات الازدحام ومتوسط مدد الانتظار بالساعات لتحسين توزيع الموظفين
          </p>
        </div>

        {peakHour && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-3.5 py-1.5 rounded-xl text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>ساعة الذروة اليوم: <strong>{peakHour.hour}</strong> (متوسط {formatMinutes(peakHour.avgWaitMinutes)})</span>
          </div>
        )}
      </div>

      {/* Grid of Key Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">أعلى وقت انتظار مسجل</span>
            <span className="text-xl font-black text-slate-800 dark:text-white num-latin">
              {peakHour ? formatMinutes(peakHour.avgWaitMinutes) : '0 د'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">أكثر الساعات توافداً للعملاء</span>
            <span className="text-xl font-black text-slate-800 dark:text-white num-latin">
              {busiestHour ? `${busiestHour.hour} (${formatTicketCount(busiestHour.ticketCount)})` : '-'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">كفاءة الإنجاز ومعدل الخدمة</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 num-latin">
              {tickets.length > 0 
                ? `${Math.round((tickets.filter(t => t.status === 'completed').length / tickets.length) * 100)}%` 
                : '100%'}
            </span>
          </div>
        </div>
      </div>

      {/* Chart 1: Hourly Wait Time Peak (Area Chart) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h5 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              مخطط ذروة متوسط وقت الانتظار على مدار اليوم (بالدقائق)
            </h5>
            <p className="text-[11px] text-slate-400">يبين تصاعد أوقات انتظار المراجعين حسب ساعات الدوام</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 num-latin">
            وحدة القياس: دقيقة
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="waitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#94a3b8' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  borderColor: '#334155', 
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right'
                }}
                formatter={(value: any, name: any) => [
                  name === 'avgWaitMinutes' ? formatMinutes(Number(value)) : formatTicketCount(Number(value)),
                  name === 'avgWaitMinutes' ? 'متوسط الانتظار' : 'التذاكر المصدرة'
                ]}
                labelFormatter={(label) => `الساعة: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => (value === 'avgWaitMinutes' ? 'متوسط وقت الانتظار (د)' : 'عدد التذاكر المصدرة')}
              />
              <Area 
                type="monotone" 
                dataKey="avgWaitMinutes" 
                name="avgWaitMinutes"
                stroke="#0d9488" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#waitGradient)" 
              />
              <Area 
                type="monotone" 
                dataKey="ticketCount" 
                name="ticketCount"
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#ticketGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Tickets Issued vs Completed (Bar Chart) & Service Wait Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart: Traffic and Completion */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div>
            <h5 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              مقارنة التذاكر الصادرة مقابل المنجزة حسب الساعات
            </h5>
            <p className="text-[11px] text-slate-400">متابعة سرعة تفريغ طوابير الانتظار في أوقات الضغط</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderColor: '#334155', 
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                  formatter={(value: any, name: any) => [
                    formatTicketCount(Number(value)),
                    name === 'ticketCount' ? 'المسجلة' : 'المنجزة'
                  ]}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  formatter={(value) => (value === 'ticketCount' ? 'التذاكر المصدرة' : 'التذاكر المنجزة')}
                />
                <Bar dataKey="ticketCount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="servedCount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Average Wait Time per Service */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div>
            <h5 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              متوسط وقت الانتظار حسب نوع الخدمة
            </h5>
            <p className="text-[11px] text-slate-400">تحديد الخدمات التي تستغرق وقتاً أطول وتحتاج دعماً إضافياً</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={serviceStats} 
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderColor: '#334155', 
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    direction: 'rtl',
                    textAlign: 'right'
                  }}
                  formatter={(value: any) => [formatMinutes(Number(value)), 'متوسط الانتظار']}
                  labelFormatter={(label, payload) => {
                    const full = payload && payload[0] && (payload[0].payload as any).fullName;
                    return full || label;
                  }}
                />
                <Bar dataKey="avgWait" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
