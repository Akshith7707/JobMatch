function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.code === '23505') {
    const emailTaken =
      err.constraint === 'users_email_key' ||
      (typeof err.detail === 'string' && err.detail.includes('(email)'));
    return res.status(409).json({
      error: emailTaken
        ? 'An account with this email already exists. Try logging in or use a different email.'
        : 'Resource already exists',
    });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

module.exports = { errorHandler };
