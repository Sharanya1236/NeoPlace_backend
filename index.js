const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send("Welcome to the Placement App Backend!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at Port: ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cors = require('cors');
const multer = require('multer'); // For file uploads
const FormData = require('form-data'); // For sending files
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');
const nodemailer = require('nodemailer');
// Import Models
const Course = require('./models/Course');
const User = require('./models/User');
const ChatHistory = require('./models/ChatHistory');
const Problem = require('./models/Problem');
const Submission = require('./models/Submission');
const Company = require('./models/Company');
const pdfParse = require("pdf-parse/lib/pdf-parse.js");


// Import Middleware
const authMiddleware = require('./middleware/authMiddleware');

// Create an Express application
const app = express();


// Configure multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// --- MIDDLEWARE ---
app.use(cors({
    origin: "*",
    methods: ["GET","POST","PUT","DELETE"],
    credentials: true
}));
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://localhost:3000",
    "https://your-netlify-url.netlify.app"
  ],
  credentials: true
}));

app.use(express.json());
// ------------------

// --- DATABASE CONNECTION ---
const DB_CONNECTION_STRING = "mongodb+srv://CapstoneProject:CapstoneProject%40191@capstoneproject.arxoeyp.mongodb.net/?retryWrites=true&w=majority&appName=CapstoneProject";

mongoose.connect(DB_CONNECTION_STRING)
  .then(() => console.log('✅ Successfully connected to MongoDB!'))
  .catch((error) => console.error('❌ Error connecting to MongoDB:', error));
// -------------------------

// --- ROUTES ---

// Welcome Route
app.get('/', (req, res) => {
  res.send('Welcome to the Placement App Backend!');
});

// --- Course CRUD Routes ---
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

// ==========================================================
// ==> THIS IS THE ROUTE TO ADD COURSES. IT IS ALREADY COMPLETE. <==
// ==========================================================
app.post('/api/courses', authMiddleware, async (req, res) => {
  try {
    // Destructure all expected fields from the request body for clarity
    const { title, description, category, instructor, level } = req.body;

    const newCourse = new Course({
      title,
      description,
      category,
      instructor,
      level
    });
    
    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Error creating course' });
  }
});
// NEW ROUTE: Get a single course by its ID
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    res.status(500).json({ message: 'Error fetching course details' });
  }
});

app.put('/api/courses/:id', authMiddleware, async (req, res) => {
  try {
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(updatedCourse);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Server error updating course' });
  }
});

app.delete('/api/courses/:id', authMiddleware, async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    if (!deletedCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (error)
  {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Server error deleting course' });
  }
});

// --- CODING PROBLEM ROUTES ---
app.post('/api/problems', authMiddleware, async (req, res) => {
  try {
    const newProblem = new Problem(req.body);
    const savedProblem = await newProblem.save();
    res.status(201).json(savedProblem);
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ message: 'Server error creating problem' });
  }
});

app.get('/api/problems', async (req, res) => {
  try {
    const problems = await Problem.find({});
    res.json(problems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ message: 'Server error fetching problems' });
  }
});

// --- COMPANY ROUTES ---
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.find({});
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching companies' });
  }
});

app.post('/api/companies', authMiddleware, async (req, res) => {
  try {
    const newCompany = new Company(req.body);
    await newCompany.save();
    res.status(201).json(newCompany);
  } catch (error) {
    res.status(500).json({ message: 'Error creating company' });
  }
});
// --- UPDATED ATS + JOB DESCRIPTION CHECKER ROUTE ---
// FIX: Safe import for pdf-parse

// --- UPDATED ATS + JOB DESCRIPTION CHECKER ROUTE ---
app.post("/api/resume/check", authMiddleware, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF required" });
    }

    const jobDescription = req.body.jobDescription?.trim();
    if (!jobDescription) {
      return res.status(400).json({ message: "Job Description is required" });
    }

    // Parse PDF safely
    const pdfData = await pdfParse(req.file.buffer);
    const resumeText = (pdfData.text || "").toLowerCase();
    const jdText = jobDescription.toLowerCase();

    // Extract keywords
    const keywordRegex = /\b[a-zA-Z]{3,}\b/g;
    let jdKeywords = jdText.match(keywordRegex) || [];

    // Remove duplicates
    jdKeywords = [...new Set(jdKeywords)];

    // Remove useless small/common words
    const ignoreWords = new Set([
      "and","the","with","your","that","from","for","you","are","will",
      "this","have","but","not","all","any","job","role","who","our",
      "in","on","is","of","as","by","be","or","to","a"
    ]);

    jdKeywords = jdKeywords.filter(w => !ignoreWords.has(w));

    // Compare with resume
    const matched = jdKeywords.filter(k => resumeText.includes(k));
    const missing = jdKeywords.filter(k => !resumeText.includes(k));

    // Suggestions
    const suggestions = [];

    if (missing.length > 0) {
      suggestions.push(
        "Your resume is missing important keywords from the job description: " + 
        missing.slice(0, 12).join(", ")
      );
    }

    if (matched.length < 5) {
      suggestions.push(
        "Highlight more relevant technical skills and project details to improve ATS score."
      );
    }

    if (!resumeText.includes("experience") && jdText.includes("experience")) {
      suggestions.push("Add an 'Experience' section with metrics and achievements.");
    }

    if (!resumeText.includes("projects")) {
      suggestions.push("Include a 'Projects' section with tech stack and outcomes.");
    }

    // Score Calculation
    const score = jdKeywords.length === 0 
      ? 0 
      : Math.round((matched.length / jdKeywords.length) * 100);

    // Send result
    return res.json({
      score,
      matched,
      missing,
      suggestions,
      totalKeywords: jdKeywords.length
    });

  } catch (error) {
    console.error("ATS Error:", error);
    return res.status(500).json({ message: "Error reading resume PDF" });
  }
});

// --- SUBMISSION ROUTE ---
// REPLACE your old /api/submissions route with this new one

// REPLACE your old /api/submissions route in index.js with this new one

app.post('/api/submissions', authMiddleware, async (req, res) => {
    // We now expect a 'submissionType' from the frontend ("run" or "submit")
    const { problemId, code, language, submissionType } = req.body;
    const userId = req.user.id;

    try {
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({ message: 'Problem not found' });
        }

        // We only use the first example test case for a "Run"
        // For a "Submit", Judge0 would ideally run all test cases,
        // but for this project, we'll just use the first one for both.
        const testCase = problem.testCases[0];
        
        const submissionData = {
            source_code: code,
            language_id: getLanguageId(language),
            stdin: testCase.input,
            expected_output: testCase.output
        };

        // Send to Judge0 API
        const response = await axios.post('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', submissionData, {
            headers: {
                'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
                'x-rapidapi-key': process.env.JUDGE0_API_KEY,
                'content-type': 'application/json',
            }
        });

        const result = response.data;
        const newStatus = result.status ? result.status.description : 'Error';
        const newOutput = result.stdout || result.stderr || result.compile_output || 'No output.';

        // Check if the submission was correct
        if (newStatus === 'Accepted') {
            // ONLY increment the score if it was a 'submit'
            if (submissionType === 'submit') {
                // 🏆 Increment the totalQuestionsSolved counter 🏆
                // We should add logic to prevent double-counting if already solved
                const user = await User.findById(userId);
                const problemObjectId = new mongoose.Types.ObjectId(problemId);

                // Check if user has already solved this problem
                if (!user.solvedProblems.includes(problemObjectId)) {
                    await User.findByIdAndUpdate(
                        userId,
                        { 
                            $inc: { totalQuestionsSolved: 1 },
                            $push: { solvedProblems: problemObjectId }
                        },
                        { new: true }
                    );
                }
            }
        }
        
        // Save the submission to our database regardless
        const newSubmission = new Submission({
            userId,
            problemId,
            code,
            language,
            status: newStatus,
            output: newOutput
        });
        await newSubmission.save();

        // Send the full result back to the frontend
        res.json(newSubmission);

    } catch (error) {
        console.error('Error in submission route:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            message: 'Server error during submission',
            output: error.message,
            status: 'Server Error'
        });
    }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }
    const payload = {
      user: {
        id: user.id
      }
    };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      // ==========================================================
      // ==> I REMOVED THE DUPLICATE { expiresIn: '1h' } LINE FROM HERE <==
      // ==========================================================
      { expiresIn: '365d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// --- CHATBOT ROUTE ---
// --- CHATBOT ROUTE (FULLY FIXED) ---
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userMessage = req.body.message;

    // Save user message
    await new ChatHistory({
      userId,
      role: 'user',
      message: userMessage
    }).save();

    // Get user details & last messages
    const user = await User.findById(userId).select('-password');
    const history = await ChatHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // FIXED: Build safe history string
    const historyText = history
      .map(h => `${h.role}: ${h.message}`)
      .join("\n");

    // Build AI prompt
    const prompt = `
You are a helpful placement preparation assistant.
The user you are talking to is named ${user.username}.

Recent conversation history:
${historyText}

Now respond to the user's latest message:
user: ${userMessage}
`;

    // Call AI server
    const aiResponse = await axios.post('http://localhost:5000/api/chat', {
      message: prompt
    });

    const assistantMessage = aiResponse.data.response;

    // Save assistant message
    await new ChatHistory({
      userId,
      role: 'assistant',
      message: assistantMessage
    }).save();

    res.json({ response: assistantMessage });

  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).json({ message: "Server error in chat" });
  }
});


// --- MOCK INTERVIEW BOOKING ROUTES ---

// REPLACE your old /api/slots POST route with this one

// Route for ADMIN to create MULTIPLE slots
// Route for ADMIN to create MULTIPLE slots
app.post('/api/slots', authMiddleware, async (req, res) => {
  try {
    const { slots, durationMinutes } = req.body;
    const createdSlots = [];

    if (!slots || !Array.isArray(slots) || !durationMinutes) {
      return res.status(400).json({ message: 'Invalid input. Need slots array and durationMinutes.' });
    }

    for (const slotRequest of slots) {
      const { startTime, count } = slotRequest;
      if (!startTime || !count || count <= 0) {
        console.warn('Skipping invalid slot request:', slotRequest);
        continue;
      }

      const baseStartTime = new Date(startTime);
      const endTime = new Date(baseStartTime.getTime() + durationMinutes * 60000);

      for (let i = 0; i < count; i++) {
        const newSlot = new Slot({ startTime: baseStartTime, endTime });
        createdSlots.push(newSlot.save());
      }
    }

    const savedSlots = await Promise.all(createdSlots);

    console.log(`✅ Created ${savedSlots.length} new slots.`);
    res.status(201).json(savedSlots);

  } catch (error) {
    console.error('Error creating multiple slots:', error);
    res.status(500).json({ message: 'Error creating slots' });
  }
});

// Route for USERS to see available slots
app.get('/api/get-interviews', authMiddleware, async (req, res) => {
    try {
        const availableSlots = await Slot.find({ 
            isBooked: false,
            startTime: { $gte: new Date() } // Only show future slots
        }).sort({ startTime: 'asc' });
        res.json(availableSlots);
    } catch (error) {
        console.error('Error fetching available slots:', error)
        res.status(500).json({ message: 'Error fetching slots' });
    }
});
// --- PASTE THIS ENTIRE BLOCK INTO YOUR index.js ---
// --- A good place is after your other GET routes ---

app.get('/api/leaderboard', async (req, res) => {
    try {
        const leaderboardData = await User.find({}) // Make sure 'User' model is imported at the top
            .select('username totalQuestionsSolved') 
            .sort({ totalQuestionsSolved: -1 }) // Sort descending
            .limit(50); // Top 50 users
            
        res.status(200).json(leaderboardData);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ message: 'Failed to fetch leaderboard data.' });
    }
});

// Route for a USER to book a slot
app.post('/api/bookings', authMiddleware, async (req, res) => {
    try {
        const { slotId } = req.body;
        const userId = req.user.id;

        const slot = await Slot.findById(slotId);
        if (!slot || slot.isBooked) {
            return res.status(400).json({ message: 'Slot is not available.' });
        }

        // Mark the slot as booked
        slot.isBooked = true;
        slot.bookedBy = userId;
        await slot.save();

        const newBooking = new Booking({ user: userId, slot: slotId });
        await newBooking.save();

        // Send notification email to admin
        await sendBookingNotification(newBooking);

        res.status(201).json(newBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating booking.' });
    }
});


// --- Email Notification Helper ---
async function sendBookingNotification(booking) {
    const user = await User.findById(booking.user).select('username email');
    const slot = await Slot.findById(booking.slot);

    // Create a transporter using your email service
    let transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email provider
        auth: {
            user: process.env.EMAIL_USER, // Your email address from .env file
            pass: process.env.EMAIL_APP_PASSWORD, // Your email app password from .env file
        },
    });

    // Email content
    let mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'contactneoplace@gmail.com', // The email where you want to receive notifications
        subject: 'New Mock Interview Slot Booked!',
        html: `
            <h1>New Booking Confirmation</h1>
            <p>A new mock interview slot has been booked.</p>
            <ul>
                <li><strong>User:</strong> ${user.username} (${user.email})</li>
                <li><strong>Time:</strong> ${new Date(slot.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>
            </ul>
            <p>Please schedule a meeting and update the booking.</p>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Booking notification email sent.');
}
// --- ADD THIS NEW ROUTE TO index.js ---

// GET current user's profile (for solved problems)
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    // req.user.id is added by the authMiddleware
    const user = await User.findById(req.user.id).select('solvedProblems'); 
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------------

// Your app.listen(...) line should be right after this
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Helper function to map language names to Judge0 IDs
function getLanguageId(language) {
  switch (language.toLowerCase()) {
    case 'javascript': return 93;
    case 'python': return 92;
    case 'java': return 91;
    case 'c++': return 54;
    default: return null;
  }
}