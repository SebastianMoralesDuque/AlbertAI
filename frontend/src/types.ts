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

export interface QuestionResult {
  question_index: number
  question: string
  selected_answer: number
  correct_answer: number
  is_correct: boolean
  explanation: string
}

export interface QuizResult {
  score: number
  passed: boolean
  attempts: number
  best_score: number
  concepts_mastered: string[]
  concepts_failed: string[]
  feedback: string
  question_results: QuestionResult[]
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

export interface LessonProgress {
  lesson_id: number
  day_number: number
  title: string
  quiz_passed: boolean
  best_score: number
  attempts: number
}

export interface LearningProfileLesson {
  lesson_id: number
  day_number: number
  title: string
  lesson_type: string
  quiz_passed: boolean
  best_score: number
  attempts: number
}

export interface ConceptDetail {
  name: string
  times_mastered: number
  times_failed: number
  mastery_rate: number
}

export interface LearningProfile {
  course_id: number
  course_title: string
  course_topic: string
  course_level: string
  current_day: number
  total_days: number
  current_streak: number
  longest_streak: number
  total_days_studied: number
  mastered_concepts: string[]
  failed_concepts: string[]
  weak_areas: string[]
  recent_scores: number[]
  total_quiz_attempts: number
  best_overall_score: number
  last_quiz_score: number
  concept_details: ConceptDetail[]
  lessons: LearningProfileLesson[]
}
