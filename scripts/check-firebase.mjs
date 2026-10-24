// Reports which Firebase environment variables this project can see, and whether the Admin
// SDK and Firestore actually respond. Prints names and status only — never values.
const REQUIRED = {
  "Firebase web config (browser, public)": [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ],
  "Firebase web config (optional extras)": [
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  ],
  "Admin credentials (server secret)": [
    "FIREBASE_SERVICE_ACCOUNT",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
  ],
};

const lines = [];
for (const [group, names] of Object.entries(REQUIRED)) {
  lines.push(`\n${group}`);
  for (const name of names) {
    const set = Boolean(process.env[name]?.trim());
    lines.push(`  ${set ? "OK     " : "MISSING"} ${name}`);
  }
}

const webReady = REQUIRED["Firebase web config (browser, public)"].every((n) => process.env[n]?.trim());
const adminReady = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT?.trim())
  || (process.env.FIREBASE_PROJECT_ID?.trim() && process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim());

let adminResult = "skipped";
let firestoreResult = "skipped";
if (adminReady) {
  try {
    const { firebaseAdminEnabled } = await import("../lib/firebase/admin.mjs");
    adminResult = firebaseAdminEnabled() ? "initialised" : "could not initialise (check the key JSON / private key line breaks)";
    if (adminResult === "initialised") {
      const { getFirestore } = await import("firebase-admin/firestore");
      const snapshot = await getFirestore().collection("profiles").limit(1).get();
      firestoreResult = `reachable (${snapshot.size} profile document(s) in this page)`;
    }
  } catch (error) {
    adminResult = `failed — ${error.message.split("\n")[0]}`;
  }
}

console.log("SOLEIX Firebase configuration check");
console.log(lines.join("\n"));
console.log("\nResult");
console.log(`  Browser sign-in (email + Google buttons): ${webReady ? "enabled" : "DISABLED — add the NEXT_PUBLIC_FIREBASE_* values"}`);
console.log(`  Server token verification: ${adminReady ? adminResult : "DISABLED — add FIREBASE_SERVICE_ACCOUNT (or the three FIREBASE_* fields)"}`);
console.log(`  Firestore profiles: ${adminReady ? firestoreResult : "not tested"}`);
console.log("\n  Restart `npm run dev` after editing .env.local — Next.js only reads it at startup.");
