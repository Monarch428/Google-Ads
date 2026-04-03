import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import {
  UserPlus,
  Search,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Filter,
  MoreVertical,
  Megaphone,
  Globe,
  BarChart2,
  Shield,
  ShieldOff,
} from "lucide-react";
import { Manager } from "../lib/mock-data";
import { useData } from "../lib/data-context";
import { createUser, updateUser } from "../lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";

// ─── Module Access Types & Constants ────────────────────────────────────────

const MODULE_PAGES = ["dashboard", "inputs", "projects", "reports", "settings"] as const;
type ModulePage = (typeof MODULE_PAGES)[number];

type ModuleAccess = {
  gads: ModulePage[];
  seo: ModulePage[];
  website: ModulePage[];
};

const DEFAULT_MODULE_ACCESS: ModuleAccess = { gads: [], seo: [], website: [] };

const PAGE_LABELS: Record<ModulePage, string> = {
  dashboard: "Dashboard",
  inputs: "Inputs",
  projects: "Projects",
  reports: "Reports",
  settings: "Project Settings",
};

const MODULE_CONFIG = [
  {
    key: "gads" as const,
    label: "G-Ads",
    badge: "Google Ads",
    Icon: Megaphone,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-50 text-blue-700",
    activeBorder: "border-blue-200",
    activeHeader: "bg-blue-50/60",
    toggleActive: "bg-blue-600",
  },
  {
    key: "seo" as const,
    label: "SEO",
    badge: "Search Optimization",
    Icon: BarChart2,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-50 text-emerald-700",
    activeBorder: "border-emerald-200",
    activeHeader: "bg-emerald-50/60",
    toggleActive: "bg-emerald-600",
  },
  {
    key: "website" as const,
    label: "Website",
    badge: "Web Management",
    Icon: Globe,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    badgeBg: "bg-pink-50 text-pink-700",
    activeBorder: "border-pink-200",
    activeHeader: "bg-pink-50/60",
    toggleActive: "bg-pink-600",
  },
] as const;

// ─── Role Options ────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "senior", label: "Senior Ad Manager" },
  { value: "manager", label: "Ad Manager" },
  { value: "junior", label: "Junior Ad Manager" },
  { value: "admin", label: "Administrator" },
];

function getRoleValueFromLabel(label: string): string {
  const normalized = label.toLowerCase();
  const match = ROLE_OPTIONS.find((o) => o.label.toLowerCase() === normalized);
  if (match) return match.value;
  if (normalized.includes("senior")) return "senior";
  if (normalized.includes("junior")) return "junior";
  if (normalized.includes("admin")) return "admin";
  return "manager";
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface UserManagementProps {
  onManagerClick?: (manager: Manager) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserManagement({ onManagerClick }: UserManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Add form state ──
  const [selectedAddClients, setSelectedAddClients] = useState<string[]>([]);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "manager",
    status: "active",
    password: "",
    confirmPassword: "",
  });

  // ── Edit form state ──
  const [selectedEditClients, setSelectedEditClients] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "manager",
    status: "active",
  });

  // ── Module access state ──
  const [editModuleAccess, setEditModuleAccess] = useState<ModuleAccess>(DEFAULT_MODULE_ACCESS);

  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingManager, setIsDeletingManager] = useState(false);

  const {
    managers,
    managersLoading,
    clients,
    refreshManagers,
    refreshClients,
    deleteManager,
    authToken,
  } = useData();

  const displayManagers = managers;
  const displayClients = clients;

  // ─── Reset add form ───────────────────────────────────────────────────────

  const resetAddForm = useCallback(() => {
    setAddForm({ name: "", email: "", role: "manager", status: "active", password: "", confirmPassword: "" });
    setSelectedAddClients([]);
    setIsCreating(false);
  }, []);

  useEffect(() => {
    if (!isAddDialogOpen) resetAddForm();
  }, [isAddDialogOpen, resetAddForm]);

  // ─── Populate edit form ───────────────────────────────────────────────────

  useEffect(() => {
    if (selectedManager) {
      setEditForm({
        name: selectedManager.name,
        email: selectedManager.email,
        role: getRoleValueFromLabel(selectedManager.role),
        status: selectedManager.status,
      });
      setSelectedEditClients(selectedManager.assignedClientIds ?? []);
      const access = (selectedManager as any).module_access;
      setEditModuleAccess(access ?? DEFAULT_MODULE_ACCESS);
    } else {
      setSelectedEditClients([]);
      setEditModuleAccess(DEFAULT_MODULE_ACCESS);
    }
  }, [selectedManager]);

  useEffect(() => {
    if (!isEditDialogOpen) setIsSaving(false);
  }, [isEditDialogOpen]);

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filteredManagers = useMemo(
    () =>
      displayManagers.filter((m) => {
        const matchesSearch =
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || m.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [displayManagers, searchQuery, statusFilter],
  );

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleEditClick = (manager: Manager) => { setSelectedManager(manager); setIsEditDialogOpen(true); };
  const handleDeleteClick = (manager: Manager) => { setSelectedManager(manager); setIsDeleteDialogOpen(true); };
  const handleViewActivityClick = (manager: Manager) => { onManagerClick?.(manager); };

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedManager) return;
    setIsDeletingManager(true);
    try {
      await deleteManager(selectedManager.id);
      toast.success(`${selectedManager.name} removed`);
      setIsDeleteDialogOpen(false);
      setSelectedManager(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove manager");
    } finally {
      setIsDeletingManager(false);
    }
  }, [deleteManager, selectedManager]);

  const handleAddClientToggle = useCallback(
    (clientId: string) => setSelectedAddClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]),
    [],
  );

  const handleAddFieldChange = useCallback(
    (field: keyof typeof addForm, value: string) => setAddForm((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const handleEditClientToggle = useCallback(
    (clientId: string) => setSelectedEditClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]),
    [],
  );

  const handleEditFieldChange = useCallback(
    (field: keyof typeof editForm, value: string) => setEditForm((prev) => ({ ...prev, [field]: value })),
    [],
  );

  // ── Module-level toggle (enable/disable entire module) ──
  const handleModuleToggle = useCallback(
    (module: keyof ModuleAccess) =>
      setEditModuleAccess((prev) => {
        const isFullyEnabled = prev[module].length === MODULE_PAGES.length;
        return {
          ...prev,
          [module]: isFullyEnabled ? [] : [...MODULE_PAGES],
        };
      }),
    [],
  );

  // ── Select All / Deselect All per module ──
  const handleSelectAll = useCallback(
    (module: keyof ModuleAccess) =>
      setEditModuleAccess((prev) => ({
        ...prev,
        [module]: prev[module].length === MODULE_PAGES.length ? [] : [...MODULE_PAGES],
      })),
    [],
  );

  // ── Page-level toggle ──
  const handleModulePageToggle = useCallback(
    (module: keyof ModuleAccess, page: ModulePage) =>
      setEditModuleAccess((prev) => {
        const current = prev[module];
        return {
          ...prev,
          [module]: current.includes(page)
            ? current.filter((p) => p !== page)
            : [...current, page],
        };
      }),
    [],
  );

  // ─── Create manager ───────────────────────────────────────────────────────

  const handleCreateManager = useCallback(async () => {
    if (isCreating) return;
    const name = addForm.name.trim();
    const email = addForm.email.trim();
    const { password, confirmPassword } = addForm;
    if (!name || !email) return toast.error("Name and email are required");
    if (!password || !confirmPassword) return toast.error("Password and confirmation are required");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters long");
    if (!authToken) return toast.error("Admin authentication required to create managers");

    const clientIds = selectedAddClients.map(Number).filter((id) => Number.isFinite(id) && id > 0);
    try {
      setIsCreating(true);
      await createUser(
        { name, email, password, role: addForm.role, is_active: addForm.status === "active", assigned_client_ids: clientIds.length ? clientIds : undefined },
        authToken,
      );
      toast.success("New Ad Manager created successfully");
      resetAddForm();
      setIsAddDialogOpen(false);
      await Promise.all([refreshManagers(), refreshClients()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create manager");
    } finally {
      setIsCreating(false);
    }
  }, [addForm, isCreating, authToken, selectedAddClients, refreshClients, refreshManagers, resetAddForm]);

  // ─── Save edit ────────────────────────────────────────────────────────────

  const handleSaveChanges = useCallback(async () => {
    if (!selectedManager) return;
    const name = editForm.name.trim();
    const email = editForm.email.trim();
    if (!name || !email) return toast.error("Name and email are required");

    const resolvedRoleLabel = ROLE_OPTIONS.find((o) => o.value === editForm.role)?.label ?? selectedManager.role;
    const nextManagerState: Manager = {
      ...selectedManager,
      name, email,
      role: resolvedRoleLabel,
      status: editForm.status as Manager["status"],
      clientsAssigned: selectedEditClients.length || selectedManager.clientsAssigned,
      assignedClientIds: selectedEditClients,
      module_access: editModuleAccess,
    } as any;

    if (!authToken) {
      toast.info("No authenticated session. Changes saved locally only.");
      setSelectedManager(nextManagerState);
      setIsEditDialogOpen(false);
      return;
    }

    try {
      setIsSaving(true);
      const clientIds = selectedEditClients.map(Number).filter((id) => Number.isFinite(id) && id > 0);
      await updateUser(
        Number(selectedManager.id),
        { name, email, role: editForm.role, is_active: editForm.status === "active", assigned_client_ids: clientIds, module_access: editModuleAccess } as any,
        authToken,
      );
      setSelectedManager(nextManagerState);
      toast.success("Manager updated successfully");
      setIsEditDialogOpen(false);
      await Promise.all([refreshManagers(), refreshClients()]);
      setSelectedManager(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update manager");
    } finally {
      setIsSaving(false);
    }
  }, [authToken, editForm, editModuleAccess, refreshClients, refreshManagers, selectedEditClients, selectedManager]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage Ad Managers and account assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="w-4 h-4 mr-2" />Add New Manager</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Ad Manager</DialogTitle>
              <DialogDescription>Create a new Ad Manager account and assign client accounts</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">Full Name *</Label>
                  <Input id="add-name" placeholder="John Doe" value={addForm.name} onChange={(e) => handleAddFieldChange("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-email">Email *</Label>
                  <Input id="add-email" type="email" placeholder="john@agency.com" value={addForm.email} onChange={(e) => handleAddFieldChange("email", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-role">Role *</Label>
                  <Select value={addForm.role} onValueChange={(v: any) => handleAddFieldChange("role", v)}>
                    <SelectTrigger id="add-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-status">Status *</Label>
                  <Select value={addForm.status} onValueChange={(v: any) => handleAddFieldChange("status", v)}>
                    <SelectTrigger id="add-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-password">Password *</Label>
                  <Input id="add-password" type="password" placeholder="Enter a secure password" value={addForm.password} onChange={(e) => handleAddFieldChange("password", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-confirm-password">Confirm Password *</Label>
                  <Input id="add-confirm-password" type="password" placeholder="Confirm password" value={addForm.confirmPassword} onChange={(e) => handleAddFieldChange("confirmPassword", e.target.value)} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Assign Client Accounts</Label>
                <p className="text-xs text-slate-500 mb-3">Select which clients this manager will oversee</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {displayClients.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-500 text-center">No clients available.</p>
                  ) : (
                    displayClients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox id={`client-${client.id}`} checked={selectedAddClients.includes(client.id)} onCheckedChange={() => handleAddClientToggle(client.id)} />
                        <label htmlFor={`client-${client.id}`} className="text-sm text-slate-900 cursor-pointer flex-1">{client.name}</label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">{selectedAddClients.length} client(s) selected</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateManager} disabled={isCreating}>{isCreating ? "Creating..." : "Create Manager"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search managers by name or email..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 border-0 shadow-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Managers", value: displayManagers.length, valueClass: "text-slate-900", Icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Active Managers", value: displayManagers.filter((m) => m.status === "active").length, valueClass: "text-green-600", Icon: CheckCircle, iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Total Clients Managed", value: displayManagers.reduce((s, m) => s + m.clientsAssigned, 0), valueClass: "text-slate-900", Icon: TrendingUp, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
          { label: "Pending Reviews", value: displayManagers.reduce((s, m) => s + m.recommendationsPending, 0), valueClass: "text-yellow-600", Icon: Clock, iconBg: "bg-yellow-50", iconColor: "text-yellow-600" },
        ].map(({ label, value, valueClass, Icon, iconBg, iconColor }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`text-slate-900 ${valueClass}`}>{value}</p>
                </div>
                <div className={`p-3 ${iconBg} rounded-lg`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Managers Table ── */}
      <Card>
        <CardHeader><CardTitle>Ad Managers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manager</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clients</TableHead>
                <TableHead>Recommendations</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managersLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8">Loading managers...</TableCell></TableRow>
              ) : filteredManagers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8">No managers found matching your criteria</TableCell></TableRow>
              ) : (
                filteredManagers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm">{manager.name.split(" ").map((n) => n[0]).join("").toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-slate-900">{manager.name}</p>
                          <p className="text-xs text-slate-500">{manager.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><p className="text-sm text-slate-900">{manager.role}</p></TableCell>
                    <TableCell><Badge variant={manager.status === "active" ? "default" : "secondary"} className="capitalize">{manager.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{manager.clientsAssigned}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-600" /><span className="text-xs text-green-600">{manager.recommendationsApproved} Approved</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-yellow-600" /><span className="text-xs text-yellow-600">{manager.recommendationsPending} Pending</span></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1"><Activity className="w-3 h-3 text-slate-400" /><span className="text-xs text-slate-600">{manager.actionBundlesCreated} Bundles</span></div>
                        <p className="text-xs text-slate-500">Avg: {manager.avgTimeToApproval}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(manager)}><Edit className="w-4 h-4 mr-2" />Edit Manager</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewActivityClick(manager)}><Eye className="w-4 h-4 mr-2" />View Activity</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(manager)}><Trash2 className="w-4 h-4 mr-2" />Remove Manager</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Edit Manager Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
            <DialogDescription>Update manager details, client assignments and module access</DialogDescription>
          </DialogHeader>

          {selectedManager && (
            <div className="space-y-4 py-4">
              {/* Name + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input id="edit-name" value={editForm.name} onChange={(e) => handleEditFieldChange("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => handleEditFieldChange("email", e.target.value)} />
                </div>
              </div>

              {/* Role + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select value={editForm.role} onValueChange={(v: any) => handleEditFieldChange("role", v)}>
                    <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select value={editForm.status} onValueChange={(v: any) => handleEditFieldChange("status", v)}>
                    <SelectTrigger id="edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Assign Clients */}
              <div className="space-y-2">
                <Label>Assign Client Accounts</Label>
                <p className="text-xs text-slate-500 mb-3">Currently managing {selectedEditClients.length || selectedManager.clientsAssigned} client(s)</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {displayClients.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-500 text-center">No clients available to assign.</p>
                  ) : (
                    displayClients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox id={`edit-client-${client.id}`} checked={selectedEditClients.includes(client.id)} onCheckedChange={() => handleEditClientToggle(client.id)} />
                        <label htmlFor={`edit-client-${client.id}`} className="text-sm text-slate-900 cursor-pointer flex-1">{client.name}</label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* ── Module Access — Redesigned ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Module Access</Label>
                    <p className="text-xs text-slate-500 mt-0.5">Toggle modules on/off or fine-tune page access</p>
                  </div>
                  {/* Grant All / Revoke All */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditModuleAccess({ gads: [...MODULE_PAGES], seo: [...MODULE_PAGES], website: [...MODULE_PAGES] })}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                    >
                      <Shield className="w-3 h-3" />
                      Grant All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModuleAccess(DEFAULT_MODULE_ACCESS)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ShieldOff className="w-3 h-3" />
                      Revoke All
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {MODULE_CONFIG.map(({ key, label, badge, Icon, iconBg, iconColor, badgeBg, activeBorder, activeHeader, toggleActive }) => {
                    const enabledPages = editModuleAccess[key];
                    const enabledCount = enabledPages.length;
                    const isModuleOn = enabledCount > 0;
                    const isAllSelected = enabledCount === MODULE_PAGES.length;

                    return (
                      <div
                        key={key}
                        className={`border rounded-xl overflow-hidden transition-all duration-200 ${isModuleOn ? activeBorder : "border-slate-200"}`}
                      >
                        {/* ── Module Header Row ── */}
                        <div className={`flex items-center justify-between px-4 py-3 ${isModuleOn ? activeHeader : "bg-slate-50"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                              <Icon className={`w-4 h-4 ${iconColor}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">{label}</p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeBg}`}>{badge}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {isModuleOn ? `${enabledCount} of ${MODULE_PAGES.length} pages` : "No access"}
                              </p>
                            </div>
                          </div>

                          {/* Right side: Select All + Module toggle */}
                          <div className="flex items-center gap-3">
                            {isModuleOn && (
                              <button
                                type="button"
                                onClick={() => handleSelectAll(key)}
                                className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
                              >
                                {isAllSelected ? "Deselect all" : "Select all"}
                              </button>
                            )}
                            {/* Toggle switch */}
                            <button
                              type="button"
                              onClick={() => handleModuleToggle(key)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${isModuleOn ? toggleActive : "bg-slate-200"}`}
                              aria-label={`Toggle ${label} module`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${isModuleOn ? "translate-x-4" : "translate-x-1"}`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* ── Page Checkboxes (only shown when module is on) ── */}
                        {isModuleOn && (
                          <div className="grid grid-cols-3 gap-x-4 gap-y-2 px-4 py-3 border-t border-slate-100">
                            {MODULE_PAGES.map((page) => {
                              const checked = enabledPages.includes(page);
                              return (
                                <button
                                  key={page}
                                  type="button"
                                  onClick={() => handleModulePageToggle(key, page)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-all duration-150 ${
                                    checked
                                      ? `${iconBg} ${iconColor} border-current/20`
                                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${checked ? "bg-current border-current" : "border-slate-300"}`}>
                                    {checked && (
                                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                  {PAGE_LABELS[page]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Activity Summary */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <h4 className="text-sm text-slate-900">Activity Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><p className="text-slate-500">Reviewed</p><p className="text-slate-900">{selectedManager.recommendationsReviewed}</p></div>
                  <div><p className="text-slate-500">Action Bundles</p><p className="text-slate-900">{selectedManager.actionBundlesCreated}</p></div>
                  <div><p className="text-slate-500">Avg Response</p><p className="text-slate-900">{selectedManager.avgTimeToApproval}</p></div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedManager(null); }}>Cancel</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedManager?.name}</strong>? This action will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Revoke access to all assigned client accounts</li>
                <li>Archive all pending recommendations ({selectedManager?.recommendationsPending || 0})</li>
                <li>Preserve historical activity data</li>
              </ul>
              <p className="mt-3 text-red-600">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={isDeletingManager} onClick={handleConfirmDelete}>
              {isDeletingManager ? "Removing..." : "Remove Manager"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
