exports.errorHandler = (err, req, res, next) => {
  console.error(err);

  // Prisma unique constraint
  if (err.code === 'P2002') {
    const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : null;
    return res.status(409).json({
      error: fields
        ? `A record with this ${fields} already exists`
        : 'A record with that value already exists',
    });
  }
  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({ error: message });
};
