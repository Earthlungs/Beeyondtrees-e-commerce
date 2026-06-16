import { redirect } from "next/navigation"

// The old gate-code + self-registration staff portal has been retired. Staff
// now sign in through the single admin login (accounts are provisioned from the
// admin Users page). Kept as a redirect so old links/bookmarks still work.
export default function PortalPage() {
  redirect("/admin/login")
}
