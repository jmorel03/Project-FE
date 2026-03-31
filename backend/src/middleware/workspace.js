function requireWorkspaceAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (String(req.workspaceRole || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  return next();
}

module.exports = {
  requireWorkspaceAdmin,
};
