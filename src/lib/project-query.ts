import { queryOptions } from "@tanstack/react-query";
import { getProjectData, getAllProjectsData } from "@/lib/data.functions";

export type ProjectSettings = {
  id: string;
  title: string;
  subtitle: string | null;
  start_date: string;
  end_date: string;
  total_progress: number;
  budget_baht: number | null;
  updated_at: string;
  hero_image_path?: string | null;
  hero_url?: string | null;
  org_name?: string | null;
  org_tagline?: string | null;
  intro_text?: string | null;
  prep_heading?: string | null;
  prep_subtitle?: string | null;
  cons_heading?: string | null;
  cons_subtitle?: string | null;
  calendar_start_month?: string | null;
  unit_id?: string | null;
  unit_name?: string | null;
  unit_type?: string | null;
  district?: string | null;
  province?: string | null;
  is_active?: boolean;
  lat?: number | null;
  lng?: number | null;
};

export type ResourceLink = {
  id: string;
  label: string;
  description: string | null;
  url: string;
  icon: string;
  order: number;
  project_id?: string | null;
};

export const projectQuery = (projectId: string) => queryOptions({
  queryKey: ["project-data", projectId],
  queryFn: () => getProjectData({ data: { projectId } }),
  staleTime: 60_000,
});

export const allProjectsQuery = queryOptions({
  queryKey: ["all-projects"],
  queryFn: () => getAllProjectsData(),
  staleTime: 60_000,
});
