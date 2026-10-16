-- Development only. The owner is attached by pnpm seed after creating a Supabase Auth user.
insert into public.creators(id,name,slug,description,hero_url,rights_confirmed_at,status,currency) values
 ('11111111-1111-4111-8111-111111111111','High Elf Club Demo','high-elf-club','Turn a photo you love into a unique illustrated poster.','/demo/garden.svg',now(),'live','sek') on conflict(slug) do nothing;
insert into public.products(id,creator_id,name,slug,width_mm,height_mm,aspect_ratio,currency,price_amount,sort_order) values
 ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','A3 Poster','a3-poster',297,420,'portrait','sek',39900,0),
 ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','A2 Poster','a2-poster',420,594,'portrait','sek',59900,1)
 on conflict(creator_id,slug) do nothing;
insert into public.creator_examples(id,creator_id,image_url,source_url,caption,sort_order) values
 ('99999999-9999-4999-8999-999999999991','11111111-1111-4111-8111-111111111111','/demo/garden.svg','/demo/garden.svg','A place to call home',0),
 ('99999999-9999-4999-8999-999999999992','11111111-1111-4111-8111-111111111111','/demo/cat.svg','/demo/cat.svg','A familiar little face',1),
 ('99999999-9999-4999-8999-999999999993','11111111-1111-4111-8111-111111111111','/demo/flowers.svg','/demo/flowers.svg','Something worth keeping',2)
 on conflict(id) do nothing;
