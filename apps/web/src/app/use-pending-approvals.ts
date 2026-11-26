"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./api-client";

export type PendingApprovalsCount = {
  transferRequests: number;
  writeOffRequests: number;
  maintenanceRequests: number;
  total: number;
};

const POLL_INTERVAL_MS = 30_000;

const ZERO_COUNT: PendingApprovalsCount = {
  transferRequests: 0,
  writeOffRequests: 0,
  maintenanceRequests: 0,
  total: 0,
};

/**
 * يستطلع عدد الطلبات المعلّقة بانتظار اعتماد المستخدم الحالي (نقل/شطب/صيانة)
 * كل 30 ثانية طالما أنه مسجّل دخول، ليعرض شارات في القائمة الجانبية.
 */
export function usePendingApprovals(enabled: boolean) {
  const [counts, setCounts] = useState<PendingApprovalsCount>(ZERO_COUNT);

  useEffect(() => {
    // بدون تسجيل دخول لا نستطلع شيئًا؛ القيمة الصفرية تُرجع مباشرة في نهاية الدالة
    // بدل تخزينها هنا، لأن استدعاء setState داخل جسم useEffect يسبب إعادة رسم إضافية.
    if (!enabled) {
      return;
    }

    let ignore = false;

    function load() {
      apiFetch("/notifications/pending-approvals")
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("تعذر تحميل الإشعارات.");
          }

          return response.json() as Promise<PendingApprovalsCount>;
        })
        .then((data) => {
          if (!ignore) {
            setCounts(data);
          }
        })
        .catch(() => {
          // فشل صامت: الشارات ميزة مساعدة وليست حرجة، ولا داعي لإزعاج المستخدم بها.
        });
    }

    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      window.clearInterval(timer);
      // نصفّر العدد عند الإيقاف (مثل تسجيل الخروج)، حتى لا تظهر أعداد المستخدم السابق
      // للحظة إذا سجّل مستخدم آخر الدخول قبل وصول أول استجابة.
      setCounts(ZERO_COUNT);
    };
  }, [enabled]);

  return enabled ? counts : ZERO_COUNT;
}
