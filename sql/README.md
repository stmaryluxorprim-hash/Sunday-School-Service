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
| 0002 | `0002_members_classes.sql` | عمود `code_word` + جدول `classes` + جدول `members` + RLS + Realtime + triggers (الإصدار الأصلي بأعمدة الاسم/التاريخ المقسّمة) |
| 0003 | `0003_members_single_fields.sql` | تحويل `members` إلى عمود `name` واحد + `birth_date` واحد، وتطبيع `phone` لصيغة `+2…` (يَنقل البيانات تلقائياً من الأعمدة القديمة) |
