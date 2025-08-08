'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { Badge } from '@kit/ui/badge';

interface Course {
  id: string;
  title: string;
  slug: string;
  sku?: string;
  price: string;
  description: string | null;
  status: string;
  expectedSlug?: string;
}

interface CartMultiSelectProps {
  availableCourses: Course[];
  onCartUpdate: () => void;
}

export function CartMultiSelect({ availableCourses, onCartUpdate }: CartMultiSelectProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cartCourses, setCartCourses] = useState<Set<string>>(new Set());

  // Load initial cart state
  useEffect(() => {
    const savedCart = localStorage.getItem('training-cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        const newQuantities: Record<string, number> = {};
        const courseIds = new Set<string>();
        
        cartItems.forEach((item: { courseId: string; quantity: number }) => {
          // Find course by slug, expectedSlug, sku, or id
          const course = availableCourses.find(c => 
            c.slug === item.courseId || 
            c.expectedSlug === item.courseId ||
            c.sku === item.courseId || 
            c.id === item.courseId
          );
          if (course) {
            // Use the stored courseId to maintain consistency
            newQuantities[item.courseId] = item.quantity;
            courseIds.add(item.courseId);
          }
        });
        
        setQuantities(newQuantities);
        setCartCourses(courseIds);
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, [availableCourses]);

  const updateQuantity = (courseIdentifier: string, quantity: number) => {
    const newQuantities = { ...quantities };
    
    if (quantity <= 0) {
      delete newQuantities[courseIdentifier];
      setCartCourses(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseIdentifier);
        return newSet;
      });
    } else {
      newQuantities[courseIdentifier] = quantity;
      setCartCourses(prev => new Set([...prev, courseIdentifier]));
    }
    
    setQuantities(newQuantities);
    
    // Update localStorage
    const cartItems = Object.entries(newQuantities).map(([courseId, quantity]) => ({
      courseId,
      quantity
    }));
    localStorage.setItem('training-cart', JSON.stringify(cartItems));
    onCartUpdate();
  };

  const getQuantity = (courseIdentifier: string) => {
    return quantities[courseIdentifier] || 0;
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(quantities).reduce((total, [courseId, qty]) => {
      const course = availableCourses.find(c => c.slug === courseId || c.id === courseId);
      return total + (parseFloat(course?.price || '0') * qty);
    }, 0);
  };

  // Only show published courses
  const publishedCourses = availableCourses.filter(c => c.status === 'published');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Courses</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {getTotalItems()} items
              </Badge>
              <Badge variant="default">
                ${getTotalPrice().toFixed(2)}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {publishedCourses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No courses available at this time.
              </p>
            ) : (
              publishedCourses.map((course) => {
                // Use expectedSlug if available and it's in the cart, otherwise use slug or id
                let courseId = course.slug || course.id;
                if (course.expectedSlug && cartCourses.has(course.expectedSlug)) {
                  courseId = course.expectedSlug;
                }
                const quantity = getQuantity(courseId);
                const isInCart = cartCourses.has(courseId);
                
                return (
                  <div 
                    key={course.id} 
                    className={`p-4 border rounded-lg transition-colors ${
                      isInCart ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold">{course.title}</h4>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-medium">
                            ${course.price} per seat
                          </span>
                          {course.sku && (
                            <Badge variant="outline" className="text-xs">
                              SKU: {course.sku}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {quantity > 0 ? (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(courseId, quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={quantity}
                              onChange={(e) => updateQuantity(courseId, parseInt(e.target.value) || 0)}
                              className="w-16 text-center h-8"
                              min="0"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(courseId, quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <div className="text-right min-w-[80px]">
                              <p className="font-semibold text-sm">
                                ${(parseFloat(course.price) * quantity).toFixed(2)}
                              </p>
                            </div>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => updateQuantity(courseId, 1)}
                            className="bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}