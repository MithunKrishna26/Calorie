-- CalorieFit Database Schema (Enhanced)

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    age INTEGER,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    height DECIMAL(5,2), -- in cm
    weight DECIMAL(5,2), -- in kg
    bmi DECIMAL(5,2), -- optional: calculated using weight / (height/100)^2
    bmr DECIMAL(6,2), -- optional: Basal Metabolic Rate
    activity_level VARCHAR(50), -- optional: sedentary, light, moderate, active, very active
    profile_public BOOLEAN DEFAULT false, -- for community features
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foods table
CREATE TABLE foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    calories INTEGER NOT NULL,
    protein DECIMAL(5,2) NOT NULL, -- in grams
    carbs DECIMAL(5,2) NOT NULL,   -- in grams
    fats DECIMAL(5,2) NOT NULL,    -- in grams
    serving VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food logs table
CREATE TABLE food_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES foods(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity tracker table
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    calories_burned_per_hour INTEGER NOT NULL,
    category VARCHAR(100) NOT NULL, -- cardio, strength, flexibility, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activity logs
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals table (optional reference table)
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    goal_type VARCHAR(50) UNIQUE NOT NULL -- e.g., 'lose weight', 'maintain weight', 'gain weight'
);

-- User goals (per-user goal setting)
CREATE TABLE user_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(100) NOT NULL, -- max_calories, workout_streak, weight_target, etc.
    goal_name VARCHAR(255) NOT NULL,
    target_value DECIMAL(10,2),
    target_date DATE,
    current_value DECIMAL(10,2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievement badges
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    criteria_type VARCHAR(100) NOT NULL, -- streak_days, total_workouts, etc.
    criteria_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User badges
CREATE TABLE user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

-- Journal entries
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    entry_type VARCHAR(50) NOT NULL, -- meal_plan, workout_plan, general
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot conversations
CREATE TABLE chatbot_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, date);
CREATE INDEX idx_foods_name ON foods(name);
CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, date);
CREATE INDEX idx_user_goals_user ON user_goals(user_id);
CREATE INDEX idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_public ON journal_entries(is_public) WHERE is_public = true;

-- Sample food data
INSERT INTO foods (name, calories, protein, carbs, fats, serving) VALUES
('Apple', 95, 0.5, 25, 0.3, '1 medium (182g)'),
('Banana', 105, 1.3, 27, 0.4, '1 medium (118g)'),
('Chicken Breast', 165, 31, 0, 3.6, '100g'),
('White Rice', 130, 2.7, 28, 0.3, '100g cooked'),
('Broccoli', 55, 3.7, 11, 0.6, '100g'),
('Egg', 68, 5.5, 0.5, 4.8, '1 large (50g)'),
('Salmon', 208, 20, 0, 13, '100g'),
('Almonds', 164, 6, 6, 14, '1 oz (28g)'),
('Greek Yogurt', 100, 10, 6, 5, '100g'),
('Avocado', 160, 2, 9, 15, '100g'),
('Brown Rice', 112, 2.6, 23, 0.9, '100g cooked'),
('Sweet Potato', 86, 1.6, 20, 0.1, '100g'),
('Spinach', 23, 2.9, 3.6, 0.4, '100g'),
('Oats', 389, 16.9, 66, 6.9, '100g dry'),
('Tuna', 144, 30, 0, 0.8, '100g'),
('Quinoa', 120, 4.4, 22, 1.9, '100g cooked'),
('Lentils', 116, 9, 20, 0.4, '100g cooked'),
('Cottage Cheese', 98, 11, 3.4, 4.3, '100g'),
('Turkey Breast', 135, 30, 0, 1, '100g'),
('Blueberries', 57, 0.7, 14, 0.3, '100g');

-- Sample activities
INSERT INTO activities (name, calories_burned_per_hour, category) VALUES
('Running', 600, 'cardio'),
('Walking', 300, 'cardio'),
('Cycling', 500, 'cardio'),
('Swimming', 550, 'cardio'),
('Weight Training', 400, 'strength'),
('Yoga', 200, 'flexibility'),
('Pilates', 250, 'flexibility'),
('Dancing', 450, 'cardio'),
('Basketball', 600, 'sports'),
('Tennis', 500, 'sports'),
('Hiking', 400, 'cardio'),
('Rowing', 600, 'cardio'),
('Elliptical', 500, 'cardio'),
('Stair Climbing', 600, 'cardio'),
('Boxing', 700, 'strength');

-- Sample goal types
INSERT INTO goals (goal_type) VALUES ('lose weight'), ('maintain weight'), ('gain weight');

-- Sample badges
INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES
('First Steps', 'Complete your first workout', 'fas fa-shoe-prints', 'total_workouts', 1),
('Week Warrior', 'Work out for 7 consecutive days', 'fas fa-calendar-week', 'streak_days', 7),
('Month Master', 'Work out for 30 consecutive days', 'fas fa-calendar-alt', 'streak_days', 30),
('Century Club', 'Complete 100 workouts', 'fas fa-trophy', 'total_workouts', 100),
('Calorie Counter', 'Log food for 7 consecutive days', 'fas fa-utensils', 'food_log_streak', 7),
('Goal Getter', 'Achieve your first goal', 'fas fa-bullseye', 'goals_completed', 1),
('Social Butterfly', 'Share 5 public journal entries', 'fas fa-users', 'public_entries', 5),
('Nutrition Expert', 'Log food for 30 consecutive days', 'fas fa-apple-alt', 'food_log_streak', 30);
