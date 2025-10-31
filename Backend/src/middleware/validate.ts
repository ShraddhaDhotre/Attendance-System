// Generic validation middleware for request body/query/params using Zod
// Use `any` types for req/res/next so this file remains usable before dev
// dependencies are installed in the environment.
export const validate = (schema: any, target: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    try {
      const payload = req[target];
      const result = schema.parse(payload);
      // Assign properties individually to avoid issues with getters/setters
      if (target === 'query' || target === 'params') {
        Object.keys(result).forEach(key => {
          req[target][key] = result[key];
        });
      } else {
        req[target] = result;
      }
      next();
    } catch (err: any) {
      console.error('Validation error on', target, err);
      return res.status(400).json({ error: err?.message || 'Validation failed', details: err?.errors || null });
    }
  };
};
