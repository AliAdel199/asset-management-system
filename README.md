# Asset Management System

نظام حكومي لإدارة ومتابعة الموجودات.

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
