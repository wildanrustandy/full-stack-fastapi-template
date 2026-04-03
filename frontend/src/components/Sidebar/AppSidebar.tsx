import {
  BarChart3,
  Briefcase,
  Camera,
  DollarSign,
  Home,
  Users,
} from "lucide-react"

import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import { type Item, Main } from "./Main"
import { User } from "./User"

const baseItems: Item[] = [
  { icon: Home, title: "Dashboard", path: "/" },
  { icon: Briefcase, title: "Items", path: "/items" },
]

const photoboothItems: Item[] = [
  { icon: BarChart3, title: "PB Dashboard", path: "/photobooth-dashboard" },
  { icon: Camera, title: "Booths", path: "/photobooth-booths" },
  { icon: DollarSign, title: "Transactions", path: "/photobooth-transactions" },
]

export function AppSidebar() {
  const { user: currentUser } = useAuth()

  const items = currentUser?.is_superuser
    ? [...baseItems, { icon: Users, title: "Admin", path: "/admin" }]
    : baseItems

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-6 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
        <Logo variant="responsive" />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
        {currentUser?.is_superuser && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Photobooth</SidebarGroupLabel>
            </SidebarGroup>
            <Main items={photoboothItems} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
