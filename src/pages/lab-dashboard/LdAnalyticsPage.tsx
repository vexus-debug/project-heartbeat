import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];
const fmt = (v: number) => `₦${v.toLocaleString()}`;

export default function LdAnalyticsPage() {
  const { data: cases = [] } = useQuery({
    queryKey: ["ld_cases_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ld_cases").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["ld_invoices_analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ld_invoices").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalCases = cases.length;
  const completedCases = cases.filter((c: any) => c.status === "completed" || c.status === "delivered").length;
  const totalRevenue = invoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
  const pendingCases = cases.filter((c: any) => c.status === "pending" || c.status === "in_progress").length;

  const statusCounts: Record<string, number> = {};
  cases.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  const workTypeCounts: Record<string, number> = {};
  cases.forEach((c: any) => { workTypeCounts[c.work_type_name] = (workTypeCounts[c.work_type_name] || 0) + 1; });
  const workTypeData = Object.entries(workTypeCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const monthlyRevenue: Record<string, number> = {};
  invoices.forEach((inv: any) => {
    const month = inv.invoice_date?.slice(0, 7) || "Unknown";
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(inv.total_amount || 0);
  });
  const revenueData = Object.entries(monthlyRevenue).sort().slice(-6).map(([month, total]) => ({
    month: new Date(month + "-01").toLocaleDateString("en", { month: "short", year: "2-digit" }),
    total,
  }));

  const stats = [
    { label: "Total Cases", value: totalCases, icon: CheckCircle, color: "text-blue-500" },
    { label: "Active Cases", value: pendingCases, icon: Clock, color: "text-amber-500" },
    { label: "Completed", value: completedCases, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Total Revenue", value: fmt(totalRevenue), icon: DollarSign, color: "text-green-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics & Reports" description="Lab performance overview and insights" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-muted ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Cases by Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No case data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {statusData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card md:col-span-2">
          <CardHeader><CardTitle className="text-base">Top Work Types</CardTitle></CardHeader>
          <CardContent>
            {workTypeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No work type data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={workTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
