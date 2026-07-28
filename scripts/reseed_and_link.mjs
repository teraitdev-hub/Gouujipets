import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc } from "firebase/firestore";
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
const db = getFirestore(app);

async function getOrCreateUid(email, pass) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user.uid;
  } catch (e) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      return cred.user.uid;
    } catch (e2) {
      return null;
    }
  }
}

async function fixAll() {
  console.log("🚀 Syncing Auth UIDs to Firestore businesses and users...");

  // 1. Ensure SEED_USERS
  const userMap = new Map();
  for (const u of SEED_USERS) {
    if (u.email) {
      let pass = "Customer@123456";
      if (u.role === "admin") pass = "Admin@123456";
      if (u.role === "partner") pass = "Partner@123456";
      const uid = await getOrCreateUid(u.email, pass);
      if (uid) {
        userMap.set(u.id, uid);
        await setDoc(doc(db, "users", uid), {
          ...u,
          id: uid,
          email: u.email
        }, { merge: true });
      }
    }
  }

  // 2. Map old partner IDs to UIDs
  const partnerUidMap = new Map();
  if (userMap.has("partner_dr_sharma")) partnerUidMap.set("partner_dr_sharma", userMap.get("partner_dr_sharma"));
  if (userMap.has("partner_anita_rao")) partnerUidMap.set("partner_anita_rao", userMap.get("partner_anita_rao"));

  // 3. Update SEED_BUSINESSES in Firestore
  let count = 0;
  for (const b of SEED_BUSINESSES) {
    const email = b.email || b.contact_email;
    let ownerUid = partnerUidMap.get(b.owner_id);
    if (!ownerUid && email) {
      ownerUid = await getOrCreateUid(email, "Partner@123456");
      if (ownerUid) {
        await setDoc(doc(db, "users", ownerUid), {
          id: ownerUid,
          email: email,
          role: "partner",
          full_name: b.name,
          created_at: new Date().toISOString()
        }, { merge: true });
      }
    }
    if (ownerUid) {
      await setDoc(doc(db, "businesses", b.id), {
        ...b,
        owner_id: ownerUid,
        status: "active" // Default seeded demo businesses to active so login works
      }, { merge: true });
      count++;
    }
  }

  console.log(`✅ Synced and linked ${count} business profiles to real Firebase Auth UIDs!`);
  process.exit(0);
}

fixAll();
