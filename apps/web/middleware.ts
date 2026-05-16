import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Skip health check
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  // Skip if no credentials configured (dev mode)
  const user = process.env["DASHBOARD_USER"];
  const pass = process.env["DASHBOARD_PASSWORD"];
  if (!user || !pass) return NextResponse.next();

  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const [reqUser, ...passParts] = decoded.split(":");
      const reqPass = passParts.join(":");
      if (reqUser === user && reqPass === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Trade Dashboard"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
