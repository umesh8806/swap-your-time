-- Functions to handle swap lifecycle securely and atomically
-- 1) request_swap: create a swap request and mark both events as SWAP_PENDING
-- 2) accept_swap: receiver accepts; swap ownership and set both events BUSY
-- 3) reject_swap: receiver rejects; set request REJECTED and revert event statuses

create or replace function public.request_swap(
  _receiver_id uuid,
  _requester_slot_id uuid,
  _receiver_slot_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _requester_id uuid := auth.uid();
begin
  if _requester_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Basic sanity checks
  if _receiver_id = _requester_id then
    raise exception 'Cannot request a swap with yourself';
  end if;

  -- Insert swap request
  insert into public.swap_requests (requester_id, receiver_id, requester_slot_id, receiver_slot_id)
  values (_requester_id, _receiver_id, _requester_slot_id, _receiver_slot_id);

  -- Mark both events as pending swap
  update public.events
  set status = 'SWAP_PENDING'
  where id in (_requester_slot_id, _receiver_slot_id);
end;
$$;

create or replace function public.accept_swap(
  _request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _receiver_id uuid;
  _requester_id uuid;
  _requester_slot_id uuid;
  _receiver_slot_id uuid;
  _req_event_owner uuid;
  _rec_event_owner uuid;
begin
  -- Fetch request and ensure the caller is the receiver and status is PENDING
  select requester_id, receiver_id, requester_slot_id, receiver_slot_id
    into _requester_id, _receiver_id, _requester_slot_id, _receiver_slot_id
  from public.swap_requests
  where id = _request_id and status = 'PENDING';

  if not found then
    raise exception 'Swap request not found or not pending';
  end if;

  if auth.uid() is distinct from _receiver_id then
    raise exception 'Only the receiver can accept this swap';
  end if;

  -- Get current owners of both events
  select user_id into _req_event_owner from public.events where id = _requester_slot_id;
  select user_id into _rec_event_owner from public.events where id = _receiver_slot_id;

  if _req_event_owner is null or _rec_event_owner is null then
    raise exception 'Events not found';
  end if;

  -- Swap ownership and set status to BUSY for both
  update public.events set user_id = _rec_event_owner, status = 'BUSY' where id = _requester_slot_id;
  update public.events set user_id = _req_event_owner, status = 'BUSY' where id = _receiver_slot_id;

  -- Mark request as accepted
  update public.swap_requests set status = 'ACCEPTED' where id = _request_id;
end;
$$;

create or replace function public.reject_swap(
  _request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _receiver_id uuid;
  _requester_slot_id uuid;
  _receiver_slot_id uuid;
begin
  -- Fetch request and ensure the caller is the receiver and status is PENDING
  select receiver_id, requester_slot_id, receiver_slot_id
    into _receiver_id, _requester_slot_id, _receiver_slot_id
  from public.swap_requests
  where id = _request_id and status = 'PENDING';

  if not found then
    raise exception 'Swap request not found or not pending';
  end if;

  if auth.uid() is distinct from _receiver_id then
    raise exception 'Only the receiver can reject this swap';
  end if;

  -- Mark request as rejected
  update public.swap_requests set status = 'REJECTED' where id = _request_id;

  -- Revert event statuses back to SWAPPABLE
  update public.events set status = 'SWAPPABLE' where id in (_requester_slot_id, _receiver_slot_id);
end;
$$;