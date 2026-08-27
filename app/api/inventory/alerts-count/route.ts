import { auth } from "@/lib/auth";
import { getInventoryAlertCounts } from "@/lib/inventoryAlerts";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const counts = await getInventoryAlertCounts();
  return Response.json({ success: true, data: counts });
}
