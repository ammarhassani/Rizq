"use client";

/**
 * TasksTab — Project Workspace (spec 004), task T018.
 * Work breakdown: add tasks, cycle status (todo → doing → done), delete, and
 * optionally group under milestones (with completion). Money-free.
 */

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createTask,
  updateTask,
  deleteTask,
  createMilestone,
  type TaskRow,
  type MilestoneRow,
} from "@/app/actions/projects/tasks";
import { normalizeStatus, completionRatio } from "@/lib/projects/taskStatus";
import type { TaskStatus } from "@/lib/projects/types";

const NEXT: Record<TaskStatus, TaskStatus> = { todo: "doing", doing: "done", done: "todo" };
const STATUS_KEY: Record<TaskStatus, string> = { todo: "statusTodo", doing: "statusDoing", done: "statusDone" };
const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-rizq-gold/15 text-rizq-ink-soft",
  doing: "status-info",
  done: "bg-emerald-100 text-[var(--acc)]",
};

export function TasksTab({
  locale,
  projectId,
  tasks,
  milestones,
}: {
  locale: "ar" | "en";
  projectId: string;
  tasks: TaskRow[];
  milestones: MilestoneRow[];
}) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const [newTask, setNewTask] = useState("");
  const [newMilestone, setNewMilestone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const run = (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    start(async () => {
      await fn();
      setBusy(null);
      router.refresh();
    });
  };

  const fieldCls = `rounded-xl border border-rizq-gold/30 bg-[var(--raised)] px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`;

  const groups = [
    { id: null as string | null, name: t("ungrouped"), target: null as string | null },
    ...milestones.map((m) => ({ id: m.id, name: m.name, target: m.target_date })),
  ];

  function TaskItem({ task }: { task: TaskRow }) {
    const status = normalizeStatus(task.status);
    return (
      <li className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-[var(--raised)] px-4 py-2.5">
        <span className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => run(`s-${task.id}`, () => updateTask({ task_id: task.id, status: NEXT[status] }))}
            disabled={busy === `s-${task.id}`}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]} ${font}`}
          >
            {busy === `s-${task.id}` ? <Loader2 size={11} className="animate-spin" /> : t(STATUS_KEY[status])}
          </button>
          <span className={`text-sm text-rizq-ink truncate ${status === "done" ? "line-through opacity-60" : ""} ${font}`}>
            {task.title}
          </span>
        </span>
        <button
          type="button"
          onClick={() => run(`d-${task.id}`, () => deleteTask({ task_id: task.id }))}
          className="text-rizq-ink-soft/60 hover:text-[var(--over)] transition-colors shrink-0"
          title={t("deleteTask")}
        >
          <Trash2 size={14} />
        </button>
      </li>
    );
  }

  return (
    <div dir={dir} className={font}>
      {/* Add task + milestone */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={t("taskPlaceholder")}
          className={`${fieldCls} flex-1`}
        />
        <button
          type="button"
          onClick={() =>
            newTask.trim() &&
            run("add-task", async () => {
              await createTask({ project_id: projectId, title: newTask.trim() });
              setNewTask("");
            })
          }
          disabled={busy === "add-task"}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-70 ${font}`}
        >
          {busy === "add-task" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {t("addTask")}
        </button>
      </div>

      {tasks.length === 0 && milestones.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("tasksEmpty")}</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const groupTasks = tasks.filter((task) => (task.milestone_id ?? null) === g.id);
            if (g.id === null && groupTasks.length === 0) return null;
            const ratio = completionRatio(groupTasks.map((task) => task.status));
            return (
              <div key={g.id ?? "ungrouped"}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold text-rizq-ink-soft/70 uppercase tracking-wide flex items-center gap-1.5 ${font}`}>
                    {g.id && <Flag size={12} />}
                    {g.name}
                  </p>
                  {groupTasks.length > 0 && (
                    <span className="text-xs text-rizq-ink-soft/60">
                      {t("milestoneProgress", { done: groupTasks.filter((x) => normalizeStatus(x.status) === "done").length, total: groupTasks.length })}
                      {" · "}
                      {Math.round(ratio * 100)}%
                    </span>
                  )}
                </div>
                {groupTasks.length === 0 ? (
                  <p className={`text-xs text-rizq-ink-soft/50 ${font}`}>—</p>
                ) : (
                  <ul className="space-y-2">
                    {groupTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add milestone */}
      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <input
          value={newMilestone}
          onChange={(e) => setNewMilestone(e.target.value)}
          placeholder={t("milestonePlaceholder")}
          className={`${fieldCls} flex-1`}
        />
        <button
          type="button"
          onClick={() =>
            newMilestone.trim() &&
            run("add-ms", async () => {
              await createMilestone({ project_id: projectId, name: newMilestone.trim() });
              setNewMilestone("");
            })
          }
          disabled={busy === "add-ms"}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-5 py-2.5 text-sm font-medium hover:bg-rizq-green/8 transition-colors disabled:opacity-70 ${font}`}
        >
          {busy === "add-ms" ? <Loader2 size={14} className="animate-spin" /> : <Flag size={14} />}
          {t("addMilestone")}
        </button>
      </div>
    </div>
  );
}
