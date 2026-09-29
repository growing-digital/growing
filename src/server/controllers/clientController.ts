import { Response } from 'express';
import { Client } from '../models/Client.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export async function getClients(_req: AuthenticatedRequest, res: Response) {
  try {
    if (isMongoConnected()) {
      const clients = await Client.find().sort({ createdAt: -1 });
      const mapped = clients.map((c) => ({
        id: c._id.toString(),
        clientName: c.clientName,
        packageTier: c.packageTier,
        monthlyFee: c.monthlyFee,
        contractStart: c.contractStart.toISOString().slice(0, 10),
        renewalDate: c.renewalDate.toISOString().slice(0, 10),
        namedApprover: c.namedApprover,
        billingContact: c.billingContact,
        deliveryLead: c.deliveryLead,
        baselineMetrics: c.baselineMetrics,
        seuLoad: c.seuLoad,
        paymentStatus: c.paymentStatus,
        status: c.status,
        notes: c.notes || '',
        createdAt: c.createdAt.toISOString(),
      }));
      return res.json(mapped);
    }
  } catch (err: any) {
    console.warn('[Clients] Mongo query failed, falling back to local store:', err.message);
  }

  return res.json(db.getClients());
}

export async function createClient(req: AuthenticatedRequest, res: Response) {
  const {
    clientName,
    packageTier,
    monthlyFee,
    contractStart,
    renewalDate,
    namedApprover,
    billingContact,
    deliveryLead,
    baselineMetrics,
    seuLoad,
    paymentStatus,
    status,
    notes,
  } = req.body;

  if (!clientName || !billingContact) {
    return res.status(400).json({ error: 'Client name and billing contact are required.' });
  }

  try {
    if (isMongoConnected()) {
      const newClient = await Client.create({
        clientName,
        packageTier: packageTier || 'Growth',
        monthlyFee: Number(monthlyFee) || 0,
        contractStart: contractStart ? new Date(contractStart) : new Date(),
        renewalDate: renewalDate ? new Date(renewalDate) : new Date(Date.now() + 365 * 24 * 3600 * 1000),
        namedApprover: namedApprover || '',
        billingContact,
        deliveryLead: deliveryLead || '',
        baselineMetrics: baselineMetrics || 'General Marketing',
        seuLoad: seuLoad || '30 hrs',
        paymentStatus: paymentStatus || 'Paid',
        status: status || 'Active',
        notes: notes || '',
      });

      return res.status(201).json({
        id: newClient._id.toString(),
        clientName: newClient.clientName,
        packageTier: newClient.packageTier,
        monthlyFee: newClient.monthlyFee,
        contractStart: newClient.contractStart.toISOString().slice(0, 10),
        renewalDate: newClient.renewalDate.toISOString().slice(0, 10),
        namedApprover: newClient.namedApprover,
        billingContact: newClient.billingContact,
        deliveryLead: newClient.deliveryLead,
        baselineMetrics: newClient.baselineMetrics,
        seuLoad: newClient.seuLoad,
        paymentStatus: newClient.paymentStatus,
        status: newClient.status,
        notes: newClient.notes,
        createdAt: newClient.createdAt.toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('[Clients] Mongo create error, falling back:', err.message);
  }

  const client = db.addClient({
    clientName,
    packageTier: packageTier || 'Growth',
    monthlyFee: Number(monthlyFee) || 0,
    contractStart: contractStart || '2026-09-01',
    renewalDate: renewalDate || '2027-08-31',
    namedApprover: namedApprover || '',
    billingContact,
    deliveryLead: deliveryLead || '',
    baselineMetrics: baselineMetrics || 'General Marketing',
    seuLoad: seuLoad || '30 hrs',
    paymentStatus: paymentStatus || 'Paid',
    status: status || 'Active',
    notes: notes || '',
  });

  return res.status(201).json(client);
}

export async function updateClient(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const updated = await Client.findByIdAndUpdate(id, req.body, { new: true });
      if (updated) {
        return res.json({
          id: updated._id.toString(),
          clientName: updated.clientName,
          packageTier: updated.packageTier,
          monthlyFee: updated.monthlyFee,
          contractStart: updated.contractStart.toISOString().slice(0, 10),
          renewalDate: updated.renewalDate.toISOString().slice(0, 10),
          namedApprover: updated.namedApprover,
          billingContact: updated.billingContact,
          deliveryLead: updated.deliveryLead,
          baselineMetrics: updated.baselineMetrics,
          seuLoad: updated.seuLoad,
          paymentStatus: updated.paymentStatus,
          status: updated.status,
          notes: updated.notes,
          createdAt: updated.createdAt.toISOString(),
        });
      }
    }
  } catch (err: any) {
    console.warn('[Clients] Mongo update error, checking local store:', err.message);
  }

  const updatedLocal = db.updateClient(id, req.body);
  if (!updatedLocal) {
    return res.status(404).json({ error: 'Client record not found.' });
  }
  return res.json(updatedLocal);
}

export async function deleteClient(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      await Client.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Client record deleted.' });
    }
  } catch (err: any) {
    console.warn('[Clients] Mongo delete error:', err.message);
  }

  const deleted = db.deleteClient(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Client record not found.' });
  }
  return res.json({ success: true, message: 'Client record deleted.' });
}
