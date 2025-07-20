# LMS Data Consistency Guide

## Problem Statement

The LMS platform has been experiencing persistent data persistence issues due to **data format mismatches** between UI components, server actions, and database schemas. This anti-pattern manifests as:

- ✅ UI shows changes were saved
- ❌ Data doesn't persist to database
- 🔄 Changes revert when page refreshes
- 🐛 Silent failures without error messages

## Root Cause Analysis

### The Anti-Pattern: Parallel Component Evolution

```
Database Schema (Boolean)     UI Components (Enum)       Server Actions (Mixed)
├── is_published: boolean ←→  ├── status: 'draft'   ←→  ├── expects enum
├── processing_status: text ←→├── status: 'ready'   ←→  ├── validates boolean  
└── active: boolean        ←→ └── state: 'active'   ←→  └── transforms inconsistently
```

### Examples Found:

1. **Course Status**: Database `is_published: boolean` ↔ UI `status: enum`
2. **Video Processing**: Database `processing_status: text` ↔ UI `status: enum` 
3. **Quiz Data**: Database `options: JSON` ↔ UI `options: QuizOption[]`
4. **Enrollment Progress**: Multiple status tables with different formats

## Solution: Data Consistency Layer

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Components │    │  Transformation  │    │    Database     │
│                 │    │      Layer       │    │                 │
│ UICourse        │◄──►│ CourseTransform  │◄──►│ DatabaseCourse  │
│ UIVideo         │◄──►│ VideoTransform   │◄──►│ DatabaseVideo   │
│ UIQuiz          │◄──►│ QuizTransform    │◄──►│ DatabaseQuiz    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Files

1. **Type Definitions**: `apps/web/app/admin/lms/_lib/types/data-contracts.ts`
2. **Transformers**: `apps/web/app/admin/lms/_lib/transformers/data-transformers.ts`  
3. **Utilities**: `apps/web/app/admin/lms/_lib/utils/data-consistency.ts`

## Implementation Guide

### Step 1: Import Data Contracts

```typescript
// Replace local type definitions
import { 
  UICourse, 
  DatabaseCourse, 
  CourseTransformer 
} from '../_lib/types/data-contracts';
```

### Step 2: Update Component Props

```typescript
// OLD: Local interface
interface CourseEditorProps {
  course: {
    id: string;
    is_published: boolean; // ❌ Database format in UI
  };
}

// NEW: Standard UI contract
interface CourseEditorProps {
  course: UICourse; // ✅ Consistent UI format
}
```

### Step 3: Transform at Boundaries

```typescript
// SERVER ACTION: Transform UI → Database
export const updateCourseAction = enhanceAction(
  async function (uiData: Partial<UICourse>) {
    const dbData = CourseTransformer.toDatabase(uiData);
    await client.from('courses').update(dbData);
  }
);

// DATA LOADER: Transform Database → UI  
export async function loadCourseAction(courseId: string): Promise<UICourse> {
  const { data: dbCourse } = await client.from('courses').select('*');
  return CourseTransformer.toUI(dbCourse, { lessonsCount: 5 });
}
```

### Step 4: Handle Errors Gracefully

```typescript
import { handleTransformationError } from '../_lib/utils/data-consistency';

try {
  const result = await updateCourseAction(courseData);
} catch (error) {
  handleTransformationError(error, 'CourseEditor.handleSave', () => {
    toast.error('Failed to save course');
  });
}
```

## Migration Checklist

For each component that handles data:

- [ ] **Step 1**: Import data contracts and transformers
- [ ] **Step 2**: Update component prop types to use UI types  
- [ ] **Step 3**: Update server actions to use Database types
- [ ] **Step 4**: Add transformation calls at boundaries
- [ ] **Step 5**: Add error handling for transformation failures
- [ ] **Step 6**: Test round-trip transformations
- [ ] **Step 7**: Remove legacy type definitions
- [ ] **Step 8**: Update related components that pass data

## Testing Strategy

### Round-Trip Validation

```typescript
import { testRoundTripTransformation } from '../_lib/utils/data-consistency';

// Test data integrity
const course: UICourse = { /* test data */ };
const isValid = testRoundTripTransformation(
  course,
  CourseTransformer.toDatabase,
  CourseTransformer.toUI,
  'Course'
);
```

### Development Warnings

The system will log warnings in development when:
- Legacy data formats are detected
- Transformation validation fails  
- Round-trip transformations lose data

## Common Patterns

### Pattern 1: Boolean ↔ Enum Status

```typescript
// Database: is_published: boolean
// UI: status: 'draft' | 'published' | 'archived'

const CourseTransformer = {
  toUI: (db) => ({
    ...db,
    status: db.is_published ? 'published' : 'draft'
  }),
  toDatabase: (ui) => ({
    ...ui,
    is_published: ui.status === 'published'
  })
};
```

### Pattern 2: JSON ↔ Structured Data

```typescript
// Database: options: JSON string
// UI: options: QuizOption[]

const QuizTransformer = {
  toUI: (db) => ({
    ...db,
    options: JSON.parse(db.options || '[]')
  }),
  toDatabase: (ui) => ({
    ...ui,
    options: JSON.stringify(ui.options)
  })
};
```

### Pattern 3: Computed Fields

```typescript
// UI needs computed fields not in database
const CourseTransformer = {
  toUI: (db, stats) => ({
    ...db,
    lessons_count: stats?.lessonsCount || 0, // Computed
    version: '1.0' // UI-only field
  })
};
```

## Preventing Future Issues

### 1. Type-First Development

Always define types in `data-contracts.ts` before building components.

### 2. Boundary Enforcement

Never pass database types to UI components or UI types to database operations.

### 3. Validation at Runtime

Use type guards and validation functions to catch mismatches early.

### 4. Consistent Naming

- Database fields: Snake_case matching SQL
- UI fields: CamelCase matching TypeScript conventions
- Transformers: Clear directionality (`toUI`, `toDatabase`)

## Red Flags to Watch For

🚨 **Immediate Action Required**:
- Components with both `is_published` and `status` props
- Server actions that accept `any` or mixed types
- Direct database field access in UI components
- JSON.parse/stringify without error handling

⚠️ **Review Needed**:
- Multiple similar components (`Editor` vs `EditorClient`)
- Hardcoded status strings instead of enums
- Missing transformation in data loaders
- Silent fallbacks in server actions

## Support

When implementing this system:

1. **Start with one entity** (e.g., courses) to validate the pattern
2. **Test thoroughly** with round-trip validations
3. **Migrate gradually** using legacy warnings during transition
4. **Monitor production** for transformation errors

The goal is to eliminate data persistence issues by ensuring **consistent, validated data contracts** throughout the application stack.