from typing import TypedDict, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import get_settings
from app.langgraph_agents.state import LearningState

settings = get_settings()

# Initialize Gemini
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=settings.gemini_api_key,
    temperature=0.7,
)


def should_create_game(state: LearningState) -> str:
    """Decide if we need to create a game based on failed concepts."""
    if state.get("concepts_failed") and len(state["concepts_failed"]) > 0:
        return "create_game"
    return "no_game"


def should_review(state: LearningState) -> str:
    """Decide if we need to review before advancing."""
    if state.get("quiz_passed") is False:
        return "review"
    return "advance"


class LearningAgent:
    """LangGraph agent for adaptive learning."""

    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the learning agent graph."""
        workflow = StateGraph(LearningState)

        # Add nodes
        workflow.add_node("analyze_progress", self.analyze_progress)
        workflow.add_node("generate_lesson", self.generate_lesson)
        workflow.add_node("evaluate_knowledge", self.evaluate_knowledge)
        workflow.add_node("create_game", self.create_game)
        workflow.add_node("review_concepts", self.review_concepts)
        workflow.add_node("advance_difficulty", self.advance_difficulty)

        # Set entry point
        workflow.set_entry_point("analyze_progress")

        # Add edges
        workflow.add_edge("analyze_progress", "generate_lesson")
        workflow.add_edge("generate_lesson", "evaluate_knowledge")

        # Conditional edges after evaluation
        workflow.add_conditional_edges(
            "evaluate_knowledge",
            should_review,
            {
                "review": "review_concepts",
                "advance": "advance_difficulty",
            },
        )

        # Conditional edges after review
        workflow.add_conditional_edges(
            "analyze_progress",
            should_create_game,
            {
                "create_game": "create_game",
                "no_game": "generate_lesson",
            },
        )

        # End edges
        workflow.add_edge("create_game", END)
        workflow.add_edge("review_concepts", END)
        workflow.add_edge("advance_difficulty", END)

        return workflow.compile()

    async def analyze_progress(self, state: LearningState) -> Dict[str, Any]:
        """Analyze user's progress and determine what to teach next."""
        prompt = f"""
        Analiza el progreso del estudiante en el tema: {state['topic']}
        
        Nivel: {state['level']}
        Día actual: {state['current_day']}
        Conceptos dominados: {state.get('concepts_mastered', [])}
        Conceptos fallidos: {state.get('concepts_failed', [])}
        
        Determina:
        1. ¿Qué concepto enseñar hoy?
        2. ¿Necesita repasar conceptos fallidos?
        3. ¿Qué dificultad debe tener la lección?
        
        Responde en JSON con:
        {{
            "next_concept": "nombre del concepto",
            "needs_review": true/false,
            "difficulty": 0.0-1.0,
            "reasoning": "explicación breve"
        }}
        """
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        # Parse response (simplified for demo)
        return {
            "lesson_concepts": [state.get("topic", "general")],
            "difficulty_adjustment": 0.0,
            "next_action": "generate_lesson",
        }

    async def generate_lesson(self, state: LearningState) -> Dict[str, Any]:
        """Generate a lesson based on the topic and level."""
        concepts_to_teach = state.get("lesson_concepts", [state["topic"]])
        
        prompt = f"""
        Genera una lección para aprender: {state['topic']}
        
        Conceptos a enseñar hoy: {concepts_to_teach}
        Nivel: {state['level']}
        Tiempo disponible: {state['daily_minutes']} minutos
        
        La lección debe incluir:
        1. Explicación clara y concisa
        2. Ejemplos prácticos
        3. Código de ejemplo (si aplica)
        4. Tips útiles
        
        Formato: Markdown estructurado
        """
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        # Generate quiz questions
        quiz_prompt = f"""
        Crea 5 preguntas de opción múltiple para evaluar: {concepts_to_teach}
        
        Formato JSON:
        {{
            "questions": [
                {{
                    "question": "pregunta",
                    "options": ["opción1", "opción2", "opción3", "opción4"],
                    "correct_answer": 0,
                    "explanation": "explicación"
                }}
            ]
        }}
        """
        
        quiz_response = await llm.ainvoke([HumanMessage(content=quiz_prompt)])
        
        return {
            "lesson_content": response.content,
            "quiz_data": {"questions": []},  # Would parse quiz_response
            "next_action": "evaluate",
        }

    async def evaluate_knowledge(self, state: LearningState) -> Dict[str, Any]:
        """Evaluate the user's knowledge after the lesson."""
        # This would be called after user submits quiz
        # For now, return placeholder
        return {
            "quiz_score": 0.0,
            "quiz_passed": False,
            "concepts_mastered": [],
            "concepts_failed": state.get("lesson_concepts", []),
            "next_action": "review",
        }

    async def create_game(self, state: LearningState) -> Dict[str, Any]:
        """Create a game to reinforce failed concepts."""
        failed_concepts = state.get("concepts_failed", [])
        
        prompt = f"""
        Crea un juego interactivo para reforzar estos conceptos: {failed_concepts}
        
        Opciones de juegos:
        1. Memoria (encontrar pares)
        2. Completar la palabra/frase
        3. Trivia con opciones múltiples
        4. Ordenar pasos de un proceso
        
        Elige el mejor tipo de juego y genera los datos en JSON:
        {{
            "game_type": "memory|fill_blank|trivia|order_steps",
            "title": "título del juego",
            "game_data": {{...datos específicos del juego}},
            "concepts": ["conceptos reforzados"]
        }}
        """
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            "needs_game": True,
            "game_type": "trivia",
            "game_data": {},
            "next_action": "create_game",
        }

    async def review_concepts(self, state: LearningState) -> Dict[str, Any]:
        """Review concepts that were failed."""
        failed = state.get("concepts_failed", [])
        
        prompt = f"""
        Genera un repaso breve para estos conceptos que el estudiante falló: {failed}
        
        Incluye:
        1. Explicación simplificada
        2. Ejemplo práctico
        3. Tip para recordar
        """
        
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        
        return {
            "lesson_content": response.content,
            "next_action": "review_complete",
        }

    async def advance_difficulty(self, state: LearningState) -> Dict[str, Any]:
        """Advance to next difficulty level if mastered."""
        return {
            "current_day": state["current_day"] + 1,
            "concepts_mastered": state.get("concepts_mastered", []),
            "next_action": "next_day",
        }

    async def run(self, initial_state: LearningState) -> LearningState:
        """Run the learning agent with the given state."""
        result = await self.graph.ainvoke(initial_state)
        return result
