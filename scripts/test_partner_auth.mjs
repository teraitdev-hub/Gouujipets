import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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

async function test() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "dr.sharma@gouujipets.com", "Partner@123456");
    console.log("✅ Signed in as dr.sharma:", cred.user.uid);
  } catch (e) {
    console.log("❌ Sign in failed:", e.code, e.message);
    try {
      const cred = await createUserWithEmailAndPassword(auth, "dr.sharma@gouujipets.com", "Partner@123456");
      console.log("✅ Created dr.sharma:", cred.user.uid);
    } catch (e2) {
      console.log("❌ Create failed:", e2.code, e2.message);
    }
  }
  await new Promise(r => setTimeout(r, 2000));
  process.exit(0);
}

test();
