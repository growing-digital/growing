import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  employeeEmail: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  note?: string;
  hoursWorked?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeEmail: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'],
    },
    checkIn: {
      type: String,
      default: null,
    },
    checkOut: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'On Leave'],
      default: 'Present',
      index: true,
    },
    note: {
      type: String,
      default: '',
    },
    hoursWorked: {
      type: String,
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
