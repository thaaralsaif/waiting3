import React, { useState } from 'react';
import { SystemSettings, IntakeFormSettings, CustomFieldDefinition, Service, FieldRequirement } from '../types';
import { FormInput, Plus, Trash2, Check, RotateCcw, Eye, HelpCircle, Layers, Sparkles, AlertCircle } from 'lucide-react';

interface IntakeFieldsCustomizerTabProps {
  settings: SystemSettings;
  services: Service[];
  onSave: (newSettings: SystemSettings) => void;
}

const defaultIntakeSettings: IntakeFormSettings = {
  nameField: 'required',
  phoneField: 'required',
  nationalIdField: 'required',
  enablePriorityToggle: true,
  customFields: [],
  instructionNotice: 'يرجى تعبئة بيانات المراجع بدقة لتسهيل الخدمة واستلام إشعار الدور',
};

export const IntakeFieldsCustomizerTab: React.FC<IntakeFieldsCustomizerTabProps> = ({
  settings,
  services,
  onSave,
}) => {
  const [formConfig, setFormConfig] = useState<IntakeFormSettings>(() => ({
    ...defaultIntakeSettings,
    ...(settings.intakeForm || {}),
    customFields: settings.intakeForm?.customFields || [],
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Custom Field modal/state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'number' | 'select'>('text');
  const [newOptionsStr, setNewOptionsStr] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleRequirementChange = (
    field: 'nameField' | 'phoneField' | 'nationalIdField',
    value: FieldRequirement
  ) => {
    setFormConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const options =
      newType === 'select'
        ? newOptionsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const fieldDef: CustomFieldDefinition = {
      id: `field_${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      options,
      required: newRequired,
      placeholder: newPlaceholder.trim() || undefined,
      serviceId: newServiceId || undefined,
    };

    setFormConfig((prev) => ({
      ...prev,
      customFields: [...prev.customFields, fieldDef],
    }));

    setNewLabel('');
    setNewType('text');
    setNewOptionsStr('');
    setNewRequired(false);
    setNewPlaceholder('');
    setNewServiceId('');
    setShowAddModal(false);
  };

  const handleDeleteCustomField = (fieldId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((f) => f.id !== fieldId),
    }));
  };

  const handleSave = () => {
    const updated: SystemSettings = {
      ...settings,
      intakeForm: formConfig,
    };
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    setFormConfig(defaultIntakeSettings);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm"
            style={{
              backgroundColor: `${settings.theme.primary}18`,
              color: settings.theme.primary,
            }}
          >
            <FormInput className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
              منشئ الحقول ونموذج بيانات المراجع (Custom Intake Fields)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تحكم يدوي في جعل الحقول الأساسية (إلزامية، اختيارية، أو مخفية)، وإضافة حقول إضافية مخصصة للكشك
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              backgroundColor: settings.theme.primary,
              color: settings.theme.buttonTextColor || '#ffffff',
            }}
            className="px-6 py-2.5 rounded-xl font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95"
          >
            <Check className="w-4 h-4" />
            <span>حفظ إعدادات النموذج</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500 text-white text-xs font-bold rounded-2xl text-center shadow-sm flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>تم حفظ إعدادات وحقول نموذج الكشك بنجاح! سيتم تطبيقها فوراً.</span>
        </div>
      )}

      {/* Main Grid: Settings vs Live Form Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Configuration Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Standard Core Fields */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>حالة الحقول الأساسية الثلاثة</span>
            </h4>

            <div className="space-y-3">
              {/* Name Field */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white block">
                    حقل اسم المراجع الكامل
                  </span>
                  <span className="text-[11px] text-slate-400">اسم المراجع للنداء والطباعة</span>
                </div>
                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  {(['required', 'optional', 'hidden'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleRequirementChange('nameField', opt)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        formConfig.nameField === opt
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {opt === 'required' ? 'إلزامي' : opt === 'optional' ? 'اختياري' : 'مخفي'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Field */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white block">
                    حقل رقم الجوال
                  </span>
                  <span className="text-[11px] text-slate-400">لإرسال إشعارات التتبع والرسائل</span>
                </div>
                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  {(['required', 'optional', 'hidden'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleRequirementChange('phoneField', opt)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        formConfig.phoneField === opt
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {opt === 'required' ? 'إلزامي' : opt === 'optional' ? 'اختياري' : 'مخفي'}
                    </button>
                  ))}
                </div>
              </div>

              {/* National ID Field */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white block">
                    حقل رقم الهوية الوطنية / الإقامة
                  </span>
                  <span className="text-[11px] text-slate-400">للتحقق من السجل والتأكد من المعاملة</span>
                </div>
                <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                  {(['required', 'optional', 'hidden'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleRequirementChange('nationalIdField', opt)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        formConfig.nationalIdField === opt
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {opt === 'required' ? 'إلزامي' : opt === 'optional' ? 'اختياري' : 'مخفي'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Toggle */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white block">
                    تفعيل خيار "عميل أولوية خاصة VIP"
                  </span>
                  <span className="text-[11px] text-slate-400">
                    يسمح للمراجع باختيار تذكرة أولوية (كبار السن، ذوي الاحتياجات، كبار العملاء)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formConfig.enablePriorityToggle}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, enablePriorityToggle: e.target.checked })
                  }
                  className="w-5 h-5 text-brand-600 rounded cursor-pointer focus:ring-brand-500"
                />
              </div>

              {/* Notice text */}
              <div className="pt-2">
                <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1">
                  رسالة الإرشاد للمراجع أعلى النموذج:
                </label>
                <input
                  type="text"
                  value={formConfig.instructionNotice || ''}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, instructionNotice: e.target.value })
                  }
                  placeholder="مثال: يرجى تعبئة بيانات المراجع بدقة لتسهيل الخدمة"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Custom Extra Fields */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-600" />
                <span>الحقول الإضافية المخصصة ({formConfig.customFields.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة حقل جديد
              </button>
            </div>

            {formConfig.customFields.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30">
                <p className="text-xs text-slate-400">
                  لا توجد حقول إضافية حالياً. يمكنك إضافة حقول مثل (رقم المعاملة، رقم الحساب، نوع الطلب).
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {formConfig.customFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">
                          {field.label}
                        </span>
                        {field.required && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 text-[10px] font-black">
                            إلزامي
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-medium">
                          {field.type === 'text'
                            ? 'نص'
                            : field.type === 'number'
                            ? 'رقم'
                            : 'قائمة اختيار'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {field.serviceId
                          ? `خاص بخدمة: ${
                              services.find((s) => s.id === field.serviceId)?.name || 'محددة'
                            }`
                          : 'لكافة الخدمات المتاحة'}
                        {field.options && ` • الخيارات: (${field.options.join('، ')})`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomField(field.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      title="حذف هذا الحقل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Kiosk Form Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-brand-600" />
                معاينة حية لشاشة إدخال البيانات في الكشك
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold">
                مباشر
              </span>
            </div>

            {/* Kiosk Simulator Card */}
            <div className="bg-slate-100 dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">
                  بيانات المراجع لإصدار التذكرة
                </h4>
                {formConfig.instructionNotice && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {formConfig.instructionNotice}
                  </p>
                )}
              </div>

              {/* Form Fields Simulation */}
              <div className="space-y-3 text-xs">
                {/* Name */}
                {formConfig.nameField !== 'hidden' && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      اسم المراجع الكامل
                      {formConfig.nameField === 'required' ? (
                        <span className="text-rose-500 mr-1">*</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] mr-1">(اختياري)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder="محمد أحمد المنصور"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed text-xs"
                    />
                  </div>
                )}

                {/* Phone */}
                {formConfig.phoneField !== 'hidden' && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      رقم الجوال
                      {formConfig.phoneField === 'required' ? (
                        <span className="text-rose-500 mr-1">*</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] mr-1">(اختياري)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder="05XXXXXXXX"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed text-xs num-latin"
                    />
                  </div>
                )}

                {/* National ID */}
                {formConfig.nationalIdField !== 'hidden' && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      رقم الهوية الوطنية / الإقامة
                      {formConfig.nationalIdField === 'required' ? (
                        <span className="text-rose-500 mr-1">*</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] mr-1">(اختياري)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder="10XXXXXXXX"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed text-xs num-latin"
                    />
                  </div>
                )}

                {/* Custom Fields in Simulator */}
                {formConfig.customFields.map((f) => (
                  <div key={f.id}>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {f.label}
                      {f.required ? (
                        <span className="text-rose-500 mr-1">*</span>
                      ) : (
                        <span className="text-slate-400 text-[10px] mr-1">(اختياري)</span>
                      )}
                    </label>

                    {f.type === 'select' ? (
                      <select
                        disabled
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed text-xs"
                      >
                        <option>اختر من القائمة...</option>
                        {f.options?.map((opt, i) => (
                          <option key={i}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        disabled
                        placeholder={f.placeholder || `أدخل ${f.label}`}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed text-xs"
                      />
                    )}
                  </div>
                ))}

                {/* VIP Checkbox in Simulator */}
                {formConfig.enablePriorityToggle && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-200 text-xs block">
                        عميل أولوية خاصة VIP
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400">
                        كبار السن وذوي الاحتياجات
                      </span>
                    </div>
                    <div className="w-4 h-4 border border-amber-500 rounded bg-white dark:bg-slate-800"></div>
                  </div>
                )}
              </div>

              {/* Fake CTA */}
              <div className="pt-2 text-center">
                <span className="inline-block w-full py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs opacity-90">
                  اختر الخدمة لاستخراج التذكرة
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-600" />
                إضافة حقل مخصص جديد للنموذج
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomField} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  عنوان الحقل (Label):
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="مثال: رقم المعاملة السابقة، رقم الحساب"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    نوع الحقل:
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'text' | 'number' | 'select')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
                  >
                    <option value="text">نص عادي (Text)</option>
                    <option value="number">رقمي (Number)</option>
                    <option value="select">قائمة منسدلة (Select)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    خاص بخدمة معينة:
                  </label>
                  <select
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
                  >
                    <option value="">كافة الخدمات</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newType === 'select' && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    خيارات القائمة (مفصولة بفاصلة):
                  </label>
                  <input
                    type="text"
                    required
                    value={newOptionsStr}
                    onChange={(e) => setNewOptionsStr(e.target.value)}
                    placeholder="استفسار عام، شكوى، طلب جديد، أخرى"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  نص توضيحي داخل الحقل (Placeholder):
                </label>
                <input
                  type="text"
                  value={newPlaceholder}
                  onChange={(e) => setNewPlaceholder(e.target.value)}
                  placeholder="مثال: يرجى كتابة الرقم المرجعي المكون من 6 أرقام"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="req_check"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                />
                <label htmlFor="req_check" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  هذا الحقل إلزامي لإصدار التذكرة
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 cursor-pointer shadow-xs"
                >
                  إضافة الحقل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
