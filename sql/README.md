# SQL Migrations

كل تغييرات قاعدة البيانات تتحط هنا كملفات SQL مرقّمة بالإصدار.

## القاعدة | Convention
- اسم الملف: `NNNN_description.sql` (مثال: `0001_settings.sql`).
- الترقيم تصاعدي ومتسلسل — شغّلها بالترتيب.
- كل ملف **idempotent** قدر الإمكان (آمن لإعادة التشغيل).

## كيفية التشغيل | How to run
1. افتح **Supabase Dashboard → SQL Editor → New query**.
2. انسخ محتوى الملف المطلوب.
3. اضغط **Run** ▶️.

## الإصدارات | Versions
| Version | File | Description |
|---------|------|-------------|
| 0001 | `0001_settings.sql` | جدول `app_settings` + RLS + Realtime + Storage bucket `app-images` + سياساته |
