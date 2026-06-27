export interface Course {
  id: number
  user_id: number
  title: string
  topic: string
  description: string | null
  level: 'beginner' | 'intermediate' | 'advanced'
  status: 'active' | 'completed' | 'paused'
  daily_minutes: number
  total_days: number
  current_day: number
  created_at: string
}

export interface CourseCreate {
  topic: string
  title?: string
  description?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  daily_minutes?: number
  total_days?: number
}

export interface Lesson {
  id: number
  course_id: number
  day_number: number
  title: string
  content: string
  lesson_type: string
  concepts: string[]
  quiz_data: {
    questions: QuizQuestion[]
  }
  estimated_minutes: number
  difficulty: number
  created_at: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export interface QuizResult {
  score: number
  passed: boolean
  concepts_mastered: string[]
  concepts_failed: string[]
  feedback: string
}

export interface Streak {
  id: number
  user_id: number
  course_id: number
  current_streak: number
  longest_streak: number
  total_days_studied: number
  last_activity_date: string
}

export interface Game {
  id: number
  course_id: number
  lesson_id: number
  game_type: string
  title: string
  content: Record<string, unknown>
  difficulty: number
  created_at: string
}
