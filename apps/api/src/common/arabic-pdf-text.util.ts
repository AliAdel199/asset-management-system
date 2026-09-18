// pdfkit يرسم النص كسلسلة LTR بسيطة بدون خوارزمية Unicode BiDi ولا تشكيل عربي (Arabic shaping).
// هذه دالة مبسطة: تقسّم النص إلى مقاطع عربية/غير عربية، تعيد تشكيل كل مقطع عربي (حروف متصلة)
// ثم تعكس ترتيب أحرف كل مقطع عربي وترتيب المقاطع نفسها لمحاكاة الاتجاه من اليمين لليسار،
// بينما تبقي مقاطع الأرقام/اللاتينية بترتيبها الطبيعي (LTR) داخل السياق - وهي حالة كافية
// لمحتوى التقارير (تسميات عربية مع أرقام ورموز تصنيف لاتينية) دون تطبيق كامل UBA.
import * as ArabicReshaper from 'arabic-reshaper';

const ARABIC_CHAR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const BASIC_NEUTRAL = /[\s.,\-:/،]/;
const STRONG_LTR = /[A-Za-z0-9]/;
const OPENING_BRACKETS = new Set(['(', '[', '{']);
const CLOSING_BRACKETS = new Set([')', ']', '}']);

type Run = { text: string; isArabic: boolean };

function lookaheadDirection(chars: string[], fromIndex: number): 'ar' | 'ltr' | null {
  for (let j = fromIndex; j < chars.length; j += 1) {
    if (ARABIC_CHAR.test(chars[j])) {
      return 'ar';
    }

    if (STRONG_LTR.test(chars[j])) {
      return 'ltr';
    }
  }

  return null;
}

function splitIntoRuns(value: string): Run[] {
  const chars = Array.from(value);
  const runs: Run[] = [];
  let current = '';
  let currentIsArabic: boolean | null = null;

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    let isArabic: boolean;

    if (ARABIC_CHAR.test(char)) {
      isArabic = true;
    } else if (OPENING_BRACKETS.has(char)) {
      // القوس الفاتح يتبع اتجاه أول محرف قوي يليه حتى يبقى ملتصقاً بمحتواه (مثال: "أجهزة (DEV)").
      const next = lookaheadDirection(chars, i + 1);
      isArabic = next === 'ar' ? true : next === 'ltr' ? false : (currentIsArabic ?? false);
    } else if (CLOSING_BRACKETS.has(char) || BASIC_NEUTRAL.test(char)) {
      isArabic = currentIsArabic ?? false;
    } else {
      isArabic = false;
    }

    if (currentIsArabic === null || isArabic === currentIsArabic) {
      current += char;
    } else {
      runs.push({ text: current, isArabic: currentIsArabic });
      current = char;
    }

    currentIsArabic = isArabic;
  }

  if (current) {
    runs.push({ text: current, isArabic: currentIsArabic ?? false });
  }

  return runs;
}

export function shapeArabicForPdf(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (!ARABIC_CHAR.test(text)) {
    return text;
  }

  const runs = splitIntoRuns(text);

  const processed = runs.map((run) => {
    if (!run.isArabic) {
      return run.text;
    }

    const reshaped: string = ArabicReshaper.convertArabic(run.text);
    return reshaped.split('').reverse().join('');
  });

  return processed.reverse().join('');
}
