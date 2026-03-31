import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetPendingApprovals, apiApproveTask, apiRejectTask } from "@/lib/api";

export function useApprovals() {
  return useQuery({
    queryKey: ["approvals"],
    queryFn: apiGetPendingApprovals,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useApproveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (approvalId: string) => apiApproveTask(approvalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
}

export function useRejectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ approvalId, note }: { approvalId: string; note: string }) =>
      apiRejectTask(approvalId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });
}
