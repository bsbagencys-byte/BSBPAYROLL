# Demo data

Development demo users are marked with `is_demo = true`.

## Local preview (no Supabase)

Set `NEXT_PUBLIC_DEMO_MODE=true`. The in-memory store seeds:

| Username | Password | Role |
| --- | --- | --- |
| bsbadmin | Admin@123 | Super Admin |
| bsbhr | Hruser@123 | HR |
| bsbpayroll | Payroll@123 | Payroll |
| bsbemployee | Employee@123 | Employee |

One demo organization, branch (`Head Office`), department (`Operations`) and designation (`Staff`).

Restart the server to reset the in-memory store.

## Supabase

1. Apply `supabase/schema.sql` in the SQL editor.
2. Apply `supabase/seed.sql`.
3. Create Auth users with the **internal** mapping emails (never shown in UI):

- `bsbadmin@auth.bsbpayroll.internal`
- `bsbhr@auth.bsbpayroll.internal`
- `bsbpayroll@auth.bsbpayroll.internal`
- `bsbemployee@auth.bsbpayroll.internal`

4. Link `user_profiles.auth_user_id` to those Auth user IDs.
5. Set `NEXT_PUBLIC_DEMO_MODE=false`.

## Removal

```sql
delete from public.organization_users
where organization_id in (select id from public.organizations where is_demo);

delete from public.user_profiles where is_demo;
delete from public.organizations where is_demo;
```
