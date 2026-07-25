/**
 * useRazorpay Hook
 * Launches the Razorpay checkout modal.
 * Uses Razorpay Test Mode (key_id starting with rzp_test_).
 * In production, replace RAZORPAY_KEY_ID with your live key.
 */

// Razorpay TEST key — safe to include in frontend (public key only)
const RAZORPAY_KEY_ID = "rzp_test_1DP5mmOlF5G5ag";

interface RazorpayOptions {
  amount: number;        // in paise (₹1 = 100 paise)
  currency?: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact?: string;
  };
  onSuccess: (paymentId: string, orderId: string, signature: string) => void;
  onFailure?: (error: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const useRazorpay = () => {
  const openPayment = (options: RazorpayOptions) => {
    if (!window.Razorpay) {
      alert("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: options.amount,
      currency: options.currency ?? "INR",
      name: options.name,
      description: options.description,
      image: "/vite.svg",
      // NOTE: In production you would generate a real order_id from your backend
      // For development/demo, we use a client-side only flow (no signature verification)
      handler: function (response: any) {
        options.onSuccess(
          response.razorpay_payment_id ?? `pay_demo_${Date.now()}`,
          response.razorpay_order_id ?? `order_demo_${Date.now()}`,
          response.razorpay_signature ?? "demo_signature"
        );
      },
      prefill: {
        name: options.prefill.name,
        email: options.prefill.email,
        contact: options.prefill.contact ?? "",
      },
      notes: {
        platform: "PetPro",
      },
      theme: {
        color: "#111827",
      },
      modal: {
        ondismiss: () => {
          options.onFailure?.({ description: "Payment cancelled by user." });
        },
      },
    });

    rzp.on("payment.failed", (response: any) => {
      options.onFailure?.(response.error);
    });

    rzp.open();
  };

  return { openPayment };
};
