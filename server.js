const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "public"))) // Serve static files

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

// Initialize database tables
async function initDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        age INTEGER,
        gender VARCHAR(20),
        height DECIMAL(5,2),
        weight DECIMAL(5,2),
        profile_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Foods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        calories INTEGER NOT NULL,
        protein DECIMAL(5,2) NOT NULL,
        carbs DECIMAL(5,2) NOT NULL,
        fats DECIMAL(5,2) NOT NULL,
        serving VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Food logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        calories_burned_per_hour INTEGER NOT NULL,
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Activity logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        duration_minutes INTEGER NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User goals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        goal_type VARCHAR(100) NOT NULL,
        goal_name VARCHAR(255) NOT NULL,
        target_value DECIMAL(10,2),
        target_date DATE,
        current_value DECIMAL(10,2) DEFAULT 0,
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(100) NOT NULL,
        criteria_type VARCHAR(100) NOT NULL,
        criteria_value INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_id)
      )
    `)

    // Journal entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        entry_type VARCHAR(50) NOT NULL,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Chatbot conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Insert sample foods if table is empty
    const foodCount = await pool.query("SELECT COUNT(*) FROM foods")
    if (Number.parseInt(foodCount.rows[0].count) === 0) {
      const sampleFoods = [
        { name: "Apple", calories: 95, protein: 0.5, carbs: 25, fats: 0.3, serving: "1 medium (182g)" },
        { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fats: 0.4, serving: "1 medium (118g)" },
        { name: "Chicken Breast", calories: 165, protein: 31, carbs: 0, fats: 3.6, serving: "100g" },
        { name: "White Rice", calories: 130, protein: 2.7, carbs: 28, fats: 0.3, serving: "100g cooked" },
        { name: "Broccoli", calories: 55, protein: 3.7, carbs: 11, fats: 0.6, serving: "100g" },
        { name: "Egg", calories: 68, protein: 5.5, carbs: 0.5, fats: 4.8, serving: "1 large (50g)" },
        { name: "Salmon", calories: 208, protein: 20, carbs: 0, fats: 13, serving: "100g" },
        { name: "Almonds", calories: 164, protein: 6, carbs: 6, fats: 14, serving: "1 oz (28g)" },
        { name: "Greek Yogurt", calories: 100, protein: 10, carbs: 6, fats: 5, serving: "100g" },
        { name: "Avocado", calories: 160, protein: 2, carbs: 9, fats: 15, serving: "100g" },
        { name: "Brown Rice", calories: 112, protein: 2.6, carbs: 23, fats: 0.9, serving: "100g cooked" },
        { name: "Sweet Potato", calories: 86, protein: 1.6, carbs: 20, fats: 0.1, serving: "100g" },
        { name: "Spinach", calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, serving: "100g" },
        { name: "Oats", calories: 389, protein: 16.9, carbs: 66, fats: 6.9, serving: "100g dry" },
        { name: "Tuna", calories: 144, protein: 30, carbs: 0, fats: 0.8, serving: "100g" },
        { name: "Quinoa", calories: 120, protein: 4.4, carbs: 22, fats: 1.9, serving: "100g cooked" },
        { name: "Lentils", calories: 116, protein: 9, carbs: 20, fats: 0.4, serving: "100g cooked" },
        { name: "Cottage Cheese", calories: 98, protein: 11, carbs: 3.4, fats: 4.3, serving: "100g" },
        { name: "Turkey Breast", calories: 135, protein: 30, carbs: 0, fats: 1, serving: "100g" },
        { name: "Blueberries", calories: 57, protein: 0.7, carbs: 14, fats: 0.3, serving: "100g" },
      ]

      for (const food of sampleFoods) {
        await pool.query(
          "INSERT INTO foods (name, calories, protein, carbs, fats, serving) VALUES ($1, $2, $3, $4, $5, $6)",
          [food.name, food.calories, food.protein, food.carbs, food.fats, food.serving],
        )
      }
    }

    // Insert sample activities if table is empty
    const activityCount = await pool.query("SELECT COUNT(*) FROM activities")
    if (Number.parseInt(activityCount.rows[0].count) === 0) {
      const sampleActivities = [
        { name: "Running", calories_burned_per_hour: 600, category: "cardio" },
        { name: "Walking", calories_burned_per_hour: 300, category: "cardio" },
        { name: "Cycling", calories_burned_per_hour: 500, category: "cardio" },
        { name: "Swimming", calories_burned_per_hour: 550, category: "cardio" },
        { name: "Weight Training", calories_burned_per_hour: 400, category: "strength" },
        { name: "Yoga", calories_burned_per_hour: 200, category: "flexibility" },
        { name: "Pilates", calories_burned_per_hour: 250, category: "flexibility" },
        { name: "Dancing", calories_burned_per_hour: 450, category: "cardio" },
        { name: "Basketball", calories_burned_per_hour: 600, category: "sports" },
        { name: "Tennis", calories_burned_per_hour: 500, category: "sports" },
        { name: "Hiking", calories_burned_per_hour: 400, category: "cardio" },
        { name: "Rowing", calories_burned_per_hour: 600, category: "cardio" },
        { name: "Elliptical", calories_burned_per_hour: 500, category: "cardio" },
        { name: "Stair Climbing", calories_burned_per_hour: 600, category: "cardio" },
        { name: "Boxing", calories_burned_per_hour: 700, category: "strength" },
      ]

      for (const activity of sampleActivities) {
        await pool.query(
          "INSERT INTO activities (name, calories_burned_per_hour, category) VALUES ($1, $2, $3)",
          [activity.name, activity.calories_burned_per_hour, activity.category],
        )
      }
    }

    // Insert sample badges if table is empty
    const badgeCount = await pool.query("SELECT COUNT(*) FROM badges")
    if (Number.parseInt(badgeCount.rows[0].count) === 0) {
      const sampleBadges = [
        { name: "First Steps", description: "Complete your first workout", icon: "fas fa-shoe-prints", criteria_type: "total_workouts", criteria_value: 1 },
        { name: "Week Warrior", description: "Work out for 7 consecutive days", icon: "fas fa-calendar-week", criteria_type: "streak_days", criteria_value: 7 },
        { name: "Month Master", description: "Work out for 30 consecutive days", icon: "fas fa-calendar-alt", criteria_type: "streak_days", criteria_value: 30 },
        { name: "Century Club", description: "Complete 100 workouts", icon: "fas fa-trophy", criteria_type: "total_workouts", criteria_value: 100 },
        { name: "Calorie Counter", description: "Log food for 7 consecutive days", icon: "fas fa-utensils", criteria_type: "food_log_streak", criteria_value: 7 },
        { name: "Goal Getter", description: "Achieve your first goal", icon: "fas fa-bullseye", criteria_type: "goals_completed", criteria_value: 1 },
        { name: "Social Butterfly", description: "Share 5 public journal entries", icon: "fas fa-users", criteria_type: "public_entries", criteria_value: 5 },
        { name: "Nutrition Expert", description: "Log food for 30 consecutive days", icon: "fas fa-apple-alt", criteria_type: "food_log_streak", criteria_value: 30 },
      ]

      for (const badge of sampleBadges) {
        await pool.query(
          "INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES ($1, $2, $3, $4, $5)",
          [badge.name, badge.description, badge.icon, badge.criteria_type, badge.criteria_value],
        )
      }
    }

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
  }
}

// Add this helper function to check and award goal-related badges
async function checkAndAwardGoalBadges(userId, pool) {
  // Count completed goals for this user
  const completedGoalsResult = await pool.query(
    "SELECT COUNT(*) FROM user_goals WHERE user_id = $1 AND (is_completed = true OR (target_value IS NOT NULL AND current_value >= target_value))",
    [userId]
  );
  const completedGoals = parseInt(completedGoalsResult.rows[0].count);

  // Find all badges for goals_completed
  const goalBadgesResult = await pool.query(
    "SELECT * FROM badges WHERE criteria_type = 'goals_completed' AND criteria_value <= $1",
    [completedGoals]
  );
  const goalBadges = goalBadgesResult.rows;

  for (const badge of goalBadges) {
    // Check if user already has this badge
    const userBadgeResult = await pool.query(
      "SELECT 1 FROM user_badges WHERE user_id = $1 AND badge_id = $2",
      [userId, badge.id]
    );
    if (userBadgeResult.rows.length === 0) {
      // Award badge
      await pool.query(
        "INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)",
        [userId, badge.id]
      );
    }
  }
}

// Routes

// Auth Routes
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" })
    }

    // Check if user already exists
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User already exists with this email" })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const result = await pool.query("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, name", [
      email,
      hashedPassword,
    ])

    const user = result.rows[0]

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    res.status(201).json({
      message: "User created successfully",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const user = result.rows[0]

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/logout", (req, res) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  res.json({ message: "Logout successful" })
})

// Profile Routes
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, email, name, age, gender, height, weight, profile_public FROM users WHERE id = $1", [
      req.user.userId,
    ])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { name, age, gender, height, weight } = req.body
    if (!name || !age || !gender || !height || !weight) {
      return res.status(400).json({ error: "All profile fields are required" })
    }
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, age = $2, gender = $3, height = $4, weight = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING id, email, name, age, gender, height, weight, profile_public`,
      [name, age, gender, height, weight, req.user.userId],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error("Profile update error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Set profile public
app.put('/api/profile/public', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET profile_public = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, profile_public',
      [req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Set profile public error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add GET /api/profile for profile public check
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, age, gender, height, weight, profile_public FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Food Routes
app.get("/api/foods/search", async (req, res) => {
  try {
    const { q } = req.query
    let query = "SELECT * FROM foods"
    let params = []

    if (q && q.trim()) {
      query += " WHERE LOWER(name) LIKE LOWER($1)"
      params = [`%${q.trim()}%`]
    }

    query += " ORDER BY name LIMIT 50"

    const result = await pool.query(query, params)
    let foods = result.rows

    // If not enough local results, fetch from Open Food Facts
    if (foods.length < 10 && q && q.trim()) {
      const apiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20`;
      const apiRes = await fetch(apiUrl);
      const apiData = await apiRes.json();
      if (apiData.products) {
        const extFoods = apiData.products.map(p => ({
          name: p.product_name || p.generic_name || p.brands || "Unknown",
          calories: p.nutriments?.['energy-kcal_100g'] || null,
          protein: p.nutriments?.['proteins_100g'] || null,
          carbs: p.nutriments?.['carbohydrates_100g'] || null,
          fats: p.nutriments?.['fat_100g'] || null,
          serving: p.serving_size || "100g"
        })).filter(f => f.name && f.calories !== null)
        // Deduplicate by name
        const allFoods = [...foods, ...extFoods.filter(ef => !foods.some(lf => lf.name.toLowerCase() === ef.name.toLowerCase()))]
        return res.json(allFoods.slice(0, 50))
      }
    }
    res.json(foods)
  } catch (error) {
    console.error("Food search error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Food Log Routes
app.post("/api/food-log", authenticateToken, async (req, res) => {
  try {
    const { foodId, date } = req.body
    console.log('POST /api/food-log user:', req.user.userId, 'date:', date, 'foodId:', foodId)

    if (!foodId || !date) {
      return res.status(400).json({ error: "Food ID and date are required" })
    }

    // Verify food exists
    const foodResult = await pool.query("SELECT * FROM foods WHERE id = $1", [foodId])
    if (foodResult.rows.length === 0) {
      return res.status(404).json({ error: "Food not found" })
    }

    // Add to food log
    const result = await pool.query("INSERT INTO food_logs (user_id, food_id, date) VALUES ($1, $2, $3) RETURNING *", [
      req.user.userId,
      foodId,
      date,
    ])

    // Return the log entry with food details
    const logWithFood = await pool.query(
      `
      SELECT fl.*, f.name, f.calories, f.protein, f.carbs, f.fats, f.serving
      FROM food_logs fl
      JOIN foods f ON fl.food_id = f.id
      WHERE fl.id = $1
    `,
      [result.rows[0].id],
    )

    res.status(201).json(logWithFood.rows[0])
  } catch (error) {
    console.error("Food log creation error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/food-log", authenticateToken, async (req, res) => {
  try {
    const { date } = req.query
    console.log('GET /api/food-log user:', req.user.userId, 'date:', date)

    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" })
    }

    const result = await pool.query(
      `
      SELECT fl.id, fl.date, fl.logged_at, f.id as food_id, f.name, f.calories, f.protein, f.carbs, f.fats, f.serving
      FROM food_logs fl
      JOIN foods f ON fl.food_id = f.id
      WHERE fl.user_id = $1 AND fl.date = $2
      ORDER BY fl.logged_at DESC
    `,
      [req.user.userId, date],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Food log fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/food-log/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM food_logs WHERE id = $1 AND user_id = $2 RETURNING *", [
      id,
      req.user.userId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Food log entry not found" })
    }

    res.json({ message: "Food log entry deleted successfully" })
  } catch (error) {
    console.error("Food log deletion error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Activity Routes
app.get("/api/activities", async (req, res) => {
  try {
    const { category } = req.query
    let query = "SELECT * FROM activities"
    let params = []

    if (category && category.trim()) {
      query += " WHERE category = $1"
      params = [category.trim()]
    }

    query += " ORDER BY name"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Activities fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/activity-log", authenticateToken, async (req, res) => {
  try {
    const { activityId, durationMinutes, date, notes } = req.body

    if (!activityId || !durationMinutes || !date) {
      return res.status(400).json({ error: "Activity ID, duration, and date are required" })
    }

    console.log('Received activity log request:', { activityId, durationMinutes, date, notes })

    // Verify activity exists
    const activityResult = await pool.query("SELECT * FROM activities WHERE id = $1", [activityId])
    if (activityResult.rows.length === 0) {
      return res.status(404).json({ error: "Activity not found" })
    }

    // Use the date directly without timezone conversion to avoid off-by-one errors
    const formattedDate = date // Use the date as-is from the form
    console.log('Using date for storage:', formattedDate)

    // Add to activity log
    const result = await pool.query(
      "INSERT INTO activity_logs (user_id, activity_id, duration_minutes, date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.userId, activityId, durationMinutes, formattedDate, notes || null],
    )

    console.log('Activity log created:', result.rows[0])

    // Return the log entry with activity details
    const logWithActivity = await pool.query(
      `
      SELECT al.*, a.name, a.calories_burned_per_hour, a.category
      FROM activity_logs al
      JOIN activities a ON al.activity_id = a.id
      WHERE al.id = $1
    `,
      [result.rows[0].id],
    )

    res.status(201).json(logWithActivity.rows[0])
  } catch (error) {
    console.error("Activity log creation error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/activity-log", authenticateToken, async (req, res) => {
  try {
    const { date } = req.query
    const userId = req.user.userId

    let query = `
      SELECT al.*, a.id as activity_id, a.name, a.calories_burned_per_hour, a.category
      FROM activity_logs al
      JOIN activities a ON al.activity_id = a.id
      WHERE al.user_id = $1
    `
    let params = [userId]

    if (date) {
      query += " AND al.date = $2"
      params.push(date)
    }

    query += " ORDER BY al.logged_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Activity log fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete activity log endpoint
app.delete("/api/activity-log/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const result = await pool.query(
      "DELETE FROM activity_logs WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activity log not found" })
    }

    res.json({ message: "Activity log deleted successfully" })
  } catch (error) {
    console.error("Activity log deletion error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Activity calendar endpoint
app.get("/api/activity-calendar", authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query
    const userId = req.user.userId

    console.log(`Fetching calendar for user ${userId}, year ${year}, month ${month}`)

    const result = await pool.query(
      `
      SELECT DISTINCT al.date
      FROM activity_logs al
      WHERE al.user_id = $1 
      AND EXTRACT(YEAR FROM al.date) = $2 
      AND EXTRACT(MONTH FROM al.date) = $3
      ORDER BY al.date
    `,
      [userId, year, month],
    )

    // Return dates as YYYY-MM-DD strings (no timezone shift)
    const workoutDays = result.rows.map((row) => {
      if (row.date instanceof Date) {
        return row.date.toISOString().slice(0, 10);
      } else if (typeof row.date === 'string') {
        return row.date.slice(0, 10);
      } else {
        return String(row.date).slice(0, 10);
      }
    });
    console.log('Workout days found:', workoutDays)
    res.json(workoutDays)
  } catch (error) {
    console.error("Activity calendar fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Activity stats endpoint
app.get("/api/activity-stats", authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.query
    const userId = req.user.userId

    console.log(`Fetching stats for user ${userId}, year ${year}, month ${month}`)

    // First, let's check if there are any activity logs for this user
    const userLogsCheck = await pool.query(
      "SELECT COUNT(*) as total_logs FROM activity_logs WHERE user_id = $1",
      [userId]
    )
    console.log('Total logs for user:', userLogsCheck.rows[0].total_logs)

    // Get total calories burned, total minutes, and workout days for the month
    const statsResult = await pool.query(
      `
      SELECT 
        COALESCE(SUM((a.calories_burned_per_hour * al.duration_minutes) / 60), 0) as total_calories,
        COALESCE(SUM(al.duration_minutes), 0) as total_minutes,
        COALESCE(COUNT(DISTINCT al.date), 0) as workout_days
      FROM activity_logs al
      JOIN activities a ON al.activity_id = a.id
      WHERE al.user_id = $1 
      AND EXTRACT(YEAR FROM al.date) = $2 
      AND EXTRACT(MONTH FROM al.date) = $3
    `,
      [userId, year, month],
    )

    console.log('Stats result:', statsResult.rows[0])

    // Let's also check what dates are actually stored for this month
    const dateCheck = await pool.query(
      `
      SELECT al.date, a.name, al.duration_minutes, a.calories_burned_per_hour
      FROM activity_logs al
      JOIN activities a ON al.activity_id = a.id
      WHERE al.user_id = $1 
      AND EXTRACT(YEAR FROM al.date) = $2 
      AND EXTRACT(MONTH FROM al.date) = $3
      ORDER BY al.date
    `,
      [userId, year, month],
    )
    // Format dateCheck rows to always use YYYY-MM-DD
    const dateCheckRows = dateCheck.rows.map(row => ({
      ...row,
      date: (row.date instanceof Date) ? row.date.toISOString().slice(0, 10) : (typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date).slice(0, 10))
    }))
    console.log('Date check result:', dateCheckRows)

    // Remove streak calculation to avoid aggregate nesting error
    // If you want to add streaks, do it in a separate endpoint or with a different query

    const stats = {
      totalCalories: Math.round(parseFloat(statsResult.rows[0].total_calories) || 0),
      totalMinutes: parseInt(statsResult.rows[0].total_minutes) || 0,
      workoutDays: parseInt(statsResult.rows[0].workout_days) || 0
    }

    console.log('Final stats:', stats)
    res.json(stats)
  } catch (error) {
    console.error("Activity stats fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Goals Routes
app.get("/api/goals", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM user_goals WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.userId],
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Goals fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/goals", authenticateToken, async (req, res) => {
  try {
    const { goalType, goalName, targetValue, targetDate } = req.body

    if (!goalType || !goalName) {
      return res.status(400).json({ error: "Goal type and name are required" })
    }

    const result = await pool.query(
      "INSERT INTO user_goals (user_id, goal_type, goal_name, target_value, target_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.userId, goalType, goalName, targetValue || null, targetDate || null],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Goal creation error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/goals/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { currentValue, isCompleted } = req.body

    const result = await pool.query(
      "UPDATE user_goals SET current_value = $1, is_completed = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *",
      [currentValue || 0, isCompleted || false, id, req.user.userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" })
    }

    // Check and award goal-related badges
    await checkAndAwardGoalBadges(req.user.userId, pool);

    res.json(result.rows[0])
  } catch (error) {
    console.error("Goal update error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/goals/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM user_goals WHERE id = $1 AND user_id = $2 RETURNING *", [
      id,
      req.user.userId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Goal not found" })
    }

    res.json({ message: "Goal deleted successfully" })
  } catch (error) {
    console.error("Goal deletion error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Badges Routes
app.get("/api/badges", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT b.*, ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
      ORDER BY b.criteria_value ASC
    `,
      [req.user.userId],
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Badges fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Journal Routes
app.get("/api/journal", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.userId],
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Journal fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/journal", authenticateToken, async (req, res) => {
  try {
    const { title, content, entryType, isPublic } = req.body

    if (!title || !content || !entryType) {
      return res.status(400).json({ error: "Title, content, and entry type are required" })
    }

    const result = await pool.query(
      "INSERT INTO journal_entries (user_id, title, content, entry_type, is_public) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.user.userId, title, content, entryType, isPublic || false],
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error("Journal creation error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.put("/api/journal/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { title, content, entryType, isPublic } = req.body

    if (!title || !content || !entryType) {
      return res.status(400).json({ error: "Title, content, and entry type are required" })
    }

    const result = await pool.query(
      "UPDATE journal_entries SET title = $1, content = $2, entry_type = $3, is_public = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *",
      [title, content, entryType, isPublic || false, id, req.user.userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Journal entry not found" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Journal update error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/journal/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING *", [
      id,
      req.user.userId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Journal entry not found" })
    }

    res.json({ message: "Journal entry deleted successfully" })
  } catch (error) {
    console.error("Journal deletion error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Community Routes
app.get("/api/community", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT je.*, u.name as author_name
      FROM journal_entries je
      JOIN users u ON je.user_id = u.id
      WHERE je.is_public = true
      ORDER BY je.created_at DESC
      LIMIT 50
    `,
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Community fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/community/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params

    const result = await pool.query(
      `
      SELECT u.id, u.name, u.profile_public, u.created_at as joined_at,
             COUNT(DISTINCT je.id) as journal_entries,
             COUNT(DISTINCT al.id) as total_workouts
      FROM users u
      LEFT JOIN journal_entries je ON u.id = je.user_id AND je.is_public = true
      LEFT JOIN activity_logs al ON u.id = al.user_id
      WHERE u.id = $1 AND u.profile_public = true
      GROUP BY u.id, u.name, u.profile_public, u.created_at
    `,
      [userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found or profile not public" })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Community user fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Chatbot Routes
app.post("/api/chatbot", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: "Message is required" })
    }

    // Simple chatbot logic - in a real app, you'd integrate with an AI service
    let response = "I'm here to help with your nutrition and fitness questions! Ask me about meal recommendations, workout tips, or general health advice."

    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("meal") || lowerMessage.includes("food") || lowerMessage.includes("eat")) {
      response = "For healthy meals, I recommend focusing on lean proteins, whole grains, and plenty of vegetables. Some great options include grilled chicken with quinoa and steamed broccoli, or salmon with brown rice and asparagus. Would you like specific meal plans?"
    } else if (lowerMessage.includes("workout") || lowerMessage.includes("exercise") || lowerMessage.includes("fitness")) {
      response = "Great question! I recommend a mix of cardio and strength training. Try 30 minutes of cardio (running, cycling, or swimming) 3-4 times per week, plus 2-3 strength training sessions. Don't forget to include rest days for recovery!"
    } else if (lowerMessage.includes("calorie") || lowerMessage.includes("weight")) {
      response = "Calorie needs vary based on age, gender, activity level, and goals. Generally, aim for a balanced diet with moderate calorie deficit for weight loss, or maintenance calories to maintain weight. Track your food intake to stay on target!"
    } else if (lowerMessage.includes("protein") || lowerMessage.includes("carbs") || lowerMessage.includes("fat")) {
      response = "A balanced macronutrient ratio is typically 40% carbs, 30% protein, and 30% fat. Protein helps build muscle, carbs provide energy, and healthy fats support hormone production. Focus on whole food sources for all three!"
    }

    // Save conversation
    await pool.query(
      "INSERT INTO chatbot_conversations (user_id, message, response) VALUES ($1, $2, $3)",
      [req.user.userId, message, response],
    )

    res.json({ response })
  } catch (error) {
    console.error("Chatbot error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/chatbot/history", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM chatbot_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.user.userId],
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Chatbot history fetch error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Debug endpoint to check activity logs
app.get("/api/debug/activity-logs", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId
    
    const result = await pool.query(
      "SELECT al.*, a.name as activity_name FROM activity_logs al JOIN activities a ON al.activity_id = a.id WHERE al.user_id = $1 ORDER BY al.date DESC LIMIT 10",
      [userId]
    )
    
    res.json({
      userId,
      totalLogs: result.rows.length,
      logs: result.rows
    })
  } catch (error) {
    console.error("Debug activity logs error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Test endpoint to verify date handling
app.get("/api/test/date/:date", (req, res) => {
  try {
    const { date } = req.params
    const formattedDate = new Date(date + 'T00:00:00').toISOString().split('T')[0]
    
    res.json({
      originalDate: date,
      formattedDate: formattedDate,
      timestamp: new Date(date + 'T00:00:00').getTime(),
      isoString: new Date(date + 'T00:00:00').toISOString()
    })
  } catch (error) {
    console.error("Date test error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Serve frontend files
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: "Something went wrong!" })
})

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" })
})

// Serve frontend for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  await initDatabase()
})

module.exports = app
