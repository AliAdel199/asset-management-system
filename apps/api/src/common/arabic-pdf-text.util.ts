// pdfkit (عبر fontkit) يشكّل الحروف العربية تلقائياً بالاعتماد على جداول OpenType الخاصة
// بالخط المضمّن (GSUB: isol/init/medi/fina) طالما الخط يدعم ذلك - وهذا يشمل خطوط عربية حديثة
// مثل Tajawal، بعكس التحويل اليدوي لأشكال العرض (Presentation Forms) الذي يفشل مع أي خط
// لا يضمّن تلك النطاقات القديمة في جدول cmap الخاص به (Tajawal لا يضمّنها فتظهر مربعات فارغة).
// المشكلة الوحيدة أن pdfkit لا يطبّق خوارزمية Unicode BiDi لإعادة ترتيب النص من اليمين لليسار،
// فيرسم الكلمات بترتيبها المنطقي (كما كُتبت) من اليسار لليمين. الحل: نعكس ترتيب الكلمات فقط
// (وليس الأحرف داخل كل كلمة) حتى يبقى تشكيل الحروف داخل كل كلمة سليماً.
// نبني نمط الفحص من رموز الأحرف رقمياً بدل كتابة \uXXXX أو الأحرف الفعلية مباشرة بالشيفرة
// المصدرية، لأن أدوات التحرير/الفحص هنا تميل لتحويل مثل هذي الهروبات لمحارف فعلية غير مرئية
// (ومنها U+FEFF) يرفضها إعداد eslint (no-irregular-whitespace) بمجرد ظهورها حرفياً بالملف.
const ARABIC_CODE_RANGES: Array<[number, number]> = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x08a0, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

const ARABIC_CHAR_PATTERN = new RegExp(
  `[${ARABIC_CODE_RANGES.map(
    ([start, end]) =>
      `${String.fromCharCode(start)}-${String.fromCharCode(end)}`,
  ).join('')}]`,
);

export function shapeArabicForPdf(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (!ARABIC_CHAR_PATTERN.test(text)) {
    return text;
  }

  return text.split(' ').reverse().join(' ');
}
