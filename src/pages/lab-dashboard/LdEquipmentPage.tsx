import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Wrench, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { useLdEquipment, useAddLdEquipment, useUpdateLdEquipment, useDeleteLdEquipment, useLdEquipmentMaintenance, useAddLdEquipmentMaintenance } from "@/hooks/useLdExtendedFeatures";
import { motion } from "framer-motion";

const statusColors: Record<string, { bg: string; icon: any }> = {
  operational: { bg: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  "needs-service": { bg: "bg-amber-100 text-amber-800", icon: AlertTriangle },
  "out-of-service": { bg: "bg-destructive/20 text-destructive", icon: XCircle },
};

const maintenanceTypes = [
  { value: "routine", label: "Routine Maintenance" },
  { value: "repair", label: "Repair" },
  { value: "calibration", label: "Calibration" },
];

export default function LdEquipmentPage() {
  const { data: equipment = [], isLoading } = useLdEquipment();
  const addEquipment = useAddLdEquipment();
  const updateEquipment = useUpdateLdEquipment();
  const deleteEquipment = useDeleteLdEquipment();
  const addMaintenance = useAddLdEquipmentMaintenance();

  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);

  const { data: maintenanceHistory = [] } = useLdEquipmentMaintenance(selectedEquipmentId || undefined);

  // Equipment form
  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formWarrantyExpiry, setFormWarrantyExpiry] = useState("");
  const [formStatus, setFormStatus] = useState("operational");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Maintenance form
  const [maintType, setMaintType] = useState("routine");
  const [maintDate, setMaintDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [maintNextDate, setMaintNextDate] = useState("");
  const [maintPerformedBy, setMaintPerformedBy] = useState("");
  const [maintCost, setMaintCost] = useState(0);
  const [maintDescription, setMaintDescription] = useState("");
  const [maintNotes, setMaintNotes] = useState("");

  const resetEquipmentForm = () => {
    setFormName("");
    setFormModel("");
    setFormSerial("");
    setFormPurchaseDate("");
    setFormWarrantyExpiry("");
    setFormStatus("operational");
    setFormLocation("");
    setFormNotes("");
    setEditingEquipment(null);
  };

  const openCreateEquipmentDialog = () => {
    resetEquipmentForm();
    setEquipmentDialogOpen(true);
  };

  const openEditEquipmentDialog = (eq: any) => {
    setEditingEquipment(eq);
    setFormName(eq.name);
    setFormModel(eq.model || "");
    setFormSerial(eq.serial_number || "");
    setFormPurchaseDate(eq.purchase_date || "");
    setFormWarrantyExpiry(eq.warranty_expiry || "");
    setFormStatus(eq.status);
    setFormLocation(eq.location || "");
    setFormNotes(eq.notes || "");
    setEquipmentDialogOpen(true);
  };

  const handleSaveEquipment = async () => {
    if (!formName) {
      toast.error("Equipment name is required");
      return;
    }
    const payload = {
      name: formName,
      model: formModel,
      serial_number: formSerial,
      purchase_date: formPurchaseDate || null,
      warranty_expiry: formWarrantyExpiry || null,
      status: formStatus,
      location: formLocation,
      notes: formNotes,
    };
    try {
      if (editingEquipment) {
        await updateEquipment.mutateAsync({ id: editingEquipment.id, ...payload });
        toast.success("Equipment updated");
      } else {
        await addEquipment.mutateAsync(payload as any);
        toast.success("Equipment added");
      }
      setEquipmentDialogOpen(false);
      resetEquipmentForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!confirm("Delete this equipment?")) return;
    try {
      await deleteEquipment.mutateAsync(id);
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openMaintenanceDialog = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    setMaintType("routine");
    setMaintDate(format(new Date(), "yyyy-MM-dd"));
    setMaintNextDate("");
    setMaintPerformedBy("");
    setMaintCost(0);
    setMaintDescription("");
    setMaintNotes("");
    setMaintenanceDialogOpen(true);
  };

  const handleAddMaintenance = async () => {
    if (!selectedEquipmentId) return;
    try {
      await addMaintenance.mutateAsync({
        equipment_id: selectedEquipmentId,
        maintenance_type: maintType,
        maintenance_date: maintDate,
        next_maintenance_date: maintNextDate || null,
        performed_by: maintPerformedBy,
        cost: maintCost,
        description: maintDescription,
        notes: maintNotes,
      } as any);
      toast.success("Maintenance record added");
      setMaintenanceDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getWarrantyStatus = (expiry: string | null) => {
    if (!expiry) return null;
    const days = differenceInDays(parseISO(expiry), new Date());
    if (days < 0) return { text: "Expired", color: "text-destructive" };
    if (days < 30) return { text: `${days} days left`, color: "text-amber-600" };
    return { text: `${days} days left`, color: "text-emerald-600" };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment Management"
        description="Track lab machinery and maintenance schedules"
      >
        <Button onClick={openCreateEquipmentDialog} className="gap-2">
          <Plus className="h-4 w-4" /> Add Equipment
        </Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusColors).map(([status, { bg, icon: Icon }]) => {
          const count = equipment.filter(e => e.status === status).length;
          return (
            <Card key={status}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`p-3 rounded-full ${bg}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{status.replace("-", " ")}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Equipment List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : equipment.length === 0 ? (
            <p className="text-muted-foreground">No equipment registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((eq, idx) => {
                  const warranty = getWarrantyStatus(eq.warranty_expiry);
                  const StatusIcon = statusColors[eq.status]?.icon || CheckCircle;
                  return (
                    <motion.tr
                      key={eq.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b"
                    >
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell>{eq.model || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">{eq.serial_number || "-"}</TableCell>
                      <TableCell>{eq.location || "-"}</TableCell>
                      <TableCell>
                        {warranty ? (
                          <span className={`text-sm ${warranty.color}`}>{warranty.text}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[eq.status]?.bg || "bg-muted"}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => openMaintenanceDialog(eq.id)}>
                          <Wrench className="h-4 w-4 mr-1" /> Log
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditEquipmentDialog(eq)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteEquipment(eq.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Equipment Dialog */}
      <Dialog open={equipmentDialogOpen} onOpenChange={setEquipmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Equipment Name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., CAD/CAM Mill" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={formModel} onChange={e => setFormModel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={formSerial} onChange={e => setFormSerial(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={formPurchaseDate} onChange={e => setFormPurchaseDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Warranty Expiry</Label>
                <Input type="date" value={formWarrantyExpiry} onChange={e => setFormWarrantyExpiry(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="needs-service">Needs Service</SelectItem>
                    <SelectItem value="out-of-service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="e.g., Lab Room A" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquipmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEquipment} disabled={addEquipment.isPending || updateEquipment.isPending}>
              {editingEquipment ? "Save Changes" : "Add Equipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
            <CardDescription>
              {equipment.find(e => e.id === selectedEquipmentId)?.name}
            </CardDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={maintType} onValueChange={setMaintType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Next Maintenance</Label>
                <Input type="date" value={maintNextDate} onChange={e => setMaintNextDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input type="number" value={maintCost} onChange={e => setMaintCost(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Performed By</Label>
              <Input value={maintPerformedBy} onChange={e => setMaintPerformedBy(e.target.value)} placeholder="Technician name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={maintDescription} onChange={e => setMaintDescription(e.target.value)} rows={2} placeholder="What was done" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={maintNotes} onChange={e => setMaintNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMaintenance} disabled={addMaintenance.isPending}>
              Log Maintenance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
