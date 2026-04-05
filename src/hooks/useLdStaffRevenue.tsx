import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useLdStaffRevenueAllocations(periodStart?: string, periodEnd?: string) {
  return useQuery({
    queryKey: ["ld-staff-revenue-allocations", periodStart, periodEnd],
    queryFn: async () => {
      let q = supabase.from("ld_staff_revenue_allocations").select("*, staff:ld_staff(full_name, role, seniority_level)").order("created_at", { ascending: false });
      if (periodStart) q = q.gte("period_start", periodStart);
      if (periodEnd) q = q.lte("period_end", periodEnd);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateLdStaffRevenueAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { error } = await supabase.from("ld_staff_revenue_allocations").insert([values as any]);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ld-staff-revenue-allocations"] }); toast.success("Allocation saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Calculate revenue allocation for a period
export function calculateStaffRevenueAllocation(
  cases: any[],
  staff: any[],
  periodStart: Date,
  periodEnd: Date,
  paidOnly: boolean = false
) {
  // Filter cases in the period
  const periodCases = cases.filter((c: any) => {
    const d = new Date(c.created_at);
    if (d < periodStart || d > periodEnd) return false;
    if (paidOnly && !c.is_paid) return false;
    return true;
  });

  // Exclude courier and express charges from allocation base
  const getProductiveAmount = (c: any) => {
    const net = Number(c.net_amount || 0);
    const courier = Number(c.courier_amount || 0);
    const express = Number(c.express_surcharge || 0);
    return Math.max(net - courier - express, 0);
  };

  const totalProductiveRevenue = periodCases.reduce((s, c) => s + getProductiveAmount(c), 0);
  const outputPool = totalProductiveRevenue * 0.20; // 20% output
  const basicPool = totalProductiveRevenue * 0.10; // 10% basic

  // Count jobs per technician
  const techJobs: Record<string, { count: number; revenue: number }> = {};
  periodCases.forEach(c => {
    const tid = c.assigned_technician_id;
    if (!tid) return;
    if (!techJobs[tid]) techJobs[tid] = { count: 0, revenue: 0 };
    techJobs[tid].count++;
    techJobs[tid].revenue += getProductiveAmount(c);
  });

  const totalJobs = Object.values(techJobs).reduce((s, t) => s + t.count, 0);

  // Calculate seniority total for basic salary distribution
  const activeStaff = staff.filter((s: any) => s.status === "active" && techJobs[s.id]);
  const totalSeniority = activeStaff.reduce((s, st) => s + (Number(st.seniority_level) || 1), 0);

  const allocations = activeStaff.map(st => {
    const jobs = techJobs[st.id] || { count: 0, revenue: 0 };
    
    // Output: proportional to jobs done
    const outputShare = totalJobs > 0 ? (jobs.count / totalJobs) * outputPool : 0;
    
    // Basic: proportional to seniority level
    const seniorityLevel = Number(st.seniority_level) || 1;
    const basicShare = totalSeniority > 0 ? (seniorityLevel / totalSeniority) * basicPool : 0;

    return {
      staff_id: st.id,
      staff_name: st.full_name,
      role: st.role,
      seniority_level: seniorityLevel,
      jobs_count: jobs.count,
      jobs_revenue: jobs.revenue,
      output_allocation: Math.round(outputShare * 100) / 100,
      basic_allocation: Math.round(basicShare * 100) / 100,
      total_allocation: Math.round((outputShare + basicShare) * 100) / 100,
    };
  });

  return {
    totalProductiveRevenue,
    outputPool,
    basicPool,
    totalJobs,
    allocations,
    courierTotal: periodCases.reduce((s, c) => s + Number(c.courier_amount || 0), 0),
    expressTotal: periodCases.reduce((s, c) => s + Number(c.express_surcharge || 0), 0),
  };
}
