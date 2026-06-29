# خدمة الكنيسة — Church Service Management PWA

تطبيق ويب تقدمي (PWA) لإدارة خدمات الكنيسة، مبني بمنهجية خطوة بخطوة وقابل للترقية بالكامل.

## نظرة عامة | Project Overview
- **الاسم**: خدمة الكنيسة (Church Service PWA)
- **الهدف**: إدارة المخدومين، الحضور، الإحصائيات، والصلاحيات (RBAC) — بتصميم عربي (مصر) متجاوب، أولوية للموبايل.
- **التقنيات**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · PWA
- **اللغة والاتجاه**: العربية (RTL) — خط Cairo

## ✅ المنجز حتى الآن (الخطوة 1: التصميم العام)
- هيكل مشروع Next.js كامل مع TypeScript و Tailwind و PWA manifest + أيقونات.
- نظام تصميم "Aurora" المجرّد الأنيق المتدرّج، عبر متغيرات CSS قابلة للتغيير وقت التشغيل.
- **الهيدر**: أيقونة + اسم الخدمة + الشعار · زر القائمة الجانبية · زر اختيار التاريخ.
- **القائمة الجانبية** (off-canvas drawer) + شريط تنقّل سفلي للصفحات الخمس.
- الصفحات الخمس: الرئيسية · البيانات · الماسح · الاحصائيات · الإعدادات.
- صفحة تسجيل الدخول (تسجيل دخول / حساب جديد).
- **الإعدادات تتحكّم في كل شيء**: اسم الخدمة، الشعار، الأيقونة، نظام الألوان (4 أنظمة)، الوضع الليلي — وتُحفظ محلياً (ولاحقاً في Supabase).

## مسارات التطبيق | Functional Entry URIs
| المسار | الصفحة |
|--------|--------|
| `/` | الرئيسية (Home / لوحة عامة) |
| `/data` | البيانات (إدارة المخدومين) |
| `/scanner` | الماسح (مسح QR للحضور) |
| `/stats` | الاحصائيات (تقارير ورسوم) |
| `/settings` | الإعدادات (تخصيص كامل) |
| `/login` | تسجيل الدخول / حساب جديد |

## معمارية البيانات | Data Architecture
- **مصدر الإعدادات الآن**: `localStorage` عبر `SettingsProvider` (سيُستبدل بـ Supabase).
- **التخزين المخطط له**: Supabase (Auth + Postgres + Storage).
- **RBAC**: كل عنصر تنقّل/تفصيلة له مفتاح صلاحية (`permission`) معرّف في `src/config/navigation.ts` — سيُفعّل بالكامل لاحقاً مع الملفات الشخصية (Profiles).

## ✅ الخطوة 2: المصادقة (Supabase Auth) — مكتملة
- تسجيل دخول / إنشاء حساب فعلي عبر Supabase (بدون تأكيد بريد).
- حماية المسارات عبر middleware: غير المسجّل يُحوَّل إلى `/login` تلقائياً.
- رسائل خطأ بالعربية + حالات تحميل.
- عرض المستخدم الحالي (الاسم + البريد) في القائمة الجانبية + زر خروج فعّال.

## ما لم يُنفّذ بعد | Not Yet Implemented
- نظام RBAC الكامل + إدارة الملفات الشخصية (Profiles).
- وظائف صفحات البيانات/الماسح/الإحصائيات الفعلية.
- Service Worker للعمل دون اتصال (offline).

## الخطوات القادمة الموصى بها | Recommended Next Steps
1. إعداد مشروع Supabase وربط الـ Auth بصفحة تسجيل الدخول.
2. تصميم مخطط قاعدة البيانات (المستخدمون، الأدوار، الصلاحيات، المخدومون، الحضور).
3. بناء نظام RBAC وإدارة الملفات الشخصية.
4. تفعيل الماسح والكاميرا، ثم البيانات والإحصائيات.

## التشغيل محلياً | Local Development
```bash
npm install
npm run dev   # http://localhost:3000
```

## النشر | Deployment
- **المنصة المستهدفة**: Vercel (للواجهة) + Supabase (قاعدة البيانات والتخزين).
- **GitHub**: https://github.com/stmaryluxorprim-hash/Sunday-School-Service
- **الحالة**: ⏳ قيد التطوير — الخطوة 1 (التصميم العام) مكتملة.

### متغيرات البيئة على Vercel | Vercel Environment Variables
أضف هذين المتغيّرين في Vercel → Project → **Settings → Environment Variables**:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase | Production · Preview · Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon العام | Production · Preview · Development |

> هذه القيم **لا تُحفظ في GitHub** — فقط في Vercel. ملف `.env*` مُستثنى عبر `.gitignore`.
> للتطوير المحلي: انسخ `.env.example` إلى `.env.local` واملأ نفس المفاتيح.

### الخطوات | Steps
1. ادفع الكود إلى GitHub (تم).
2. في Vercel: **New Project → Import** المستودع `Sunday-School-Service`.
3. أضف متغيّري البيئة أعلاه.
4. **Deploy** — سيكتشف Vercel إطار Next.js تلقائياً.

---
آخر تحديث: الخطوة 1 — التصميم العام
