'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ArrowLeft, ShoppingCart, Plus, Minus, Loader2 } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { toast } from '@kit/ui/sonner';
import pathsConfig from '~/config/paths.config';
import { CustomShieldIcon } from '../../_components/custom-icons';

interface Course {
  id: string;
  title: string;
  slug: string;
  price: string;
  description: string | null;
  billing_product_id: string | null;
  expectedSlug?: string;
  sku?: string;
  status: string;
}

interface CartClientProps {
  availableCourses: Course[];
}

export function CartClient({ availableCourses }: CartClientProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Load initial quantities from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('training-cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        const newQuantities: Record<string, number> = {};
        
        cartItems.forEach((item: { courseId: string; quantity: number }) => {
          // Find course by any identifier
          const course = availableCourses.find(c => 
            c.slug === item.courseId || 
            c.expectedSlug === item.courseId ||
            c.sku === item.courseId || 
            c.id === item.courseId
          );
          
          if (course) {
            // Store by course ID for consistency
            newQuantities[course.id] = item.quantity;
          }
        });
        
        setQuantities(newQuantities);
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
    setIsLoading(false);
  }, [availableCourses]);

  // Save to localStorage whenever quantities change
  useEffect(() => {
    if (!isLoading) {
      const cartItems = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([courseId, quantity]) => {
          const course = availableCourses.find(c => c.id === courseId);
          // Store by slug if available, otherwise by ID
          return {
            courseId: course?.slug || courseId,
            quantity
          };
        });
      
      localStorage.setItem('training-cart', JSON.stringify(cartItems));
    }
  }, [quantities, isLoading, availableCourses]);

  const updateQuantity = (courseId: string, quantity: number) => {
    if (quantity <= 0) {
      setQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[courseId];
        return newQuantities;
      });
    } else {
      setQuantities(prev => ({
        ...prev,
        [courseId]: quantity
      }));
    }
  };

  const getQuantity = (courseId: string) => quantities[courseId] || 0;

  const calculateSubtotal = () => {
    return Object.entries(quantities).reduce((total, [courseId, qty]) => {
      const course = availableCourses.find(c => c.id === courseId);
      return total + (parseFloat(course?.price || '0') * qty);
    }, 0);
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getCartCourses = () => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([courseId, qty]) => {
        const course = availableCourses.find(c => c.id === courseId);
        return { course, quantity: qty };
      })
      .filter(item => item.course);
  };

  const handleCheckout = async () => {
    const cartCourses = getCartCourses();
    
    if (cartCourses.length === 0) {
      toast.error('Please add at least one course to your cart');
      return;
    }

    setIsCheckingOut(true);
    
    try {
      // Create checkout session
      const response = await fetch('/api/courses/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartCourses.map(({ course, quantity }) => ({
            product_id: course?.billing_product_id,
            price: parseFloat(course?.price || '0'),
            quantity,
            name: course?.title || 'Course',
            description: `Training seats for ${course?.title}`,
          })),
          success_url: `${window.location.origin}/checkout/success`,
          cancel_url: `${window.location.origin}/cart`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionUrl } = await response.json();
      
      if (sessionUrl) {
        // Redirect to Stripe checkout
        window.location.href = sessionUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const publishedCourses = availableCourses.filter(c => c.status === 'published');
  const subtotal = calculateSubtotal();
  const tax = 0; // No tax for digital products
  const total = subtotal + tax;
  const totalItems = getTotalItems();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <CustomShieldIcon className="h-6 w-6" />
              <span className="text-xl font-bold">Evergreen Comply</span>
            </Link>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/#features" className="text-sm font-medium hover:text-primary">
              Features
            </Link>
            <Link href="/courses" className="text-sm font-medium hover:text-primary">
              Courses
            </Link>
            <Link href="/#pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href={pathsConfig.auth.signUp}>
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-12">
        <div className="container">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="h-8 w-8" />
              Shopping Cart
            </h1>
            <p className="text-muted-foreground mt-2">
              Select the courses and number of seats you need for your team
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Course Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Available Courses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {publishedCourses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No courses available at this time.
                    </p>
                  ) : (
                    publishedCourses.map((course) => {
                      const quantity = getQuantity(course.id);
                      const lineTotal = parseFloat(course.price) * quantity;
                      
                      return (
                        <div 
                          key={course.id} 
                          className={`p-4 border rounded-lg transition-colors ${
                            quantity > 0 ? 'bg-primary/5 border-primary/20' : ''
                          }`}
                        >
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-lg">{course.title}</h4>
                              {course.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {course.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-lg font-medium">
                                  ${course.price} per seat
                                </span>
                                {course.sku && (
                                  <Badge variant="outline" className="text-xs">
                                    SKU: {course.sku}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(course.id, Math.max(0, quantity - 1))}
                                  disabled={quantity === 0}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateQuantity(course.id, parseInt(e.target.value) || 0)}
                                  className="w-20 text-center h-8"
                                  min="0"
                                />
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(course.id, quantity + 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground ml-2">
                                  seats
                                </span>
                              </div>
                              
                              {quantity > 0 && (
                                <div className="text-right">
                                  <p className="font-semibold">
                                    ${lineTotal.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {totalItems > 0 ? (
                    <>
                      <div className="space-y-2">
                        {getCartCourses().map(({ course, quantity }) => (
                          <div key={course!.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {course!.title} × {quantity}
                            </span>
                            <span>${(parseFloat(course!.price) * quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-semibold text-lg">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || totalItems === 0}
                      >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Checkout (${totalItems} ${totalItems === 1 ? 'seat' : 'seats'})`
                        )}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Secure checkout powered by Stripe
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Select courses and seats to begin
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}