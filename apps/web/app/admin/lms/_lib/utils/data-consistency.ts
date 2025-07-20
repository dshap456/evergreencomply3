/**
 * Data Consistency Utilities
 * 
 * Utilities and helpers to enforce data consistency patterns
 * and prevent the data format mismatch anti-pattern.
 */

import { DataTransformationError } from '../types/data-contracts';

// ============================================================================
// DEVELOPMENT MODE VALIDATION
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log data transformation issues in development
 */
export function logTransformationIssue(
  entity: string,
  issue: string,
  data?: any
) {
  if (isDevelopment) {
    console.warn(`🔄 Data Transformation Issue - ${entity}:`, issue);
    if (data) {
      console.warn('Data:', data);
    }
  }
}

/**
 * Assert data format expectations in development
 */
export function assertDataFormat<T>(
  data: unknown,
  validator: (obj: any) => obj is T,
  entityName: string,
  context: string
): T {
  if (!validator(data)) {
    const error = new DataTransformationError(
      entityName,
      'toUI',
      new Error(`Invalid ${entityName} format in ${context}`)
    );
    
    if (isDevelopment) {
      console.error('❌ Data Format Assertion Failed:', {
        entity: entityName,
        context,
        data,
        error: error.message
      });
    }
    
    throw error;
  }
  
  return data;
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Gradual migration helper for legacy components
 * Warns about using old formats but allows fallback
 */
export function legacyDataWarning(
  component: string,
  oldFormat: string,
  newFormat: string,
  migrationGuide?: string
) {
  if (isDevelopment) {
    console.warn(`⚠️ Legacy Data Format in ${component}:`);
    console.warn(`  Old: ${oldFormat}`);
    console.warn(`  New: ${newFormat}`);
    if (migrationGuide) {
      console.warn(`  Migration: ${migrationGuide}`);
    }
  }
}

/**
 * Handle legacy is_published boolean fields gracefully
 */
export function handleLegacyStatus(
  data: any,
  fieldName: string = 'status'
): 'draft' | 'published' | 'archived' {
  // New format: status enum
  if (data[fieldName] && typeof data[fieldName] === 'string') {
    return data[fieldName];
  }
  
  // Legacy format: is_published boolean
  if (typeof data.is_published === 'boolean') {
    legacyDataWarning(
      'handleLegacyStatus',
      'is_published: boolean',
      'status: enum',
      'Use CourseTransformer.toUI()'
    );
    return data.is_published ? 'published' : 'draft';
  }
  
  // Fallback
  return 'draft';
}

// ============================================================================
// COMPONENT INTEGRATION HELPERS
// ============================================================================

/**
 * Wrapper for server actions that need data transformation
 */
export function withDataTransformation<TInput, TOutput, TDB>(
  serverAction: (data: TDB) => Promise<TOutput>,
  transformer: (input: TInput) => TDB,
  entityName: string
) {
  return async (input: TInput): Promise<TOutput> => {
    try {
      const transformedData = transformer(input);
      return await serverAction(transformedData);
    } catch (error) {
      if (error instanceof DataTransformationError) {
        throw error;
      }
      throw new DataTransformationError(entityName, 'toDatabase', error as Error);
    }
  };
}

/**
 * Wrapper for data loaders that need UI transformation
 */
export function withUITransformation<TDB, TUI>(
  loader: () => Promise<TDB>,
  transformer: (db: TDB) => TUI,
  entityName: string
) {
  return async (): Promise<TUI> => {
    try {
      const dbData = await loader();
      return transformer(dbData);
    } catch (error) {
      if (error instanceof DataTransformationError) {
        throw error;
      }
      throw new DataTransformationError(entityName, 'toUI', error as Error);
    }
  };
}

// ============================================================================
// ERROR HANDLING PATTERNS
// ============================================================================

/**
 * Standard error handler for data transformation issues
 */
export function handleTransformationError(
  error: Error,
  context: string,
  fallbackAction?: () => void
) {
  if (error instanceof DataTransformationError) {
    console.error(`Data transformation failed in ${context}:`, {
      entity: error.entity,
      direction: error.direction,
      message: error.message,
      originalError: error.originalError
    });
    
    // In development, be more aggressive about surfacing these
    if (isDevelopment) {
      throw error;
    }
  } else {
    console.error(`Unexpected error in ${context}:`, error);
  }
  
  // Execute fallback if provided
  fallbackAction?.();
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * Test data transformation round-trip integrity
 */
export function testRoundTripTransformation<TUI, TDB>(
  uiData: TUI,
  toDatabase: (ui: TUI) => TDB,
  toUI: (db: TDB) => TUI,
  entityName: string,
  equalityCheck?: (a: TUI, b: TUI) => boolean
): boolean {
  try {
    const dbData = toDatabase(uiData);
    const roundTripData = toUI(dbData);
    
    // Use custom equality check or simple JSON comparison
    const isEqual = equalityCheck 
      ? equalityCheck(uiData, roundTripData)
      : JSON.stringify(uiData) === JSON.stringify(roundTripData);
    
    if (!isEqual && isDevelopment) {
      console.warn(`Round-trip transformation failed for ${entityName}:`);
      console.warn('Original:', uiData);
      console.warn('Round-trip:', roundTripData);
    }
    
    return isEqual;
  } catch (error) {
    console.error(`Round-trip test failed for ${entityName}:`, error);
    return false;
  }
}

// ============================================================================
// COMPONENT PATTERNS
// ============================================================================

/**
 * Standard pattern for components that need to handle both formats
 * during migration period
 */
export function adaptLegacyProps<TLegacy, TNew>(
  props: TLegacy | TNew,
  isLegacy: (p: any) => p is TLegacy,
  converter: (legacy: TLegacy) => TNew,
  componentName: string
): TNew {
  if (isLegacy(props)) {
    legacyDataWarning(
      componentName,
      'Legacy props format',
      'New props format',
      'Update parent component to use new data contracts'
    );
    return converter(props);
  }
  
  return props as TNew;
}

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * Checklist for migrating components to use data contracts
 */
export const MIGRATION_CHECKLIST = {
  STEP_1: 'Import data contracts and transformers',
  STEP_2: 'Update component prop types to use UI types',
  STEP_3: 'Update server actions to use Database types',
  STEP_4: 'Add transformation calls at boundaries',
  STEP_5: 'Add error handling for transformation failures',
  STEP_6: 'Test round-trip transformations',
  STEP_7: 'Remove legacy type definitions',
  STEP_8: 'Update related components that pass data'
} as const;

/**
 * Helper to log migration progress
 */
export function logMigrationStep(
  componentName: string,
  step: keyof typeof MIGRATION_CHECKLIST,
  completed: boolean = true
) {
  if (isDevelopment) {
    const status = completed ? '✅' : '⏳';
    const stepDescription = MIGRATION_CHECKLIST[step];
    console.log(`${status} ${componentName}: ${stepDescription}`);
  }
}