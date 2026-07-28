import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1COW2uZ9YP-sYosaESXgRX1AOs6LVknE",
  authDomain: "gouujipets.firebaseapp.com",
  projectId: "gouujipets",
  storageBucket: "gouujipets.firebasestorage.app",
  messagingSenderId: "591158355137",
  appId: "1:591158355137:web:83e6ecd166cd8cf522a040"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_OR_TEST_NAMES = [
  'test', 'demo', 'sample', 'placeholder', 'unregistered', 'royal pet haven', 'barkley manor', 'paws & tail', 'whispering pines', 'happy tails', 'sunnyside', 'pampered paw', 'bubble & bark', 'furry styles', 'cozy home', 'safepaws', 'k9 champions', 'smart paws', 'gouuji 24/7', 'st. francis', 'petcare plus', 'step & bark'
];

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

async function deleteDummyData() {
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");
  
  console.log("Removing dummy businesses...");
  const bSnap = await getDocs(collection(db, "businesses"));
  let bCount = 0;
  for (const d of bSnap.docs) {
    const data = d.data();
    const isDummyId = d.id.startsWith("biz_") || d.id === "_placeholder";
    const nameLower = (data.name || "").toLowerCase();
    const isDummyName = SEED_OR_TEST_NAMES.some(n => nameLower.includes(n));
    if (isDummyId || isDummyName) {
      await deleteDoc(doc(db, "businesses", d.id));
      console.log(`Deleted dummy business: ${d.id} (${data.name})`);
      bCount++;
    }
  }

  console.log("Removing dummy users (seeded customers/partners)...");
  const uSnap = await getDocs(collection(db, "users"));
  let uCount = 0;
  for (const d of uSnap.docs) {
    const data = d.data();
    const isDummyId = d.id.startsWith("customer_") || d.id.startsWith("partner_") || d.id === "_placeholder";
    const emailLower = (data.email || "").toLowerCase();
    const isDummyEmail = emailLower.includes("gouujipets.com") || emailLower.includes("pawstailresort.com") || emailLower.includes("royalpethaven.in") || emailLower.includes("barkleymanor") || emailLower.includes("whisperingpines") || emailLower.includes("happytailsdaycare") || emailLower.includes("sunnysidepune") || emailLower.includes("pamperedpaw") || emailLower.includes("bubblebark") || emailLower.includes("furrystyles") || emailLower.includes("cozypetsitting") || emailLower.includes("safepawstaxi") || emailLower.includes("k9champions") || emailLower.includes("smartpawsmumbai") || emailLower.includes("gouujivet.com") || emailLower.includes("stfrancis.hyd.com") || emailLower.includes("petcareplus.mum.in") || emailLower.includes("stepandbark.com");
    if ((isDummyId || isDummyEmail) && data.role !== "admin") {
      await deleteDoc(doc(db, "users", d.id));
      console.log(`Deleted dummy user: ${d.id} (${data.email})`);
      uCount++;
    }
  }
  
  console.log(`\n✅ Done! Deleted ${bCount} dummy businesses and ${uCount} dummy users.`);
  process.exit(0);
}

deleteDummyData();
