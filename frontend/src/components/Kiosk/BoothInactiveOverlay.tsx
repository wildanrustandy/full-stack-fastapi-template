import { useKioskDevice } from "@/hooks/useKioskDevice"

export default function BoothInactiveOverlay() {
  const { unassignedReason } = useKioskDevice()

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
    >
      <div className="text-center text-white space-y-4">
        <div className="text-6xl font-bold text-red-500">Inactive</div>
        <div className="text-xl text-gray-300">
          {unassignedReason || "Booth is temporarily unavailable"}
        </div>
        <div className="text-sm text-gray-500 mt-8">
          Please contact an administrator
        </div>
      </div>
    </div>
  )
}
