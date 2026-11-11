-- Promotion detail screen (Figma "Home Screen Loader" 4203:2255): a promotion with a
-- `body` opens a full-screen page with a large photo, headline, text and a call to action.
-- Promotions without a body stay plain tiles.

alter table public.promotions
  add column headline text check (char_length(headline) <= 80),
  add column body text check (char_length(body) <= 500),
  -- Large photo for the detail page, path in the `media` bucket (falls back to image_path).
  add column hero_image_path text,
  -- Button label; the button opens the Book tab.
  add column cta_label text check (char_length(cta_label) <= 40);

update public.promotions
set headline = 'First time on Doctor Dent?',
    body = 'An automatic 30% discount gets applied when you sign up for your first appointment with one of our dentists',
    hero_image_path = 'promo-first-session-hero.jpg',
    cta_label = 'Book a Session'
where image_path = 'promo-first-session.jpg';
