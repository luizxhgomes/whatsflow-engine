-- Story 1.1: Tag System - Tags para classificacao de leads/contatos (CRM)
-- Separado de inbox_labels (etiquetas de conversa) — tags sao permanentes no contato

-- Tabela principal de tags
CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6B7280'::text NOT NULL,
    category text DEFAULT 'custom'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name),
    CONSTRAINT tags_category_check CHECK (category IN ('lead_status', 'segment', 'custom')),
    CONSTRAINT tags_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Tabela junction: contato <-> tag (many-to-many)
CREATE TABLE public.contact_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id text NOT NULL,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (contact_id, tag_id)
);

-- Indices para performance de filtros
CREATE INDEX idx_contact_tags_tag ON public.contact_tags(tag_id);
CREATE INDEX idx_contact_tags_contact ON public.contact_tags(contact_id);
CREATE INDEX idx_tags_category ON public.tags(category);

-- RPC: Contar contatos por tag (eficiente para listagem)
CREATE OR REPLACE FUNCTION public.get_tag_counts()
RETURNS TABLE(tag_id uuid, contact_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT tag_id, COUNT(*) as contact_count
  FROM public.contact_tags
  GROUP BY tag_id;
$$;
