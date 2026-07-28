import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function check() {
  const testEmails = [
    "dr.sharma@gouujipets.com",
    "reservations@pawstailresort.com",
    "stay@royalpethaven.in",
    "info@barkleymanor.delhi.com"
  ];

  for (const email of testEmails) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, "Partner@123456");
      const q = query(collection(db, "businesses"), where("owner_id", "==", cred.user.uid));
      const snap = await getDocs(q);
      const status = snap.empty ? "no business doc" : snap.docs[0].data().status;
      console.log(`✅ ${email}: signed in successfully (status: ${status})`);
    } catch (e) {
      console.log(`❌ ${email}: sign in failed (${e.code}) - ${e.message}`);
    }
  }

  process.exit(0);
}

check();
