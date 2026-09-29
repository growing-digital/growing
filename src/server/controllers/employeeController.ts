import { Response } from 'express';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getEmployees(_req: AuthenticatedRequest, res: Response) {
  try {
    if (isMongoConnected()) {
      const users = await User.find().sort({ createdAt: -1 });
      const mapped = users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        phone: u.phone,
        department: u.department,
        joiningDate: u.joiningDate ? u.joiningDate.toISOString().slice(0, 10) : '2026-09-28',
        status: u.status,
        avatarUrl: u.avatarUrl,
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.warn('[Employees] Mongo query error:', err.message);
  }

  return res.json(db.getUsers());
}

export async function createEmployee(req: AuthenticatedRequest, res: Response) {
  const { name, email, phone, username, password, role, department, joiningDate, status } = req.body;

  if (!name || !email || !username) {
    return res.status(400).json({ error: 'Name, email, and username are required.' });
  }

  try {
    if (isMongoConnected()) {
      const existing = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
      });
      if (existing) {
        return res.status(400).json({ error: 'A user with this email or username already exists.' });
      }

      const created = await User.create({
        name,
        email: email.toLowerCase(),
        phone: phone || '',
        username: username.toLowerCase(),
        password: password || 'employee123',
        role: role || 'employee',
        department: department || 'General',
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        status: status || 'Active',
      });

      return res.status(201).json({
        id: created._id.toString(),
        name: created.name,
        email: created.email,
        username: created.username,
        role: created.role,
        phone: created.phone,
        department: created.department,
        joiningDate: created.joiningDate ? created.joiningDate.toISOString().slice(0, 10) : '2026-09-28',
        status: created.status,
      });
    }
  } catch (err: any) {
    console.warn('[Employees] Mongo create error, using local fallback:', err.message);
  }

  const existing = db.getUserByEmailOrUsername(email) || db.getUserByEmailOrUsername(username);
  if (existing) {
    return res.status(400).json({ error: 'A user with this email or username already exists.' });
  }

  const created = db.addUser({
    name,
    email,
    phone: phone || '',
    username,
    password: password || 'employee123',
    role: role || 'employee',
    department: department || 'General',
    joiningDate: joiningDate || '2026-09-28',
    status: status || 'Active',
  });

  return res.status(201).json(created);
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const updated = await User.findByIdAndUpdate(id, req.body, { new: true });
      if (updated) {
        return res.json({
          id: updated._id.toString(),
          name: updated.name,
          email: updated.email,
          username: updated.username,
          role: updated.role,
          phone: updated.phone,
          department: updated.department,
          joiningDate: updated.joiningDate ? updated.joiningDate.toISOString().slice(0, 10) : '2026-09-28',
          status: updated.status,
          avatarUrl: updated.avatarUrl,
        });
      }
    }
  } catch (err: any) {
    console.warn('[Employees] Mongo update error:', err.message);
  }

  const updatedLocal = db.updateUser(id, req.body);
  if (!updatedLocal) {
    return res.status(404).json({ error: 'Employee not found.' });
  }
  return res.json(updatedLocal);
}

export async function toggleEmployeeStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Active', 'Disabled'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required ("Active" or "Disabled").' });
  }

  try {
    if (isMongoConnected()) {
      const updated = await User.findByIdAndUpdate(id, { status }, { new: true });
      if (updated) {
        return res.json({
          id: updated._id.toString(),
          name: updated.name,
          email: updated.email,
          username: updated.username,
          role: updated.role,
          phone: updated.phone,
          department: updated.department,
          joiningDate: updated.joiningDate ? updated.joiningDate.toISOString().slice(0, 10) : '2026-09-28',
          status: updated.status,
        });
      }
    }
  } catch (err: any) {
    console.warn('[Employees] Mongo toggle status error:', err.message);
  }

  const updatedLocal = db.updateUser(id, { status });
  if (!updatedLocal) {
    return res.status(404).json({ error: 'Employee not found.' });
  }
  return res.json(updatedLocal);
}

export async function resetPassword(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { newPassword } = req.body;
  const password = newPassword || 'Welcome@2026';

  try {
    if (isMongoConnected()) {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: 'Employee not found.' });
      user.password = password;
      await user.save();
      return res.json({ success: true, message: `Password reset to "${password}" for ${user.name}.` });
    }
  } catch (err: any) {
    console.warn('[Employees] Mongo reset password error:', err.message);
  }

  const user = db.getUserById(id);
  if (!user) return res.status(404).json({ error: 'Employee not found.' });
  db.updateUser(id, { password });
  return res.json({ success: true, message: `Password reset to "${password}" for ${user.name}.` });
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  if (id === req.user?.id) {
    return res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
  }

  try {
    if (isMongoConnected()) {
      await User.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Employee account removed.' });
    }
  } catch (err: any) {
    console.warn('[Employees] Mongo delete error:', err.message);
  }

  const deleted = db.deleteUser(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Employee not found.' });
  }
  return res.json({ success: true, message: 'Employee account removed.' });
}
