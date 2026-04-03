import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useBooths, useCreateBooth, useDeleteBooth, useAssignDevice, useUnassignDevice } from "@/hooks/usePhotobooth"
import useCustomToast from "@/hooks/useCustomToast"
import { UsersService } from "@/client"
import { Plus, Trash2, MapPin, Settings, Monitor, X } from "lucide-react"

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
  const assignDevice = useAssignDevice()
  const unassignDevice = useUnassignDevice()
  const [assignOpen, setAssignOpen] = useState(false)
  const [deviceId, setDeviceId] = useState("")

  const handleDelete = async () => {
    try {
      await deleteBooth.mutateAsync(booth.id)
      showSuccessToast("Booth deleted")
    } catch (error) {
      showErrorToast("Failed to delete booth")
    }
  }

  const handleAssign = async () => {
    if (!deviceId.trim()) return
    console.log("Assigning device:", { boothId: booth.id, deviceId: deviceId.trim(), booth })
    try {
      await assignDevice.mutateAsync({ boothId: booth.id, deviceId: deviceId.trim() })
      showSuccessToast("Device assigned successfully")
      setDeviceId("")
      setAssignOpen(false)
    } catch (error) {
      console.error("Assign failed:", error)
      showErrorToast("Failed to assign device. Check if device ID is valid.")
    }
  }

  const handleUnassign = async () => {
    try {
      await unassignDevice.mutateAsync(booth.id)
      showSuccessToast("Device unassigned")
    } catch (error) {
      showErrorToast("Failed to unassign device")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{booth.name}</CardTitle>
        <Badge variant={booth.is_active ? "default" : "secondary"}>
          {booth.is_active ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {booth.location || "No location"}
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
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Device to {booth.name}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deviceId">Device ID</Label>
                    <Input 
                      id="deviceId" 
                      value={deviceId} 
                      onChange={(e) => setDeviceId(e.target.value)} 
                      placeholder="e.g., dev_aB3x9KpL2mN7qR5s"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the device ID shown on the kiosk waiting screen
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleAssign} 
                    disabled={!deviceId.trim() || assignDevice.isPending}
                  >
                    {assignDevice.isPending ? "Assigning..." : "Assign"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BoothsContent() {
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
          <p className="text-muted-foreground">Manage your photobooth locations and assign devices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Booth</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Booth</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Booth name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Mall A, Floor 3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!name || createBooth.isPending}>
                {createBooth.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(booths) && booths.map((booth: any) => (
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
