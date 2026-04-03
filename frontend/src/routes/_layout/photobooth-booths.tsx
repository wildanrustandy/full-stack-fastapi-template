import { createFileRoute, redirect } from "@tanstack/react-router"
import { MapPin, Monitor, Plus, Settings, Trash2, X } from "lucide-react"
import { Suspense, useState } from "react"
import { UsersService } from "@/client"
import { AssignDeviceByPinDialog } from "@/components/Booths/AssignDeviceByPinDialog"
import { EditBoothDialog } from "@/components/Booths/EditBoothDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminWebSocket } from "@/hooks/useAdminWebSocket"
import useCustomToast from "@/hooks/useCustomToast"
import {
  useBooths,
  useCreateBooth,
  useDeleteBooth,
  useUnassignDevice,
} from "@/hooks/usePhotobooth"

export const Route = createFileRoute("/_layout/photobooth-booths")({
  component: PhotoboothBooths,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({ meta: [{ title: "Booths - FastAPI Template" }] }),
})

function BoothCard({ booth }: { booth: any }) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const deleteBooth = useDeleteBooth()
  const unassignDevice = useUnassignDevice()

  const handleDelete = async () => {
    try {
      await deleteBooth.mutateAsync(booth.id)
      showSuccessToast("Booth deleted")
    } catch (_error) {
      showErrorToast("Failed to delete booth")
    }
  }

  const handleUnassign = async () => {
    try {
      await unassignDevice.mutateAsync(booth.id)
      showSuccessToast("Device unassigned")
    } catch (_error) {
      showErrorToast("Failed to unassign device")
    }
  }

  const price = booth.config?.price_per_print || 35000

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{booth.name}</CardTitle>
          <Badge variant={booth.is_active ? "default" : "secondary"}>
            {booth.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <EditBoothDialog booth={booth} />
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {booth.location || "No location"}
        </div>

        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Price: </span>
          <span className="font-medium">
            Rp {price.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Device Assignment Section */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Device</span>
          </div>

          {booth.device_id ? (
            <div className="flex items-center justify-between bg-muted rounded-md p-2">
              <code className="text-xs">{booth.device_id}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnassign}
                disabled={unassignDevice.isPending}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <AssignDeviceByPinDialog
              boothId={booth.id}
              boothName={booth.name}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function BoothsContent() {
  // Connect to admin WebSocket for real-time updates
  useAdminWebSocket()

  const { data: boothsData } = useBooths()
  const createBooth = useCreateBooth()
  const { showSuccessToast } = useCustomToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")

  const booths = (boothsData as any)?.data ?? boothsData ?? []

  const handleCreate = async () => {
    await createBooth.mutateAsync({ name, location: location || undefined })
    showSuccessToast("Booth created successfully")
    setName("")
    setLocation("")
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booths</h1>
          <p className="text-muted-foreground">
            Manage your photobooth locations and assign devices
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Booth
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Booth</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Booth name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mall A, Floor 3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!name || createBooth.isPending}
              >
                {createBooth.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(booths) &&
          booths.map((booth: any) => (
            <BoothCard key={booth.id} booth={booth} />
          ))}
      </div>

      {(!Array.isArray(booths) || booths.length === 0) && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
          <Settings className="h-12 w-12" />
          <p>No booths yet. Create your first booth!</p>
        </div>
      )}
    </div>
  )
}

function PhotoboothBooths() {
  return (
    <Suspense fallback={<div className="p-6">Loading booths...</div>}>
      <BoothsContent />
    </Suspense>
  )
}
