import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";
import { SEED_USERS, SEED_BUSINESSES, SEED_PETS, SEED_REVIEWS, SEED_COUPONS, SEED_BOOKINGS } from "./seedData.mjs";

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

async function seedDatabase() {
  console.log("🚀 Starting comprehensive Firestore database seed for GouujiPets...");

  // 1. Authenticate as Admin
  try {
    const cred = await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");
    console.log("✅ Authenticated as admin:", cred.user.uid);
  } catch (e) {
    console.log("⚠️ Could not sign in as admin@gouujipets.com, attempting to create account...");
    try {
      const cred = await createUserWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");
      console.log("✅ Created admin user:", cred.user.uid);
    } catch (e2) {
      console.error("❌ Auth failed:", e2.message);
      process.exit(1);
    }
  }

  // Also try to create test partner and customer accounts in Auth if they don't exist
  const authUsersToCreate = [
    { email: "dr.sharma@gouujipets.com", pass: "Partner@123456" },
    { email: "anita.rao@gouujipets.com", pass: "Partner@123456" },
    { email: "priya.patel@gmail.com", pass: "Customer@123456" },
    { email: "rahul.verma@gmail.com", pass: "Customer@123456" }
  ];

  for (const u of authUsersToCreate) {
    try {
      await createUserWithEmailAndPassword(auth, u.email, u.pass);
      console.log(`✅ Created auth account for ${u.email}`);
    } catch (e) {
      // Ignore error if account already exists
    }
  }

  // Re-verify we are signed in as admin before seeding Firestore
  await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");

  // 2. Seed Users Collection
  console.log(`\n📦 Seeding ${SEED_USERS.length} users into /users collection...`);
  for (const user of SEED_USERS) {
    try {
      await setDoc(doc(db, "users", user.id), user);
      console.log(`   ✔ User: ${user.full_name} (${user.role})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed user ${user.id}:`, err.message);
    }
  }

  // 3. Seed Businesses Collection
  console.log(`\n📦 Seeding ${SEED_BUSINESSES.length} verified businesses into /businesses collection...`);
  for (const biz of SEED_BUSINESSES) {
    try {
      await setDoc(doc(db, "businesses", biz.id), biz);
      console.log(`   ✔ Business: ${biz.name} [${biz.type}]`);
    } catch (err) {
      console.error(`   ❌ Failed to seed business ${biz.id}:`, err.message);
    }
  }

  // 4. Seed Services Collection (Global catalog from services_offered + categories)
  console.log(`\n📦 Seeding global catalog into /services collection...`);
  const serviceSet = new Map();
  for (const biz of SEED_BUSINESSES) {
    if (Array.isArray(biz.services_offered)) {
      for (const s of biz.services_offered) {
        const key = `${biz.type}_${s.id}`;
        serviceSet.set(key, {
          id: key,
          serviceId: s.id,
          name: s.name,
          category: biz.type,
          price: s.price,
          duration_mins: s.duration_mins || 60,
          description: s.description || s.name,
          business_id: biz.id,
          business_name: biz.name,
          status: "active",
          created_at: new Date().toISOString()
        });
      }
    }
  }
  for (const [key, srv] of serviceSet) {
    try {
      await setDoc(doc(db, "services", key), srv);
      console.log(`   ✔ Service: ${srv.name} (${srv.category})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed service ${key}:`, err.message);
    }
  }

  // 5. Seed Pets Collection
  console.log(`\n📦 Seeding ${SEED_PETS.length} pets into /pets collection...`);
  for (const pet of SEED_PETS) {
    try {
      await setDoc(doc(db, "pets", pet.id), pet);
      console.log(`   ✔ Pet: ${pet.name} (${pet.breed})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed pet ${pet.id}:`, err.message);
    }
  }

  // 6. Seed Reviews Collection
  console.log(`\n📦 Seeding ${SEED_REVIEWS.length} verified reviews into /reviews collection...`);
  for (const rev of SEED_REVIEWS) {
    try {
      await setDoc(doc(db, "reviews", rev.id), rev);
      console.log(`   ✔ Review by ${rev.user_name} (${rev.rating}⭐)`);
    } catch (err) {
      console.error(`   ❌ Failed to seed review ${rev.id}:`, err.message);
    }
  }

  // 7. Seed Coupons Collection
  console.log(`\n📦 Seeding ${SEED_COUPONS.length} promotional coupons into /coupons collection...`);
  for (const cpn of SEED_COUPONS) {
    try {
      await setDoc(doc(db, "coupons", cpn.id), cpn);
      console.log(`   ✔ Coupon: ${cpn.code} (${cpn.discount}%)`);
    } catch (err) {
      console.error(`   ❌ Failed to seed coupon ${cpn.id}:`, err.message);
    }
  }

  // 8. Seed Bookings Collection
  console.log(`\n📦 Seeding ${SEED_BOOKINGS.length} sample bookings into /bookings collection...`);
  for (const bkg of SEED_BOOKINGS) {
    try {
      await setDoc(doc(db, "bookings", bkg.id), bkg);
      console.log(`   ✔ Booking: ${bkg.service_name} for ${bkg.pet_names} (${bkg.status})`);
    } catch (err) {
      console.error(`   ❌ Failed to seed booking ${bkg.id}:`, err.message);
    }
  }

  console.log("\n🎉 Database seeding completed successfully! All collections are now properly populated.");
  console.log("⏳ Flushing network buffers and committing to Firestore servers...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  process.exit(0);
}

seedDatabase();
