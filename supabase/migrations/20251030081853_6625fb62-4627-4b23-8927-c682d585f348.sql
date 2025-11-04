-- Drop the existing restrictive policy for viewing swappable events
DROP POLICY IF EXISTS "Users can view swappable events from others" ON public.events;

-- Create a new policy that allows users to see:
-- 1. Their own events
-- 2. Events with SWAPPABLE status
-- 3. Events that are part of swap requests they're involved in (either as requester or receiver)
CREATE POLICY "Users can view relevant events" 
ON public.events 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  status = 'SWAPPABLE'::event_status
  OR
  EXISTS (
    SELECT 1 FROM public.swap_requests 
    WHERE (
      (requester_id = auth.uid() AND (requester_slot_id = events.id OR receiver_slot_id = events.id))
      OR 
      (receiver_id = auth.uid() AND (requester_slot_id = events.id OR receiver_slot_id = events.id))
    )
  )
);