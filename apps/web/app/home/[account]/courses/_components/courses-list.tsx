'use client';

import { PlusIcon, BookOpenIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

interface Course {
  id: string;
  title: string;
  description: string | null;
  sku: string | null;
  price: number;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  modules?: Array<{
    id: string;
    title: string;
    lessons?: Array<{
      id: string;
      title: string;
      content_type: string;
    }>;
  }>;
}

interface CoursesListProps {
  courses: Course[];
  account: string;
}

export function CoursesList({ courses, account }: CoursesListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Trans i18nKey="courses:title" />
          </h1>
          <p className="text-muted-foreground">
            <Trans i18nKey="courses:description" />
          </p>
        </div>
        
        <Button asChild>
          <Link href={`/home/${account}/courses/new`}>
            <PlusIcon className="mr-2 h-4 w-4" />
            <Trans i18nKey="courses:createCourse" />
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">
            <Trans i18nKey="courses:noCourses" />
          </h3>
          <p className="mt-2 text-muted-foreground">
            <Trans i18nKey="courses:noCoursesDescription" />
          </p>
          <Button asChild className="mt-4">
            <Link href={`/home/${account}/courses/new`}>
              <PlusIcon className="mr-2 h-4 w-4" />
              <Trans i18nKey="courses:createFirstCourse" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpenIcon className="h-4 w-4" />
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      course.status === 'published' 
                        ? 'bg-green-100 text-green-800' 
                        : course.status === 'archived'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    </span>
                  </div>
                  {course.price > 0 && (
                    <span className="text-sm font-medium">
                      ${course.price}
                    </span>
                  )}
                </div>
                
                <CardTitle className="line-clamp-2">
                  <Link 
                    href={`/home/${account}/courses/${course.id}`}
                    className="hover:underline"
                  >
                    {course.title}
                  </Link>
                </CardTitle>
                
                {course.description && (
                  <CardDescription className="line-clamp-3">
                    {course.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span>
                      {course.modules?.length || 0} modules
                    </span>
                    <span>
                      {course.modules?.reduce((total, module) => 
                        total + (module.lessons?.length || 0), 0
                      ) || 0} lessons
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <UsersIcon className="h-3 w-3" />
                    <span>0 enrolled</span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/home/${account}/courses/${course.id}`}>
                      <Trans i18nKey="common:edit" />
                    </Link>
                  </Button>
                  
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/home/${account}/courses/${course.id}/preview`}>
                      <Trans i18nKey="courses:preview" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}