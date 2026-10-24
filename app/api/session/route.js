import { getAccountUser, homeFor } from "@/lib/session.mjs";
import { getCustomer, listAddresses } from "@/lib/queries.mjs";

// The header is a static shell, so it asks for the viewer's identity after hydration instead
// of reading cookies in the shared layout. Only the signed-in viewer's own public profile
// fields are returned — never another account's data.
export async function GET() {
  const user = await getAccountUser();
  if (!user) {
    return Response.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  }
  const customer = user.kind === "customer" ? getCustomer(user.uid) : null;
  const address = user.kind === "customer" ? listAddresses(user.uid).find((entry) => entry.is_default) || null : null;

  return Response.json(
    {
      signedIn: true,
      kind: user.kind,
      name: customer?.name || user.name,
      email: user.email,
      phone: customer?.phone || "",
      picture: user.picture || "",
      role: user.role,
      address: address
        ? { full_name: address.full_name, phone: address.phone, address: address.address, city: address.city, postal_code: address.postal_code }
        : null,
      home: user.kind === "staff" ? homeFor(user.role) : "/account",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
