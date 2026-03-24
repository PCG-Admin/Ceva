"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Eye,
  TrendingUp,
  AlertCircle,
} from "lucide-react"

interface Invoice {
  id: string
  invoiceNumber: string
  client: string
  loadNumber: string
  issueDate: string
  dueDate: string
  amount: number
  vat: number
  totalAmount: number
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  paymentDate?: string
  paymentMethod?: string
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-001",
    client: "ABC Logistics",
    loadNumber: "L-2847",
    issueDate: "2024-12-20",
    dueDate: "2024-12-27",
    amount: 85000,
    vat: 12750,
    totalAmount: 97750,
    status: "paid",
    paymentDate: "2024-12-22",
    paymentMethod: "Bank Transfer",
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-002",
    client: "XYZ Traders",
    loadNumber: "L-2848",
    issueDate: "2024-12-21",
    dueDate: "2024-12-28",
    amount: 72000,
    vat: 10800,
    totalAmount: 82800,
    status: "sent",
  },
  {
    id: "3",
    invoiceNumber: "INV-2024-003",
    client: "PQR Industries",
    loadNumber: "L-2849",
    issueDate: "2024-12-15",
    dueDate: "2024-12-22",
    amount: 45000,
    vat: 6750,
    totalAmount: 51750,
    status: "overdue",
  },
  {
    id: "4",
    invoiceNumber: "INV-2024-004",
    client: "LMN Enterprises",
    loadNumber: "L-2850",
    issueDate: "2024-12-22",
    dueDate: "2024-12-29",
    amount: 95000,
    vat: 14250,
    totalAmount: 109250,
    status: "draft",
  },
]

export function InvoicingPayments() {
  const [invoices] = useState<Invoice[]>(mockInvoices)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.loadNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.totalAmount, 0)
  const pendingAmount = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.totalAmount, 0)
  const overdueAmount = invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.totalAmount, 0)

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsViewDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R{(totalRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R{(pendingAmount / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((i) => i.status === "sent").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">R{(overdueAmount / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices.filter((i) => i.status === "overdue").length} invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">94%</div>
            <p className="text-xs text-muted-foreground mt-1">On-time payments</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Invoice Management</CardTitle>
                  <CardDescription>Create and manage invoices for completed deliveries</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
              <div className="flex gap-2 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <InvoiceCard key={invoice.id} invoice={invoice} onView={() => handleViewInvoice(invoice)} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Payment History</CardTitle>
              <CardDescription>Track all received payments and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices
                  .filter((i) => i.status === "paid")
                  .map((invoice) => (
                    <PaymentHistoryItem key={invoice.id} invoice={invoice} />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Monthly Revenue Trend</CardTitle>
                <CardDescription>Revenue analysis for the past 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border border-border rounded-lg bg-muted">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Revenue chart visualization</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Payment Distribution</CardTitle>
                <CardDescription>Breakdown by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ReportRow label="Paid" value="R10.2K" percentage={65} color="bg-accent" />
                  <ReportRow label="Pending" value="R3.8K" percentage={24} color="bg-secondary" />
                  <ReportRow label="Overdue" value="R1.7K" percentage={11} color="bg-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Top Clients by Revenue</CardTitle>
                <CardDescription>Highest paying customers this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ClientRevenueItem client="ABC Logistics" revenue={245000} loads={12} />
                <ClientRevenueItem client="XYZ Traders" revenue={189000} loads={9} />
                <ClientRevenueItem client="PQR Industries" revenue={156000} loads={7} />
                <ClientRevenueItem client="LMN Enterprises" revenue={134000} loads={6} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Quick Actions</CardTitle>
                <CardDescription>Common financial tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Send className="mr-2 h-4 w-4" />
                  Send Payment Reminders
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Financial Report
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate VAT Report
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Profit Analysis
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>Complete invoice information and payment status</DialogDescription>
          </DialogHeader>
          {selectedInvoice && <InvoiceDetails invoice={selectedInvoice} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InvoiceCard({ invoice, onView }: { invoice: Invoice; onView: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{invoice.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{invoice.client}</p>
              </div>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Load Number</p>
              <p className="text-sm font-medium text-foreground">{invoice.loadNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Issue Date</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(invoice.issueDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(invoice.dueDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-sm font-bold text-foreground">R{invoice.totalAmount.toLocaleString("en-ZA")}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="icon" onClick={onView}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          {invoice.status === "sent" && (
            <Button variant="outline" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function InvoiceStatusBadge({ status }: { status: Invoice["status"] }) {
  const statusConfig = {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground", icon: FileText },
    sent: { label: "Sent", className: "bg-secondary text-secondary-foreground", icon: Send },
    paid: { label: "Paid", className: "bg-accent text-accent-foreground", icon: CheckCircle },
    overdue: { label: "Overdue", className: "bg-destructive text-destructive-foreground", icon: AlertCircle },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", icon: XCircle },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Ceva Logistics Services</CardTitle>
              <CardDescription>VAT No: 4123456789</CardDescription>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bill To */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Bill To:</p>
            <p className="text-sm font-medium text-foreground">{invoice.client}</p>
            <p className="text-sm text-muted-foreground">Customer Address Line 1</p>
            <p className="text-sm text-muted-foreground">Johannesburg, Gauteng - 2001</p>
          </div>

          {/* Invoice Details */}
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="text-sm font-medium text-foreground">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Load Number</p>
              <p className="text-sm font-medium text-foreground">{invoice.loadNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issue Date</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(invoice.issueDate).toLocaleDateString("en-ZA")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium text-foreground">
                {new Date(invoice.dueDate).toLocaleDateString("en-ZA")}
              </p>
            </div>
          </div>

          {/* Line Items */}
          <div className="pt-4 border-t border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 text-sm text-foreground">Freight Charges - {invoice.loadNumber}</td>
                  <td className="py-3 text-sm text-right font-medium text-foreground">
                    R{invoice.amount.toLocaleString("en-ZA")}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 text-sm text-foreground">VAT @ 15%</td>
                  <td className="py-3 text-sm text-right font-medium text-foreground">
                    R{invoice.vat.toLocaleString("en-ZA")}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-base font-semibold text-foreground">Total Amount</td>
                  <td className="py-3 text-base text-right font-bold text-foreground">
                    R{invoice.totalAmount.toLocaleString("en-ZA")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Details */}
          {invoice.status === "paid" && invoice.paymentDate && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-semibold text-foreground mb-2">Payment Details:</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(invoice.paymentDate).toLocaleDateString("en-ZA")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="text-sm font-medium text-foreground">{invoice.paymentMethod}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {invoice.status === "sent" && (
              <Button className="flex-1 bg-transparent" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PaymentHistoryItem({ invoice }: { invoice: Invoice }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <CheckCircle className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
          <p className="text-sm text-muted-foreground">{invoice.client}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-foreground">R{invoice.totalAmount.toLocaleString("en-ZA")}</p>
        <p className="text-xs text-muted-foreground">
          {invoice.paymentDate && new Date(invoice.paymentDate).toLocaleDateString("en-ZA")}
        </p>
      </div>
    </div>
  )
}

function ReportRow({
  label,
  value,
  percentage,
  color,
}: {
  label: string
  value: string
  percentage: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function ClientRevenueItem({ client, revenue, loads }: { client: string; revenue: number; loads: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{client}</p>
        <p className="text-xs text-muted-foreground">{loads} loads</p>
      </div>
      <p className="text-sm font-semibold text-foreground">R{revenue.toLocaleString("en-ZA")}</p>
    </div>
  )
}
