import mongoose, {
  Document,
  Schema,
} from 'mongoose';

/**
 * ============================================================
 * ATTENDANCE DOCUMENT TYPE
 * ============================================================
 */
export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;

  employeeId: mongoose.Types.ObjectId;

  employeeName: string;

  employeeEmail: string;

  department: string;

  /**
   * Attendance day.
   *
   * Always:
   * YYYY-MM-DD
   *
   * Example:
   * 2026-10-01
   */
  date: string;

  /**
   * Check-in time.
   *
   * Example:
   * 09:10 AM
   */
  checkIn: string | null;

  /**
   * Check-out time.
   *
   * Example:
   * 06:05 PM
   */
  checkOut: string | null;

  status:
    | 'Present'
    | 'Late'
    | 'Absent'
    | 'On Leave';

  note?: string;

  /**
   * Example:
   * 8h 55m
   *
   * While shift is active:
   * Active
   */
  hoursWorked?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * ============================================================
 * ATTENDANCE SCHEMA
 * ============================================================
 */
const AttendanceSchema =
  new Schema<IAttendance>(
    {
      // ------------------------------------------------------
      // EMPLOYEE
      // ------------------------------------------------------
      employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
      },

      employeeName: {
        type: String,
        required: true,
        trim: true,
      },

      employeeEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      department: {
        type: String,
        required: true,
        trim: true,
      },

      // ------------------------------------------------------
      // ATTENDANCE DATE
      // ------------------------------------------------------
      date: {
        type: String,
        required: true,
        trim: true,
        index: true,

        /**
         * Only allow:
         *
         * YYYY-MM-DD
         *
         * Example:
         * 2026-10-01
         */
        match: [
          /^\d{4}-\d{2}-\d{2}$/,
          'Date format must be YYYY-MM-DD',
        ],
      },

      // ------------------------------------------------------
      // CHECK IN
      // ------------------------------------------------------
      checkIn: {
        type: String,
        default: null,
        trim: true,
      },

      // ------------------------------------------------------
      // CHECK OUT
      // ------------------------------------------------------
      checkOut: {
        type: String,
        default: null,
        trim: true,
      },

      // ------------------------------------------------------
      // ATTENDANCE STATUS
      // ------------------------------------------------------
      status: {
        type: String,

        enum: [
          'Present',
          'Late',
          'Absent',
          'On Leave',
        ],

        default: 'Present',

        index: true,
      },

      // ------------------------------------------------------
      // NOTE
      // ------------------------------------------------------
      note: {
        type: String,
        default: '',
        trim: true,
      },

      // ------------------------------------------------------
      // HOURS WORKED
      // ------------------------------------------------------
      hoursWorked: {
        type: String,
        default: 'Active',
        trim: true,
      },
    },

    {
      /**
       * Automatically creates:
       *
       * createdAt
       * updatedAt
       */
      timestamps: true,
    }
  );

/**
 * ============================================================
 * CRITICAL DAILY ATTENDANCE RULE
 * ============================================================
 *
 * One employee can have ONLY ONE attendance record
 * for a particular calendar date.
 *
 * Example:
 *
 * Employee A + 2026-10-01  -> allowed
 * Employee A + 2026-10-01  -> NOT allowed
 * Employee A + 2026-10-02  -> allowed
 * Employee B + 2026-10-01  -> allowed
 *
 * This is what gives you day-by-day attendance.
 */
AttendanceSchema.index(
  {
    employeeId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

/**
 * ============================================================
 * DATE + STATUS INDEX
 * ============================================================
 *
 * Helps admin attendance searches such as:
 *
 * October 1 + Present
 * October 1 + Late
 */
AttendanceSchema.index(
  {
    date: 1,
    status: 1,
  }
);

/**
 * ============================================================
 * EXPORT MODEL
 * ============================================================
 */
export const Attendance =
  mongoose.model<IAttendance>(
    'Attendance',
    AttendanceSchema
  );