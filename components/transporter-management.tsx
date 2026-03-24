"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Truck,
  Container,
  User,
  Link2,
  Plus,
  Search,
  FileText,
  Upload,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  Loader2,
  ChevronsUpDown,
  Check,
} from "lucide-react"
import type {
  Transporter,
  TransporterDocument,
  Horse,
  Trailer,
  Driver,
  DriverDocument,
  VehicleCombination,
  DriverDocumentType,
  DocumentType,
  VehicleStatus,
  TrailerType,
  DriverStatus,
} from "@/types/transporter"
import {
  DOCUMENT_TYPE_LABELS,
  DRIVER_DOCUMENT_TYPE_LABELS,
  TRAILER_TYPE_LABELS,
  VEHICLE_STATUS_LABELS,
  DRIVER_STATUS_LABELS,
} from "@/types/transporter"

export function TransporterManagement() {
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("details")

  const supabase = createClient()

  useEffect(() => {
    fetchTransporters()
  }, [])

  async function fetchTransporters() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_transporters")
      .select("*")
      .order("company_name", { ascending: true })

    if (error) {
      console.error("Error fetching transporters:", error)
    } else {
      setTransporters(data || [])
    }
    setLoading(false)
  }

  const filteredTransporters = transporters.filter(
    (t) =>
      t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.trading_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transporter Management</h2>
          <p className="text-muted-foreground">Manage transport suppliers and their fleet</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Transporter
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transporter List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Transporters</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transporters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : filteredTransporters.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transporters found</p>
            ) : (
              filteredTransporters.map((transporter) => (
                <div
                  key={transporter.id}
                  onClick={() => {
                    setSelectedTransporter(transporter)
                    setActiveTab("details")
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTransporter?.id === transporter.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{transporter.company_name}</p>
                      {transporter.trading_name && (
                        <p className="text-xs text-muted-foreground">t/a {transporter.trading_name}</p>
                      )}
                    </div>
                  </div>
                  {transporter.contact_person && (
                    <p className="text-sm text-muted-foreground mt-1">{transporter.contact_person}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transporter Details */}
        <Card className="lg:col-span-2">
          {selectedTransporter ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTransporter.company_name}</CardTitle>
                    <CardDescription>
                      {selectedTransporter.trading_name && `Trading as ${selectedTransporter.trading_name}`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={async () => {
                      if (!confirm(`Are you sure you want to delete ${selectedTransporter.company_name}? This will also delete all associated horses, trailers, and drivers.`)) return
                      const { error } = await supabase.from("ceva_transporters").delete().eq("id", selectedTransporter.id)
                      if (error) {
                        console.error("Error deleting transporter:", error.message)
                        toast.error(error.message || "Failed to delete transporter")
                      } else {
                        toast.success("Transporter deleted")
                        setSelectedTransporter(null)
                        fetchTransporters()
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="details" className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Docs</span>
                    </TabsTrigger>
                    <TabsTrigger value="horses" className="flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      <span className="hidden sm:inline">Horses</span>
                    </TabsTrigger>
                    <TabsTrigger value="trailers" className="flex items-center gap-1">
                      <Container className="h-4 w-4" />
                      <span className="hidden sm:inline">Trailers</span>
                    </TabsTrigger>
                    <TabsTrigger value="drivers" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Drivers</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-4">
                    <TransporterDetails
                      transporter={selectedTransporter}
                      onUpdate={async () => {
                        const { data } = await supabase
                          .from("ceva_transporters")
                          .select("*")
                          .eq("id", selectedTransporter.id)
                          .single()
                        if (data) setSelectedTransporter(data)
                        fetchTransporters()
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-4">
                    <TransporterDocuments transporterId={selectedTransporter.id} />
                  </TabsContent>

                  <TabsContent value="horses" className="mt-4">
                    <HorseManagement transporterId={selectedTransporter.id} />
                  </TabsContent>

                  <TabsContent value="trailers" className="mt-4">
                    <TrailerManagement transporterId={selectedTransporter.id} />
                  </TabsContent>

                  <TabsContent value="drivers" className="mt-4">
                    <DriverManagement transporterId={selectedTransporter.id} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">Select a transporter to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Transporter Dialog */}
      <AddTransporterDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          fetchTransporters()
          setShowAddDialog(false)
        }}
      />
    </div>
  )
}

// ============================================
// TRANSPORTER DETAILS COMPONENT
// ============================================

function TransporterDetails({
  transporter,
  onUpdate,
}: {
  transporter: Transporter
  onUpdate: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(transporter)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setFormData(transporter)
  }, [transporter])

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from("ceva_transporters")
      .update({
        company_name: formData.company_name,
        trading_name: formData.trading_name,
        registration_number: formData.registration_number,
        vat_number: formData.vat_number,
        physical_address: formData.physical_address,
        postal_address: formData.postal_address,
        contact_person: formData.contact_person,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_branch_code: formData.bank_branch_code,
        bank_account_type: formData.bank_account_type,
        notes: formData.notes,
      })
      .eq("id", transporter.id)

    if (error) {
      console.error("Error updating transporter:", error)
    } else {
      setIsEditing(false)
      onUpdate()
    }
    setSaving(false)
  }

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Details
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Company Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Company Information</h4>
            <DetailRow label="Company Name" value={transporter.company_name} />
            <DetailRow label="Trading Name" value={transporter.trading_name} />
            <DetailRow label="Registration No." value={transporter.registration_number} />
            <DetailRow label="VAT Number" value={transporter.vat_number} />
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contact Information</h4>
            <DetailRow label="Contact Person" value={transporter.contact_person} />
            <DetailRow label="Email" value={transporter.contact_email} />
            <DetailRow label="Phone" value={transporter.contact_phone} />
            <DetailRow label="Physical Address" value={transporter.physical_address} />
          </div>

          {/* Bank Details */}
          <div className="space-y-4 md:col-span-2">
            <h4 className="font-semibold text-foreground">Bank Details</h4>
            <div className="grid gap-4 md:grid-cols-4">
              <DetailRow label="Bank Name" value={transporter.bank_name} />
              <DetailRow label="Account Number" value={transporter.bank_account_number} />
              <DetailRow label="Branch Code" value={transporter.bank_branch_code} />
              <DetailRow label="Account Type" value={transporter.bank_account_type} />
            </div>
          </div>

          {/* Notes */}
          {transporter.notes && (
            <div className="space-y-2 md:col-span-2">
              <h4 className="font-semibold text-foreground">Notes</h4>
              <p className="text-sm text-muted-foreground">{transporter.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Company Name *</Label>
          <Input
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Trading Name</Label>
          <Input
            value={formData.trading_name || ""}
            onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Registration Number</Label>
          <Input
            value={formData.registration_number || ""}
            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>VAT Number</Label>
          <Input
            value={formData.vat_number || ""}
            onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Contact Person</Label>
          <Input
            value={formData.contact_person || ""}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={formData.contact_email || ""}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Contact Phone</Label>
          <Input
            value={formData.contact_phone || ""}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Physical Address</Label>
          <Textarea
            value={formData.physical_address || ""}
            onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Input
            value={formData.bank_name || ""}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Account Number</Label>
          <Input
            value={formData.bank_account_number || ""}
            onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Branch Code</Label>
          <Input
            value={formData.bank_branch_code || ""}
            onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Account Type</Label>
          <Input
            value={formData.bank_account_type || ""}
            onChange={(e) => setFormData({ ...formData, bank_account_type: e.target.value })}
            placeholder="e.g., Cheque, Savings"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || "-"}</p>
    </div>
  )
}

// ============================================
// TRANSPORTER DOCUMENTS COMPONENT
// ============================================

function TransporterDocuments({ transporterId }: { transporterId: string }) {
  const [documents, setDocuments] = useState<TransporterDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType>("bank_proof")

  const supabase = createClient()

  useEffect(() => {
    fetchDocuments()
  }, [transporterId])

  async function fetchDocuments() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_transporter_documents")
      .select("*")
      .eq("transporter_id", transporterId)
      .order("uploaded_at", { ascending: false })

    if (error) {
      console.error("Error fetching documents:", error)
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    // Upload to storage
    const fileExt = file.name.split(".").pop()
    const filePath = `${transporterId}/${selectedType}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("transporter-documents")
      .upload(filePath, file)

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      setUploading(false)
      return
    }

    // Create document record
    const { error: insertError } = await supabase.from("ceva_transporter_documents").insert({
      transporter_id: transporterId,
      document_type: selectedType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })

    if (insertError) {
      console.error("Error creating document record:", insertError)
    } else {
      fetchDocuments()
    }

    setUploading(false)
    e.target.value = ""
  }

  async function handleDelete(doc: TransporterDocument) {
    // Delete from storage
    await supabase.storage.from("transporter-documents").remove([doc.file_path])

    // Delete record
    await supabase.from("ceva_transporter_documents").delete().eq("id", doc.id)

    fetchDocuments()
  }

  async function handleView(doc: TransporterDocument) {
    const { data } = await supabase.storage
      .from("transporter-documents")
      .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  async function handleDownload(doc: TransporterDocument) {
    const { data } = await supabase.storage
      .from("transporter-documents")
      .createSignedUrl(doc.file_path, 3600, { download: true })

    if (data?.signedUrl) {
      const link = document.createElement("a")
      link.href = data.signedUrl
      link.download = doc.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const requiredDocs: DocumentType[] = ["bank_proof", "vat_certificate", "git_confirmation"]
  const uploadedTypes = documents.map((d) => d.document_type)

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="flex items-end gap-4">
        <div className="space-y-2 flex-1">
          <Label>Document Type</Label>
          <Select value={selectedType} onValueChange={(v: DocumentType) => setSelectedType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_proof">Proof of Bank Details</SelectItem>
              <SelectItem value="vat_certificate">VAT Certificate</SelectItem>
              <SelectItem value="git_confirmation">Confirmation of GIT</SelectItem>
              <SelectItem value="other">Other Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button asChild disabled={uploading}>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Document"}
              </span>
            </Button>
          </Label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>
      </div>

      {/* Required Documents Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {requiredDocs.map((type) => {
          const hasDoc = uploadedTypes.includes(type)
          return (
            <div
              key={type}
              className={`p-4 rounded-lg border ${
                hasDoc ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {hasDoc ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className={`text-sm font-medium ${hasDoc ? "text-green-800" : "text-yellow-800"}`}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </span>
              </div>
              <p className={`text-xs mt-1 ${hasDoc ? "text-green-600" : "text-yellow-600"}`}>
                {hasDoc ? "Uploaded" : "Required"}
              </p>
            </div>
          )
        })}
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        <h4 className="font-semibold text-foreground">Uploaded Documents</h4>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : documents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_TYPE_LABELS[doc.document_type]} •{" "}
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.verified && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(doc)}
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    className="text-destructive hover:text-destructive"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// HORSE MANAGEMENT COMPONENT
// ============================================

function HorseManagement({ transporterId }: { transporterId: string }) {
  const [horses, setHorses] = useState<Horse[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchHorses()
  }, [transporterId])

  async function fetchHorses() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_horses")
      .select("*")
      .eq("transporter_id", transporterId)
      .order("registration_number", { ascending: true })

    if (error) {
      console.error("Error fetching horses:", error)
    } else {
      setHorses(data || [])
    }
    setLoading(false)
  }

  async function handleDeleteHorse(horseId: string) {
    if (!confirm("Are you sure you want to delete this horse?")) return
    const { error } = await supabase.from("ceva_horses").delete().eq("id", horseId)
    if (error) {
      console.error("Error deleting horse:", error.message)
      toast.error(error.message || "Failed to delete horse")
    } else {
      toast.success("Horse deleted")
      fetchHorses()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{horses.length} horse(s) registered</p>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Horse
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : horses.length === 0 ? (
        <p className="text-muted-foreground text-sm">No horses registered yet</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {horses.map((horse) => (
            <div key={horse.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{horse.registration_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {horse.make} {horse.model} {horse.year && `(${horse.year})`}
                  </p>
                </div>
                <Badge variant="outline" className={getVehicleStatusClass(horse.status)}>
                  {VEHICLE_STATUS_LABELS[horse.status]}
                </Badge>
              </div>
              {horse.tracking_provider && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tracking: {horse.tracking_provider} - {horse.tracking_unit_id}
                </p>
              )}
              {horse.license_expiry && (
                <p className="text-xs text-muted-foreground">
                  License expires: {new Date(horse.license_expiry).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingHorse(horse)}
                >
                  <Edit className="mr-2 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteHorse(horse.id)}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddHorseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        transporterId={transporterId}
        onSuccess={() => {
          fetchHorses()
          setShowAddDialog(false)
        }}
      />

      {editingHorse && (
        <EditHorseDialog
          open={!!editingHorse}
          onOpenChange={(open) => !open && setEditingHorse(null)}
          horse={editingHorse}
          onSuccess={() => {
            fetchHorses()
            setEditingHorse(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// TRAILER MANAGEMENT COMPONENT
// ============================================

function TrailerManagement({ transporterId }: { transporterId: string }) {
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchTrailers()
  }, [transporterId])

  async function fetchTrailers() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_trailers")
      .select("*")
      .eq("transporter_id", transporterId)
      .order("registration_number", { ascending: true })

    if (error) {
      console.error("Error fetching trailers:", error)
    } else {
      setTrailers(data || [])
    }
    setLoading(false)
  }

  async function handleDeleteTrailer(trailerId: string) {
    if (!confirm("Are you sure you want to delete this trailer?")) return
    const { error } = await supabase.from("ceva_trailers").delete().eq("id", trailerId)
    if (error) {
      console.error("Error deleting trailer:", error.message)
      toast.error(error.message || "Failed to delete trailer")
    } else {
      toast.success("Trailer deleted")
      fetchTrailers()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{trailers.length} trailer(s) registered</p>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Trailer
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : trailers.length === 0 ? (
        <p className="text-muted-foreground text-sm">No trailers registered yet</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trailers.map((trailer) => (
            <div key={trailer.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{trailer.registration_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {TRAILER_TYPE_LABELS[trailer.trailer_type]}
                    {trailer.max_payload_tons && ` • ${trailer.max_payload_tons}t max`}
                  </p>
                </div>
                <Badge variant="outline" className={getVehicleStatusClass(trailer.status)}>
                  {VEHICLE_STATUS_LABELS[trailer.status]}
                </Badge>
              </div>
              {trailer.license_expiry && (
                <p className="text-xs text-muted-foreground mt-2">
                  License expires: {new Date(trailer.license_expiry).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTrailer(trailer)}
                >
                  <Edit className="mr-2 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteTrailer(trailer.id)}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddTrailerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        transporterId={transporterId}
        onSuccess={() => {
          fetchTrailers()
          setShowAddDialog(false)
        }}
      />

      {editingTrailer && (
        <EditTrailerDialog
          open={!!editingTrailer}
          onOpenChange={(open) => !open && setEditingTrailer(null)}
          trailer={editingTrailer}
          onSuccess={() => {
            fetchTrailers()
            setEditingTrailer(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// DRIVER MANAGEMENT COMPONENT
// ============================================

function DriverManagement({ transporterId }: { transporterId: string }) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchDrivers()
  }, [transporterId])

  async function fetchDrivers() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_drivers")
      .select("*")
      .eq("transporter_id", transporterId)
      .order("last_name", { ascending: true })

    if (error) {
      console.error("Error fetching drivers:", error)
    } else {
      setDrivers(data || [])
    }
    setLoading(false)
  }

  async function handleDeleteDriver(driverId: string) {
    if (!confirm("Are you sure you want to delete this driver?")) return
    const { error } = await supabase.from("ceva_drivers").delete().eq("id", driverId)
    if (error) {
      console.error("Error deleting driver:", error.message)
      toast.error(error.message || "Failed to delete driver")
    } else {
      toast.success("Driver deleted")
      if (selectedDriver?.id === driverId) setSelectedDriver(null)
      fetchDrivers()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{drivers.length} driver(s) registered</p>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Driver
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : drivers.length === 0 ? (
        <p className="text-muted-foreground text-sm">No drivers registered yet</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedDriver?.id === driver.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedDriver(driver)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">
                    {driver.first_name} {driver.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    License: {driver.license_type || "N/A"}
                  </p>
                </div>
                <Badge variant="outline" className={getDriverStatusClass(driver.status)}>
                  {DRIVER_STATUS_LABELS[driver.status]}
                </Badge>
              </div>
              {driver.contact_phone && (
                <p className="text-xs text-muted-foreground mt-2">{driver.contact_phone}</p>
              )}
              {driver.license_expiry && (
                <p className="text-xs text-muted-foreground">
                  License expires: {new Date(driver.license_expiry).toLocaleDateString()}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteDriver(driver.id)
                }}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Selected Driver Documents */}
      {selectedDriver && (
        <div className="mt-6 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">
              Documents for {selectedDriver.first_name} {selectedDriver.last_name}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(null)}>
              Close
            </Button>
          </div>
          <DriverDocuments driverId={selectedDriver.id} />
        </div>
      )}

      <AddDriverDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        transporterId={transporterId}
        onSuccess={() => {
          fetchDrivers()
          setShowAddDialog(false)
        }}
      />
    </div>
  )
}

// ============================================
// DRIVER DOCUMENTS COMPONENT
// ============================================

function DriverDocuments({ driverId }: { driverId: string }) {
  const [documents, setDocuments] = useState<DriverDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState<DriverDocumentType>("id_document")

  const supabase = createClient()

  useEffect(() => {
    fetchDocuments()
  }, [driverId])

  async function fetchDocuments() {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_driver_documents")
      .select("*")
      .eq("driver_id", driverId)
      .order("uploaded_at", { ascending: false })

    if (error) {
      console.error("Error fetching driver documents:", error)
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    // Upload to storage
    const fileExt = file.name.split(".").pop()
    const filePath = `drivers/${driverId}/${selectedType}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("transporter-documents")
      .upload(filePath, file)

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      setUploading(false)
      return
    }

    // Create document record
    const { error: insertError } = await supabase.from("ceva_driver_documents").insert({
      driver_id: driverId,
      document_type: selectedType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })

    if (insertError) {
      console.error("Error creating document record:", insertError)
    } else {
      fetchDocuments()
    }

    setUploading(false)
    e.target.value = ""
  }

  async function handleDelete(doc: DriverDocument) {
    // Delete from storage
    await supabase.storage.from("transporter-documents").remove([doc.file_path])

    // Delete record
    await supabase.from("ceva_driver_documents").delete().eq("id", doc.id)

    fetchDocuments()
  }

  async function handleView(doc: DriverDocument) {
    const { data } = await supabase.storage
      .from("transporter-documents")
      .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  async function handleDownload(doc: DriverDocument) {
    const { data } = await supabase.storage
      .from("transporter-documents")
      .createSignedUrl(doc.file_path, 3600, { download: true })

    if (data?.signedUrl) {
      const link = document.createElement("a")
      link.href = data.signedUrl
      link.download = doc.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const requiredDocs: DriverDocumentType[] = ["id_document", "drivers_license"]
  const uploadedTypes = documents.map((d) => d.document_type)

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="flex items-end gap-4">
        <div className="space-y-2 flex-1">
          <Label>Document Type</Label>
          <Select value={selectedType} onValueChange={(v: DriverDocumentType) => setSelectedType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id_document">ID Document</SelectItem>
              <SelectItem value="drivers_license">Driver&apos;s License</SelectItem>
              <SelectItem value="prdp">PrDP</SelectItem>
              <SelectItem value="other">Other Document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="driver-file-upload" className="cursor-pointer">
            <Button asChild disabled={uploading} size="sm">
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload"}
              </span>
            </Button>
          </Label>
          <input
            id="driver-file-upload"
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>
      </div>

      {/* Required Documents Status */}
      <div className="grid gap-2 grid-cols-2">
        {requiredDocs.map((type) => {
          const hasDoc = uploadedTypes.includes(type)
          return (
            <div
              key={type}
              className={`p-3 rounded-lg border ${
                hasDoc ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-center gap-2">
                {hasDoc ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <span className={`text-xs font-medium ${hasDoc ? "text-green-800" : "text-yellow-800"}`}>
                  {DRIVER_DOCUMENT_TYPE_LABELS[type]}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Documents List */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 rounded-lg border border-border bg-background"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DRIVER_DOCUMENT_TYPE_LABELS[doc.document_type]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleView(doc)}
                  className="h-8 w-8"
                  title="View document"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(doc)}
                  className="h-8 w-8"
                  title="Download document"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getVehicleStatusClass(status: VehicleStatus): string {
  const classes: Record<VehicleStatus, string> = {
    available: "bg-green-100 text-green-800",
    in_use: "bg-blue-100 text-blue-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    inactive: "bg-gray-100 text-gray-800",
  }
  return classes[status]
}

function getDriverStatusClass(status: DriverStatus): string {
  const classes: Record<DriverStatus, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    suspended: "bg-red-100 text-red-800",
  }
  return classes[status]
}

// ============================================
// ADD TRANSPORTER DIALOG
// ============================================

function AddTransporterDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    company_name: "",
    trading_name: "",
    registration_number: "",
    vat_number: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    physical_address: "",
    bank_name: "",
    bank_account_number: "",
    bank_branch_code: "",
    bank_account_type: "",
  })
  const [saving, setSaving] = useState(false)
  const [dialogTab, setDialogTab] = useState("company")

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from("ceva_transporters").insert({
      ...formData,
      created_by: userData.user?.id,
    })

    if (error) {
      console.error("Error creating transporter:", error)
    } else {
      setFormData({
        company_name: "",
        trading_name: "",
        registration_number: "",
        vat_number: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        physical_address: "",
        bank_name: "",
        bank_account_number: "",
        bank_branch_code: "",
        bank_account_type: "",
      })
      setDialogTab("company")
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Transporter</DialogTitle>
          <DialogDescription>Enter the transport supplier company details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs value={dialogTab} onValueChange={setDialogTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="company">Company Details</TabsTrigger>
              <TabsTrigger value="banking">Banking Details</TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trading Name</Label>
                  <Input
                    value={formData.trading_name}
                    onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAT Number</Label>
                  <Input
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Physical Address</Label>
                  <Input
                    value={formData.physical_address}
                    onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="banking">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g., Standard Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Code</Label>
                  <Input
                    value={formData.bank_branch_code}
                    onChange={(e) => setFormData({ ...formData, bank_branch_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Input
                    value={formData.bank_account_type}
                    onChange={(e) => setFormData({ ...formData, bank_account_type: e.target.value })}
                    placeholder="e.g., Cheque, Savings"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Transporter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// ADD HORSE DIALOG
// ============================================

interface CtrackLookupVehicle {
  nodeId: number
  registration: string
  fleetNumber: string
  description: string
  vin: string | null
  serialNumber: string | null
  unitIMEI: string | null
}

function AddHorseDialog({
  open,
  onOpenChange,
  transporterId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporterId: string
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    registration_number: "",
    make: "",
    model: "",
    year: "",
    license_expiry: "",
    tracking_provider: "",
    tracking_unit_id: "",
    status: "available" as VehicleStatus,
  })
  const [saving, setSaving] = useState(false)

  // Ctrack import state
  const [ctrackVehicles, setCtrackVehicles] = useState<CtrackLookupVehicle[]>([])
  const [ctrackLoading, setCtrackLoading] = useState(false)
  const [ctrackFetched, setCtrackFetched] = useState(false)
  const [ctrackError, setCtrackError] = useState<string | null>(null)
  const [ctrackSearch, setCtrackSearch] = useState("")
  const [ctrackOpen, setCtrackOpen] = useState(false)
  const [selectedCtrackVehicle, setSelectedCtrackVehicle] = useState<CtrackLookupVehicle | null>(null)
  const ctrackRef = useRef<HTMLDivElement>(null)
  const ctrackSearchRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const fetchCtrackVehicles = useCallback(async () => {
    if (ctrackFetched || ctrackLoading) return
    setCtrackLoading(true)
    setCtrackError(null)
    try {
      const [res, { data: existingHorses }] = await Promise.all([
        fetch("/api/ctrack/vehicles/lookup"),
        supabase.from("ceva_horses").select("registration_number"),
      ])
      const data = await res.json()
      if (data.error) {
        setCtrackError(data.error)
      } else {
        const existingRegs = new Set(
          (existingHorses ?? []).map((h: { registration_number: string }) =>
            h.registration_number.toUpperCase()
          )
        )
        const vehicles = (data.vehicles ?? []).filter(
          (v: CtrackLookupVehicle) => !existingRegs.has(v.registration.toUpperCase())
        )
        setCtrackVehicles(vehicles)
      }
    } catch {
      setCtrackError("Failed to connect to Ctrack")
    } finally {
      setCtrackLoading(false)
      setCtrackFetched(true)
    }
  }, [ctrackFetched, ctrackLoading, supabase])

  function handleToggleCtrackDropdown() {
    if (!ctrackOpen) {
      fetchCtrackVehicles()
      setCtrackOpen(true)
      setTimeout(() => ctrackSearchRef.current?.focus(), 0)
    } else {
      setCtrackOpen(false)
      setCtrackSearch("")
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ctrackRef.current && !ctrackRef.current.contains(e.target as Node)) {
        setCtrackOpen(false)
        setCtrackSearch("")
      }
    }
    if (ctrackOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ctrackOpen])

  function handleSelectCtrackVehicle(vehicle: CtrackLookupVehicle) {
    setSelectedCtrackVehicle(vehicle)
    setFormData((prev) => ({
      ...prev,
      registration_number: vehicle.registration || prev.registration_number,
      tracking_provider: "Ctrack",
      tracking_unit_id: String(vehicle.nodeId),
    }))
    setCtrackOpen(false)
    setCtrackSearch("")
  }

  const filteredCtrackVehicles = ctrackVehicles.filter((v) => {
    if (!ctrackSearch) return true
    const q = ctrackSearch.toLowerCase()
    return (
      v.registration.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.fleetNumber.toLowerCase().includes(q)
    )
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from("ceva_horses").insert({
      transporter_id: transporterId,
      registration_number: formData.registration_number,
      make: formData.make || null,
      model: formData.model || null,
      year: formData.year ? parseInt(formData.year) : null,
      license_expiry: formData.license_expiry || null,
      tracking_provider: formData.tracking_provider || null,
      tracking_unit_id: formData.tracking_unit_id || null,
      status: formData.status,
    })

    if (error) {
      console.error("Error creating horse:", error.message, error.code, error.details)
      if (error.code === "23505") {
        toast.error("A horse with this registration number already exists")
      } else {
        toast.error(error.message || "Failed to create horse")
      }
    } else {
      setFormData({
        registration_number: "",
        make: "",
        model: "",
        year: "",
        license_expiry: "",
        tracking_provider: "",
        tracking_unit_id: "",
        status: "available",
      })
      setCtrackVehicles([])
      setCtrackFetched(false)
      setCtrackSearch("")
      setCtrackOpen(false)
      setSelectedCtrackVehicle(null)
      toast.success("Horse added successfully")
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Horse (Truck)</DialogTitle>
          <DialogDescription>Enter the truck/tractor unit details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Import from Ctrack */}
            <div className="space-y-2">
              <Label>Import from Ctrack</Label>
              <div className="relative" ref={ctrackRef}>
                <button
                  type="button"
                  onClick={handleToggleCtrackDropdown}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {ctrackLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading vehicles...
                    </span>
                  ) : selectedCtrackVehicle ? (
                    <span className="truncate">
                      {selectedCtrackVehicle.registration}
                      <span className="ml-2 text-muted-foreground">
                        {selectedCtrackVehicle.description}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select a Ctrack vehicle...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>

                {ctrackOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        ref={ctrackSearchRef}
                        value={ctrackSearch}
                        onChange={(e) => setCtrackSearch(e.target.value)}
                        placeholder="Search by registration, description..."
                        className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                      {ctrackLoading ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading from Ctrack...
                        </div>
                      ) : filteredCtrackVehicles.length > 0 ? (
                        filteredCtrackVehicles.map((v) => (
                          <button
                            key={v.nodeId}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => handleSelectCtrackVehicle(v)}
                          >
                            <Check
                              className={`h-4 w-4 shrink-0 ${
                                selectedCtrackVehicle?.nodeId === v.nodeId
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{v.registration}</span>
                              <span className="text-xs text-muted-foreground">
                                {v.description}{v.fleetNumber ? ` — Fleet: ${v.fleetNumber}` : ""}
                              </span>
                            </div>
                          </button>
                        ))
                      ) : ctrackFetched ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No vehicles found
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
              {ctrackError && (
                <p className="text-sm text-red-500">{ctrackError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Registration Number *</Label>
              <Input
                required
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                placeholder="e.g., GP 123-456"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Volvo"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., FH16"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g., 2022"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>License Expiry</Label>
              <Input
                type="date"
                value={formData.license_expiry}
                onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tracking Provider</Label>
                <Input
                  value={formData.tracking_provider}
                  onChange={(e) => setFormData({ ...formData, tracking_provider: e.target.value })}
                  placeholder="e.g., Ctrack"
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Unit ID</Label>
                <Input
                  value={formData.tracking_unit_id}
                  onChange={(e) => setFormData({ ...formData, tracking_unit_id: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v: VehicleStatus) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Horse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// EDIT HORSE DIALOG
// ============================================

function EditHorseDialog({
  open,
  onOpenChange,
  horse,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  horse: Horse
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    registration_number: horse.registration_number,
    make: horse.make || "",
    model: horse.model || "",
    year: horse.year?.toString() || "",
    license_expiry: horse.license_expiry || "",
    tracking_provider: horse.tracking_provider || "",
    tracking_unit_id: horse.tracking_unit_id || "",
    status: horse.status,
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from("ceva_horses")
      .update({
        registration_number: formData.registration_number,
        make: formData.make || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        license_expiry: formData.license_expiry || null,
        tracking_provider: formData.tracking_provider || null,
        tracking_unit_id: formData.tracking_unit_id || null,
        status: formData.status,
      })
      .eq("id", horse.id)

    if (error) {
      console.error("Error updating horse:", error)
    } else {
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Horse</DialogTitle>
          <DialogDescription>Update the truck/tractor unit details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Registration Number *</Label>
              <Input
                required
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>License Expiry</Label>
              <Input
                type="date"
                value={formData.license_expiry}
                onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tracking Provider</Label>
                <Input
                  value={formData.tracking_provider}
                  onChange={(e) => setFormData({ ...formData, tracking_provider: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Unit ID</Label>
                <Input
                  value={formData.tracking_unit_id}
                  onChange={(e) => setFormData({ ...formData, tracking_unit_id: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v: VehicleStatus) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
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

// ============================================
// ADD TRAILER DIALOG
// ============================================

function AddTrailerDialog({
  open,
  onOpenChange,
  transporterId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporterId: string
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    registration_number: "",
    trailer_type: "side_tipper" as TrailerType,
    max_payload_tons: "",
    license_expiry: "",
    status: "available" as VehicleStatus,
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from("ceva_trailers").insert({
      transporter_id: transporterId,
      registration_number: formData.registration_number,
      trailer_type: formData.trailer_type,
      max_payload_tons: formData.max_payload_tons ? parseFloat(formData.max_payload_tons) : null,
      license_expiry: formData.license_expiry || null,
      status: formData.status,
    })

    if (error) {
      console.error("Error creating trailer:", error)
    } else {
      setFormData({
        registration_number: "",
        trailer_type: "side_tipper",
        max_payload_tons: "",
        license_expiry: "",
        status: "available",
      })
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Trailer</DialogTitle>
          <DialogDescription>Enter the trailer details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Registration Number *</Label>
              <Input
                required
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trailer Type *</Label>
                <Select
                  value={formData.trailer_type}
                  onValueChange={(v: TrailerType) => setFormData({ ...formData, trailer_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAILER_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Payload (tons)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.max_payload_tons}
                  onChange={(e) => setFormData({ ...formData, max_payload_tons: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Expiry</Label>
                <Input
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: VehicleStatus) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Trailer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// EDIT TRAILER DIALOG
// ============================================

function EditTrailerDialog({
  open,
  onOpenChange,
  trailer,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trailer: Trailer
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    registration_number: trailer.registration_number,
    trailer_type: trailer.trailer_type,
    max_payload_tons: trailer.max_payload_tons?.toString() || "",
    license_expiry: trailer.license_expiry || "",
    status: trailer.status,
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from("ceva_trailers")
      .update({
        registration_number: formData.registration_number,
        trailer_type: formData.trailer_type,
        max_payload_tons: formData.max_payload_tons ? parseFloat(formData.max_payload_tons) : null,
        license_expiry: formData.license_expiry || null,
        status: formData.status,
      })
      .eq("id", trailer.id)

    if (error) {
      console.error("Error updating trailer:", error)
    } else {
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Trailer</DialogTitle>
          <DialogDescription>Update the trailer details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Registration Number *</Label>
              <Input
                required
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trailer Type *</Label>
                <Select
                  value={formData.trailer_type}
                  onValueChange={(v: TrailerType) => setFormData({ ...formData, trailer_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRAILER_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Payload (tons)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.max_payload_tons}
                  onChange={(e) => setFormData({ ...formData, max_payload_tons: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Expiry</Label>
                <Input
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: VehicleStatus) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

// ============================================
// ADD DRIVER DIALOG
// ============================================

function AddDriverDialog({
  open,
  onOpenChange,
  transporterId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporterId: string
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    id_number: "",
    license_number: "",
    license_type: "",
    license_expiry: "",
    prdp_expiry: "",
    contact_phone: "",
    status: "active" as DriverStatus,
  })
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from("ceva_drivers").insert({
      transporter_id: transporterId,
      first_name: formData.first_name,
      last_name: formData.last_name,
      id_number: formData.id_number || null,
      license_number: formData.license_number || null,
      license_type: formData.license_type || null,
      license_expiry: formData.license_expiry || null,
      prdp_expiry: formData.prdp_expiry || null,
      contact_phone: formData.contact_phone || null,
      status: formData.status,
    })

    if (error) {
      console.error("Error creating driver:", error)
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        id_number: "",
        license_number: "",
        license_type: "",
        license_expiry: "",
        prdp_expiry: "",
        contact_phone: "",
        status: "active",
      })
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
          <DialogDescription>Enter the driver details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID Number</Label>
                <Input
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>License Type</Label>
                <Input
                  value={formData.license_type}
                  onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                  placeholder="e.g., EC, C"
                />
              </div>
              <div className="space-y-2">
                <Label>License Expiry</Label>
                <Input
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PrDP Expiry</Label>
                <Input
                  type="date"
                  value={formData.prdp_expiry}
                  onChange={(e) => setFormData({ ...formData, prdp_expiry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: DriverStatus) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
