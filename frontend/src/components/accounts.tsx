import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useData } from "../lib/data-context";
import { AccountsChatbot } from "./accounts-chatbot";
import { Button } from "./ui/button";
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
import { Toaster, toast } from "sonner";
import { GoogleAdsSyncControls } from "./google-ads-sync-controls";
import { API_BASE_URL } from "../lib/api";
import { formatCurrency } from "../lib/currencies";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";

interface AccountsProps {
  onClientClick?: (clientId: string) => void;
}

export function Accounts({ onClientClick }: AccountsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientPendingDelete, setClientPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [clientPendingEdit, setClientPendingEdit] = useState<{ id: string; name: string; customerIds?: string[] } | null>(null);
  const [editCustomerIds, setEditCustomerIds] = useState<string[]>([]);
  const [editCustomerIdInput, setEditCustomerIdInput] = useState("");
  const [editCustomerIdError, setEditCustomerIdError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { clients, clientsLoading, deleteClient, updateClient, viewerRole } = useData();

  const isAdmin = viewerRole === "admin";
  const hasClients = clients.length > 0;

  const filteredClients = useMemo(() => {
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.industry && client.industry.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [clients, searchQuery]);

  const parseCustomerIdTokens = (raw: string) =>
    raw
      .split(/[,\s]+/)
      .map((token) => token.replace(/\D/g, "").trim())
      .filter(Boolean);

  const openEditDialog = (client: { id: string; name: string; customerIds?: string[] }) => {
    setClientPendingEdit(client);
    setEditCustomerIds(client.customerIds ?? []);
    setEditCustomerIdInput("");
    setEditCustomerIdError(null);
    setIsEditDialogOpen(true);
  };

  const addEditCustomerIdsFromInput = () => {
    const tokens = parseCustomerIdTokens(editCustomerIdInput);
    if (!tokens.length) {
      setEditCustomerIdError("Please enter at least one numeric customer ID.");
      return;
    }

    setEditCustomerIdError(null);
    setEditCustomerIds((prev) => {
      const existing = new Set(prev);
      const next = [...prev];
      tokens.forEach((id) => {
        if (!existing.has(id)) {
          existing.add(id);
          next.push(id);
        }
      });
      return next;
    });
    setEditCustomerIdInput("");
  };

  const removeEditCustomerId = (id: string) => {
    setEditCustomerIds((prev) => prev.filter((existing) => existing !== id));
  };

  const handleSaveCustomerIds = async () => {
    if (!clientPendingEdit) return;

    const sanitizedIds = editCustomerIds.map((id) => id.replace(/\D/g, "").trim()).filter(Boolean);
    if (!sanitizedIds.length) {
      setEditCustomerIdError("Add at least one valid customer ID before saving.");
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateClient(clientPendingEdit.id, {
        customer_ids: sanitizedIds,
        // customer_id: sanitizedIds.join(","),
      });
      toast.success("Client updated", {
        description: "Customer IDs saved successfully.",
      });
      setIsEditDialogOpen(false);
      setClientPendingEdit(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update client";
      toast.error("Unable to save changes", { description: message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  /**
   * Launch the Google OAuth flow for a particular client record.
   * Backend is expected to expose /auth/google-connect?client_db_id=<id>
   */
  const handleGoogleOAuthConnect = (clientId: string | number, clientName: string) => {
    // ensure clientId is string and safely encoded
    const idStr = String(clientId);
    const oauthUrl = `${API_BASE_URL}/auth/google-connect?client_db_id=${encodeURIComponent(idStr)}`;

    if (typeof window === "undefined") {
      toast.error("Unable to launch Google OAuth", {
        description: "A browser window is required to complete the Google consent flow.",
      });
      return;
    }

    try {
      // open in new tab - backend will 302 to Google and set state cookie
      const win = window.open(oauthUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.error("Popup blocked", {
          description: "Please allow popups for this site or use the Connect link directly.",
        });
        return;
      }
      toast.info("Google OAuth launched", {
        description: `Complete the Google consent screen for ${clientName} to sync live Google Ads data.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to open OAuth window";
      toast.error("Google OAuth failed", { description: message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Client Accounts</h1>
        <p className="text-slate-500">Manage and monitor all client Google Ads accounts</p>
      </div>

      <GoogleAdsSyncControls className="max-w-4xl" contextLabel="client account metrics" />

      {/* Client Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Accounts ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search clients by name or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Clients Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ad Spend</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-center">Google OAuth</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                      Loading clients...
                    </TableCell>
                  </TableRow>
                )}
                {!clientsLoading && hasClients && filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="hover:bg-slate-50"
                  >
                    <TableCell>
                      <p className="text-sm text-slate-900">{client.name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-slate-700">{client.industry || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                        client.status === "healthy"
                          ? "bg-green-100 text-green-800"
                          : client.status === "warning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {client.status === "healthy" ? "Healthy" : client.status === "warning" ? "Warning" : "Critical"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-slate-900">{formatCurrency(client.adSpend, client.currencyCode)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-slate-900">{client.conversions.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-slate-900">{client.roas.toFixed(2)}x</p>
                    </TableCell>
                    <TableCell className="text-center">
                      {client.hasGoogleOAuth ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          Connected
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGoogleOAuthConnect(client.id, client.name)}
                        >
                          Connect
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onClientClick?.(client.id)}>
                          View Details
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(client)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setClientPendingDelete({ id: client.id, name: client.name });
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!clientsLoading && !hasClients && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                      No client accounts added yet. Connect a Google Ads account to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!clientsLoading && hasClients && filteredClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No clients found matching your search</p>
            </div>
          )}
      </CardContent>
    </Card>

    {/* AI Chatbot Assistant */}
    <AccountsChatbot />

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setClientPendingEdit(null);
            setEditCustomerIds([]);
            setEditCustomerIdInput("");
            setEditCustomerIdError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer IDs</DialogTitle>
            <DialogDescription>
              Update Google Ads customer IDs linked to this client account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900">{clientPendingEdit?.name}</p>
              <p className="text-xs text-slate-500">Add or remove customer IDs as needed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer-id">Customer IDs</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="edit-customer-id"
                  placeholder="e.g., 1234567890"
                  value={editCustomerIdInput}
                  onChange={(event) => setEditCustomerIdInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addEditCustomerIdsFromInput();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addEditCustomerIdsFromInput}>
                  Add ID
                </Button>
              </div>

              {editCustomerIdError && (
                <p className="text-xs text-destructive">{editCustomerIdError}</p>
              )}

              {!!editCustomerIds.length && (
                <div className="flex flex-wrap gap-2">
                  {editCustomerIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      <span className="font-medium">{id}</span>
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-900"
                        onClick={() => removeEditCustomerId(id)}
                        aria-label={`Remove customer ID ${id}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500">
                Enter one or more numeric IDs separated by commas or spaces. Duplicates are ignored.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCustomerIds} disabled={isSavingEdit || !clientPendingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <AlertDialog
      open={isDeleteDialogOpen}
      onOpenChange={(open: boolean) => {
        setIsDeleteDialogOpen(open);
          if (!open && !isDeleting) {
            setClientPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Account?</AlertDialogTitle>
            <AlertDialogDescription>
              {clientPendingDelete ? (
                <span>
                  Are you sure you want to delete <strong>{clientPendingDelete.name}</strong>? This action cannot be undone and
                  will permanently remove the client&apos;s account access.
                </span>
              ) : (
                "Are you sure you want to delete this client?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={async () => {
                if (!clientPendingDelete) return;
                setIsDeleting(true);
                try {
                  await deleteClient(clientPendingDelete.id);
                  toast.success("Client deleted", {
                    description: `${clientPendingDelete.name} has been removed from your managed accounts.`,
                  });
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Failed to delete client";
                  toast.error("Unable to delete client", { description: message });
                } finally {
                  setIsDeleting(false);
                  setIsDeleteDialogOpen(false);
                  setClientPendingDelete(null);
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
