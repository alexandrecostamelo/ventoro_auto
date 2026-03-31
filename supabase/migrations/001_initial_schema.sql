-- Habilitar extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- TABELA: profiles
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  email text not null,
  nome text not null,
  telefone text,
  cpf text,
  cidade text,
  estado text,
  tipo text not null default 'comprador' check (tipo in ('comprador', 'particular', 'garagem', 'admin')),
  avatar_url text,
  garagem_id uuid
);

alter table public.profiles enable row level security;

create policy "Usuário vê seu próprio perfil"
  on profiles for select using (auth.uid() = id);

create policy "Usuário atualiza seu próprio perfil"
  on profiles for update using (auth.uid() = id);

-- ============================================================
-- TABELA: garagens
-- ============================================================
create table public.garagens (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  slug text unique not null,
  nome text not null,
  razao_social text,
  cnpj text,
  descricao text,
  logo_url text,
  capa_url text,
  cidade text not null,
  estado text not null,
  telefone text,
  whatsapp text,
  email text,
  especialidade text,
  plano text not null default 'starter' check (plano in ('starter', 'pro', 'premium')),
  ativa boolean default true,
  verificada boolean default false,
  cnpj_verificado boolean default false,
  score_confianca integer default 50 check (score_confianca between 0 and 100),
  total_vendas integer default 0,
  avaliacao numeric(3,2) default 0,
  tempo_resposta_minutos integer default 60
);

alter table public.garagens enable row level security;

create policy "Garagens são públicas para leitura"
  on garagens for select using (ativa = true);

create policy "Membro da garagem pode atualizar"
  on garagens for update using (
    auth.uid() in (
      select id from profiles where garagem_id = garagens.id
    )
  );

-- ============================================================
-- TABELA: veiculos
-- ============================================================
create table public.veiculos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  slug text unique not null,
  marca text not null,
  modelo text not null,
  versao text,
  ano integer not null check (ano between 1950 and 2030),
  quilometragem integer not null check (quilometragem >= 0),
  preco numeric(12,2) not null check (preco > 0),
  combustivel text not null check (combustivel in ('flex', 'gasolina', 'etanol', 'diesel', 'eletrico', 'hibrido')),
  cambio text not null check (cambio in ('manual', 'automatico', 'cvt')),
  cor text,
  potencia text,
  torque text,
  consumo_cidade text,
  consumo_estrada text,
  cidade text not null,
  estado text not null,
  descricao text,
  opcionais text[] default '{}',
  condicao text not null default 'bom' check (condicao in ('excelente', 'otimo', 'bom', 'regular')),
  ipva_pago boolean default false,
  revisoes_em_dia boolean default false,
  sem_sinistro boolean default false,
  num_chaves integer default 1,
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'pausado', 'vendido', 'expirado')),
  tipo_anunciante text not null check (tipo_anunciante in ('particular', 'garagem')),
  anunciante_id uuid references public.profiles(id) on delete cascade not null,
  garagem_id uuid references public.garagens(id) on delete set null,
  plano text not null default 'basico' check (plano in ('basico', 'premium', 'turbo')),
  validade_ate timestamptz,
  score_confianca integer default 50 check (score_confianca between 0 and 100),
  preco_status text default 'na_media' check (preco_status in ('abaixo', 'na_media', 'acima')),
  preco_sugerido_min numeric(12,2),
  preco_sugerido_max numeric(12,2),
  selo_studio_ia boolean default false,
  selo_video_ia boolean default false,
  selo_inspecao boolean default false,
  destaque boolean default false,
  visualizacoes integer default 0,
  favoritos_count integer default 0,
  leads_count integer default 0
);

alter table public.veiculos enable row level security;

create policy "Veículos publicados são públicos"
  on veiculos for select using (status = 'publicado');

create policy "Anunciante vê todos seus veículos"
  on veiculos for select using (auth.uid() = anunciante_id);

create policy "Anunciante cria veículos"
  on veiculos for insert with check (auth.uid() = anunciante_id);

create policy "Anunciante atualiza seus veículos"
  on veiculos for update using (auth.uid() = anunciante_id);

create policy "Anunciante deleta seus veículos"
  on veiculos for delete using (auth.uid() = anunciante_id);

-- Índices para busca
create index veiculos_marca_idx on veiculos(marca);
create index veiculos_modelo_idx on veiculos(modelo);
create index veiculos_preco_idx on veiculos(preco);
create index veiculos_ano_idx on veiculos(ano);
create index veiculos_cidade_idx on veiculos(cidade);
create index veiculos_status_idx on veiculos(status);
create index veiculos_slug_idx on veiculos(slug);
create index veiculos_search_idx on veiculos using gin(to_tsvector('portuguese', marca || ' ' || modelo || ' ' || coalesce(versao, '')));

-- ============================================================
-- TABELA: fotos_veiculo
-- ============================================================
create table public.fotos_veiculo (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  veiculo_id uuid references public.veiculos(id) on delete cascade not null,
  url_original text not null,
  url_processada text,
  cenario_ia text,
  ordem integer default 0,
  is_capa boolean default false,
  processada_por_ia boolean default false
);

alter table public.fotos_veiculo enable row level security;

create policy "Fotos são públicas para leitura"
  on fotos_veiculo for select using (true);

create policy "Anunciante gerencia fotos de seus veículos"
  on fotos_veiculo for all using (
    auth.uid() in (
      select anunciante_id from veiculos where id = fotos_veiculo.veiculo_id
    )
  );

-- ============================================================
-- TABELA: conteudo_ia
-- ============================================================
create table public.conteudo_ia (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  veiculo_id uuid references public.veiculos(id) on delete cascade unique not null,
  titulo text,
  descricao text,
  highlights text[] default '{}',
  faq jsonb default '[]',
  nota_qualidade integer check (nota_qualidade between 0 and 100),
  sugestoes text[] default '{}',
  headline_landing text,
  copy_landing text
);

alter table public.conteudo_ia enable row level security;

create policy "Conteúdo IA é público para leitura"
  on conteudo_ia for select using (true);

create policy "Anunciante gerencia conteúdo IA de seus veículos"
  on conteudo_ia for all using (
    auth.uid() in (
      select anunciante_id from veiculos where id = conteudo_ia.veiculo_id
    )
  );

-- ============================================================
-- TABELA: leads
-- ============================================================
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  veiculo_id uuid references public.veiculos(id) on delete cascade not null,
  anunciante_id uuid references public.profiles(id) not null,
  comprador_id uuid references public.profiles(id),
  nome text not null,
  telefone text not null,
  email text,
  mensagem text,
  origem text not null check (origem in ('whatsapp', 'formulario', 'agendamento', 'proposta')),
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'proposta', 'visita', 'negociacao', 'vendido', 'perdido')),
  vendedor_id uuid references public.profiles(id),
  garagem_id uuid references public.garagens(id),
  valor_proposta numeric(12,2),
  notas text
);

alter table public.leads enable row level security;

create policy "Anunciante vê seus leads"
  on leads for select using (auth.uid() = anunciante_id);

create policy "Qualquer um pode criar lead"
  on leads for insert with check (true);

create policy "Anunciante atualiza status do lead"
  on leads for update using (auth.uid() = anunciante_id);

-- ============================================================
-- TABELA: favoritos
-- ============================================================
create table public.favoritos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  veiculo_id uuid references public.veiculos(id) on delete cascade not null,
  lista_nome text default 'Sem categoria',
  unique(user_id, veiculo_id)
);

alter table public.favoritos enable row level security;

create policy "Usuário gerencia seus favoritos"
  on favoritos for all using (auth.uid() = user_id);

-- ============================================================
-- TABELA: buscas_salvas
-- ============================================================
create table public.buscas_salvas (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null,
  filtros jsonb not null default '{}',
  ativa boolean default true,
  frequencia text default 'diaria' check (frequencia in ('tempo_real', 'diaria', 'semanal')),
  ultimo_disparo timestamptz,
  total_matches integer default 0
);

alter table public.buscas_salvas enable row level security;

create policy "Usuário gerencia suas buscas salvas"
  on buscas_salvas for all using (auth.uid() = user_id);

-- ============================================================
-- TABELA: historico_preco
-- ============================================================
create table public.historico_preco (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  veiculo_id uuid references public.veiculos(id) on delete cascade not null,
  preco numeric(12,2) not null
);

alter table public.historico_preco enable row level security;

create policy "Histórico de preço é público"
  on historico_preco for select using (true);

-- ============================================================
-- TABELA: assinaturas
-- ============================================================
create table public.assinaturas (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  garagem_id uuid references public.garagens(id) on delete cascade unique not null,
  plano text not null check (plano in ('starter', 'pro', 'premium')),
  status text not null default 'trial' check (status in ('ativa', 'cancelada', 'inadimplente', 'trial')),
  stripe_subscription_id text,
  trial_ate timestamptz default (now() + interval '14 days'),
  proxima_cobranca timestamptz,
  valor_mensal numeric(10,2) not null
);

alter table public.assinaturas enable row level security;

create policy "Garagem vê sua assinatura"
  on assinaturas for select using (
    auth.uid() in (
      select id from profiles where garagem_id = assinaturas.garagem_id
    )
  );

-- ============================================================
-- TABELA: pagamentos
-- ============================================================
create table public.pagamentos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now() not null,
  anunciante_id uuid references public.profiles(id) not null,
  veiculo_id uuid references public.veiculos(id) on delete set null,
  tipo text not null check (tipo in ('anuncio', 'upgrade', 'assinatura')),
  plano text not null,
  valor numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'falhou', 'estornado')),
  metodo text check (metodo in ('pix', 'cartao', 'boleto')),
  stripe_payment_id text,
  pago_em timestamptz
);

alter table public.pagamentos enable row level security;

create policy "Usuário vê seus pagamentos"
  on pagamentos for select using (auth.uid() = anunciante_id);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger garagens_updated_at before update on garagens for each row execute function update_updated_at();
create trigger veiculos_updated_at before update on veiculos for each row execute function update_updated_at();
create trigger leads_updated_at before update on leads for each row execute function update_updated_at();
create trigger buscas_salvas_updated_at before update on buscas_salvas for each row execute function update_updated_at();
create trigger assinaturas_updated_at before update on assinaturas for each row execute function update_updated_at();

-- ============================================================
-- TRIGGER — criar profile após signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nome, tipo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'tipo', 'comprador')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- TRIGGER — registrar histórico de preço ao publicar
-- ============================================================
create or replace function registrar_historico_preco()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' and new.status = 'publicado') or
     (TG_OP = 'UPDATE' and new.preco <> old.preco) then
    insert into historico_preco (veiculo_id, preco) values (new.id, new.preco);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger veiculo_historico_preco
  after insert or update on veiculos
  for each row execute function registrar_historico_preco();

-- ============================================================
-- TRIGGER — atualizar contador de leads no veículo
-- ============================================================
create or replace function atualizar_contador_leads()
returns trigger as $$
begin
  update veiculos
  set leads_count = (select count(*) from leads where veiculo_id = new.veiculo_id)
  where id = new.veiculo_id;
  return new;
end;
$$ language plpgsql;

create trigger lead_criado
  after insert on leads
  for each row execute function atualizar_contador_leads();

-- ============================================================
-- TRIGGER — atualizar contador de favoritos no veículo
-- ============================================================
create or replace function atualizar_contador_favoritos()
returns trigger as $$
declare
  vid uuid;
begin
  vid := coalesce(new.veiculo_id, old.veiculo_id);
  update veiculos
  set favoritos_count = (select count(*) from favoritos where veiculo_id = vid)
  where id = vid;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger favorito_alterado
  after insert or delete on favoritos
  for each row execute function atualizar_contador_favoritos();

-- ============================================================
-- FUNÇÃO — incrementar visualizações (chamada via rpc)
-- ============================================================
create or replace function incrementar_visualizacoes(veiculo_id uuid)
returns void
language sql
security definer
as $$
  update veiculos set visualizacoes = visualizacoes + 1 where id = veiculo_id;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('fotos-veiculos', 'fotos-veiculos', true);
insert into storage.buckets (id, name, public) values ('logos-garagens', 'logos-garagens', true);
insert into storage.buckets (id, name, public) values ('capas-garagens', 'capas-garagens', true);
insert into storage.buckets (id, name, public) values ('avatares', 'avatares', true);

create policy "Fotos de veículos são públicas"
  on storage.objects for select using (bucket_id = 'fotos-veiculos');

create policy "Usuário autenticado faz upload de fotos"
  on storage.objects for insert with check (
    bucket_id = 'fotos-veiculos' and auth.role() = 'authenticated'
  );

create policy "Usuário deleta suas próprias fotos"
  on storage.objects for delete using (
    bucket_id = 'fotos-veiculos' and auth.uid()::text = (storage.foldername(name))[1]
  );
