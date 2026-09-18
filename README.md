# Asset Management System

نظام حكومي لإدارة ومتابعة الموجودات، يغطي دورة حياة الموجود من الإدخال إلى الصيانة والنقل والأرشفة، مع صلاحيات مرتبطة بالهيكل التنظيمي (نطاق مركزي أو نطاق جهة واحدة).

## المزايا الرئيسية

- إدارة الموجودات (مركبات، عقارات، أراضي) مع سجل صيانة وتنبيهات.
- طلبات نقل الموجودات بين الجهات مع سجل تدقيق (Audit Log) لكل عملية.
- إدارة المستخدمين والأدوار والصلاحيات، مع تقييد الوصول حسب الجهة التنظيمية.
- لوحة إدارة (Admin) لإدارة المستخدمين، الأدوار، الجهات التنظيمية، وكتالوج الأصناف.
- تقارير وجرد (Inventory) ولوحة مؤشرات (Dashboard).

## التقنيات المستخدمة

- **الواجهة (`apps/web`)**: Next.js + React + TypeScript.
- **الخادم الخلفي (`apps/api`)**: NestJS + Prisma + PostgreSQL.

## الهيكل

- `apps/web`: واجهة النظام.
- `apps/api`: الخادم الخلفي وواجهات API.
- `packages/shared`: الأنواع أو الأدوات المشتركة لاحقًا.
- `docs`: وثائق التحليل والتصميم.

## التشغيل المحلي

أوامر التشغيل من جذر المشروع:

```bash
npm run dev:web
npm run dev:api
```

الواجهة تعمل افتراضيًا على:

```text
http://localhost:3000
```

الخادم الخلفي يعمل افتراضيًا على:

```text
http://localhost:3001/api
```

## قاعدة البيانات

تم تجهيز Prisma داخل `apps/api`.

انسخ ملف البيئة وعدل بيانات الاتصال حسب PostgreSQL المحلي:

```bash
cp apps/api/.env.example apps/api/.env
```

القيمة الافتراضية المقترحة:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asset_management_system?schema=public"
```

بعد تعديل الاتصال وإنشاء قاعدة البيانات، شغل:

```bash
npm run prisma:generate --workspace apps/api
npm run prisma:migrate --workspace apps/api
```

## ملاحظة

تم اعتماد المعمارية المقترحة في `docs/12-technical-architecture.md`.
