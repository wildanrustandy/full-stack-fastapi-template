// Device registration service - temporary until OpenAPI spec is regenerated
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export interface DeviceSession {
  id: string
  device_id: string
  device_name: string | null
  booth_id: string | null
  pin: string | null
  is_active: boolean
  connected_at: string | null
  last_heartbeat: string | null
}

export interface DeviceAssignmentCheck {
  device_id: string
  booth_id: string | null
  booth_name: string | null
  booth_location: string | null
  booth_config: Record<string, any> | null
  booth_active: boolean
  is_assigned: boolean
  pin: string | null
}

export const DevicesService = {
  async registerDevice(deviceId: string, deviceName?: string): Promise<DeviceSession> {
    const response = await fetch(`${API_BASE}/api/v1/devices/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: deviceId,
        device_name: deviceName || "Kiosk",
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to register device: ${response.status}`)
    }
    
    return response.json()
  },

  async checkAssignment(deviceId: string): Promise<DeviceAssignmentCheck> {
    const response = await fetch(`${API_BASE}/api/v1/devices/check-assignment/${deviceId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to check assignment: ${response.status}`)
    }
    
    return response.json()
  },

  async sendHeartbeat(deviceId: string): Promise<DeviceSession> {
    const response = await fetch(`${API_BASE}/api/v1/devices/${deviceId}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to send heartbeat: ${response.status}`)
    }
    
    return response.json()
  },

  async assignDeviceByPin(pin: string, boothId: string): Promise<any> {
    const token = localStorage.getItem("access_token")
    const response = await fetch(`${API_BASE}/api/v1/devices/assign-by-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        pin,
        booth_id: boothId,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Failed to assign device: ${response.status}`)
    }
    
    return response.json()
  },
}
