DO $$
DECLARE v UUID := '99999999-0000-0000-0000-000000000001';
BEGIN
SET LOCAL session_replication_role = 'replica';
UPDATE public.profiles SET
  full_name='Lucas Andrade', phone='+5511987654321',
  bio='Fotógrafo e videomaker em São Paulo. Eventos corporativos, casamentos e conteúdo para marcas. 8 anos de experiência.',
  avatar_url='https://i.pravatar.cc/300?img=33',
  cpf_cnpj='52998224725', cpf_cnpj_type='cpf', cpf_cnpj_locked=true,
  birth_date='1992-05-14', birth_date_verified=true,
  instagram='lucasandrade.foto', youtube='https://youtube.com/@lucasandrade', website='https://lucasandrade.com.br',
  is_online=true, is_approved=true, approval_status='approved',
  terms_accepted=true, terms_accepted_at=NOW(), identity_doc_type='rg'
WHERE id=v;
INSERT INTO public.addresses (profile_id,cep,street,number,complement,neighborhood,city,state)
SELECT v,'01310100','Avenida Paulista','1578','Apto 52','Bela Vista','São Paulo','SP'
WHERE NOT EXISTS (SELECT 1 FROM public.addresses WHERE profile_id=v);
INSERT INTO public.professional_pricing (profile_id,hourly_rate,daily_rate,currency)
SELECT v,180,950,'BRL' WHERE NOT EXISTS (SELECT 1 FROM public.professional_pricing WHERE profile_id=v);
INSERT INTO public.bank_accounts (profile_id,payment_type,pix_key_type,pix_key,account_holder_name,account_holder_cpf_cnpj)
SELECT v,'pix','email','demo@freelaki.com','Lucas Andrade','52998224725'
WHERE NOT EXISTS (SELECT 1 FROM public.bank_accounts WHERE profile_id=v);
IF NOT EXISTS (SELECT 1 FROM public.professional_extras WHERE profile_id=v) THEN
  INSERT INTO public.professional_extras (profile_id,name,description,price,unit,is_active,order_index) VALUES
  (v,'Edição de vídeo','Edição completa com trilha e color grading',450,'projeto',true,0),
  (v,'Drone','Imagens aéreas em 4K',350,'diária',true,1),
  (v,'Entrega expressa','Fotos tratadas em 24h',200,'projeto',true,2);
END IF;
IF NOT EXISTS (SELECT 1 FROM public.professional_equipments WHERE profile_id=v) THEN
  INSERT INTO public.professional_equipments (profile_id,name,category,order_index) VALUES
  (v,'Sony A7 IV','Câmera',0),(v,'DJI Mini 4 Pro','Drone',1),(v,'Sony 24-70mm f/2.8 GM','Lente',2);
END IF;
INSERT INTO public.professional_categories (profile_id,category_id)
SELECT v,id FROM public.categories WHERE is_active IS NOT FALSE
AND id NOT IN (SELECT category_id FROM public.professional_categories WHERE profile_id=v) ORDER BY order_index LIMIT 2;
END $$;