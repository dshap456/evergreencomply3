'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CheckCircle } from 'lucide-react';
import { CustomShieldIcon } from '../../_components/custom-icons';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Clear the cart after successful purchase
    if (sessionId && !isClearing) {
      setIsClearing(true);
      localStorage.removeItem('training-cart');
      // Dispatch custom event to update cart count
      window.dispatchEvent(new Event('cart-updated'));
    }
  }, [sessionId, isClearing]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <CustomShieldIcon className="h-6 w-6" />
              <span className="text-xl font-bold">Evergreen Comply</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container max-w-2xl px-4 md:px-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Purchase Successful!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Thank you for your purchase. You will receive an email confirmation shortly.
              </p>
              
              {sessionId && (
                <p className="text-sm text-muted-foreground">
                  Order ID: {sessionId}
                </p>
              )}

              <div className="space-y-2 pt-4">
                <p className="font-medium">What's next?</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Check your email for order confirmation</li>
                  <li>• You'll receive instructions to access your training</li>
                  <li>• Assign seats to your team members</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-center">
                <Link href="/">
                  <Button variant="outline">
                    Return to Home
                  </Button>
                </Link>
                <Link href="/auth/sign-in">
                  <Button>
                    Sign In to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted">
        <div className="container px-4 md:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CustomShieldIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">Evergreen Comply</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Evergreen Comply, LLC. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}