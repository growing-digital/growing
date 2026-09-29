import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  _id: mongoose.Types.ObjectId;
  clientName: string;
  packageTier: 'Starter' | 'Growth' | 'Premium' | 'Enterprise';
  monthlyFee: number;
  contractStart: Date;
  renewalDate: Date;
  namedApprover: string;
  billingContact: string;
  deliveryLead: string;
  baselineMetrics: string;
  seuLoad: string;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  status: 'Active' | 'Archived';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientName: {
      type: String,
      required: [true, 'Client Name is required'],
      trim: true,
      index: true,
    },
    packageTier: {
      type: String,
      enum: ['Starter', 'Growth', 'Premium', 'Enterprise'],
      required: true,
      default: 'Growth',
      index: true,
    },
    monthlyFee: {
      type: Number,
      required: [true, 'Monthly Fee is required'],
      min: 0,
    },
    contractStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    renewalDate: {
      type: Date,
      required: true,
    },
    namedApprover: {
      type: String,
      required: [true, 'Named Approver is required'],
      trim: true,
    },
    billingContact: {
      type: String,
      required: [true, 'Billing Contact Email is required'],
      lowercase: true,
      trim: true,
    },
    deliveryLead: {
      type: String,
      required: [true, 'Delivery Lead is required'],
      trim: true,
    },
    baselineMetrics: {
      type: String,
      default: 'Website / Leads / Social',
    },
    seuLoad: {
      type: String,
      default: '40 hrs',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Overdue'],
      default: 'Paid',
      index: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Archived'],
      default: 'Active',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ status: 1, monthlyFee: -1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
