exports.errorHandler = (err, req, res, next) => {
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

  // Only log unexpected server errors — 4xx are client mistakes and may contain sensitive input.
  if (status >= 500) {
    console.error('[500]', err.name, err.message, err.stack ? `\n${err.stack}` : '');
  }

  const payload = { error: message };

  if (status < 500 && err.code) {
    payload.code = err.code;
  }

  if (status < 500 && err.details) {
    payload.details = err.details;
  }

  res.status(status).json(payload);
};
