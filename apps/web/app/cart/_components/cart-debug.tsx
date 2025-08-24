'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

export function CartDebug({ availableCourses }: { availableCourses: any[] }) {
  const [localStorageContent, setLocalStorageContent] = useState<string>('');
  const [parsedCart, setParsedCart] = useState<any>(null);
  
  useEffect(() => {
    const cart = localStorage.getItem('training-cart');
    setLocalStorageContent(cart || 'Empty');
    
    if (cart) {
      try {
        const parsed = JSON.parse(cart);
        setParsedCart(parsed);
      } catch (e) {
        setParsedCart('Parse error');
      }
    }
  }, []);
  
  return (
    <Card className="mb-4 border-red-500">
      <CardHeader>
        <CardTitle className="text-red-600">🔍 Cart Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-bold">localStorage Content:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {localStorageContent}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold">Parsed Cart Items:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(parsedCart, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-bold">Available Courses (from props):</h3>
          <div className="space-y-2">
            {availableCourses.map((course, idx) => (
              <div key={idx} className="bg-blue-50 p-2 rounded text-xs">
                <div>ID: {course.id}</div>
                <div>Title: "{course.title}"</div>
                <div>Slug: {course.slug}</div>
                <div>Expected Slug: {course.expectedSlug}</div>
                <div>SKU: {course.sku}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-bold">Match Attempts:</h3>
          {parsedCart && Array.isArray(parsedCart) && (
            <div className="space-y-2">
              {parsedCart.map((item: any, idx: number) => {
                const matchBySlug = availableCourses.find(c => c.slug === item.courseId);
                const matchByExpectedSlug = availableCourses.find(c => c.expectedSlug === item.courseId);
                const matchById = availableCourses.find(c => c.id === item.courseId);
                const matchBySku = availableCourses.find(c => c.sku === item.courseId);
                
                return (
                  <div key={idx} className="bg-yellow-50 p-2 rounded text-xs">
                    <div className="font-bold">Cart Item: {item.courseId} (qty: {item.quantity})</div>
                    <div>Match by slug: {matchBySlug ? '✅ ' + matchBySlug.title : '❌'}</div>
                    <div>Match by expectedSlug: {matchByExpectedSlug ? '✅ ' + matchByExpectedSlug.title : '❌'}</div>
                    <div>Match by ID: {matchById ? '✅' : '❌'}</div>
                    <div>Match by SKU: {matchBySku ? '✅' : '❌'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}