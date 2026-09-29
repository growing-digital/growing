import mongoose from 'mongoose';
import { User } from '../models/User.ts';
import { connectMongoDB } from '../db/mongodb.ts';

async function seedAdmin() {
  console.log('Seeding Root Administrator into MongoDB...');
  const connected = await connectMongoDB();
  if (!connected) {
    console.error('Cannot seed: MongoDB is not connected.');
    process.exit(1);
  }

  try {
    const existingAdmin = await User.findOne({
      $or: [{ email: 'admin@company.com' }, { username: 'admin' }],
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
    } else {
      const admin = await User.create({
        name: 'Sarah Jenkins',
        email: 'admin@company.com',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        phone: '+1 (555) 019-2834',
        department: 'Operations',
        status: 'Active',
      });
      console.log('Successfully created initial Administrator:', admin.email);
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
