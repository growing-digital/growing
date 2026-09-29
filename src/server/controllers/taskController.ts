import { Response } from 'express';
import { Task } from '../models/Task.ts';
import { Client } from '../models/Client.ts';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getTasks(req: AuthenticatedRequest, res: Response) {
  const isAdmin = req.user?.role === 'admin';
  const userId = req.user?.id;

  try {
    if (isMongoConnected()) {
      const filter = isAdmin ? {} : { assignedTo: userId };
      const tasks = await Task.find(filter).sort({ dueDate: 1 });
      const mapped = tasks.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        clientId: t.clientId ? t.clientId.toString() : '',
        clientName: t.clientName,
        assignedTo: t.assignedTo.toString(),
        assignedToName: t.assignedToName,
        dueDate: t.dueDate.toISOString().slice(0, 10),
        definitionOfDone: t.definitionOfDone,
        dependency: t.dependency,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        completionNotes: t.completionNotes || '',
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.warn('[Tasks] Mongo query error, falling back:', err.message);
  }

  if (isAdmin) {
    return res.json(db.getTasks());
  } else {
    return res.json(db.getTasks(userId));
  }
}

export async function createTask(req: AuthenticatedRequest, res: Response) {
  const { title, clientId, assignedTo, dueDate, definitionOfDone, dependency, priority, status } = req.body;

  if (!title || !assignedTo) {
    return res.status(400).json({ error: 'Task title and assigned employee are required.' });
  }

  try {
    if (isMongoConnected()) {
      let clientName = 'Internal Project';
      if (clientId) {
        const c = await Client.findById(clientId);
        if (c) clientName = c.clientName;
      }

      let assignedToName = 'Unassigned';
      const u = await User.findById(assignedTo);
      if (u) assignedToName = u.name;

      const created = await Task.create({
        title,
        clientId: clientId || null,
        clientName,
        assignedTo,
        assignedToName,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 3600 * 1000),
        definitionOfDone: definitionOfDone || 'Deliverable finalized and reviewed',
        dependency: dependency || 'None',
        priority: priority || 'Medium',
        status: status || 'Pending',
      });

      return res.status(201).json({
        id: created._id.toString(),
        title: created.title,
        clientId: created.clientId ? created.clientId.toString() : '',
        clientName: created.clientName,
        assignedTo: created.assignedTo.toString(),
        assignedToName: created.assignedToName,
        dueDate: created.dueDate.toISOString().slice(0, 10),
        definitionOfDone: created.definitionOfDone,
        dependency: created.dependency,
        priority: created.priority,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('[Tasks] Mongo create error, using local store:', err.message);
  }

  const assignedUser = db.getUserById(assignedTo);
  const clientObj = clientId ? db.getClientById(clientId) : undefined;

  const newTask = db.addTask({
    title,
    clientId: clientId || '',
    clientName: clientObj ? clientObj.clientName : 'Internal Project',
    assignedTo,
    assignedToName: assignedUser ? assignedUser.name : 'Unassigned',
    dueDate: dueDate || '2026-10-05',
    definitionOfDone: definitionOfDone || '',
    dependency: dependency || 'None',
    priority: priority || 'Medium',
    status: status || 'Pending',
  });

  return res.status(201).json(newTask);
}

export async function updateTask(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const updated = await Task.findByIdAndUpdate(id, req.body, { new: true });
      if (updated) {
        return res.json({
          id: updated._id.toString(),
          title: updated.title,
          clientId: updated.clientId ? updated.clientId.toString() : '',
          clientName: updated.clientName,
          assignedTo: updated.assignedTo.toString(),
          assignedToName: updated.assignedToName,
          dueDate: updated.dueDate.toISOString().slice(0, 10),
          definitionOfDone: updated.definitionOfDone,
          dependency: updated.dependency,
          priority: updated.priority,
          status: updated.status,
          createdAt: updated.createdAt.toISOString(),
          completionNotes: updated.completionNotes || '',
        });
      }
    }
  } catch (err: any) {
    console.warn('[Tasks] Mongo update error:', err.message);
  }

  const updatedLocal = db.updateTask(id, req.body);
  if (!updatedLocal) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  return res.json(updatedLocal);
}

export async function updateTaskStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status, completionNotes } = req.body;

  try {
    if (isMongoConnected()) {
      const task = await Task.findById(id);
      if (!task) return res.status(404).json({ error: 'Task not found.' });

      const assignedStr = task.assignedTo ? task.assignedTo.toString() : '';
      if (req.user?.role !== 'admin' && assignedStr !== req.user?.id) {
        return res.status(403).json({ error: 'You may only update tasks assigned to you.' });
      }

      if (status) task.status = status;
      if (completionNotes !== undefined) task.completionNotes = completionNotes;

      await task.save();
      return res.json({
        id: task._id.toString(),
        title: task.title,
        clientId: task.clientId ? task.clientId.toString() : '',
        clientName: task.clientName,
        assignedTo: assignedStr,
        assignedToName: task.assignedToName,
        dueDate: task.dueDate.toISOString().slice(0, 10),
        definitionOfDone: task.definitionOfDone,
        dependency: task.dependency,
        priority: task.priority,
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        completionNotes: task.completionNotes || '',
      });
    }
  } catch (err: any) {
    console.warn('[Tasks] Mongo update status error:', err.message);
  }

  const task = db.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  if (req.user?.role !== 'admin' && task.assignedTo !== req.user?.id) {
    return res.status(403).json({ error: 'You may only update tasks assigned to you.' });
  }

  const updates: any = {};
  if (status) updates.status = status;
  if (completionNotes !== undefined) updates.completionNotes = completionNotes;

  const updated = db.updateTask(id, updates);
  return res.json(updated);
}

export async function deleteTask(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      await Task.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Task deleted.' });
    }
  } catch (err: any) {
    console.warn('[Tasks] Mongo delete error:', err.message);
  }

  const deleted = db.deleteTask(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  return res.json({ success: true, message: 'Task deleted.' });
}
