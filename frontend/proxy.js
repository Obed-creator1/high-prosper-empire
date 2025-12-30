import { NextResponse } from "next/server";

const roleDashboardMap = {
  ceo: "/dashboard/ceo",
  admin: "/dashboard/admin",
  collector: "/dashboard/collector",
  hr: "/dashboard/hr",
  staff: "/dashboard/staff",
  accounting: "/dashboard/accounting",
  manager: "/dashboard/manager",
  supervisor: "/dashboard/supervisor",
  driver: "/dashboard/driver",
  manpower: "/dashboard/manpower",
  customer: "/dashboard/customer",
};

export default function proxy(request) {
  const url = request.nextUrl.clone();
  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value; // make sure it's set at login

  // 🔒 Redirect unauthenticated users trying to access dashboards
  if (!token && url.pathname.startsWith("/dashboard")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 🎯 Redirect authenticated users to their role-based dashboard
  if (token && url.pathname === "/dashboard" && role) {
    const redirectPath = roleDashboardMap[role] || "/dashboard";
    url.pathname = redirectPath;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ✅ Configure matching routes
export const config = {
  matcher: ["/dashboard/:path*"],
};
