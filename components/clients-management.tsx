"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Search, Users, Edit, Trash2, Phone, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { AddressInput } from "@/components/ui/address-input"
import { GoogleMapsProvider } from "@/components/ui/address-input/google-maps-provider"
import type { ClientAddress } from "@/types/location"
import { createClientWithUser, updateClient } from "@/app/actions/create-client-user"
import { useToast } from "@/hooks/use-toast"

interface Client {
  id: string
  name: string
  contact_number: string | null
  email: string | null
  pickup_addresses: ClientAddress[]
  delivery_addresses: ClientAddress[]
  notes: string | null
  created_at: string
  updated_at: string
}

export function ClientsManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_clients")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching clients:", error)
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("ceva_clients").delete().eq("id", id)
    if (error) {
      console.error("Error deleting client:", error)
    } else {
      fetchClients()
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_number?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <GoogleMapsProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Clients</h2>
            <p className="text-muted-foreground">Manage your clients</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No clients found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingClient(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {client.contact_number && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{client.contact_number}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {!client.contact_number && !client.email && (
                    <p className="text-muted-foreground">No contact info</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchClients()
          setShowAddDialog(false)
        }}
      />

      {editingClient && (
        <EditClientDialog
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          client={editingClient}
          onSuccess={() => {
            fetchClients()
            setEditingClient(null)
          }}
        />
      )}
      </div>
    </GoogleMapsProvider>
  )
}

function AddressListEditor({
  title,
  addresses,
  onChange,
  idPrefix,
}: {
  title: string
  addresses: ClientAddress[]
  onChange: (addresses: ClientAddress[]) => void
  idPrefix: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...addresses, { label: "", address: "" }])}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {addresses.map((addr, index) => (
        <div key={index} className="flex gap-2 items-start rounded-md border border-border p-3">
          <div className="space-y-2 flex-1">
            <Input
              placeholder="Label (e.g. Main Warehouse)"
              value={addr.label}
              onChange={(e) => {
                const updated = [...addresses]
                updated[index] = { ...updated[index], label: e.target.value }
                onChange(updated)
              }}
            />
            <AddressInput
              id={`${idPrefix}-${index}`}
              name={`${idPrefix}-${index}`}
              label=""
              value={addr.address}
              onChange={(location) => {
                const updated = [...addresses]
                updated[index] = { ...updated[index], address: location.address }
                onChange(updated)
              }}
              placeholder="Enter address or paste Google Maps link"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive mt-1 shrink-0"
            onClick={() => onChange(addresses.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {addresses.length === 0 && (
        <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added</p>
      )}
    </div>
  )
}

function AddClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: "",
    contact_number: "",
    email: "",
    pickup_addresses: [] as ClientAddress[],
    delivery_addresses: [] as ClientAddress[],
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Use server action to create client with automatic user creation
    const result = await createClientWithUser({
      name: formData.name,
      email: formData.email,
      contact_number: formData.contact_number,
      pickup_addresses: formData.pickup_addresses.filter(a => a.address),
      delivery_addresses: formData.delivery_addresses.filter(a => a.address),
      notes: formData.notes,
    })

    if (result.success) {
      toast({
        title: "Client created successfully",
        description: result.message || `Login credentials: ${formData.email} / CevaCitrus2026!`,
        variant: "default",
      })
      setFormData({ name: "", contact_number: "", email: "", pickup_addresses: [], delivery_addresses: [], notes: "" })
      onSuccess()
    } else {
      toast({
        title: "Error creating client",
        description: result.error,
        variant: "destructive",
      })
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
          <DialogDescription>Add a new client to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="e.g. +27 12 345 6789"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>
            <AddressListEditor
              title="Pickup Addresses"
              addresses={formData.pickup_addresses}
              onChange={(pickup_addresses) => setFormData({ ...formData, pickup_addresses })}
              idPrefix="add-pickup"
            />
            <AddressListEditor
              title="Delivery Addresses"
              addresses={formData.delivery_addresses}
              onChange={(delivery_addresses) => setFormData({ ...formData, delivery_addresses })}
              idPrefix="add-delivery"
            />
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: client.name,
    contact_number: client.contact_number || "",
    email: client.email || "",
    pickup_addresses: client.pickup_addresses || [],
    delivery_addresses: client.delivery_addresses || [],
    notes: client.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await updateClient(client.id, {
      name: formData.name,
      email: formData.email,
      contact_number: formData.contact_number,
      pickup_addresses: formData.pickup_addresses.filter(a => a.address),
      delivery_addresses: formData.delivery_addresses.filter(a => a.address),
      notes: formData.notes,
    })

    if (result.success) {
      toast({
        title: "Client updated successfully",
        description: result.message,
      })
      onSuccess()
    } else {
      toast({
        title: "Error updating client",
        description: result.error,
        variant: "destructive",
      })
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>Update client details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="e.g. +27 12 345 6789"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>
            <AddressListEditor
              title="Pickup Addresses"
              addresses={formData.pickup_addresses}
              onChange={(pickup_addresses) => setFormData({ ...formData, pickup_addresses })}
              idPrefix="edit-pickup"
            />
            <AddressListEditor
              title="Delivery Addresses"
              addresses={formData.delivery_addresses}
              onChange={(delivery_addresses) => setFormData({ ...formData, delivery_addresses })}
              idPrefix="edit-delivery"
            />
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
