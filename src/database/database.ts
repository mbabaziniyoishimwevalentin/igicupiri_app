
// All database operations must go through the backend API.
// This file enforces that by throwing errors if used directly.

export const executeQuery = async () => {
  throw new Error('All database operations must use the backend API.');
};

export const getFirstRow = async () => {
  throw new Error('All database operations must use the backend API.');
};

export const initDatabase = async () => {
  // No-op: database is managed by the backend only
  return;
};