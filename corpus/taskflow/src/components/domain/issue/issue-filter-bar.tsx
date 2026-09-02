"use client";

/**
 * Filter chips writing back into the URL search params.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { humanizeStatus } from "@/lib/format";
import { activeFilterCount, UNASSIGNED_TOKEN } from "@/hooks/issue-filter-params";
import { ISSUE_STATUSES, type IssueFilter, type IssueStatus } from "@/types/issue";
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { Project } from "@/types/project";
import type { ProjectId } from "@/types/common";
import type { ReactElement } from "react";

export type IssueFilterBarProps = {
  filter: IssueFilter;
  projects: readonly Project[];
  members: readonly MemberWithUser[];
  onChange: (filter: IssueFilter) => void;
};

/** Adds or removes one status without disturbing the other dimensions. */
export function toggleStatus(
  filter: IssueFilter,
  status: IssueStatus,
): IssueFilter {
  const current = filter.status ?? [];
  const next = current.includes(status)
    ? current.filter((value) => value !== status)
    : [...current, status];
  const { status: _dropped, ...rest } = filter;
  return next.length === 0 ? rest : { ...rest, status: next };
}

export function IssueFilterBar(
  props: IssueFilterBarProps,
): ReactElement | null {
  const { filter, projects, members, onChange } = props;

  const projectOptions: readonly SelectOption[] = [
    { value: "", label: "All projects" },
    ...projects.map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ];

  const assigneeOptions: readonly SelectOption[] = [
    { value: "", label: "Anyone" },
    { value: UNASSIGNED_TOKEN, label: "Unassigned" },
    ...members.map((member) => ({
      value: member.userId,
      label: member.user.name,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        type="search"
        value={filter.query ?? ""}
        placeholder="Search issues"
        onChange={(value) =>
          onChange(value.length === 0 ? stripQuery(filter) : { ...filter, query: value })
        }
      />

      <Select
        name="project"
        value={filter.projectId ?? ""}
        options={projectOptions}
        onChange={(value) =>
          onChange(
            value.length === 0
              ? stripProject(filter)
              : { ...filter, projectId: value as ProjectId },
          )
        }
      />

      <Select
        name="assignee"
        value={
          filter.assigneeId === undefined
            ? ""
            : (filter.assigneeId ?? UNASSIGNED_TOKEN)
        }
        options={assigneeOptions}
        onChange={(value) => onChange(withAssignee(filter, value))}
      />

      <div className="flex flex-wrap gap-1">
        {ISSUE_STATUSES.map((status) => {
          const active = (filter.status ?? []).includes(status);
          return (
            <Button
              key={status}
              variant={active ? "primary" : "ghost"}
              size="sm"
              onClick={() => onChange(toggleStatus(filter, status))}
            >
              {humanizeStatus(status)}
            </Button>
          );
        })}
      </div>

      {activeFilterCount(filter) > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          Clear ({activeFilterCount(filter)})
        </Button>
      ) : null}
    </div>
  );
}

function stripQuery(filter: IssueFilter): IssueFilter {
  const { query: _query, ...rest } = filter;
  return rest;
}

function stripProject(filter: IssueFilter): IssueFilter {
  const { projectId: _projectId, ...rest } = filter;
  return rest;
}

function withAssignee(filter: IssueFilter, raw: string): IssueFilter {
  if (raw.length === 0) {
    const { assigneeId: _assigneeId, ...rest } = filter;
    return rest;
  }
  return {
    ...filter,
    assigneeId: raw === UNASSIGNED_TOKEN ? null : (raw as UserId),
  };
}
