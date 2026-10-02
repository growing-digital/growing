import type { Response } from 'express';
import { User } from '../models/User.ts';
import { db } from '../db.ts';
import { isMongoConnected } from '../db/mongodb.ts';
import type { AuthenticatedRequest } from '../middleware/auth.ts';

// ====================================================
// APPLICATION DATE
// ====================================================

const getApplicationDate = (): string => {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year =
    parts.find((part) => part.type === 'year')?.value || '';

  const month =
    parts.find((part) => part.type === 'month')?.value || '';

  const day =
    parts.find((part) => part.type === 'day')?.value || '';

  return `${year}-${month}-${day}`;
};

// ====================================================
// MAP MONGO USER
// ====================================================

const mapMongoUser = (user: any) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  phone: user.phone || '',
  department: user.department || '',
  joiningDate: user.joiningDate
    ? user.joiningDate.toISOString().slice(0, 10)
    : '',
  status: user.status,
  avatarUrl: user.avatarUrl,
});

// ====================================================
// GET EMPLOYEES
// ====================================================

export async function getEmployees(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (isMongoConnected()) {
      const users = await User.find().sort({
        createdAt: -1,
      });

      const mapped = users.map(mapMongoUser);

      return res.json(mapped);
    }
  } catch (err: any) {
    console.warn(
      '[Employees] Mongo query error:',
      err?.message || err
    );
  }

  return res.json(db.getUsers());
}

// ====================================================
// CREATE EMPLOYEE
// ====================================================

export async function createEmployee(
  req: AuthenticatedRequest,
  res: Response
) {
  const {
    name,
    email,
    phone,
    username,
    password,
    role,
    department,
    joiningDate,
    status,
  } = req.body;

  if (!name || !email || !username) {
    return res.status(400).json({
      error:
        'Name, email, and username are required.',
    });
  }

  if (
    !password ||
    String(password).trim().length < 6
  ) {
    return res.status(400).json({
      error:
        'A password of at least 6 characters is required.',
    });
  }

  try {
    if (isMongoConnected()) {
      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const normalizedUsername = String(username)
        .trim()
        .toLowerCase();

      const existing = await User.findOne({
        $or: [
          { email: normalizedEmail },
          { username: normalizedUsername },
        ],
      });

      if (existing) {
        return res.status(400).json({
          error:
            'A user with this email or username already exists.',
        });
      }

      const finalJoiningDate =
        joiningDate || getApplicationDate();

      const created = await User.create({
        name: String(name).trim(),

        email: normalizedEmail,

        phone: phone || '',

        username: normalizedUsername,

        password: String(password),

        role: role || 'employee',

        department:
          department || 'General',

        joiningDate: new Date(
          `${finalJoiningDate}T00:00:00`
        ),

        status: status || 'Active',
      });

      return res.status(201).json(
        mapMongoUser(created)
      );
    }
  } catch (err: any) {
    console.warn(
      '[Employees] Mongo create error, using local fallback:',
      err?.message || err
    );
  }

  // ==================================================
  // LOCAL STORE FALLBACK
  // ==================================================

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  const normalizedUsername = String(username)
    .trim()
    .toLowerCase();

  const existing =
    db.getUserByEmailOrUsername(
      normalizedEmail
    ) ||
    db.getUserByEmailOrUsername(
      normalizedUsername
    );

  if (existing) {
    return res.status(400).json({
      error:
        'A user with this email or username already exists.',
    });
  }

  const created = db.addUser({
    name: String(name).trim(),

    email: normalizedEmail,

    phone: phone || '',

    username: normalizedUsername,

    password: String(password),

    role: role || 'employee',

    department:
      department || 'General',

    joiningDate:
      joiningDate || getApplicationDate(),

    status: status || 'Active',
  });

  return res.status(201).json(created);
}

// ====================================================
// UPDATE EMPLOYEE
// ====================================================

export async function updateEmployee(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params;

  try {
    if (isMongoConnected()) {
      const updateData = {
        ...req.body,
      };

      /*
       * Do not replace an existing password with an
       * empty value during a normal employee edit.
       */
      if (
        updateData.password === '' ||
        updateData.password === undefined
      ) {
        delete updateData.password;
      }

      /*
       * Normalize dates when a joining date is supplied.
       */
      if (updateData.joiningDate) {
        updateData.joiningDate = new Date(
          `${updateData.joiningDate}T00:00:00`
        );
      }

      const updated =
        await User.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      if (updated) {
        return res.json(
          mapMongoUser(updated)
        );
      }
    }
  } catch (err: any) {
    console.warn(
      '[Employees] Mongo update error:',
      err?.message || err
    );
  }

  const localUpdate = {
    ...req.body,
  };

  if (
    localUpdate.password === '' ||
    localUpdate.password === undefined
  ) {
    delete localUpdate.password;
  }

  const updatedLocal =
    db.updateUser(id, localUpdate);

  if (!updatedLocal) {
    return res.status(404).json({
      error: 'Employee not found.',
    });
  }

  return res.json(updatedLocal);
}

// ====================================================
// TOGGLE EMPLOYEE STATUS
// ====================================================

export async function toggleEmployeeStatus(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params;
  const { status } = req.body;

  if (
    !status ||
    !['Active', 'Disabled'].includes(status)
  ) {
    return res.status(400).json({
      error:
        'Valid status is required ("Active" or "Disabled").',
    });
  }

  try {
    if (isMongoConnected()) {
      const updated =
        await User.findByIdAndUpdate(
          id,
          { status },
          {
            new: true,
            runValidators: true,
          }
        );

      if (updated) {
        return res.json(
          mapMongoUser(updated)
        );
      }
    }
  } catch (err: any) {
    console.warn(
      '[Employees] Mongo toggle status error:',
      err?.message || err
    );
  }

  const updatedLocal =
    db.updateUser(id, { status });

  if (!updatedLocal) {
    return res.status(404).json({
      error: 'Employee not found.',
    });
  }

  return res.json(updatedLocal);
}

// ====================================================
// RESET PASSWORD
// ====================================================

export async function resetPassword(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (
    !newPassword ||
    String(newPassword).trim().length < 6
  ) {
    return res.status(400).json({
      error:
        'New password must be at least 6 characters.',
    });
  }

  const password = String(newPassword);

  try {
    if (isMongoConnected()) {
      const user =
        await User.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'Employee not found.',
        });
      }

      user.password = password;

      await user.save();

      return res.json({
        success: true,
        message: `Password updated successfully for ${user.name}.`,
      });
    }
  } catch (err: any) {
    console.warn(
      '[Employees] Mongo reset password error:',
      err?.message || err
    );
  }

  // ==================================================
  // LOCAL FALLBACK
  // ==================================================

  const user = db.getUserById(id);

  if (!user) {
    return res.status(404).json({
      error: 'Employee not found.',
    });
  }

  db.updateUser(id, {
    password,
  });

  return res.json({
    success: true,
    message: `Password updated successfully for ${user.name}.`,
  });
}

// ====================================================
// DELETE EMPLOYEE
// ====================================================

export async function deleteEmployee(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id } = req.params;

  if (id === req.user?.id) {
    return res.status(400).json({
      error:
        'Cannot delete your own active administrator account.',
    });
  }

  try {
    if (isMongoConnected()) {
      const deleted =
        await User.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({
          error: 'Employee not found.',
        });
      }

      return res.json({
        success: true,
        message:
          'Employee account removed.',
      });
    }
  } catch (err: any) {
    console.warn(
      '[Employees] Mongo delete error:',
      err?.message || err
    );
  }

  const deleted = db.deleteUser(id);

  if (!deleted) {
    return res.status(404).json({
      error: 'Employee not found.',
    });
  }

  return res.json({
    success: true,
    message:
      'Employee account removed.',
  });
}