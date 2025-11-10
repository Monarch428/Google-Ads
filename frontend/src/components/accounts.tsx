import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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

interface AccountsProps {
  onClientClick?: (clientId: string) => void;
}

export function Accounts({ onClientClick }: AccountsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { clients, clientsLoading } = useData();

  const filteredClients = useMemo(() => {
    return clients.filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.industry && client.industry.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [clients, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-slate-900">Client Accounts</h1>
        <p className="text-slate-500">Manage and monitor all client Google Ads accounts</p>
      </div>

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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-slate-500">
                      Loading clients...
                    </TableCell>
                  </TableRow>
                )}
                {!clientsLoading && filteredClients.map((client) => (
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
                      <p className="text-sm text-slate-900">${client.adSpend.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-slate-900">{client.conversions.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-sm text-slate-900">{client.roas.toFixed(2)}x</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => onClientClick?.(client.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!clientsLoading && filteredClients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No clients found matching your search</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Chatbot Assistant */}
      <AccountsChatbot />
    </div>
  );
}
