'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { ArrowLeft, ShoppingCart, Plus, Minus, Loader2, ChevronDown, User, Users } from 'lucide-react';
import { Badge } from '@kit/ui/badge';
import { toast } from '@kit/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Label } from '@kit/ui/label';
import pathsConfig from '~/config/paths.config';
import { CustomShieldIcon } from '../../_components/custom-icons';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { createAccountsApi } from '@kit/accounts/api';

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
  const supabase = useSupabase();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'personal' | 'team'>('personal');
  const [teamAccounts, setTeamAccounts] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerName, setCustomerName] = useState('');

  // Load initial quantities from localStorage and check auth
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
    
    // Check if user is authenticated
    checkAuth();
    
    setIsLoading(false);
  }, [availableCourses]);
  
  // Check authentication and load team accounts
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setIsAuthenticated(true);
      await loadTeamAccounts();
      
      // Try to load user's name from their account
      const { data: account } = await supabase
        .from('accounts')
        .select('name')
        .eq('id', session.user.id)
        .eq('is_personal_account', true)
        .single();
      
      if (account?.name) {
        setCustomerName(account.name);
      }
    }
  };
  
  // Load team accounts for the current user
  const loadTeamAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const api = createAccountsApi(supabase);
      const accounts = await api.loadUserAccounts();
      
      console.log('Loaded accounts from API:', accounts);
      
      // Filter to only show team accounts (not personal)
      const teams = accounts.filter(acc => !acc.is_personal_account);
      console.log('Filtered team accounts:', teams);
      
      setTeamAccounts(teams);
      
      // If user has teams and no selection yet, default to first team
      if (teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teams[0].id);
      }
    } catch (error) {
      console.error('Error loading team accounts:', error);
      toast.error('Failed to load team accounts');
    } finally {
      setIsLoadingAccounts(false);
    }
  };

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
      
      // Dispatch custom event to update cart count
      window.dispatchEvent(new Event('cart-updated'));
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
    
    // Validate name is provided (only for personal or single-seat purchases)
    if ((purchaseType === 'personal' || totalItems === 1) && !customerName.trim()) {
      toast.error('Please enter your name for the certificate');
      return;
    }

    setIsCheckingOut(true);
    
    try {
      // Create checkout session - use the training endpoint with fixed price IDs
      const response = await fetch('/api/checkout/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems: cartCourses.map(({ course, quantity }) => ({
            courseId: course?.slug || course?.id,  // Use slug as the courseId
            quantity,
          })),
          customerName: customerName.trim(),  // Add customer name
          accountType: purchaseType,
          ...(purchaseType === 'team' && selectedTeamId ? { accountId: selectedTeamId } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();  // The training endpoint returns 'url' not 'sessionUrl'
      
      if (url) {
        // Redirect to Stripe checkout
        window.location.href = url;
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
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary">
                Courses
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/courses/dot-hazmat" className="cursor-pointer">
                    DOT HAZMAT - General
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/courses/advanced-hazmat" className="cursor-pointer">
                    DOT HAZMAT - Advanced
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/courses/epa-rcra" className="cursor-pointer">
                    EPA RCRA
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/contact" className="text-sm font-medium hover:text-primary">
              Contact
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

      <main className="flex-1 py-8">
        <div className="container">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" />
              Shopping Cart
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Select the courses and number of seats you need for your team
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Course Selection */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Available Courses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
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
                          className={`p-2 border rounded-lg transition-all ${
                            quantity > 0 ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{course.title}</h4>
                              <p className="text-xs font-medium mt-0.5">
                                ${course.price} per seat
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(course.id, Math.max(0, quantity - 1))}
                                disabled={quantity === 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => updateQuantity(course.id, parseInt(e.target.value) || 0)}
                                className="w-12 text-center h-6 px-1 text-xs"
                                min="0"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(course.id, quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              {quantity > 0 && (
                                <div className="text-right min-w-[50px]">
                                  <p className="font-semibold text-xs">
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
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {totalItems > 0 ? (
                    <>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {getCartCourses().map(({ course, quantity }) => (
                          <div key={course!.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate mr-2">
                              {course!.title} × {quantity}
                            </span>
                            <span className="font-medium">${(parseFloat(course!.price) * quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Tax</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-1">
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span className="text-base">${total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Name Field - Show only for personal purchases or single-seat purchases */}
                      {(purchaseType === 'personal' || totalItems === 1) && (
                        <div className="space-y-2 border-t pt-3">
                          <Label htmlFor="customer-name" className="text-xs font-medium">
                            Name for Certificate <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customer-name"
                            type="text"
                            placeholder="Enter your full legal name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="h-8 text-xs"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            This name will appear on your completion certificate
                          </p>
                        </div>
                      )}
                      
                      {/* Multi-seat team purchase notice */}
                      {purchaseType === 'team' && totalItems > 1 && (
                        <div className="border-t pt-3">
                          <p className="text-xs text-muted-foreground">
                            You're purchasing {totalItems} seats for your team. You'll be able to assign these seats to team members after purchase, and each member will provide their name when they enroll.
                          </p>
                        </div>
                      )}
                      
                      {/* Purchase Type Selection - Only show if authenticated and has teams */}
                      {isAuthenticated && teamAccounts.length > 0 && (
                        <div className="space-y-3 border-t pt-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Purchase Type</Label>
                            <RadioGroup 
                              value={purchaseType} 
                              onValueChange={(value: 'personal' | 'team') => setPurchaseType(value)}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="personal" id="personal" />
                                <Label htmlFor="personal" className="text-xs flex items-center gap-1 cursor-pointer">
                                  <User className="h-3 w-3" />
                                  Personal (for yourself)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="team" id="team" />
                                <Label htmlFor="team" className="text-xs flex items-center gap-1 cursor-pointer">
                                  <Users className="h-3 w-3" />
                                  Team (assign to members)
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          {/* Team Selection Dropdown */}
                          {purchaseType === 'team' && (
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Select Team</Label>
                              {isLoadingAccounts ? (
                                <div className="flex items-center justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                <Select 
                                  value={selectedTeamId || ''} 
                                  onValueChange={setSelectedTeamId}
                                >
                                  <SelectTrigger className="w-full h-8 text-xs">
                                    <SelectValue placeholder="Choose a team account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teamAccounts.map((team) => (
                                      <SelectItem key={team.id} value={team.id} className="text-xs">
                                        {team.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}
                          
                          {purchaseType === 'team' && totalItems > 1 && (
                            <p className="text-xs text-muted-foreground">
                              You're purchasing {totalItems} seats that can be assigned to team members
                            </p>
                          )}
                        </div>
                      )}
                      
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || totalItems === 0 || (purchaseType === 'team' && !selectedTeamId)}
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