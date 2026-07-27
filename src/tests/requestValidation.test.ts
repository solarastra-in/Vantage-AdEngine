import { requireString, requireFiniteNumber, requireArray, requireObject, ValidationError, withValidation } from '../lib/requestValidation.server';

describe('requestValidation: requireString', () => {
  test('accepts a non-empty string', () => {
    expect(requireString('hello', 'field')).toBe('hello');
  });
  test('rejects undefined', () => {
    expect(() => requireString(undefined, 'field')).toThrow(ValidationError);
  });
  test('rejects an empty string', () => {
    expect(() => requireString('', 'field')).toThrow(ValidationError);
  });
  test('rejects a number', () => {
    expect(() => requireString(42, 'field')).toThrow(ValidationError);
  });
});

describe('requestValidation: requireFiniteNumber', () => {
  test('accepts a valid number', () => {
    expect(requireFiniteNumber(5, 'field')).toBe(5);
  });
  test('rejects NaN', () => {
    expect(() => requireFiniteNumber(NaN, 'field')).toThrow(ValidationError);
  });
  test('rejects Infinity', () => {
    expect(() => requireFiniteNumber(Infinity, 'field')).toThrow(ValidationError);
  });
  test('rejects a string', () => {
    expect(() => requireFiniteNumber('5', 'field')).toThrow(ValidationError);
  });
  test('enforces min bound', () => {
    expect(() => requireFiniteNumber(-1, 'field', { min: 0 })).toThrow(ValidationError);
  });
  test('enforces max bound', () => {
    expect(() => requireFiniteNumber(101, 'field', { max: 100 })).toThrow(ValidationError);
  });
});

describe('requestValidation: requireArray', () => {
  test('accepts a valid array', () => {
    expect(requireArray([1, 2], 'field')).toEqual([1, 2]);
  });
  test('rejects a non-array', () => {
    expect(() => requireArray({}, 'field')).toThrow(ValidationError);
  });
  test('enforces minLength', () => {
    expect(() => requireArray([], 'field', { minLength: 1 })).toThrow(ValidationError);
  });
});

describe('requestValidation: requireObject', () => {
  test('accepts a plain object', () => {
    expect(requireObject({ a: 1 }, 'field')).toEqual({ a: 1 });
  });
  test('rejects null', () => {
    expect(() => requireObject(null, 'field')).toThrow(ValidationError);
  });
  test('rejects an array', () => {
    expect(() => requireObject([1, 2], 'field')).toThrow(ValidationError);
  });
});

describe('requestValidation: withValidation', () => {
  function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('converts a thrown ValidationError into a 400 response', async () => {
    const handler = withValidation(() => {
      requireString(undefined, 'name');
    });
    const res = mockRes();
    await handler({}, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: '"name" must be a non-empty string.' });
  });

  test('re-throws non-ValidationError errors for the caller to handle', async () => {
    const handler = withValidation(() => {
      throw new Error('something else broke');
    });
    const res = mockRes();
    await expect(handler({}, res)).rejects.toThrow('something else broke');
  });

  test('passes through successfully on valid input', async () => {
    const handler = withValidation((req: any, res: any) => {
      res.json({ ok: true });
    });
    const res = mockRes();
    await handler({}, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
