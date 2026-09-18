# آلية تشغيل النظام محلياً

هذا الملف يوضح طريقة تشغيل نظام إدارة الموجودات على جهاز التطوير.

> ملاحظة مهمة على Windows/PowerShell: استخدم `npm.cmd` بدل `npm` إذا ظهرت رسالة منع تشغيل السكربتات.

## المتطلبات

- Node.js مثبت.
- PostgreSQL شغال.
- قاعدة البيانات `asset_management_system` موجودة.
- ملف البيئة موجود في:
  `apps/api/.env`

## أول تشغيل أو بعد تحديثات قاعدة البيانات

افتح PowerShell داخل مجلد المشروع:

```powershell
cd D:\AssetManagementSystem
```

طبق migrations:

```powershell
cd apps\api
npx.cmd prisma migrate deploy
npx.cmd prisma generate
cd ..\..
```

أضف بيانات التأسيس والبيانات التجريبية:

```powershell
npm.cmd run db:seed --workspace apps/api
```

## التشغيل اليومي

افتح نافذة PowerShell أولى وشغل API:

```powershell
cd D:\AssetManagementSystem
npm.cmd run dev:api
```

افتح نافذة PowerShell ثانية وشغل الواجهة:

```powershell
cd D:\AssetManagementSystem
npm.cmd run dev:web
```

بعدها افتح:

```text
http://localhost:3000/dashboard
```

## روابط الفحص

تأكد أن الواجهة تعمل:

```text
http://localhost:3000/dashboard
```

تأكد أن API يعمل ويرجع بيانات:

```text
http://localhost:3001/api/assets
```

تأكد أن بيانات الصيانة تعمل:

```text
http://localhost:3001/api/maintenance-requests
```

## إذا فتحت الواجهة بدون بيانات

افحص بالترتيب:

1. PostgreSQL شغال.
2. API شغال على `localhost:3001`.
3. الواجهة شغالة على `localhost:3000`.
4. شغل seed:

```powershell
npm.cmd run db:seed --workspace apps/api
```

5. أعد تحديث المتصفح.

## أوامر التحقق قبل تسليم أي تعديل

```powershell
npm.cmd run lint
npm.cmd run build
```

## ملاحظات تشغيل

- لا تشغل الواجهة وحدها، لأن البيانات تأتي من API.
- إذا توقف API ستظهر الصفحات لكن بدون بيانات أو برسالة تعذر التحميل.
- إذا تغيرت الجداول أو أضفنا migration جديد، شغل:

```powershell
cd D:\AssetManagementSystem\apps\api
npx.cmd prisma migrate deploy
npx.cmd prisma generate
cd ..\..
```

- **لا تشغل `next build` على مجلد الواجهة أثناء `next dev` شغال بالتوازي على نفس المجلد.** الاثنان يشتركان بمجلد `.next` وتشغيلهما معاً يخرب كاش السيرفر التطويري (تظهر أعراض غريبة مثل صفحة ما تتحدث رغم إن الكود تغيّر). إذا صار هذا، أوقف `next dev`، احذف مجلد `apps/web/.next`، وشغّله من جديد.

## متغيرات البيئة

### `apps/api/.env`

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | رابط الاتصال بقاعدة PostgreSQL. |
| `JWT_SECRET` | سر توقيع جلسات الدخول — قيمة عشوائية طويلة مختلفة بكل بيئة. |
| `WEB_APP_ORIGINS` | روابط الواجهة المسموح لها بالاتصال (CORS)، مفصولة بفاصلة عند تعدد البيئات. |
| `PORT` | منفذ الـ API (اختياري، الافتراضي 3001). |

### `apps/web/.env.local` (أو `.env.production` عند البناء للإنتاج)

| المتغير | الوصف |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | رابط الـ API كما يراه متصفح المستخدم. **يُقرأ وقت البناء** (`next build`)، فأي تغيير يحتاج إعادة بناء الواجهة، مو فقط إعادة تشغيلها. |

كل المتغيرات موثقة بملفات `.env.example` المقابلة بكل مجلد.

## النشر على سيرفر إنتاجي (خطوط عريضة)

هذا القسم مبدئي — يحتاج اعتماد تفصيلي قبل التشغيل الرسمي حسب `docs/09-mvp-implementation-plan.md`، المرحلة 11.

1. **بيئة منفصلة**: سيرفر إنتاج بقاعدة بيانات وملفات بيئة خاصة به، غير مشتركة مع بيئة التطوير.
2. **البناء**:
   ```bash
   npm run build --workspace apps/api
   npm run build --workspace apps/web
   ```
3. **التشغيل**: استخدم مدير عمليات يعيد التشغيل تلقائياً عند الانهيار (PM2 أو systemd)، وليس `npm run start` مباشرة بالطرفية.
4. **HTTPS**: النظام نفسه لا يوفر HTTPS — يحتاج reverse proxy أمامه (Nginx أو Caddy) يتولى شهادة SSL ويمرر الطلبات للـ API (منفذ 3001) والواجهة (منفذ 3000).
5. **النسخ الاحتياطي**: نسخ دورية لقاعدة PostgreSQL، ولمجلد `apps/api/uploads` (فيه ملفات المرفقات المرفوعة فعلياً على القرص، غير موجودة بقاعدة البيانات).
6. **المستخدمون الفعليون**: احذف/عطّل مستخدمي seed التجريبيين (`admin`, `central.user`, ...) بعد إنشاء حسابات حقيقية بكلمات مرور خاصة، أو غيّر كلمات مرورهم فوراً.
7. **JWT_SECRET و WEB_APP_ORIGINS**: قيم مختلفة تماماً عن بيئة التطوير، وربط `WEB_APP_ORIGINS` بدومين الإنتاج الفعلي فقط.
