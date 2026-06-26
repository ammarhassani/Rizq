"use server";

/**
 * Project Workspace (spec 004) — Tasks & milestones (tasks T016/T017).
 * Owner-scoped CRUD for a project's work breakdown. Money-free (milestones
 * carry no amount this release). Status validated via the pure rule.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidStatus } from "@/lib/projects/taskStatus";

const revalidate = () => revalidatePath("/[locale]/projects/[id]", "page");

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  milestone_id: string | null;
  sort_order: number;
};
export type MilestoneRow = { id: string; name: string; target_date: string | null; sort_order: number };

export type TasksBundle = { tasks: TaskRow[]; milestones: MilestoneRow[] };
export type GetTasksResult = { ok: true; bundle: TasksBundle } | { ok: false; code: "unauthorized" | "error" };

export async function getProjectTasks(projectId: string): Promise<GetTasksResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    supabase
      .from("project_tasks")
      .select("id, title, status, due_date, milestone_id, sort_order")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("project_milestones")
      .select("id, name, target_date, sort_order")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    ok: true,
    bundle: { tasks: (tasks ?? []) as TaskRow[], milestones: (milestones ?? []) as MilestoneRow[] },
  };
}

// ── mutations ──
type Result = { ok: true; id?: string } | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

const CreateTaskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  due_date: z.string().optional().nullable(),
  milestone_id: z.string().uuid().optional().nullable(),
});

export async function createTask(rawInput: unknown): Promise<Result> {
  const parsed = CreateTaskSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, code: "unauthorized" };

  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      user_id: userId,
      project_id: parsed.data.project_id,
      title: parsed.data.title.trim(),
      due_date: parsed.data.due_date || null,
      milestone_id: parsed.data.milestone_id || null,
      status: "todo",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, code: "error" };
  revalidate();
  return { ok: true, id: data.id as string };
}

const UpdateTaskSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().min(1).max(300).optional(),
  status: z.string().optional(),
  due_date: z.string().nullable().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
});

export async function updateTask(rawInput: unknown): Promise<Result> {
  const parsed = UpdateTaskSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  if (parsed.data.status !== undefined && !isValidStatus(parsed.data.status)) {
    return { ok: false, code: "invalid" };
  }
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, code: "unauthorized" };

  const patch: Record<string, unknown> = {};
  const { task_id, ...rest } = parsed.data;
  for (const [k, v] of Object.entries(rest)) if (v !== undefined) patch[k] = v === "" ? null : v;

  const { error } = await supabase
    .from("project_tasks")
    .update(patch)
    .eq("id", task_id)
    .eq("user_id", userId);
  if (error) return { ok: false, code: "error" };
  revalidate();
  return { ok: true };
}

export async function deleteTask(rawInput: unknown): Promise<Result> {
  const parsed = z.object({ task_id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, code: "unauthorized" };
  const { error } = await supabase.from("project_tasks").delete().eq("id", parsed.data.task_id).eq("user_id", userId);
  if (error) return { ok: false, code: "error" };
  revalidate();
  return { ok: true };
}

export async function reorderTasks(rawInput: unknown): Promise<Result> {
  const parsed = z
    .object({ project_id: z.string().uuid(), ordered_ids: z.array(z.string().uuid()).max(500) })
    .safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, code: "unauthorized" };
  // Owner-scoped per-row sort_order updates.
  await Promise.all(
    parsed.data.ordered_ids.map((id, idx) =>
      supabase
        .from("project_tasks")
        .update({ sort_order: idx })
        .eq("id", id)
        .eq("user_id", userId)
        .eq("project_id", parsed.data.project_id)
    )
  );
  revalidate();
  return { ok: true };
}

const CreateMilestoneSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  target_date: z.string().optional().nullable(),
});

export async function createMilestone(rawInput: unknown): Promise<Result> {
  const parsed = CreateMilestoneSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, code: "unauthorized" };
  const { data, error } = await supabase
    .from("project_milestones")
    .insert({
      user_id: userId,
      project_id: parsed.data.project_id,
      name: parsed.data.name.trim(),
      target_date: parsed.data.target_date || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, code: "error" };
  revalidate();
  return { ok: true, id: data.id as string };
}

export async function assignTaskToMilestone(rawInput: unknown): Promise<Result> {
  const parsed = z
    .object({ task_id: z.string().uuid(), milestone_id: z.string().uuid().nullable() })
    .safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { supabase, userId } = await uid();
  if (!userId) return { ok: false, code: "unauthorized" };
  const { error } = await supabase
    .from("project_tasks")
    .update({ milestone_id: parsed.data.milestone_id })
    .eq("id", parsed.data.task_id)
    .eq("user_id", userId);
  if (error) return { ok: false, code: "error" };
  revalidate();
  return { ok: true };
}
