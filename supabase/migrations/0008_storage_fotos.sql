-- Armazenamento das fotos dos produtos.
--
-- O bucket é PÚBLICO para leitura de propósito: são fotos de catálogo, o
-- mesmo que ela já publica no Instagram. Deixar privado exigiria gerar URL
-- assinada a cada imagem da galeria, o que é trabalho e lentidão para
-- proteger algo que não é segredo.
--
-- Gravar, substituir e apagar, porém, continuam restritos a quem tem
-- sessão — e apenas à dona.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produtos',
  'produtos',
  true,
  5242880, -- 5 MB: foto de celular cabe, vídeo e PDF não entram por engano
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública das fotos.
drop policy if exists "fotos de produto são públicas" on storage.objects;
create policy "fotos de produto são públicas"
  on storage.objects for select
  using (bucket_id = 'produtos');

-- Só a dona envia, troca ou remove.
drop policy if exists "dona envia fotos" on storage.objects;
create policy "dona envia fotos"
  on storage.objects for insert
  with check (bucket_id = 'produtos' and e_dona());

drop policy if exists "dona atualiza fotos" on storage.objects;
create policy "dona atualiza fotos"
  on storage.objects for update
  using (bucket_id = 'produtos' and e_dona());

drop policy if exists "dona remove fotos" on storage.objects;
create policy "dona remove fotos"
  on storage.objects for delete
  using (bucket_id = 'produtos' and e_dona());
