import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, query, where } from "firebase/firestore";
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

async function linkAll() {
  console.log("🚀 Linking Firebase Auth UIDs to Firestore documents...");

  const emailToUid = new Map();

  // Find all UIDs by signing in
  for (const u of SEED_USERS) {
    if (u.email) {
      let pass = "Customer@123456";
      if (u.role === "admin") pass = "Admin@123456";
      if (u.role === "partner") pass = "Partner@123456";
      try {
        const cred = await signInWithEmailAndPassword(auth, u.email.trim(), pass);
        emailToUid.set(u.email.toLowerCase().trim(), { uid: cred.user.uid, role: u.role, oldId: u.id });
      } catch (e) {
        console.log(`Could not sign in ${u.email}`);
      }
    }
  }

  for (const b of SEED_BUSINESSES) {
    const email = b.email || b.contact_email;
    if (email && !emailToUid.has(email.toLowerCase().trim())) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), "Partner@123456");
        emailToUid.set(email.toLowerCase().trim(), { uid: cred.user.uid, role: "partner", oldId: b.owner_id });
      } catch (e) {}
    }
  }

  console.log(`Found ${emailToUid.size} Auth accounts. Updating Firestore...`);

  // Update /users collection
  for (const [email, info] of emailToUid.entries()) {
    await setDoc(doc(db, "users", info.uid), {
      id: info.uid,
      email: email,
      role: info.role,
      full_name: email.split("@")[0].replace(".", " "),
      created_at: new Date().toISOString()
    }, { merge: true });
  }

  // Update /businesses collection
  const bizSnap = await getDocs(collection(db, "businesses"));
  for (const bizDoc of bizSnap.docs) {
    const data = bizDoc.data();
    const email = (data.email || data.contact_email || "").toLowerCase().trim();
    if (email && emailToUid.has(email)) {
      const newOwnerId = emailToUid.get(email).uid;
      await updateDoc(bizDoc.ref, { owner_id: newOwnerId });
      console.log(`✅ Updated business ${data.name} -> owner_id: ${newOwnerId}`);
    } else if (data.owner_id === "partner_dr_sharma" && emailToUid.has("dr.sharma@gouujipets.com")) {
      await updateDoc(bizDoc.ref, { owner_id: emailToUid.get("dr.sharma@gouujipets.com").uid });
      console.log(`✅ Updated business ${data.name} -> owner_id: ${emailToUid.get("dr.sharma@gouujipets.com").uid}`);
    } else if (data.owner_id === "partner_anita_rao" && emailToUid.has("anita.rao@gouujipets.com")) {
      await updateDoc(bizDoc.ref, { owner_id: emailToUid.get("anita.rao@gouujipets.com").uid });
      console.log(`✅ Updated business ${data.name} -> owner_id: ${emailToUid.get("anita.rao@gouujipets.com").uid}`);
    }
  }

  console.log("Done linking!");
  process.exit(0);
}

linkAll();
