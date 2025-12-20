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
  MoreVertical
} from "lucide-react";
import { Manager } from "../lib/mock-data";
import { useData } from "../lib/data-context";
import { createUser, updateUser, type UserRole } from "../lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner@2.0.3";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "senior_manager", label: "Senior Manager" },
  { value: "manager", label: "Manager" },
  { value: "junior_manager", label: "Junior Manager" },
];

function getRoleValueFromLabel(label: string): UserRole {
  const normalized = label.toLowerCase();
  const match = ROLE_OPTIONS.find((option) => option.label.toLowerCase() === normalized);
  if (match) {
    return match.value;
  }

  if (normalized.includes("senior")) return "senior_manager";
  if (normalized.includes("junior")) return "junior_manager";
  if (normalized.includes("admin")) return "admin";
  return "manager";
}

interface UserManagementProps {
  onManagerClick?: (manager: Manager) => void;
}

export function UserManagement({ onManagerClick }: UserManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAddClients, setSelectedAddClients] = useState<string[]>([]);
  const [selectedEditClients, setSelectedEditClients] = useState<string[]>([]);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "manager" as UserRole,
    status: "active",
    password: "",
    confirmPassword: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "manager" as UserRole,
    status: "active",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingManager, setIsDeletingManager] = useState(false);
  const { managers, managersLoading, clients, refreshManagers, refreshClients, deleteManager, authToken } = useData();

  const displayManagers = managers;
  const displayClients = clients;

  const resetAddForm = useCallback(() => {
    setAddForm({
      name: "",
      email: "",
      role: "manager" as UserRole,
      status: "active",
      password: "",
      confirmPassword: "",
    });
    setSelectedAddClients([]);
    setIsCreating(false);
  }, []);

  useEffect(() => {
    if (!isAddDialogOpen) {
      resetAddForm();
    }
  }, [isAddDialogOpen, resetAddForm]);

  useEffect(() => {
    if (selectedManager) {
      setEditForm({
        name: selectedManager.name,
        email: selectedManager.email,
        role: getRoleValueFromLabel(selectedManager.role),
        status: selectedManager.status,
      });
      setSelectedEditClients(selectedManager.assignedClientIds ?? []);
    } else {
      setSelectedEditClients([]);
    }
  }, [selectedManager]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      setIsSaving(false);
    }
  }, [isEditDialogOpen]);

  // Filter managers based on search and status
  const filteredManagers = useMemo(() => {
    return displayManagers.filter(manager => {
      const matchesSearch = manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           manager.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || manager.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [displayManagers, searchQuery, statusFilter]);

  const handleEditClick = (manager: Manager) => {
    setSelectedManager(manager);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (manager: Manager) => {
    setSelectedManager(manager);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedManager) return;
    setIsDeletingManager(true);

    try {
      await deleteManager(selectedManager.id);
      toast.success(`${selectedManager.name} removed`);
      setIsDeleteDialogOpen(false);
      setSelectedManager(null);
    } catch (error) {
      console.error("Failed to remove manager", error);
      const message = error instanceof Error ? error.message : "Failed to remove manager";
      toast.error(message);
    } finally {
      setIsDeletingManager(false);
    }
  }, [deleteManager, selectedManager]);

  const handleViewActivityClick = (manager: Manager) => {
    if (onManagerClick) {
      onManagerClick(manager);
    }
  };

  const handleAddClientToggle = useCallback((clientId: string) => {
    setSelectedAddClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  }, []);

  const handleAddFieldChange = useCallback(
    (
      field: "name" | "email" | "role" | "status" | "password" | "confirmPassword",
      value: string,
    ) => {
      setAddForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleEditClientToggle = useCallback((clientId: string) => {
    setSelectedEditClients((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  }, []);

  const handleEditFieldChange = useCallback(
    (field: "name" | "email" | "role" | "status", value: string) => {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleCreateManager = useCallback(async () => {
    if (isCreating) {
      return;
    }

    const name = addForm.name.trim();
    const email = addForm.email.trim();
    const password = addForm.password;
    const confirmPassword = addForm.confirmPassword;

    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }

    if (!password || !confirmPassword) {
      toast.error("Password and confirmation are required");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (!authToken) {
      toast.error("Admin authentication required to create managers");
      return;
    }

    const clientIds = selectedAddClients
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    try {
      setIsCreating(true);
      await createUser(
        {
          name,
          email,
          password,
          role: addForm.role,
          is_active: addForm.status === "active",
          assigned_client_ids: clientIds.length ? clientIds : undefined,
        },
        authToken,
      );
      toast.success("New Ad Manager created successfully");
      resetAddForm();
      setIsAddDialogOpen(false);
      await Promise.all([refreshManagers(), refreshClients()]);
    } catch (error) {
      console.error("Failed to create manager", error);
      toast.error(error instanceof Error ? error.message : "Failed to create manager");
    } finally {
      setIsCreating(false);
    }
  }, [
    addForm.confirmPassword,
    addForm.email,
    addForm.name,
    addForm.password,
    addForm.role,
    addForm.status,
    isCreating,
    authToken,
    refreshClients,
    refreshManagers,
    resetAddForm,
    selectedAddClients,
  ]);

  const handleSaveChanges = useCallback(async () => {
    if (!selectedManager) {
      return;
    }

    const name = editForm.name.trim();
    const email = editForm.email.trim();

    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }

    const resolvedRoleLabel =
      ROLE_OPTIONS.find((option) => option.value === editForm.role)?.label ?? selectedManager.role;

    const nextManagerState: Manager = {
      ...selectedManager,
      name,
      email,
      role: resolvedRoleLabel,
      status: editForm.status as Manager["status"],
      clientsAssigned: selectedEditClients.length || selectedManager.clientsAssigned,
      assignedClientIds: selectedEditClients,
    };

    if (!authToken) {
      toast.info("No authenticated session detected. Changes saved locally only.");
      setSelectedManager(nextManagerState);
      setIsEditDialogOpen(false);
      return;
    }

    try {
      setIsSaving(true);
      const clientIds = selectedEditClients
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);
      await updateUser(Number(selectedManager.id), {
        name,
        email,
        role: editForm.role,
        is_active: editForm.status === "active",
        assigned_client_ids: clientIds,
      }, authToken);

      setSelectedManager(nextManagerState);
      toast.success("Manager updated successfully");
      setIsEditDialogOpen(false);
      await Promise.all([refreshManagers(), refreshClients()]);
      setSelectedManager(null);
    } catch (error) {
      console.error("Failed to update manager", error);
      toast.error(error instanceof Error ? error.message : "Failed to update manager");
    } finally {
      setIsSaving(false);
    }
  }, [
    authToken,
    editForm.email,
    editForm.name,
    editForm.role,
    editForm.status,
    refreshClients,
    refreshManagers,
    selectedEditClients,
    selectedManager,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage Ad Managers and account assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Manager
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Ad Manager</DialogTitle>
              <DialogDescription>
                Create a new Ad Manager account and assign client accounts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">Full Name *</Label>
                  <Input
                    id="add-name"
                    placeholder="John Doe"
                    value={addForm.name}
                    onChange={(event) => handleAddFieldChange("name", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-email">Email *</Label>
                  <Input
                    id="add-email"
                    type="email"
                    placeholder="john@agency.com"
                    value={addForm.email}
                    onChange={(event) => handleAddFieldChange("email", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-role">Role *</Label>
                  <Select
                    value={addForm.role}
                    onValueChange={(value) => handleAddFieldChange("role", value)}
                  >
                    <SelectTrigger id="add-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-status">Status *</Label>
                  <Select
                    value={addForm.status}
                    onValueChange={(value) => handleAddFieldChange("status", value)}
                  >
                    <SelectTrigger id="add-status">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Input
                    id="add-password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={addForm.password}
                    onChange={(event) => handleAddFieldChange("password", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-confirm-password">Confirm Password *</Label>
                  <Input
                    id="add-confirm-password"
                    type="password"
                    placeholder="Confirm password"
                    value={addForm.confirmPassword}
                    onChange={(event) => handleAddFieldChange("confirmPassword", event.target.value)}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Assign Client Accounts</Label>
                <p className="text-xs text-slate-500 mb-3">Select which clients this manager will oversee</p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {displayClients.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-500 text-center">
                      No clients available. Add clients to assign them to managers.
                    </p>
                  ) : (
                    displayClients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={selectedAddClients.includes(client.id)}
                          onCheckedChange={() => handleAddClientToggle(client.id)}
                        />
                        <label
                          htmlFor={`client-${client.id}`}
                          className="text-sm text-slate-900 cursor-pointer flex-1"
                        >
                          {client.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedAddClients.length} client(s) selected
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetAddForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateManager} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Manager"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search managers by name or email..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 border-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Total Managers</p>
                <p className="text-slate-900">{displayManagers.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Active Managers</p>
                <p className="text-slate-900 text-green-600">
                  {displayManagers.filter(m => m.status === "active").length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Total Clients Managed</p>
                <p className="text-slate-900">
                  {displayManagers.reduce((sum, m) => sum + m.clientsAssigned, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Pending Reviews</p>
                <p className="text-slate-900 text-yellow-600">
                  {displayManagers.reduce((sum, m) => sum + m.recommendationsPending, 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Managers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Managers</CardTitle>
        </CardHeader>
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
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    Loading managers...
                  </TableCell>
                </TableRow>
              ) : filteredManagers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    No managers found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredManagers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm">
                            {manager.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-900">{manager.name}</p>
                          <p className="text-xs text-slate-500">{manager.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-900">{manager.role}</p>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={manager.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {manager.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{manager.clientsAssigned}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">
                            {manager.recommendationsApproved} Approved
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-yellow-600" />
                          <span className="text-xs text-yellow-600">
                            {manager.recommendationsPending} Pending
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-600">
                            {manager.actionBundlesCreated} Bundles
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Avg: {manager.avgTimeToApproval}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(manager)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewActivityClick(manager)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteClick(manager)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove Manager
                          </DropdownMenuItem>
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

      {/* Edit Manager Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Manager</DialogTitle>
            <DialogDescription>
              Update manager details and client assignments
            </DialogDescription>
          </DialogHeader>
          {selectedManager && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(event) => handleEditFieldChange("name", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(event) => handleEditFieldChange("email", event.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select value={editForm.role} onValueChange={(value) => handleEditFieldChange("role", value)}>
                    <SelectTrigger id="edit-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => handleEditFieldChange("status", value)}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Assign Client Accounts</Label>
                <p className="text-xs text-slate-500 mb-3">
                  Currently managing {selectedEditClients.length || selectedManager.clientsAssigned} client(s)
                </p>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                  {displayClients.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-500 text-center">
                      No clients available to assign.
                    </p>
                  ) : (
                    displayClients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-client-${client.id}`}
                          checked={selectedEditClients.includes(client.id)}
                          onCheckedChange={() => handleEditClientToggle(client.id)}
                        />
                        <label
                          htmlFor={`edit-client-${client.id}`}
                          className="text-sm text-slate-900 cursor-pointer flex-1"
                        >
                          {client.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <Separator />
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <h4 className="text-sm text-slate-900">Activity Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Reviewed</p>
                    <p className="text-slate-900">{selectedManager.recommendationsReviewed}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Action Bundles</p>
                    <p className="text-slate-900">{selectedManager.actionBundlesCreated}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avg Response</p>
                    <p className="text-slate-900">{selectedManager.avgTimeToApproval}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedManager(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingManager}
              onClick={handleConfirmDelete}
            >
              {isDeletingManager ? "Removing..." : "Remove Manager"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
