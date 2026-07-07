# SQL Migrations

كل تغييرات قاعدة البيانات تتحط هنا كملفات SQL مرقّمة بالإصدار.

## القاعدة | Convention
- اسم الملف: `NNNN_description.sql` (مثال: `0001_settings.sql`).
- الترقيم تصاعدي ومتسلسل — شغّلها بالترتيب.
- كل ملف **idempotent** قدر الإمكان (آمن لإعادة التشغيل): استخدم
  `IF NOT EXISTS` / `add column if not exists` / `drop policy if exists` + `create policy`.

## كيفية التشغيل | How to run
1. افتح **Supabase Dashboard → SQL Editor → New query**.
2. انسخ محتوى الملف المطلوب.
3. اضغط **Run** ▶️.

> القاعدة الحالية متطابقة حتى الإصدار **0004**.

---

## 🧭 بروتوكول إنشاء SQL جديد | New SQL Protocol

اتبع الخطوات دي **كل مرة** عايز تعدّل قاعدة البيانات:

1. **رقم جديد:** خد الرقم اللي بعد آخر ملف موجود (مثال: لو آخر واحد `0003` يبقى الجديد `0004`).
2. **اسم واضح:** `NNNN_short_description.sql` (إنجليزي، lower_snake_case).
3. **هيدر ثابت:** ابدأ الملف بكومنت يوضّح:
   ```sql
   -- =====================================================================
   --  Version: 0004
   --  Title:   <عنوان مختصر>
   --  Step:    <الخطوة/الميزة>
   --  Run this in: Supabase Dashboard → SQL Editor → New query → Run
   --  Note: idempotent (safe to re-run).
   -- =====================================================================
   ```
4. **idempotent دايماً:** أي `create table` → `if not exists`، أي `policy` →
   `drop policy if exists ... ; create policy ...`، أي عمود → `add column if not exists`.
   لو بتعدّل بيانات قديمة استخدم `do $$ ... $$` مع فحص وجود العمود.
5. **حدّث جدول الإصدارات** اللي تحت في نفس الملف ده.
6. **حدّث الملف المجمّع** `schema_full.sql` بحيث يفضل قادر يبني القاعدة من الصفر
   لأحدث نسخة (انسخ نفس محتوى الترحيل الجديد في آخره — راجع القاعدة تحت).
7. **Pull Request:** كل نسخة جديدة = **PR جديد** على فرع `dev` ثم Merge لـ `main`،
   ومعاها ملف SQL جديد. **مفيش push مباشر على main**.

### قاعدة الملف المجمّع | schema_full.sql rule
- `schema_full.sql` = **كل الإصدارات من 0001 لأحدث نسخة** متجمّعة في ملف واحد.
- لو شغّلته على قاعدة فاضية يبنيها كاملة لأحدث نسخة.
- لمّا تضيف `NNNN`، ضيف نفس محتواه (أو نتيجته النهائية) في مكانه الصحيح داخل
  `schema_full.sql` وحدّث رقم "Up to version" في هيدره.
- لو عملت تعديل لاحق بيلغي عمود قديم، اعكسه في `schema_full.sql` على شكل **الحالة
  النهائية** (يعني مش لازم تكتب العمود القديم ثم تحذفه — اكتب الشكل النهائي مباشرة).

---

## الإصدارات | Versions
| Version | File | Description |
|---------|------|-------------|
| 0001 | `0001_settings.sql` | جدول `app_settings` + RLS + Realtime + Storage bucket `app-images` + سياساته |
| 0002 | `0002_members_classes.sql` | عمود `code_word` + جدول `classes` + جدول `members` (عمود `name` واحد + `birth_date` واحد + `phone` بصيغة `+2…`) + RLS + Realtime + triggers |
| 0003 | `0003_members_single_fields.sql` | ترحيل توافقي: يحوّل `members` من الأعمدة المقسّمة القديمة (لو موجودة) إلى `name` + `birth_date`، ويطبّع `phone` لصيغة `+2…`. (لا تأثير لو 0002 الحالي متطبّق بالفعل) |
| 0004 | `0004_attendance_points.sql` | الحضور والنقاط: عمود `members.attendance_count` + `app_settings.daily_points_max` + جدولا `attendance_log` و `balance_log` + دوال RPC ذرّية (`mark_attendance` / `unmark_attendance` / `adjust_balance` مع حد أقصى يومي للنقاط) |
| 0011 | `0011_store_inventory.sql` | المتجر: جداول `store_items` (أصناف بكود QR وسعر نقاط ومخزون) + `store_invoices` / `store_invoice_items` (فواتير برقم متسلسل) + RPC ذرّي `store_checkout` (مخزون + رصيد + فاتورة + balance_log) + RPC بوابة `member_portal_invoices` |

> **الملف المجمّع:** [`schema_full.sql`](./schema_full.sql) — يبني القاعدة من الصفر لأحدث نسخة (Up to 0004).
