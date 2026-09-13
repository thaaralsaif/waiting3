import React from 'react';
import { Ticket, SystemSettings } from '../types';
import { QRCodeDisplay } from './QRCodeDisplay';
import { getBaseAppUrl } from '../utils';

interface ThermalTicketPrintProps {
  ticket: Ticket | null;
  settings: SystemSettings;
  aheadCount: number;
}

export const ThermalTicketPrint: React.FC<ThermalTicketPrintProps> = ({
  ticket,
  settings,
  aheadCount,
}) => {
  if (!ticket) return null;

  const cfg = settings.ticketPrint || {
    headerText: settings.orgName,
    subHeaderText: settings.branchName,
    footerText: settings.printFooter || 'شكراً لزيارتكم - نتمنى لكم يوماً سعيداً',
    showQrCode: true,
    showWaitTimeEstimate: true,
    showWaitingCountAhead: true,
    showBranchName: true,
    showDateAndTime: true,
    showCustomerName: true,
    paperWidth: '80mm',
    fontSizeScale: 'medium'
  };

  const baseUrl = getBaseAppUrl(settings.publicQrBaseUrl || settings.appointmentSettings?.publicQrBaseUrl);
  const trackUrl = `${baseUrl}?track=${ticket.code}&svc=${encodeURIComponent(
    ticket.serviceName
  )}&name=${encodeURIComponent(ticket.customerName)}&time=${ticket.createdAt}`;

  const widthClass = cfg.paperWidth === '58mm' ? 'w-[58mm]' : 'w-[80mm]';
  const scaleClass = cfg.fontSizeScale === 'small' ? 'text-xs' : cfg.fontSizeScale === 'large' ? 'text-base' : 'text-sm';

  return (
    <div id="thermal-ticket-print" className={`hidden print:block text-black bg-white font-mono p-4 ${widthClass} mx-auto text-center ${scaleClass}`}>
      <h2 className="font-black text-xl mb-1 text-black">{cfg.headerText || settings.orgName}</h2>
      {cfg.showBranchName && (
        <p className="text-xs mb-2 text-black">{cfg.subHeaderText || settings.branchName}</p>
      )}
      <div className="border-b-2 border-dashed border-black my-2"></div>

      <p className="text-xs font-bold my-1 text-black">رقم التذكرة</p>
      <h1 className="text-6xl font-black my-2 text-black tracking-widest">{ticket.code}</h1>
      <p className="text-sm font-bold text-black">{ticket.serviceName}</p>
      
      {ticket.isPriority && (
        <p className="text-xs font-black my-1 text-black">*** تذكرة أولوية خاصة VIP ***</p>
      )}

      {ticket.isAppointment && (
        <p className="text-xs font-black my-1 text-black">*** موعد مسبق مؤكد ({ticket.appointmentCode || 'حجز'}) ***</p>
      )}

      <div className="border-b-2 border-dashed border-black my-2"></div>

      <div className="text-xs text-right space-y-1 my-2">
        {cfg.showDateAndTime && (
          <div className="flex justify-between">
            <span className="text-black">التاريخ والوقت:</span>
            <span className="text-black">{new Date(ticket.createdAt).toLocaleTimeString('en-US')}</span>
          </div>
        )}
        {cfg.showCustomerName && ticket.customerName && (
          <div className="flex justify-between">
            <span className="text-black">اسم المراجع:</span>
            <span className="text-black font-bold">{ticket.customerName}</span>
          </div>
        )}
        {ticket.customData && Object.entries(ticket.customData).map(([fId, val]) => {
          const fDef = settings.intakeForm?.customFields?.find((f) => f.id === fId);
          return (
            <div key={fId} className="flex justify-between">
              <span className="text-black">{fDef?.label || 'بيان إضافي'}:</span>
              <span className="text-black font-semibold">{val}</span>
            </div>
          );
        })}
        {cfg.showWaitingCountAhead && (
          <div className="flex justify-between">
            <span className="text-black">المراجعون أمامك:</span>
            <span className="font-bold text-black">{aheadCount}</span>
          </div>
        )}
        {cfg.showWaitTimeEstimate && (
          <div className="flex justify-between">
            <span className="text-black">الوقت التقديري:</span>
            <span className="font-bold text-black">~ {Math.max(1, aheadCount * 4)} دقيقة</span>
          </div>
        )}
      </div>

      <div className="border-b-2 border-dashed border-black my-2"></div>

      {cfg.showQrCode && (
        <>
          <div className="flex justify-center my-3">
            <QRCodeDisplay
              value={trackUrl}
              size={96}
              title="باركود التتبع الفوري"
              showActions={false}
            />
          </div>
          <p className="text-[10px] text-black">امسح الباركود بهاتفك لمتابعة دورك مباشرة</p>
        </>
      )}

      {(cfg.footerText || settings.printFooter) && (
        <p className="text-[10px] mt-2 text-black font-sans leading-relaxed">{cfg.footerText || settings.printFooter}</p>
      )}
    </div>
  );
};
