import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['FLEET_DIESEL', 'FLEET_REPAIRS', 'FLEET_MAINTENANCE', 'SALARY', 'MISC'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
