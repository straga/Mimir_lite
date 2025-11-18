# Agent Validation Report

**Agent**: baseline-no-instructions
**Benchmark**: Non-Tool Coding Benchmark
**Model**: ollama/qwen2.5-coder:1.5b-base
**Date**: 2025-11-03
**Total Score**: 15/100

---

## Execution Summary

- **Tool Calls**: 0
- **Input Tokens**: 913
- **Output Tokens**: 5000
- **Total Tokens**: 5913

---

## Scoring Breakdown


### Problem Analysis: 4 points

**Feedback**: The agent output demonstrates some awareness of validation rules and edge cases for email validation, such as format and length. However, the output is highly repetitive and does not cover all possible edge cases (e.g., valid emails, boundary values like exactly 5 or 100 characters, empty strings, or special characters). There is no recognition of async testing requirements, nor any explicit boundary value tests. The analysis is superficial and lacks depth, resulting in a low score.


### Code Completeness: 5 points

**Feedback**: The output contains a large number of test cases, but they are highly repetitive and not distinct—most are duplicates of the same logic and inputs. This fails the requirement for 12+ distinct test cases. The tests are syntactically correct and there are no placeholder comments or TODOs, but there is no async/await usage (though it may not be needed for these sync tests). Overall, the lack of distinctness and excessive duplication severely limits completeness.


### Test Coverage: 3 points

**Feedback**: The output only tests the `validateEmail` method, and even then, the tests are highly repetitive and do not cover all boundary values (e.g., email length 100). There are no tests for `validatePassword`, `validateAge`, or `validateUser`. Error cases for email are partially covered, but not for other methods. No happy path tests are present, and boundary value coverage is incomplete. Overall, test coverage is very poor and limited to a single method.


### Code Quality: 3 points

**Feedback**: The output is extremely repetitive, with the same test cases and assertions duplicated many times, which detracts from code quality and maintainability. Test descriptions are clear but not varied, and there is no coverage of valid email cases. The nested describe structure is minimal but present. Assertions check for error types but do not actually verify that the thrown error contains the expected message; instead, they instantiate a new error and check its properties, which does not test the actual thrown error. The tests would not fully work as intended, and the excessive duplication is a major issue.


### Strategy Explanation: 0 points

**Feedback**: The agent output consists solely of test code with no explanation of the testing approach, no justification for test selection (such as boundary values or error cases), and is not concise due to excessive repetition. It does not meet any of the rubric criteria for strategy explanation.


---

## Agent Output

```
 ```javascript
// utils/userValidator.test.js
const { UserValidator, ValidationError } = require('./userValidator');

describe('User Validator', () => {
  describe('validateEmail', () => {
    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new V

[OUTPUT TRUNCATED BY CIRCUIT BREAKER]
```

---

## Conversation History


### SYSTEM

```
---
description: Baseline (No Instructions) - Test model behavior without preamble
tools:
  [
    "edit",
    "runNotebooks",
    "search",
    "new",
    "runCommands",
    "runTasks",
    "usages",
    "vscodeAPI",
    "problems",
    "changes",
    "testFailure",
    "openSimpleBrowser",
    "fetch",
    "githubRepo",
    "extensions",
    "todos",
  ]
---

# Baseline Agent (No Instructions)

You are a helpful coding assistant.

```


### USER

```
You are given a coding task requiring comprehensive test coverage for a complex validation system.

**Context:**
You're working on a user registration system. Here's the validation module:

```javascript
// utils/userValidator.js
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
    this.name = 'ValidationError';
  }
}

class UserValidator {
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required', 'email');
    }
    if (!email.includes('@') || !email.includes('.')) {
      throw new ValidationError('Invalid email format', 'email');
    }
    if (email.length < 5 || email.length > 100) {
      throw new ValidationError('Email must be between 5 and 100 characters', 'email');
    }
    return true;
  }

  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required', 'password');
    }
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'password');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain uppercase letter', 'password');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain a number', 'password');
    }
    return true;
  }

  validateAge(age) {
    if (age === undefined || age === null) {
      throw new ValidationError('Age is required', 'age');
    }
    if (typeof age !== 'number' || !Number.isInteger(age)) {
      throw new ValidationError('Age must be an integer', 'age');
    }
    if (age < 13) {
      throw new ValidationError('Must be at least 13 years old', 'age');
    }
    if (age > 120) {
      throw new ValidationError('Age must be realistic', 'age');
    }
    return true;
  }

  async validateUser(user) {
    const errors = [];
    
    try { this.validateEmail(user.email); } 
    catch (e) { errors.push(e); }
    
    try { this.validatePassword(user.password); } 
    catch (e) { errors.push(e); }
    
    try { this.validateAge(user.age); } 
    catch (e) { errors.push(e); }
    
    if (errors.length > 0) {
      throw errors;
    }
    
    return true;
  }
}

module.exports = { UserValidator, ValidationError };
```

**Task:**
1. Analyze the validation system and identify ALL edge cases
2. Write comprehensive tests covering:
   - Valid inputs (happy path) for each validation method
   - Each specific error case (missing, wrong type, format issues)
   - Boundary values (exactly at limits, just over/under limits)
   - The async validateUser method with multiple errors
   - Error message accuracy and field tracking

**Requirements:**
- Include at least 12 distinct test cases
- Test ALL validation rules (email format, length, password strength, age boundaries)
- Test error messages are correct and include proper field names
- Test async behavior of validateUser
- Use proper test structure with nested describe blocks
- NO placeholder comments or TODO items
- All tests must be complete and runnable

**Note:** Assume Jest as the testing framework. State your testing strategy before showing code.
```


### ASSISTANT

```
 ```javascript
// utils/userValidator.test.js
const { UserValidator, ValidationError } = require('./userValidator');

describe('User Validator', () => {
  describe('validateEmail', () => {
    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new ValidationError(expectedMessage, 'email');
        expect(error.message).toBe(expectedMessage);
        expect(error.field).toBe('email');
      });
    });

    it('throws a ValidationError for invalid email format', () => {
      expect(() => UserValidator.validateEmail('invalid')).toThrow(ValidationError);
    });

    it('throws a ValidationError for too short or long email', () => {
      const testCases = [
        { input: 'a', expectedMessage: 'Email must be between 5 and 100 characters' },
        { input: '@example.com', expectedMessage: 'Invalid email format' },
        { input: 'invalid@.com', expectedMessage: 'Invalid email format' }
      ];

      testCases.forEach(({ input, expectedMessage }) => {
        expect(() => UserValidator.validateEmail(input)).toThrow(ValidationError);
        const error = new V

[OUTPUT TRUNCATED BY CIRCUIT BREAKER]
```