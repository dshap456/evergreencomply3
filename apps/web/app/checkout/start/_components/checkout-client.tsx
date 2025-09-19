'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

interface Course {
  id: string;
  title: string;
  slug: string;
  sku?: string;
  price: string;
  description: string | null;
  billing_product_id: string | null;
  expectedSlug?: string;
  status: string;
}

interface CartEntry {
  course: Course;
  quantity: number;
}

interface CheckoutClientProps {
  availableCourses: Course[];
}

export function CheckoutClient({ availableCourses }: CheckoutClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'needs-name' | 'processing' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isNameLoaded, setIsNameLoaded] = useState(false);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedCart = window.localStorage.getItem('training-cart');

    if (!savedCart) {
      setStatus('error');
      setErrorMessage('Your cart is empty.');
      return;
    }

    try {
      const parsed = JSON.parse(savedCart);

      if (!Array.isArray(parsed)) {
        throw new Error('Cart data is invalid.');
      }

      const matches: CartEntry[] = parsed
        .map((item: { courseId?: string; quantity?: number }) => {
          if (!item?.courseId || !item?.quantity || item.quantity <= 0) {
            return null;
          }

          const course = availableCourses.find(
            (candidate) =>
              candidate.slug === item.courseId ||
              candidate.expectedSlug === item.courseId ||
              candidate.sku === item.courseId ||
              candidate.id === item.courseId,
          );

          if (!course) {
            return null;
          }

          return {
            course,
            quantity: item.quantity,
          };
        })
        .filter(Boolean) as CartEntry[];

      if (!matches.length) {
        setStatus('error');
        setErrorMessage('We could not match your cart items. Please update your cart and try again.');
        return;
      }

      setCartEntries(matches);
      setStatus('ready');
    } catch (error) {
      console.error('Failed to prepare checkout cart:', error);
      setStatus('error');
      setErrorMessage('We could not read your cart. Please return to the cart and try again.');
    }
  }, [availableCourses]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedName = window.localStorage.getItem('training-cart-customer-name') || '';
    setCustomerName(storedName);
    setIsNameLoaded(true);
  }, []);

  const totalItems = useMemo(
    () => cartEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [cartEntries],
  );

  const subtotal = useMemo(
    () =>
      cartEntries.reduce((sum, entry) => sum + parseFloat(entry.course.price || '0') * entry.quantity, 0),
    [cartEntries],
  );

  const startCheckout = useCallback(
    async (name: string) => {
      setStatus('processing');
      setErrorMessage(null);
      hasAttemptedRef.current = true;

      try {
        if (typeof window !== 'undefined') {
          if (name) {
            window.localStorage.setItem('training-cart-customer-name', name);
          } else {
            window.localStorage.removeItem('training-cart-customer-name');
          }
        }

        const response = await fetch('/api/checkout/training', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartItems: cartEntries.map(({ course, quantity }) => ({
              courseId: course.slug || course.expectedSlug || course.sku || course.id,
              quantity,
            })),
            customerName: totalItems === 1 ? name : '',
            accountType: totalItems > 1 ? 'team' : 'personal',
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message = payload?.error || 'Failed to create checkout session.';
          throw new Error(message);
        }

        const { url } = await response.json();

        if (!url) {
          throw new Error('No checkout URL received.');
        }

        window.location.href = url;
      } catch (error) {
        console.error('Checkout redirect error:', error);
        setStatus('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'We could not start the checkout session. Please try again.',
        );
        hasAttemptedRef.current = false;
      }
    },
    [cartEntries, totalItems],
  );

  useEffect(() => {
    if (status !== 'ready' || !isNameLoaded || hasAttemptedRef.current) {
      return;
    }

    if (!totalItems) {
      setStatus('error');
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (totalItems === 1) {
      const trimmedName = customerName.trim();

      if (trimmedName) {
        void startCheckout(trimmedName);
      } else {
        setErrorMessage(null);
        setStatus('needs-name');
      }

      return;
    }

    void startCheckout('');
  }, [status, isNameLoaded, totalItems, customerName, startCheckout]);

  const handleSubmitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = customerName.trim();

    if (!trimmedName) {
      return;
    }

    void startCheckout(trimmedName);
  };

  const handleRetry = () => {
    if (!totalItems) {
      router.replace('/cart');
      return;
    }

    if (totalItems === 1 && !customerName.trim()) {
      setErrorMessage(null);
      setStatus('needs-name');
      return;
    }

    setErrorMessage(null);
    void startCheckout(totalItems === 1 ? customerName.trim() : '');
  };

  if (status === 'loading' || status === 'ready' || status === 'processing') {
    const message =
      status === 'loading'
        ? 'Preparing your cart...'
        : status === 'ready'
        ? 'Finalizing your checkout...'
        : 'Redirecting you to secure payment...';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs text-muted-foreground">This will only take a moment.</p>
        </div>
        {totalItems > 0 ? (
          <p className="text-xs text-muted-foreground">
            Order total ${subtotal.toFixed(2)} for {totalItems}{' '}
            {totalItems === 1 ? 'seat' : 'seats'}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === 'needs-name') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">Add your name</CardTitle>
            <p className="text-sm text-muted-foreground">
              We need the name that should appear on your completion certificate before continuing.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmitName}>
              <div className="space-y-2">
                <Label htmlFor="customer-name">Name for Certificate</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Enter your full legal name"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={!customerName.trim()}>
                  Continue to payment
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.replace('/cart')}
                >
                  Return to cart
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Checkout unavailable</CardTitle>
          <p className="text-sm text-muted-foreground">
            {errorMessage || 'Something went wrong while starting your checkout session.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={handleRetry}>
            Try again
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.replace('/cart')}
          >
            Return to cart
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
