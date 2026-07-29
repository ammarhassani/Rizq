-- Two columns the product writes but Postgres was rejecting.
--
-- 20260513113211 revoked UPDATE on public.users and re-granted it column by column.
-- 20260624090000 widened that grant once already, for exactly this reason: a write touching
-- an ungranted column is rejected outright, and the failure surfaces as a generic error rather
-- than anything naming the column. Both columns added since then were missed.
--
-- contribute_benchmarks: without this the consent toggle appears to work, flips optimistically,
-- and silently does nothing — which would have meant launching with a flywheel that can never
-- turn, exactly the state it has been in since it was built.
--
-- is_test_account: the e2e harness sets this on itself so contribute_benchmark() can refuse it.
-- Ungranted, the harness write failed and every disposable account still looked real to the
-- RPC, leaving the firewall shipped but unarmed.
--
-- Granting is_test_account hands the user a flag about themselves, so it is made ONE-WAY below:
-- an account may declare itself a test account, and may never undeclare. Setting it true only
-- ever removes a privilege (the ability to contribute), so there is nothing to gain by lying in
-- that direction; being able to clear it is the direction that would matter.

grant update (contribute_benchmarks, is_test_account) on public.users to authenticated;

create or replace function public.enforce_test_account_one_way()
returns trigger
language plpgsql
as $$
begin
  if old.is_test_account and not new.is_test_account then
    raise exception 'is_test_account cannot be cleared once set'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists users_test_account_one_way on public.users;
create trigger users_test_account_one_way
  before update of is_test_account on public.users
  for each row
  execute function public.enforce_test_account_one_way();
