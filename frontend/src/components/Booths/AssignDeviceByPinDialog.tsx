import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import useCustomToast from "@/hooks/useCustomToast"
import { DevicesService } from "@/services/devices"

interface AssignDeviceByPinDialogProps {
  boothId: string
  boothName: string
  onSuccess?: () => void
}

export function AssignDeviceByPinDialog({
  boothId,
  boothName,
  onSuccess,
}: AssignDeviceByPinDialogProps) {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const handleAssign = async () => {
    if (pin.length !== 6) {
      showErrorToast("Please enter a 6-digit PIN")
      return
    }

    setIsLoading(true)
    try {
      await DevicesService.assignDeviceByPin(pin, boothId)
      showSuccessToast("Device assigned successfully")
      setPin("")
      setOpen(false)
      onSuccess?.()
    } catch (_error) {
      showErrorToast("Failed to assign device. Check if PIN is correct.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Assign Device
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Device to {boothName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pin">6-Digit PIN</Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) => {
                // Only allow digits, max 6 characters
                const value = e.target.value.replace(/\D/g, "").slice(0, 6)
                setPin(value)
              }}
              placeholder="123456"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit PIN displayed on the kiosk screen
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAssign}
            disabled={pin.length !== 6 || isLoading}
          >
            {isLoading ? "Assigning..." : "Assign Device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
