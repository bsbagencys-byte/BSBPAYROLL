import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function PayrollReviewFilters({
  branches,
  departments,
  values,
}: {
  branches: string[];
  departments: string[];
  values: { employee?: string; branch?: string; department?: string; flag?: string; minNet?: string; maxNet?: string };
}) {
  return (
    <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6" method="get">
      <Input name="employee" placeholder="Employee or code" defaultValue={values.employee ?? ""} />
      <Select name="branch" defaultValue={values.branch ?? ""}>
        <option value="">All branches</option>
        {branches.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Select name="department" defaultValue={values.department ?? ""}>
        <option value="">All departments</option>
        {departments.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Select name="flag" defaultValue={values.flag ?? ""}>
        <option value="">All flags</option>
        <option value="error">Errors</option>
        <option value="warning">Warnings</option>
      </Select>
      <Input name="minNet" placeholder="Min net" defaultValue={values.minNet ?? ""} />
      <div className="flex gap-2">
        <Input name="maxNet" placeholder="Max net" defaultValue={values.maxNet ?? ""} />
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </div>
    </form>
  );
}
