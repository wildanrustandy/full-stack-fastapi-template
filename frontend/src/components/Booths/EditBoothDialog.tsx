import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useUpdateBooth } from "@/hooks/usePhotobooth"
import useCustomToast from "@/hooks/useCustomToast"
import { Settings } from "lucide-react"

interface EditBoothDialogProps {
  booth: {
    id: string
    name: string
    location: string | null
    is_active: boolean
    config: {
      price_per_print?: number
      timer_default?: number
      max_print?: number
      filters?: string[]
      payment_timeout?: number
    }
  }
}

export function EditBoothDialog({ booth }: EditBoothDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(booth.name)
  const [location, setLocation] = useState(booth.location || "")
  const [isActive, setIsActive] = useState(booth.is_active)
  const [price, setPrice] = useState(booth.config?.price_per_print?.toString() || "35000")
  
  const updateBooth = useUpdateBooth()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const handleSave = async () => {
    const priceNum = parseInt(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      showErrorToast("Please enter a valid price")
      return
    }

    try {
      await updateBooth.mutateAsync({
        id: booth.id,
        name,
        location: location || undefined,
        is_active: isActive,
        config: {
          ...booth.config,
          price_per_print: priceNum,
        }
      })
      showSuccessToast("Booth updated successfully")
      setOpen(false)
    } catch (error) {
      showErrorToast("Failed to update booth")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Booth</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input 
              id="edit-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Booth name"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-location">Location</Label>
            <Input 
              id="edit-location" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              placeholder="e.g. Mall A, Floor 3"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-price">Price per Print (Rp)</Label>
            <Input 
              id="edit-price" 
              type="number"
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              placeholder="35000"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="edit-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="edit-active" className="cursor-pointer">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSave} 
            disabled={!name || updateBooth.isPending}
          >
            {updateBooth.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
