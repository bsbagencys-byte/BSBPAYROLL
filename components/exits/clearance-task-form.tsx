import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { updateClearanceTaskAction } from "@/actions/exits";
import { CLEARANCE_TASK_STATUSES, CLEARANCE_TASK_STATUS_LABELS } from "@/lib/constants";
import type { ExitClearanceTask } from "@/types";

export function ClearanceTaskForm({ task, canEdit }: { task: ExitClearanceTask; canEdit: boolean }) {
  if (!canEdit) return null;
  return (
    <form action={updateClearanceTaskAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="taskId" value={task.id} />
      <Select name="status" defaultValue={task.status} className="h-8 w-40">
        {CLEARANCE_TASK_STATUSES.map((item) => (
          <option key={item} value={item}>
            {CLEARANCE_TASK_STATUS_LABELS[item]}
          </option>
        ))}
      </Select>
      <Input name="remarks" className="h-8 w-48" defaultValue={task.remarks ?? ""} placeholder="Remarks" />
      <Button type="submit" size="sm">
        Update
      </Button>
    </form>
  );
}
