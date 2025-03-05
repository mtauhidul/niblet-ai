import { create } from "zustand";
import { persist } from "zustand/middleware";

// Define the types for the store
interface Goals {
  targetWeight: number | null;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
}

interface WeightLog {
  weight: number;
  date?: string;
}

interface Message {
  text: string;
  mealData?: { calories?: number };
}

interface StoreState {
  user: any | null;
  isAuthenticated: boolean;
  goals: Goals;
  threadId: string | null;
  assistantId: string | null;
  messages: Message[];
  isTyping: boolean;
  aiPersonality: "best-friend" | "professional-coach" | "tough-love";
  meals: Meal[];
  caloriesConsumed: number;
  caloriesRemaining: number;
  weightLogs: WeightLog[];
  currentScreen: "dashboard" | "settings";
  darkMode: boolean;

  // Actions
  setUser: (user: any) => void;
  logout: () => void;
  setThreadId: (threadId: string) => void;
  setAssistantId: (assistantId: string) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setIsTyping: (isTyping: boolean) => void;
  setAiPersonality: (
    aiPersonality: "best-friend" | "professional-coach" | "tough-love"
  ) => void;
  addMeal: (meal: Meal) => void;
  updateMeal: (id: string, updatedMeal: Partial<Meal>) => void;
  deleteMeal: (id: string) => void;
  clearMeals: () => void;
  addWeightLog: (weightLog: WeightLog) => void;
  updateGoals: (updatedGoals: Partial<Goals>) => void;
  setCurrentScreen: (screen: "dashboard" | "settings") => void;
  toggleDarkMode: () => void;
}

// Create Zustand store with TypeScript types
const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      goals: {
        targetWeight: null,
        targetCalories: 1800,
        targetProtein: 120,
        targetCarbs: 200,
        targetFat: 60,
      },
      threadId: null,
      assistantId: null,
      messages: [],
      isTyping: false,
      aiPersonality: "best-friend",
      meals: [],
      caloriesConsumed: 0,
      caloriesRemaining: 1800,
      weightLogs: [],
      currentScreen: "dashboard",
      darkMode: false,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
      setThreadId: (threadId) => set({ threadId }),
      setAssistantId: (assistantId) => set({ assistantId }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
          caloriesConsumed: message.mealData
            ? state.caloriesConsumed + (message.mealData.calories || 0)
            : state.caloriesConsumed,
          caloriesRemaining: message.mealData
            ? state.goals.targetCalories -
              (state.caloriesConsumed + (message.mealData.calories || 0))
            : state.caloriesRemaining,
        })),
      clearMessages: () => set({ messages: [] }),
      setIsTyping: (isTyping) => set({ isTyping }),
      setAiPersonality: (aiPersonality) => set({ aiPersonality }),

      addMeal: (meal) =>
        set((state) => {
          const newMeals = [...state.meals, meal];
          const totalCalories = newMeals.reduce(
            (sum, m) => sum + m.calories,
            0
          );
          return {
            meals: newMeals,
            caloriesConsumed: totalCalories,
            caloriesRemaining: state.goals.targetCalories - totalCalories,
          };
        }),
      updateMeal: (id, updatedMeal) =>
        set((state) => {
          const updatedMeals = state.meals.map((meal) =>
            meal.id === id ? { ...meal, ...updatedMeal } : meal
          );
          const totalCalories = updatedMeals.reduce(
            (sum, m) => sum + m.calories,
            0
          );
          return {
            meals: updatedMeals,
            caloriesConsumed: totalCalories,
            caloriesRemaining: state.goals.targetCalories - totalCalories,
          };
        }),
      deleteMeal: (id) =>
        set((state) => {
          const updatedMeals = state.meals.filter((meal) => meal.id !== id);
          const totalCalories = updatedMeals.reduce(
            (sum, m) => sum + m.calories,
            0
          );
          return {
            meals: updatedMeals,
            caloriesConsumed: totalCalories,
            caloriesRemaining: state.goals.targetCalories - totalCalories,
          };
        }),
      clearMeals: () =>
        set({
          meals: [],
          caloriesConsumed: 0,
          caloriesRemaining: get().goals.targetCalories,
        }),
      addWeightLog: (weightLog) =>
        set((state) => ({
          weightLogs: [
            ...state.weightLogs,
            { ...weightLog, date: weightLog.date || new Date().toISOString() },
          ],
        })),
      updateGoals: (updatedGoals) =>
        set((state) => {
          const newGoals = { ...state.goals, ...updatedGoals };
          return {
            goals: newGoals,
            caloriesRemaining: newGoals.targetCalories - state.caloriesConsumed,
          };
        }),
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "niblet-storage",
      partialize: (state) => ({
        user: state.user,
        goals: state.goals,
        meals: state.meals,
        weightLogs: state.weightLogs,
        darkMode: state.darkMode,
        aiPersonality: state.aiPersonality,
      }),
    }
  )
);

export default useStore;
