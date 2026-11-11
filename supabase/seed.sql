-- Doctor Dent — reference data (specialists, reviews, promotions).
-- Runs on `supabase db reset` locally and with `npm run db:push` (db push --remote --include-seed) on hosted.
-- Images live in the public `media` bucket (supabase/media, uploaded by `npm run db:media`).

insert into public.specialists
  (id, full_name, specialty, photo_path, years_of_experience, price_from, clinic, skills, description, rating, review_count)
values
  ('a1f0c3e2-0000-4000-8000-000000000001', 'Kulbayeva Jazira Serikovna', 'Therapist', 'doctor-1.jpg', 20, 15000, 'Altay Dent, Saraishyq 4',
   array['Consultations', 'Tooth Removals', 'Great Reviews', 'Beautiful Gowns'],
   'Therapist with 20 years of practice. Focuses on painless treatment of caries and its complications, and on explaining every step of the treatment plan.', 4.7, 1094),
  ('a1f0c3e2-0000-4000-8000-000000000002', 'Amanbayev Shamil Serik', 'Therapist', 'doctor-2.jpg', 20, 10000, 'Altay Dent, Saraishyq 4',
   array['Fillings', 'Consultations'],
   'Restores teeth with modern composite materials and takes care to keep as much healthy tissue as possible.', 4.7, 211),
  ('a1f0c3e2-0000-4000-8000-000000000003', 'Anibayeva Bakytgul Berikovna', 'Therapist', 'doctor-3.jpg', 12, 12000, 'Altay Dent, Saraishyq 4',
   array['Fillings', 'Consultations'],
   'Treats caries and pulpitis, does professional consultations for first-time patients.', 4.6, 312),
  ('a1f0c3e2-0000-4000-8000-000000000004', 'Aibekova Gulmira Sultanovna', 'Periodontist', 'doctor-2.jpg', 10, 15000, 'Altay Dent, Saraishyq 4',
   array['Gum Treatment', 'Cleaning'],
   'Treats gum disease and performs professional hygiene.', 4.9, 23),
  ('a1f0c3e2-0000-4000-8000-000000000005', 'Ivanov Evgeniy Mikhailovich', 'Surgeon', 'doctor-4.jpg', 18, 20000, 'Altay Dent, Saraishyq 4',
   array['Tooth Removals', 'Implants'],
   'Oral surgeon: extractions of any complexity, including wisdom teeth.', 4.8, 540),
  ('a1f0c3e2-0000-4000-8000-000000000006', 'Nurlanova Aigerim Bolatovna', 'Surgeon', 'doctor-1.jpg', 9, 18000, 'Altay Dent, Saraishyq 4',
   array['Tooth Removals', 'Wisdom Teeth'],
   'Oral surgeon focused on atraumatic extractions.', 4.5, 98),
  ('a1f0c3e2-0000-4000-8000-000000000007', 'Sadykov Timur Erlanovich', 'Implantologist', 'doctor-4.jpg', 15, 35000, 'Altay Dent, Saraishyq 4',
   array['Implants', 'Bone Grafting'],
   'Places implants and performs bone grafting.', 4.8, 177),
  ('a1f0c3e2-0000-4000-8000-000000000008', 'Kim Elena Viktorovna', 'Orthodontist', 'doctor-3.jpg', 14, 25000, 'Altay Dent, Saraishyq 4',
   array['Braces', 'Aligners'],
   'Corrects bite with braces and clear aligners for teens and adults.', 4.9, 402),
  ('a1f0c3e2-0000-4000-8000-000000000009', 'Omarov Daniyar Askarovich', 'Orthopedist', 'doctor-4.jpg', 11, 22000, 'Altay Dent, Saraishyq 4',
   array['Crowns', 'Dentures'],
   'Restores missing and damaged teeth with crowns, bridges and dentures.', 4.6, 64),
  ('a1f0c3e2-0000-4000-8000-000000000010', 'Zhakupova Madina Serikovna', 'Pediatric dentist', 'doctor-2.jpg', 8, 12000, 'Altay Dent, Saraishyq 4',
   array['Kids Care', 'Sealants'],
   'Treats children from age 2 and makes the first visits calm and friendly.', 5.0, 286);

insert into public.reviews (specialist_id, author_name, rating, body, created_at)
select s.id, r.author_name, r.rating, r.body, r.created_at
from public.specialists s
cross join (
  values
    ('Irina V.', 5.0, 'I had an exceptional experience with the doctor. Her attention to detail and gentle approach made the whole visit comfortable.', now() - interval '12 days'),
    ('Alyona S.', 4.5, 'Very professional and explained every step of the treatment. I would come back again.', now() - interval '26 days')
) as r (author_name, rating, body, created_at);

insert into public.promotions (title, image_path, sort_order, headline, body, hero_image_path, cta_label)
values
  ('30% off First Session', 'promo-first-session.jpg', 1,
   'First time on Doctor Dent?',
   'An automatic 30% discount gets applied when you sign up for your first appointment with one of our dentists',
   'promo-first-session-hero.jpg', 'Book a Session'),
  ('Why use single tuft toothbrush?', 'promo-toothbrush.jpg', 2, null, null, null, null),
  ('Should you do a CT?', 'promo-ct.jpg', 3, null, null, null, null),
  ('What should be in your dental kit?', 'promo-hygiene.jpg', 4, null, null, null, null);
