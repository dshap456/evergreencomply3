'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import pathsConfig from '~/config/paths.config';
import { CustomShieldIcon } from '../_components/custom-icons';

// Hardcoded available courses
const AVAILABLE_COURSES = [
  {
    id: 'dot-hazmat-general',
    name: 'DOT HAZMAT - General Awareness',
    price: 79,
    duration: '3-year certification',
    slug: 'dot-hazmat',
  },
  {
    id: 'dot-hazmat-advanced',
    name: 'DOT HAZMAT - Advanced Awareness',
    price: 179,
    duration: '3-year certification',
    slug: 'advanced-hazmat',
  },
  {
    id: 'epa-rcra',
    name: 'EPA RCRA Hazardous Waste - Annual',
    price: 129,
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
            <Link href="/marketing-temp" className="flex items-center gap-2">
              <CustomShieldIcon className="h-6 w-6" />
              <span className="text-xl font-bold">Evergreen Comply</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href={pathsConfig.auth.signUp}>
              <Button className="bg-[rgba(58,92,81,1)]">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          <div className="mb-8">
            <Link href="/marketing-temp#courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Link>
            <h1 className="text-3xl font-bold mb-2">Training Cart</h1>
            <p className="text-muted-foreground">Select the number of seats you need for each course</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Available Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {AVAILABLE_COURSES.map((course) => {
                      const quantity = getItemQuantity(course.id);
                      const lineTotal = course.price * quantity;
                      
                      return (
                        <div key={course.id} className="border-b pb-6 last:border-0 last:pb-0">
                          <div className="grid gap-4 md:grid-cols-[1fr,auto,auto,auto] items-start md:items-center">
                            {/* Course Info */}
                            <div>
                              <h3 className="font-semibold">{course.name}</h3>
                              <p className="text-sm font-medium mt-1">${course.price} per seat</p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(course.id, quantity - 1)}
                                disabled={quantity === 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => updateQuantity(course.id, parseInt(e.target.value) || 0)}
                                className="w-20 text-center"
                                min="0"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(course.id, quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Line Total */}
                            <div className="text-right min-w-[100px]">
                              {quantity > 0 && (
                                <p className="font-semibold">${lineTotal.toLocaleString()}</p>
                              )}
                            </div>

                            {/* Remove Button */}
                            <div>
                              {quantity > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeItem(course.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
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
                              <div>
                                <p className="font-medium">{course.name}</p>
                                <p className="text-muted-foreground">{item.quantity} seats</p>
                              </div>
                              <p className="font-medium">${(course.price * item.quantity).toLocaleString()}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm text-muted-foreground">Total Seats</p>
                          <p className="font-medium">{getTotalSeats()}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-lg font-semibold">Total</p>
                          <p className="text-2xl font-bold text-primary">${calculateSubtotal().toLocaleString()}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <Button 
                    className="w-full bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]" 
                    size="lg"
                    disabled={cartItems.length === 0}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Proceed to Checkout
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    You'll be able to assign seats to team members after purchase
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted">
        <div className="container flex flex-col gap-6 py-8 md:py-10">
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <CustomShieldIcon className="h-6 w-6" />
                <span className="text-xl font-bold">Evergreen Comply</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                Modern, engaging, and legally compliant training for blue-collar professionals.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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