import { MovieCriteria, MovieRequest } from '../types/movie';

export class InputValidator {
  /**
   * Validate movie criteria
   */
  static validateCriteria(criteria: MovieCriteria): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate date range
    if (criteria.releaseDateFrom && !this.isValidDate(criteria.releaseDateFrom)) {
      errors.push('Invalid releaseDateFrom format (expected YYYY-MM-DD or YYYY)');
    }

    if (criteria.releaseDateTo && !this.isValidDate(criteria.releaseDateTo)) {
      errors.push('Invalid releaseDateTo format (expected YYYY-MM-DD or YYYY)');
    }

    if (criteria.releaseDateFrom && criteria.releaseDateTo) {
      const fromDate = new Date(criteria.releaseDateFrom);
      const toDate = new Date(criteria.releaseDateTo);
      if (toDate < fromDate) {
        errors.push('releaseDateTo must be after releaseDateFrom');
      }
    }

    // Validate year
    if (criteria.year !== undefined) {
      const currentYear = new Date().getFullYear();
      if (criteria.year < 1888 || criteria.year > currentYear + 1) {
        errors.push(`Year must be between 1888 and ${currentYear + 1}`);
      }
    }

    // Validate rating
    if (criteria.minRating !== undefined) {
      if (criteria.minRating < 0 || criteria.minRating > 10) {
        errors.push('minRating must be between 0 and 10');
      }
    }

    // Validate limit
    if (criteria.limit !== undefined) {
      if (criteria.limit < 1 || criteria.limit > 20) {
        errors.push('limit must be between 1 and 20');
      }
    }

    // Validate page
    if (criteria.page !== undefined && criteria.page < 1) {
      errors.push('page must be at least 1');
    }

    // Validate sortBy
    if (criteria.sortBy) {
      const validSortBy = ['popularity', 'rating', 'release_date', 'revenue', 'title'];
      if (!validSortBy.includes(criteria.sortBy)) {
        errors.push(`sortBy must be one of: ${validSortBy.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate movie request
   */
  static validateRequest(request: MovieRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.userId) {
      errors.push('User ID is required');
    }

    if (request.isStructured) {
      if (!request.criteria) {
        errors.push('Criteria is required for structured requests');
      } else {
        const criteriaValidation = this.validateCriteria(request.criteria);
        errors.push(...criteriaValidation.errors);
      }
    } else {
      if (!request.naturalLanguage || request.naturalLanguage.length < 5) {
        errors.push('naturalLanguage is required and must be at least 5 characters for natural language requests');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if date string is valid (YYYY-MM-DD or YYYY)
   */
  private static isValidDate(dateString: string): boolean {
    // Accept YYYY-MM-DD or YYYY format
    const dateRegex = /^\d{4}(-\d{2}-\d{2})?$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Sanitize genre name
   */
  static sanitizeGenreName(genre: string): string {
    return genre.trim().charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
  }

  /**
   * Sanitize person name (actor/director)
   */
  static sanitizePersonName(name: string): string {
    return name.trim().split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
