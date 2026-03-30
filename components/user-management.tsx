"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Trash2, Loader2, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: string
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  dispatcher: "Dispatcher",
  client: "Client",
  driver: "Driver",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  dispatcher: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  client: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  driver: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
}

export function UserManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "admin",
    password: "",
  })

  // Edit form state
  const [editData, setEditData] = useState({
    full_name: "",
    phone: "",
    role: "",
    password: "",
  })

  const supabase = createClient()

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_profiles")
      .select("id, email, full_name, phone, role, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching profiles:", error.message)
    } else {
      setProfiles(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProfiles()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [fetchProfiles])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || "Failed to create user")
    } else {
      toast.success("User created successfully")
      setShowCreateDialog(false)
      setFormData({ email: "", full_name: "", phone: "", role: "admin", password: "" })
      fetchProfiles()
    }

    setCreating(false)
  }

  function openEdit(profile: Profile) {
    setEditingUser(profile)
    setEditData({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      role: profile.role,
      password: "",
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)

    const body: Record<string, string> = {
      full_name: editData.full_name,
      phone: editData.phone,
      role: editData.role,
    }
    if (editData.password) {
      body.password = editData.password
    }

    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || "Failed to update user")
    } else {
      toast.success("User updated")
      setEditingUser(null)
      fetchProfiles()
    }

    setSaving(false)
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return

    setDeletingId(userId)

    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || "Failed to delete user")
    } else {
      toast.success("User deleted")
      fetchProfiles()
    }

    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage platform users and their roles</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {loading ? "Loading..." : `${profiles.length} user${profiles.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Joined</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-2 font-medium text-foreground">
                        {profile.full_name || "—"}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{profile.email}</td>
                      <td className="py-3 px-2 text-muted-foreground">{profile.phone || "—"}</td>
                      <td className="py-3 px-2">
                        <Badge
                          variant="secondary"
                          className={ROLE_COLORS[profile.role] || ""}
                        >
                          {ROLE_LABELS[profile.role] || profile.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground tabular-nums">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={profile.id === currentUserId || deletingId === profile.id}
                            onClick={() =>
                              handleDelete(profile.id, profile.full_name || profile.email)
                            }
                          >
                            {deletingId === profile.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new platform user with login credentials</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData((f) => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData((f) => ({ ...f, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Min 8 characters with uppercase, lowercase, number & special character
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for {editingUser?.full_name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingUser?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name</Label>
                <Input
                  id="edit_full_name"
                  value={editData.full_name}
                  onChange={(e) => setEditData((d) => ({ ...d, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={editData.phone}
                  onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Role</Label>
                <Select
                  value={editData.role}
                  onValueChange={(value) => setEditData((d) => ({ ...d, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_password">Reset Password</Label>
                <Input
                  id="edit_password"
                  type="password"
                  value={editData.password}
                  onChange={(e) => setEditData((d) => ({ ...d, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Min 8 chars with uppercase, lowercase, number & special character. Leave blank to keep current.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
