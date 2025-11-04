-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows users to see:
-- 1. Their own profile
-- 2. Profiles of users they have swap requests with (either as requester or receiver)
CREATE POLICY "Users can view relevant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.swap_requests 
    WHERE (requester_id = auth.uid() AND receiver_id = profiles.id)
       OR (receiver_id = auth.uid() AND requester_id = profiles.id)
  )
);