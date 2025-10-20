import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CheckLog } from "@shared/schema";

const PLAN_OPTIONS = ["SSS", "MCSCC", "MCS", "MMM", "Otra"]; // ajusta a tu catálogo
const STATUS_OPTIONS = ["aplicado", "rechazado", "en_ajuste", "pendiente"]; // ajusta a tu flujo

function toISO(d?: string | Date | null) {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dt = new Date(d);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return undefined;
}

function fmt(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

type Filters = {
  startDate?: string;
  endDate?: string;
  plan?: string;
  status?: string;
  billedBy?: string;
};

export default function ProjectCheckLogs({ projectId }: { projectId: string }) {
  const { toast } = useToast();

  // Filters
  const [filters, setFilters] = useState<Filters>({});

  const queryKey = useMemo(() => ["/api/projects", projectId, "check-logs", filters], [projectId, filters]);

  const { data: logs = [], isLoading, refetch } = useQuery<CheckLog[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.plan) params.set("plan", filters.plan);
      if (filters.status) params.set("status", filters.status);
      if (filters.billedBy) params.set("billedBy", filters.billedBy);
      const res = await fetch(`/api/projects/${projectId}/check-logs?` + params.toString());
      if (!res.ok) throw new Error("Failed to fetch check logs");
      return res.json();
    },
    enabled: !!projectId,
  });

  // Modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CheckLog | null>(null);

  // Form state
  const [ckDate, setCkDate] = useState("");
  const [plan, setPlan] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [segment, setSegment] = useState("");
  const [invoice, setInvoice] = useState("");
  const [notes, setNotes] = useState("");
  const [billedBy, setBilledBy] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [initials, setInitials] = useState("");

  const resetForm = () => {
    setCkDate(""); setPlan(""); setCheckNumber(""); setSegment(""); setInvoice("");
    setNotes(""); setBilledBy(""); setFromDate(""); setToDate(""); setStatus(""); setInitials("");
  };

  useEffect(() => {
    if (editing) {
      setCkDate(toISO((editing as any).ckDate) || "");
      setPlan((editing as any).plan || "");
      setCheckNumber((editing as any).checkNumber || "");
      setSegment((editing as any).segment || "");
      setInvoice((editing as any).invoice || "");
      setNotes((editing as any).notes || "");
      setBilledBy((editing as any).billedBy || "");
      setFromDate(toISO((editing as any).fromDate) || "");
      setToDate(toISO((editing as any).toDate) || "");
      setStatus((editing as any).status || "");
      setInitials((editing as any).initials || "");
    } else {
      resetForm();
    }
  }, [editing]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: any = {
        ckDate: ckDate || undefined,
        plan: plan || undefined,
        checkNumber: checkNumber || undefined,
        segment: segment || undefined,
        invoice: invoice || undefined,
        notes: notes || undefined,
        billedBy: billedBy || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: status || undefined,
        initials: initials || undefined,
      };
      const res = await apiRequest("POST", `/api/projects/${projectId}/check-logs`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Saved", description: "Check log created." });
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: () => toast({ title: "Error", description: "Failed to create.", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const body: any = {
        ckDate: ckDate || undefined,
        plan: plan || undefined,
        checkNumber: checkNumber || undefined,
        segment: segment || undefined,
        invoice: invoice || undefined,
        notes: notes || undefined,
        billedBy: billedBy || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: status || undefined,
        initials: initials || undefined,
      };
      const res = await apiRequest("PUT", `/api/check-logs/${editing.id}` , body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Saved", description: "Check log updated." });
      setOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/check-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Deleted", description: "Check log deleted." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete.", variant: "destructive" })
  });

  const onOpenNew = () => { setEditing(null); setOpen(true); };
  const onOpenEdit = (row: CheckLog) => { setEditing(row); setOpen(true); };

  return (
    <Card className="group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Check Logs</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>Buscar</Button>
            <Button className="bg-primary-blue text-white hover:bg-blue-600" onClick={onOpenNew}>Agregar nuevo</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-600">Fecha (Desde)</label>
            <Input type="date" value={filters.startDate || ""} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined }))} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Fecha (Hasta)</label>
            <Input type="date" value={filters.endDate || ""} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined }))} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Plan Médico</label>
            <Select value={filters.plan || ""} onValueChange={(v) => setFilters(f => ({ ...f, plan: v || undefined }))}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {PLAN_OPTIONS.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Estado</label>
            <Select value={filters.status || ""} onValueChange={(v) => setFilters(f => ({ ...f, status: v || undefined }))}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {STATUS_OPTIONS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Facturado por</label>
            <Input placeholder="Iniciales / nombre / entidad" value={filters.billedBy || ""} onChange={(e) => setFilters(f => ({ ...f, billedBy: e.target.value || undefined }))} />
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha CK</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead># CK</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Facturado por</TableHead>
                <TableHead>Desde/Hasta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Iniciales</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11}>Cargando...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={11}>Sin registros</TableCell></TableRow>
              ) : (
                logs.map(row => (
                  <TableRow key={row.id} className="cursor-pointer hover:bg-blue-50/40" onClick={() => onOpenEdit(row)}>
                    <TableCell>{fmt((row as any).ckDate as any)}</TableCell>
                    <TableCell>{(row as any).plan}</TableCell>
                    <TableCell>{(row as any).checkNumber}</TableCell>
                    <TableCell>{(row as any).segment}</TableCell>
                    <TableCell>{(row as any).invoice}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={(row as any).notes || ""}>{(row as any).notes}</TableCell>
                    <TableCell>{(row as any).billedBy}</TableCell>
                    <TableCell>{fmt((row as any).fromDate as any)} { (row as any).fromDate || (row as any).toDate ? " / " : "" } {fmt((row as any).toDate as any)}</TableCell>
                    <TableCell>{(row as any).status}</TableCell>
                    <TableCell>{(row as any).initials}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onOpenEdit(row); }}>Editar</Button>
                      <Button variant="outline" size="sm" className="ml-2 text-red-600 border-red-300" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal crear/editar */}
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar registro" : "Agregar nuevo registro"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-600">Fecha CK</label>
                <Input type="date" value={ckDate} onChange={(e) => setCkDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Plan Médico</label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600"># CK</label>
                <Input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Segmento</label>
                <Input value={segment} onChange={(e) => setSegment(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Factura</label>
                <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs text-gray-600">Notas</label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Facturado por</label>
                <Input value={billedBy} onChange={(e) => setBilledBy(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Desde</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Hasta</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Estado</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Iniciales</label>
                <Input value={initials} onChange={(e) => setInitials(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {editing && (
                <Button variant="outline" className="text-red-600 border-red-300" onClick={() => deleteMutation.mutate(editing.id)}>
                  Eliminar
                </Button>
              )}
              <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancelar</Button>
              <Button className="bg-primary-blue text-white hover:bg-blue-600" onClick={() => (editing ? updateMutation.mutate() : createMutation.mutate())}>
                {editing ? "Guardar cambios" : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
