-- =============================================================================
-- Eltawkol Fire — seed data.
-- Run AFTER supabase/schema.sql, in the same Supabase SQL editor.
--
-- Everything below is clearly-labelled SAMPLE data. The owner replaces it with
-- the real ~68 products (README -> "Import your real products").
-- Specs are only included where the sample data is genuinely known; unknown
-- values stay NULL / empty so the public page hides the block instead of
-- inventing content.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Categories (9)
-- -----------------------------------------------------------------------------
insert into public.categories (id, name_ar, name_en, sort) values
  ('control-panels',    'لوحات التحكم',            'Control panels',        1),
  ('detectors',         'كواشف الحريق',            'Detectors',             2),
  ('manual-call-points','نقاط النداء اليدوية',     'Manual call points',    3),
  ('sirens-bells',      'الأجراس والصفارات',       'Sirens and bells',      4),
  ('detector-bases',    'قواعد الكواشف',           'Detector bases',        5),
  ('accessories',       'ملحقات',                  'Accessories',           6),
  ('cables',            'أسلاك وكابلات',           'Cables',                7),
  ('batteries',         'بطاريات',                 'Batteries',             8),
  ('extinguishers',     'مطافئ',                   'Fire extinguishers',    9)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Brands (8)
-- -----------------------------------------------------------------------------
insert into public.brands (id, name_ar, name_en) values
  ('hst',             'إتش إس تي',        'HST'),
  ('conwey',          'كونوي',            'Conwey'),
  ('snoar',           'سنوار',            'Snoar'),
  ('apollo',          'أبولو',            'Apollo'),
  ('ats',             'إيه تي إس',        'ATS'),
  ('tanda',           'تاندا',            'Tanda'),
  ('hlt',             'إتش إل تي',        'HLT'),
  ('generic-chinese', 'صيني عام',         'Generic Chinese')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- SAMPLE products (6)
-- -----------------------------------------------------------------------------
insert into public.products (
  id, name_ar, name_en, category_id, brand_id, image_path,
  description_ar, description_en, features_ar, features_en, specs
) values
(
  1001,
  'لوحة تحكم إنذار حريق',
  'Fire Alarm Control Panel',
  'control-panels',
  'hst',
  null,
  'لوحة تحكم تقليدية لإدارة إشارات الإنذار ومراقبة دوائر النظام بوضوح. صف عينة — يُستبدل ببيانات المنتج الحقيقية.',
  'Conventional panel for managing alarm outputs and monitoring system zones clearly. Sample row — replace with real product data.',
  array['واجهة تشغيل واضحة','مؤشرات مستقلة للمناطق','هيكل معدني متين'],
  array['Clear control interface','Independent zone indicators','Robust metal enclosure'],
  '[
    {"label":{"ar":"عدد المناطق","en":"Zones"},"value":{"ar":"2","en":"2"}},
    {"label":{"ar":"جهزة التغذية","en":"Supply voltage"},"value":{"ar":"220 فولت","en":"220 V"}}
  ]'::jsonb
),
(
  2040,
  'كاشف دخان ضوئي',
  'Optical Smoke Detector',
  'detectors',
  'apollo',
  null,
  'كاشف دخان بتصميم منخفض الارتفاع للاستخدام ضمن منظومات الإنذار التقليدية. بيانات عينة.',
  'Low-profile optical smoke detector for conventional alarm systems. Sample row.',
  array['تصميم واضح وسهل الفحص','قاعدة قابلة للفصل'],
  array['Easy to inspect','Separable base'],
  '[
    {"label":{"ar":"نوع الكاشف","en":"Detector type"},"value":{"ar":"ضوئي","en":"Optical"}},
    {"label":{"ar":"جهزة التغذية","en":"Supply voltage"},"value":{"ar":"9-28 فولت","en":"9-28 V"}}
  ]'::jsonb
),
(
  3112,
  'نقطة نداء يدوية',
  'Manual Call Point',
  'manual-call-points',
  'tanda',
  null,
  'وحدة نداء يدوية حمراء بارزة للاستخدام عند اكتشاف خطر الحريق. بيانات عينة.',
  'High-visibility red manual call point for raising an alarm. Sample row.',
  array['لون إشارة واضح','تركيب سطحي'],
  array['High-visibility colour','Surface mounting'],
  '[
    {"label":{"ar":"نوع التفعيل","en":"Activation"},"value":{"ar":"زجاج كسر","en":"Glass element"}}
  ]'::jsonb
),
(
  4208,
  'جرس إنذار حريق',
  'Fire Alarm Bell',
  'sirens-bells',
  'conwey',
  null,
  'جرس إنذار معدني لإصدار تنبيه صوتي واضح ضمن شبكة الحماية. بيانات عينة.',
  'Metal fire alarm bell for a clear audible warning. Sample row.',
  array['صوت تنبيه مباشر','قاعدة تثبيت معدنية'],
  array['Direct alert sound','Metal mounting base'],
  '[
    {"label":{"ar":"مستوى الصوت","en":"Sound level"},"value":{"ar":null,"en":null}}
  ]'::jsonb
),
(
  5301,
  'قاعدة كاشف قابلة للفصل',
  'Separable Detector Base',
  'detector-bases',
  'hst',
  null,
  'قاعدة تركيب تسمح بفصل الكاشف عن السلكارب أثناء الصيانة. بيانات عينة.',
  'Mounting base that lets the detector be separated from the wiring during maintenance. Sample row.',
  array['فصل أثناء الصيانة'],
  array['Detachable during maintenance'],
  '[]'::jsonb
),
(
  9010,
  'مطافي حريق مسحوق جاف 4 كجم',
  'Dry Powder Fire Extinguisher 4 kg',
  'extinguishers',
  'generic-chinese',
  null,
  'مطاف مسحوق جاف متعدد الاستخدامات لحرائق الفئة A/B/C. بيانات عينة.',
  'Multi-purpose dry powder extinguisher for Class A/B/C fires. Sample row.',
  array['متعدد الاستخدامات','سهل التشغيل'],
  array['Multi-purpose','Easy to operate'],
  '[]'::jsonb
)
on conflict (id) do nothing;

-- Guard against accidental double-runs leaving stale sample text in place:
-- nothing to do — `on conflict do nothing` keeps whatever is already there.
