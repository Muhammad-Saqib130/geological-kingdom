// Validates req[source] against a Zod schema and replaces it with the parsed value.
// Express 5 makes req.query a getter, so parsed values are stored on req.validated instead.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  req.validated = { ...req.validated, [source]: result.data };
  next();
};
