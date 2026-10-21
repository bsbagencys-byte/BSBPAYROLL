import { z } from "zod";

export const reportKeySchema = z.object({
  key: z.string().min(1, "Report is required."),
  period: z.string().optional().or(z.literal("")),
  from: z.string().optional().or(z.literal("")),
  to: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  employeeId: z.string().optional().or(z.literal("")),
  status: z.string().optional().or(z.literal("")),
});
