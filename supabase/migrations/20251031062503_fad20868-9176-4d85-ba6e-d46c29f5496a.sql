-- Allow users to delete swap requests they are involved in
CREATE POLICY "Users can delete their swap requests"
ON public.swap_requests
FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);