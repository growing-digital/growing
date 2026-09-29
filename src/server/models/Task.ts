import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  clientId?: mongoose.Types.ObjectId;
  clientName: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedToName: string;
  dueDate: Date;
  definitionOfDone: string;
  dependency: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  completionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task Title is required'],
      trim: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true,
    },
    clientName: {
      type: String,
      required: true,
      default: 'Internal Project',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned employee is required'],
      index: true,
    },
    assignedToName: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    definitionOfDone: {
      type: String,
      required: [true, 'Definition of Done is required'],
    },
    dependency: {
      type: String,
      default: 'None',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
      index: true,
    },
    completionNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
