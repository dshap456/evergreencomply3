'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';

interface CheckoutButtonProps {
  courseId: string;
  courseName: string;
  price: number;
  billingProductId: string | null;
}

export function CheckoutButton({ 
  courseId, 
  courseName, 
  price,
  billingProductId 
}: CheckoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      // Create a checkout session via the API
      const response = await fetch('/api/checkout/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: [{
            courseId: billingProductId || courseId,
            quantity: 1,
          }],
          accountType: 'personal',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout}
      disabled={isLoading}
      className="w-full" 
      size="lg"
    >
      {isLoading ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          Processing...
        </>
      ) : (
        `Proceed to Payment - $${price}`
      )}
    </Button>
  );
}