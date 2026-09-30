import type { Request, Response } from 'express';
import { Client } from '../models/Client.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

const isProduction = process.env.NODE_ENV === 'production';

function mapClient(client: any) {
  return {
    id: client._id.toString(),
    clientName: client.clientName,
    packageTier: client.packageTier,
    monthlyFee: client.monthlyFee,
    contractStart: client.contractStart
      ? new Date(client.contractStart).toISOString().slice(0, 10)
      : '',
    renewalDate: client.renewalDate
      ? new Date(client.renewalDate).toISOString().slice(0, 10)
      : '',
    namedApprover: client.namedApprover || '',
    billingContact: client.billingContact || '',
    deliveryLead: client.deliveryLead || '',
    baselineMetrics: client.baselineMetrics || '',
    seuLoad: client.seuLoad || '',
    paymentStatus: client.paymentStatus,
    status: client.status,
    notes: client.notes || '',
    createdAt: client.createdAt
      ? new Date(client.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

/* =========================================================
   GET CLIENTS
   ========================================================= */
export async function getClients(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (isMongoConnected()) {
      const clients = await Client.find().sort({ createdAt: -1 });

      return res.json(clients.map(mapClient));
    }

    // Only use local JSON storage during development
    if (!isProduction) {
      return res.json(db.getClients());
    }

    return res.status(503).json({
      error: 'Database is unavailable. Please try again later.',
    });
  } catch (err: any) {
    console.error('[Clients] Mongo query failed:', err);

    // Do not silently fall back in production
    if (isProduction) {
      return res.status(500).json({
        error:
          err?.message || 'Failed to load clients from MongoDB.',
      });
    }

    return res.json(db.getClients());
  }
}

/* =========================================================
   CREATE CLIENT
   ========================================================= */
export async function createClient(
  req: AuthenticatedRequest,
  res: Response
) {
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

  // Required fields
  if (!clientName?.trim() || !billingContact?.trim()) {
    return res.status(400).json({
      error: 'Client name and billing contact are required.',
    });
  }

  try {
    /* -----------------------------------------
       PRODUCTION / MONGODB
       ----------------------------------------- */
    if (isMongoConnected()) {
      const newClient = await Client.create({
        clientName: clientName.trim(),
        packageTier: packageTier || 'Growth',
        monthlyFee: Number(monthlyFee) || 0,

        contractStart: contractStart
          ? new Date(contractStart)
          : new Date(),

        renewalDate: renewalDate
          ? new Date(renewalDate)
          : new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ),

        namedApprover: namedApprover?.trim() || '',
        billingContact: billingContact.trim(),
        deliveryLead: deliveryLead?.trim() || '',

        baselineMetrics:
          baselineMetrics?.trim() || 'General Marketing',

        seuLoad: seuLoad?.trim() || '30 hrs',

        paymentStatus: paymentStatus || 'Paid',
        status: status || 'Active',
        notes: notes?.trim() || '',
      });

      console.log(
        `[Clients] Client created successfully: ${newClient._id}`
      );

      return res.status(201).json(mapClient(newClient));
    }

    /* -----------------------------------------
       MONGODB NOT CONNECTED
       ----------------------------------------- */

    if (isProduction) {
      return res.status(503).json({
        error:
          'MongoDB is not connected. Client was not created.',
      });
    }

    // Local development fallback only
    const client = db.addClient({
      clientName: clientName.trim(),
      packageTier: packageTier || 'Growth',
      monthlyFee: Number(monthlyFee) || 0,

      contractStart:
        contractStart ||
        new Date().toISOString().slice(0, 10),

      renewalDate:
        renewalDate ||
        new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10),

      namedApprover: namedApprover?.trim() || '',
      billingContact: billingContact.trim(),
      deliveryLead: deliveryLead?.trim() || '',

      baselineMetrics:
        baselineMetrics?.trim() || 'General Marketing',

      seuLoad: seuLoad?.trim() || '30 hrs',

      paymentStatus: paymentStatus || 'Paid',
      status: status || 'Active',
      notes: notes?.trim() || '',
    });

    return res.status(201).json(client);
  } catch (err: any) {
    console.error(
      '[Clients] Mongo create error:',
      err
    );

    // IMPORTANT:
    // Do NOT save to local JSON when production MongoDB fails.
    return res.status(500).json({
      error:
        err?.message ||
        'Failed to create client in MongoDB.',
    });
  }
}

/* =========================================================
   UPDATE CLIENT
   ========================================================= */
export async function updateClient(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const updated = await Client.findByIdAndUpdate(
        id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        return res.status(404).json({
          error: 'Client record not found.',
        });
      }

      return res.json(mapClient(updated));
    }

    if (isProduction) {
      return res.status(503).json({
        error:
          'Database is unavailable. Client was not updated.',
      });
    }

    const updatedLocal = db.updateClient(id, req.body);

    if (!updatedLocal) {
      return res.status(404).json({
        error: 'Client record not found.',
      });
    }

    return res.json(updatedLocal);
  } catch (err: any) {
    console.error(
      '[Clients] Mongo update error:',
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        'Failed to update client in MongoDB.',
    });
  }
}

/* =========================================================
   DELETE CLIENT
   ========================================================= */
export async function deleteClient(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const deleted = await Client.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Client record not found.',
        });
      }

      return res.json({
        success: true,
        message: 'Client record deleted.',
      });
    }

    if (isProduction) {
      return res.status(503).json({
        error:
          'Database is unavailable. Client was not deleted.',
      });
    }

    const deletedLocal = db.deleteClient(id);

    if (!deletedLocal) {
      return res.status(404).json({
        error: 'Client record not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Client record deleted.',
    });
  } catch (err: any) {
    console.error(
      '[Clients] Mongo delete error:',
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        'Failed to delete client from MongoDB.',
    });
  }
}