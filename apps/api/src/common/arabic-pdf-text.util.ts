// pdfkit (عبر fontkit) يشكّل الحروف العربية تلقائياً بالاعتماد على جداول OpenType الخاصة
// بالخط المضمّن (GSUB: isol/init/medi/fina) طالما الخط يدعم ذلك - وهذا يشمل خطوط عربية حديثة
// مثل Tajawal، بعكس التحويل اليدوي لأشكال العرض (Presentation Forms) الذي يفشل مع أي خط
// لا يضمّن تلك النطاقات القديمة في جدول cmap الخاص به (Tajawal لا يضمّنها فتظهر مربعات فارغة).
// المشكلة الوحيدة أن pdfkit لا يطبّق خوارزمية Unicode BiDi لإعادة ترتيب النص من اليمين لليسار،
// فيرسم الكلمات بترتيبها المنطقي (كما كُتبت) من اليسار لليمين. الحل: نعكس ترتيب الكلمات فقط
// (وليس الأحرف داخل كل كلمة) حتى يبقى تشكيل الحروف داخل كل كلمة سليماً.
export function shapeArabicForPdf(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (!/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(text)) {
    return text;
  }

  return text.split(' ').reverse().join(' ');
}
