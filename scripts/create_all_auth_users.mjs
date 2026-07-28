import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { SEED_USERS, SEED_BUSINESSES } from "./seedData.mjs";

const firebaseConfig = {
  apiKey: "AIzaSyB1COW2uZ9YP-sYosaESXgRX1AOs6LVknE",
  authDomain: "gouujipets.firebaseapp.com",
  projectId: "gouujipets",
  storageBucket: "gouujipets.firebasestorage.app",
  messagingSenderId: "591158355137",
  appId: "1:591158355137:web:83e6ecd166cd8cf522a040"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createAll() {
  console.log("🚀 Creating auth accounts for all seeded users and businesses...");

  const allEmails = new Map();

  // Add SEED_USERS
  for (const u of SEED_USERS) {
    if (u.email) {
      let pass = "Customer@123456";
      if (u.role === "admin") pass = "Admin@123456";
      if (u.role === "partner") pass = "Partner@123456";
      allEmails.set(u.email.toLowerCase().trim(), pass);
    }
  }

  // Add SEED_BUSINESSES
  for (const b of SEED_BUSINESSES) {
    const email = b.email || b.contact_email;
    if (email) {
      allEmails.set(email.toLowerCase().trim(), "Partner@123456");
    }
  }

  console.log(`Found ${allEmails.size} unique emails to ensure in Firebase Auth.`);

  let created = 0;
  let existed = 0;
  let failed = 0;

  for (const [email, pass] of allEmails.entries()) {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      console.log(`✅ Created auth account: ${email} -> ${pass}`);
      created++;
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        existed++;
      } else {
        console.log(`❌ Failed for ${email}:`, e.code, e.message);
        failed++;
      }
    }
  }

  console.log(`\nDone! Created: ${created}, Already existed: ${existed}, Failed: ${failed}`);
  process.exit(0);
}

createAll();
