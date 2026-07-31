import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { auth } from "./lib/firebase";
import { AnimatePresence } from "framer-motion";
import { AppLayout } from "./components/layout/AppLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { PartnerLayout } from "./components/layout/PartnerLayout";
import { PetProvider } from "./context/PetContext";
import { useAuthStore } from "./store/useAuthStore";
import { LoginModal } from "./components/auth/LoginModal";
import { RequireAuth } from "./components/auth/RequireAuth";
import { Splash } from "./pages/Splash";
import { PublicHome } from "./pages/PublicHome/PublicHome";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Pets } from "./pages/Pet/Pets";
import { PetProfile } from "./pages/Pet/PetProfile";
import { Boarding } from "./pages/Boarding/Boarding";
import { Checkout } from "./pages/Checkout/Checkout";
import { Grooming } from "./pages/Grooming/Grooming";
import { Veterinary } from "./pages/Veterinary/Veterinary";
import { Health } from "./pages/Health/Health";
import { Vaccinations } from "./pages/Health/Vaccinations";
import { Activities } from "./pages/Activities/Activities";
import { Notifications } from "./pages/Notifications/Notifications";
import { Gallery } from "./pages/Gallery/Gallery";
import { FacilityDetails } from "./pages/FacilityDetails/FacilityDetails";
import { Contact } from "./pages/Contact/Contact";
import { Profile } from "./pages/Profile/Profile";
import { UserLogin } from "./pages/Auth/UserLogin";
import { CompleteRegistration } from "./pages/Auth/CompleteRegistration";
import { VerifyEmail } from "./pages/Auth/VerifyEmail";
import { PartnerLogin } from "./pages/Auth/PartnerLogin";
import { AdminLogin } from "./pages/Auth/AdminLogin";
import { ForgotPassword } from "./pages/Auth/ForgotPassword";
import { ResetPassword } from "./pages/Auth/ResetPassword";
import { AdminDashboard } from "./pages/Admin/AdminDashboard";
import { PartnerDashboard } from "./pages/Partner/PartnerDashboard";
import { PartnerBookings } from "./pages/Partner/PartnerBookings";
import { PartnerExpenses } from "./pages/Partner/PartnerExpenses";
import { PartnerServices } from "./pages/Partner/PartnerServices";
import { PublicNavbar } from "./components/layout/PublicNavbar";
import { NotFound } from "./pages/NotFound/NotFound";
import { Services } from "./pages/Services/Services";
import { PartnerProfile } from "./pages/Partner/PartnerProfile";
import { PartnerCustomers } from "./pages/Partner/PartnerCustomers";
import { PartnerInventory } from "./pages/Partner/PartnerInventory";
import { UiverseLoader } from "./components/ui/UiverseLoader";
import { Membership } from "./pages/Membership/Membership";
import { SupportPage } from "./pages/Support/SupportPage";
import { PartnerSupport } from "./pages/Partner/PartnerSupport";
import { PublicFooter } from "./components/layout/PublicFooter";
import { AdminUsers } from "./pages/Admin/AdminUsers";
import { SuperAdminPortal } from "./pages/Admin/SuperAdminPortal";
import { AdminBusinesses } from "./pages/Admin/AdminBusinesses";
import { PartnerEmployees } from "./pages/Partner/PartnerEmployees";
import { RefundPolicy } from "./pages/Legal/RefundPolicy";
import { PrivacyPolicy } from "./pages/Legal/PrivacyPolicy";
import { TermsOfService } from "./pages/Legal/TermsOfService";

import { AdminSettings } from "./pages/Admin/AdminSettings";

// A simple wrapper for public pages that need the PublicNavbar
const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col">
    <PublicNavbar />
    <main className="flex-1">
      {children}
    </main>
    <PublicFooter />
  </div>
);

function App() {
  const location = useLocation();
  const { loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex items-center justify-center">
        <UiverseLoader text="authenticating" />
      </div>
    );
  }

  return (
    <>
      <LoginModal />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* =========================================
              ZONE 1: PUBLIC PORTAL 
             ========================================= */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/login/user" element={<UserLogin />} />
          <Route path="/complete-registration" element={<CompleteRegistration />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/partner/login" element={<PartnerLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/facility/:id" element={<PublicLayout><FacilityDetails /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
          <Route path="/activities" element={<PublicLayout><Activities /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
          <Route path="/grooming" element={<PublicLayout><Grooming /></PublicLayout>} />
          <Route path="/veterinary" element={<PublicLayout><Veterinary /></PublicLayout>} />
          
          <Route path="/refund-policy" element={<PublicLayout><RefundPolicy /></PublicLayout>} />
          <Route path="/privacy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
          <Route path="/terms" element={<PublicLayout><TermsOfService /></PublicLayout>} />

          {/* =========================================
              ZONE 2: SUPER ADMIN PORTAL 
             ========================================= */}
          <Route
            path="/admin/*"
            element={
              <RequireAuth allowedRoles={['admin', 'superadmin', 'super_admin']}>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="superadmin" element={<SuperAdminPortal />} />
                    <Route path="businesses" element={<AdminBusinesses />} />
                    <Route path="finance" element={<AdminDashboard />} />
                    <Route path="helpdesk" element={<AdminDashboard />} />
                    <Route path="ai-insights" element={<AdminDashboard />} />
                    <Route path="cms" element={<AdminDashboard />} />
                    <Route path="gallery" element={<AdminDashboard />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="pets" element={<AdminDashboard />} />
                    <Route path="*" element={<NotFound type="Admin" />} />
                  </Routes>
                </AdminLayout>
              </RequireAuth>
            }
          />

          {/* =========================================
              ZONE 3: PARTNER PORTAL 
             ========================================= */}
          <Route
            path="/partner/*"
            element={
              <RequireAuth allowedRoles={['partner']}>
                <PartnerLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<PartnerDashboard type="Boarding" />} />
                    <Route path="bookings" element={<PartnerBookings />} />
                    <Route path="upcoming-bookings" element={<PartnerBookings />} />
                    <Route path="check-in" element={<PartnerBookings />} />
                    <Route path="check-out" element={<PartnerBookings />} />
                    <Route path="current-pets" element={<PartnerBookings />} />
                    <Route path="services" element={<PartnerServices />} />
                    <Route path="customers" element={<PartnerCustomers />} />
                    <Route path="revenue" element={<PartnerExpenses />} />
                    <Route path="expenses" element={<PartnerExpenses />} />
                    <Route path="inventory" element={<PartnerInventory />} />
                    <Route path="employees" element={<PartnerEmployees />} />
                    <Route path="reports" element={<PartnerExpenses />} />
                    <Route path="notifications" element={<PartnerDashboard />} />
                    <Route path="messages" element={<PartnerDashboard />} />
                    <Route path="settings" element={<PartnerProfile />} />
                    <Route path="support" element={<PartnerSupport />} />
                    <Route path="*" element={<PartnerDashboard />} />
                  </Routes>
                </PartnerLayout>
              </RequireAuth>
            }
          />

          {/* =========================================
              ZONE 4: CUSTOMER PORTAL (AppLayout)
             ========================================= */}
          <Route
            path="/*"
            element={
              <PetProvider>
                <AppLayout>
                  <Routes>
                    <Route path="dashboard" element={<RequireAuth allowedRoles={['customer']}><Dashboard /></RequireAuth>} />
                    <Route path="boarding" element={<RequireAuth allowedRoles={['customer']}><Boarding /></RequireAuth>} />
                    <Route path="pets" element={<RequireAuth allowedRoles={['customer']}><Pets /></RequireAuth>} />
                    <Route path="pet/:id" element={<RequireAuth allowedRoles={['customer']}><PetProfile /></RequireAuth>} />
                    <Route path="checkout/:id" element={<RequireAuth allowedRoles={['customer']}><Checkout /></RequireAuth>} />
                    <Route path="notifications" element={<RequireAuth allowedRoles={['customer']}><Notifications /></RequireAuth>} />
                    <Route path="profile" element={<RequireAuth allowedRoles={['customer']}><Profile /></RequireAuth>} />
                    <Route path="health" element={<RequireAuth allowedRoles={['customer']}><Health /></RequireAuth>} />
                    <Route path="vaccinations" element={<RequireAuth allowedRoles={['customer']}><Vaccinations /></RequireAuth>} />
                    <Route path="gallery" element={<RequireAuth allowedRoles={['customer']}><Gallery /></RequireAuth>} />
                    <Route path="membership" element={<RequireAuth allowedRoles={['customer']}><Membership /></RequireAuth>} />
                    <Route path="support" element={<RequireAuth allowedRoles={['customer']}><SupportPage /></RequireAuth>} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              </PetProvider>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
