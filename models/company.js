const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  category: String,
  subjects: [String]
});

const questionSchema = new mongoose.Schema({
  question: String,
  answer: String
});

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  logoURL:{
    type: String,
    required: true
  },
  rounds: [String],
  topics: [topicSchema],
  previousQuestions: [questionSchema]
}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);

module.exports = Company;