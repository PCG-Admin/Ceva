"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Search, FileText, Edit, Trash2 } from "lucide-react"

interface Contract {
  id: string
  contract_name: string
  weight_tons: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export function ContractsManagement() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchContracts()
  }, [])

  async function fetchContracts() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_contracts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching contracts:", error)
    } else {
      setContracts(data || [])
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("ceva_contracts").delete().eq("id", id)
    if (error) {
      console.error("Error deleting contract:", error)
    } else {
      fetchContracts()
    }
  }

  const filteredContracts = contracts.filter((c) =>
    c.contract_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contracts</h2>
          <p className="text-muted-foreground">Manage contracts</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contract
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contracts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-[200px]">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No contracts found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredContracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{contract.contract_name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingContract(contract)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(contract.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Weight: {contract.weight_tons ? `${contract.weight_tons} tons` : "Not specified"}</p>
                  <p className="mt-1">
                    Created: {new Date(contract.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddContractDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchContracts()
          setShowAddDialog(false)
        }}
      />

      {editingContract && (
        <EditContractDialog
          open={!!editingContract}
          onOpenChange={(open) => !open && setEditingContract(null)}
          contract={editingContract}
          onSuccess={() => {
            fetchContracts()
            setEditingContract(null)
          }}
        />
      )}
    </div>
  )
}

function AddContractDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    contract_name: "",
    weight_tons: "",
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from("ceva_contracts").insert({
      contract_name: formData.contract_name,
      weight_tons: formData.weight_tons ? parseFloat(formData.weight_tons) : null,
      created_by: userData.user?.id,
    })

    if (error) {
      console.error("Error creating contract:", error)
    } else {
      setFormData({ contract_name: "", weight_tons: "" })
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contract</DialogTitle>
          <DialogDescription>Create a new contract</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Contract Name *</Label>
              <Input
                required
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (tons)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.weight_tons}
                onChange={(e) => setFormData({ ...formData, weight_tons: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditContractDialog({
  open,
  onOpenChange,
  contract,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: Contract
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    contract_name: contract.contract_name,
    weight_tons: contract.weight_tons?.toString() || "",
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from("ceva_contracts")
      .update({
        contract_name: formData.contract_name,
        weight_tons: formData.weight_tons ? parseFloat(formData.weight_tons) : null,
      })
      .eq("id", contract.id)

    if (error) {
      console.error("Error updating contract:", error)
    } else {
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
          <DialogDescription>Update contract details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Contract Name *</Label>
              <Input
                required
                value={formData.contract_name}
                onChange={(e) => setFormData({ ...formData, contract_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Weight (tons)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.weight_tons}
                onChange={(e) => setFormData({ ...formData, weight_tons: e.target.value })}
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
