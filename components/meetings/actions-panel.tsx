"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import type { ActionItem, ActionPriority, ActionStatus } from "@/types";
import { ActionStatusBadge, Badge, PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { apiFetch } from "@/lib/client-api";
import { cn, formatTimestamp } from "@/lib/utils";

const statusOptions: Array<{ value: ActionStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const priorityOptions: Array<{ value: ActionPriority; label: string }> = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "unspecified", label: "Unspecified" },
];

interface DraftAction {
  task: string;
  owner: string;
  deadline: string;
  priority: ActionPriority;
  status: ActionStatus;
}

const emptyDraft: DraftAction = {
  task: "",
  owner: "Unassigned",
  deadline: "Not specified",
  priority: "unspecified",
  status: "pending",
};

export function ActionsPanel({
  meetingId,
  initialItems,
  readOnly,
  onJump,
}: {
  meetingId: string;
  initialItems: ActionItem[];
  readOnly?: boolean;
  onJump: (segmentId: string) => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<"all" | ActionStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftAction>(emptyDraft);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const filtered = filter === "all" ? items : items.filter((item) => item.status === filter);

  const changeStatus = async (item: ActionItem, status: ActionStatus) => {
    setBusyId(item.id);
    setError(null);
    const previous = items;
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, status } : entry)),
    );
    try {
      await apiFetch(`/api/meetings/${meetingId}/actions/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (updateError) {
      setItems(previous);
      setError((updateError as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const beginEdit = (item: ActionItem) => {
    setEditingId(item.id);
    setDraft({
      task: item.task,
      owner: item.owner,
      deadline: item.deadline,
      priority: item.priority,
      status: item.status,
    });
    setError(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await apiFetch<{ action: ActionItem }>(
          `/api/meetings/${meetingId}/actions/${editingId}`,
          { method: "PATCH", body: JSON.stringify(draft) },
        );
        setItems((current) =>
          current.map((item) => (item.id === editingId ? result.action : item)),
        );
        setEditingId(null);
        router.refresh();
      } catch (saveError) {
        setError((saveError as Error).message);
      }
    });
  };

  const addAction = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await apiFetch<{ action: ActionItem }>(
          `/api/meetings/${meetingId}/actions`,
          {
            method: "POST",
            body: JSON.stringify({
              ...draft,
              evidenceTimestamp: null,
              evidenceText: null,
              sourceSegmentId: null,
            }),
          },
        );
        setItems((current) => [...current, result.action]);
        setDraft(emptyDraft);
        setAdding(false);
        router.refresh();
      } catch (addError) {
        setError((addError as Error).message);
      }
    });
  };

  const remove = async (item: ActionItem) => {
    if (!window.confirm("Delete this action item? This cannot be undone.")) return;
    setBusyId(item.id);
    try {
      await apiFetch(`/api/meetings/${meetingId}/actions/${item.id}`, {
        method: "DELETE",
      });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      router.refresh();
    } catch (deleteError) {
      setError((deleteError as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-accent" strokeWidth={1.7} aria-hidden="true" />
            <h2 className="display text-2xl">Action items</h2>
            <Badge tone="accent">
              {items.filter((item) => item.status !== "completed").length} open
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Owners and deadlines are shown only when explicitly stated. Update status as work moves.
          </p>
        </div>
        {!readOnly ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDraft(emptyDraft);
              setAdding(true);
              setEditingId(null);
            }}
          >
            <Plus className="size-3.5" aria-hidden="true" /> Add task
          </Button>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(["all", ...statusOptions.map((option) => option.value)] as const).map((value) => {
          const label =
            value === "all"
              ? "All"
              : statusOptions.find((option) => option.value === value)?.label;
          const count =
            value === "all" ? items.length : items.filter((item) => item.status === value).length;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[0.7rem] font-medium transition-colors",
                filter === value
                  ? "border-ink bg-ink text-white"
                  : "border-line-strong bg-white text-ink-soft hover:border-ink/30",
              )}
            >
              {label} <span className={filter === value ? "text-white/60" : "text-ink-faint"}>{count}</span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-4 rounded-lg bg-[#fbeeec] p-3 text-xs text-danger">{error}</p> : null}

      {adding ? (
        <div className="mt-5 rounded-2xl border border-accent/25 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-semibold">New action item</h3>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="new-task">Task</Label>
              <Textarea
                id="new-task"
                rows={2}
                value={draft.task}
                onChange={(event) => setDraft({ ...draft, task: event.target.value })}
                placeholder="What needs to happen?"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-owner">Owner</Label>
                <Input
                  id="new-owner"
                  value={draft.owner}
                  onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="new-deadline">Deadline</Label>
                <Input
                  id="new-deadline"
                  value={draft.deadline}
                  onChange={(event) => setDraft({ ...draft, deadline: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-priority">Priority</Label>
                <Select
                  id="new-priority"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft({ ...draft, priority: event.target.value as ActionPriority })
                  }
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="new-status">Status</Label>
                <Select
                  id="new-status"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value as ActionStatus })
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)} disabled={pending}>
                Cancel
              </Button>
              <Button size="sm" onClick={addAction} disabled={pending || !draft.task.trim()}>
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Add task
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {filtered.map((item) => (
          <article key={item.id} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            {editingId === item.id ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`task-${item.id}`}>Task</Label>
                  <Textarea
                    id={`task-${item.id}`}
                    rows={2}
                    value={draft.task}
                    onChange={(event) => setDraft({ ...draft, task: event.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`owner-${item.id}`}>Owner</Label>
                    <Input
                      id={`owner-${item.id}`}
                      value={draft.owner}
                      onChange={(event) => setDraft({ ...draft, owner: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`deadline-${item.id}`}>Deadline</Label>
                    <Input
                      id={`deadline-${item.id}`}
                      value={draft.deadline}
                      onChange={(event) => setDraft({ ...draft, deadline: event.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`priority-${item.id}`}>Priority</Label>
                    <Select
                      id={`priority-${item.id}`}
                      value={draft.priority}
                      onChange={(event) =>
                        setDraft({ ...draft, priority: event.target.value as ActionPriority })
                      }
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`status-${item.id}`}>Status</Label>
                    <Select
                      id={`status-${item.id}`}
                      value={draft.status}
                      onChange={(event) =>
                        setDraft({ ...draft, status: event.target.value as ActionStatus })
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={pending}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={pending || !draft.task.trim()}>
                    {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-0.5 text-ink-faint">
                      {item.status === "completed" ? (
                        <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
                      ) : (
                        <CircleDashed className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-relaxed text-ink",
                        item.status === "completed" && "text-ink-faint line-through decoration-ink-faint/40",
                      )}>
                        {item.task}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-ink-faint">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="size-3" aria-hidden="true" /> {item.owner}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="size-3" aria-hidden="true" /> {item.deadline}
                        </span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActionStatusBadge status={item.status} />
                    {!readOnly ? (
                      <>
                        <Select
                          aria-label="Update action status"
                          className="h-8 w-28 text-xs"
                          value={item.status}
                          disabled={busyId === item.id}
                          onChange={(event) =>
                            changeStatus(item, event.target.value as ActionStatus)
                          }
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-paper hover:text-ink"
                          onClick={() => beginEdit(item)}
                          aria-label="Edit action item"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-full text-ink-faint hover:bg-[#fbeeec] hover:text-danger"
                          onClick={() => remove(item)}
                          disabled={busyId === item.id}
                          aria-label="Delete action item"
                        >
                          {busyId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {item.evidenceTimestamp !== null && item.evidenceText ? (
                  <button
                    type="button"
                    onClick={() => item.sourceSegmentId && onJump(item.sourceSegmentId)}
                    className="mt-3 flex w-full gap-2 rounded-lg bg-paper px-3 py-2 text-left text-[0.68rem] leading-relaxed text-ink-faint transition-colors hover:text-ink-soft"
                  >
                    <span className="shrink-0 font-mono text-accent">
                      {formatTimestamp(item.evidenceTimestamp)}
                    </span>
                    <span>“{item.evidenceText}”</span>
                  </button>
                ) : (
                  <p className="mt-3 text-[0.65rem] italic text-ink-faint">
                    No transcript evidence attached. Verify this task manually.
                  </p>
                )}
              </>
            )}
          </article>
        ))}
        {!filtered.length ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-white/60 px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">
              {items.length ? "No tasks match this filter" : "No action items recorded"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-faint">
              {items.length
                ? "Switch filters to see the rest of the tasks."
                : "Not every meeting produces tasks. If something was assigned, add it manually."}
            </p>
            {!readOnly && !items.length ? (
              <Button
                className="mt-4"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft(emptyDraft);
                  setAdding(true);
                }}
              >
                <Plus className="size-3.5" aria-hidden="true" /> Add task
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
