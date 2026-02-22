// app/utils/db.server.ts

export interface Admin {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  display_name: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  admin_id: number;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  hero_image_key: string | null;
  status: 'published' | 'draft' | 'archived';
  author_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleTag {
  article_id: number;
  tag: string;
}

export interface ArticleVersion {
  id: number;
  article_id: number;
  title: string | null;
  content: string | null;
  edited_by: number | null;
  edited_at: string;
}

export interface AuditLog {
  id: number;
  actor_id: number | null;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  payload: string | null;
  created_at: string;
}
