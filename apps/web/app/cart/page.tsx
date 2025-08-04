'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import pathsConfig from '~/config/paths.config';
import { CustomShieldIcon } from '../_components/custom-icons';

// Hardcoded available courses - $1 for testing
const AVAILABLE_COURSES = [
  {
    id: 'dot-hazmat-general',
    name: 'DOT HAZMAT - General Awareness',
    price: 1, // $1 for testing
    duration: '3-year certification',
    slug: 'dot-hazmat',
  },
  {
    id: 'dot-hazmat-advanced',
    name: 'DOT HAZMAT - Advanced Awareness',
    price: 1, // $1 for testing
    duration: '3-year certification',
    slug: 'advanced-hazmat',
  },
  {
    id: 'epa-rcra',
    name: 'EPA RCRA Hazardous Waste - Annual',
    price: 1, // $1 for testing
    duration: '1-year certification',
    slug: 'epa-rcra',
  }
];

interface CartItem {
  courseId: string;
  quantity: number;
}

function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('training-cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCartItems(parsed);
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('training-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoading]);

  const updateQuantity = (courseId: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0
      setCartItems(prev => prev.filter(item => item.courseId !== courseId));
    } else {
      setCartItems(prev => {
        const existing = prev.find(item => item.courseId === courseId);
        if (existing) {
          // Update existing item
          return prev.map(item => 
            item.courseId === courseId ? { ...item, quantity } : item
          );
        } else {
          // Add new item
          return [...prev, { courseId, quantity }];
        }
      });
    }
  };

  const removeItem = (courseId: string) => {
    setCartItems(prev => prev.filter(item => item.courseId !== courseId));
  };

  const getItemQuantity = (courseId: string) => {
    const item = cartItems.find(item => item.courseId === courseId);
    return item?.quantity || 0;
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const course = AVAILABLE_COURSES.find(c => c.id === item.courseId);
      return total + (course?.price || 0) * item.quantity;
    }, 0);
  };

  const getTotalSeats = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/checkout/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartItems }),
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

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
          <div className="flex items-center gap-4">
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="outline">Log In</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-4 md:py-8">
        <div className="container px-4 md:px-6">
          <div className="mb-4 md:mb-6">
            <Link href="/#courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">Training Cart</h1>
            <p className="text-sm text-muted-foreground">Select seats for each course</p>
          </div>

          <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="py-4 md:py-6">
                  <CardTitle className="text-lg md:text-xl">Available Courses</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6">
                  <div className="space-y-4">
                    {AVAILABLE_COURSES.map((course) => {
                      const quantity = getItemQuantity(course.id);
                      const lineTotal = course.price * quantity;
                      
                      return (
                        <div key={course.id} className="border-b pb-4 last:border-0 last:pb-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {/* Course Info */}
                            <div className="flex-1">
                              <h3 className="font-medium text-sm md:text-base">{course.name}</h3>
                            </div>

                            {/* Mobile: Quantity and Total */}
                            <div className="flex items-center gap-3">
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(course.id, quantity - 1)}
                                  disabled={quantity === 0}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateQuantity(course.id, parseInt(e.target.value) || 0)}
                                  className="w-14 h-7 text-center text-sm"
                                  min="0"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(course.id, quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Line Total */}
                              {quantity > 0 && (
                                <>
                                  <div className="text-sm font-semibold min-w-[60px] text-right">
                                    ${lineTotal}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => removeItem(course.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardHeader className="py-4 md:py-6">
                  <CardTitle className="text-lg md:text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6 space-y-3">
                  {cartItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No courses selected
                    </p>
                  ) : (
                    <>
                      {/* Summary Items */}
                      <div className="space-y-2">
                        {cartItems.map((item) => {
                          const course = AVAILABLE_COURSES.find(c => c.id === item.courseId);
                          if (!course) return null;
                          
                          return (
                            <div key={item.courseId} className="flex justify-between text-sm">
                              <div className="flex-1 pr-2">
                                <p className="font-medium line-clamp-1">{course.name}</p>
                                <p className="text-xs text-muted-foreground">{item.quantity} seats</p>
                              </div>
                              <p className="font-medium text-sm">${(course.price * item.quantity)}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm text-muted-foreground">Total Seats</p>
                          <p className="text-sm font-medium">{getTotalSeats()}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">Total</p>
                          <p className="text-xl font-bold text-primary">${calculateSubtotal()}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <Button 
                    className="w-full bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)] h-9 md:h-10" 
                    disabled={cartItems.length === 0 || isCheckingOut}
                    onClick={handleCheckout}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    {isCheckingOut ? 'Processing...' : 'Checkout'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Assign seats after purchase
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted mt-8">
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

export default CartPage;