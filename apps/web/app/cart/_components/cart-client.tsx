'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import pathsConfig from '~/config/paths.config';
import { CustomShieldIcon } from '../../_components/custom-icons';
import { CartMultiSelect } from './cart-multi-select';

interface CartItem {
  courseId: string;
  quantity: number;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  price: string;
  description: string | null;
  billing_product_id: string | null;
  expectedSlug?: string;
}

interface CartClientProps {
  availableCourses: Course[];
}

export function CartClient({ availableCourses }: CartClientProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showMultiSelect, setShowMultiSelect] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('training-cart');
    console.log('Saved cart from localStorage:', savedCart);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        console.log('Parsed cart items:', parsed);
        setCartItems(parsed);
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }
    console.log('Available courses:', availableCourses);
    setIsLoading(false);
  }, [availableCourses]); // Add availableCourses as dependency

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('training-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isLoading]);

  // Function to reload cart from localStorage
  const reloadCart = () => {
    const savedCart = localStorage.getItem('training-cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCartItems(parsed);
      } catch (e) {
        console.error('Error parsing cart:', e);
      }
    }
  };

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
      // Find course by slug, expectedSlug, SKU, or ID
      const course = availableCourses.find(c => 
        c.slug === item.courseId || 
        c.expectedSlug === item.courseId ||
        c.sku === item.courseId ||
        c.id === item.courseId
      );
      console.log(`Looking for course with courseId: ${item.courseId}`, course);
      return total + (parseFloat(course?.price || '0') * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    
    try {
      // Create line items for checkout
      const lineItems = cartItems.map(item => {
        const course = availableCourses.find(c => 
          c.id === item.courseId || c.slug === item.courseId
        );
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course?.title || 'Course',
              description: `Training seats for ${course?.title}`,
            },
            unit_amount: Math.round(parseFloat(course?.price || '0') * 100), // Convert to cents
          },
          quantity: item.quantity,
        };
      });

      // TODO: Integrate with actual payment system
      // For now, just simulate checkout
      console.log('Checkout with items:', lineItems);
      
      // Redirect to success page after "payment"
      setTimeout(() => {
        localStorage.removeItem('training-cart');
        window.location.href = '/checkout/success';
      }, 1500);
      
    } catch (error) {
      console.error('Checkout error:', error);
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const tax = 0; // No tax for digital products
  const total = subtotal + tax;

  // Filter cart items to only include courses that still exist
  const validCartItems = cartItems.filter(item => {
    // Check by slug, expectedSlug, SKU, or ID
    const courseExists = availableCourses.some(course => 
      course.slug === item.courseId || 
      course.expectedSlug === item.courseId ||
      course.sku === item.courseId ||
      course.id === item.courseId
    );
    console.log(`Checking cart item ${item.courseId}:`, courseExists);
    console.log('Available courses:', availableCourses.map(c => ({ 
      id: c.id, 
      slug: c.slug, 
      expectedSlug: c.expectedSlug,
      sku: c.sku,
      title: c.title 
    })));
    return courseExists;
  });

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
          </div>
          
          {/* Add Course Selection Button */}
          <div className="mb-6 flex justify-between items-center">
            <p className="text-muted-foreground">
              {validCartItems.length} {validCartItems.length === 1 ? 'course' : 'courses'} in cart
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowMultiSelect(!showMultiSelect)}
            >
              {showMultiSelect ? 'Hide Course Selection' : 'Add More Courses'}
            </Button>
          </div>

          {/* Multi-Select Course Interface */}
          {showMultiSelect && (
            <div className="mb-8">
              <CartMultiSelect 
                availableCourses={availableCourses} 
                onCartUpdate={reloadCart}
              />
            </div>
          )}

          {validCartItems.length === 0 && !showMultiSelect ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Browse our courses and add training seats to your cart
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => setShowMultiSelect(true)}>
                    Select Courses
                  </Button>
                  <Link href="/courses">
                    <Button variant="outline">Browse Course Catalog</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : validCartItems.length > 0 ? (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {validCartItems.map((item) => {
                  const course = availableCourses.find(c => 
                    c.slug === item.courseId || 
                    c.expectedSlug === item.courseId ||
                    c.sku === item.courseId ||
                    c.id === item.courseId
                  );
                  if (!course) return null;
                  
                  return (
                    <Card key={item.courseId}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              ${course.price} per seat
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.courseId, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.courseId, parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                                min="1"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.courseId, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="text-right min-w-[80px]">
                              <p className="font-semibold">
                                ${(parseFloat(course.price) * item.quantity).toFixed(2)}
                              </p>
                            </div>
                            
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeItem(item.courseId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
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
                      disabled={isCheckingOut}
                    >
                      {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Secure checkout powered by Stripe
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}