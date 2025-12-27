
import { GoogleGenAI, Type } from "@google/genai";

// Guideline: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Guideline: Use process.env.API_KEY directly when initializing the @google/genai client instance.

export const generateWorkoutPlan = async (studentInfo: string, muscleGroup?: string) => {
  // Correctly initialized using a named parameter and direct process.env reference
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const focusPrompt = muscleGroup ? ` focado especificamente em ${muscleGroup}` : "";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um Personal Trainer especialista em hipertrofia. 
      Com base nas informações do aluno: ${studentInfo}, sugira uma lista de 6 exercícios para um treino${focusPrompt}. 
      Certifique-se de que TODOS os exercícios sejam relacionados a ${muscleGroup || 'objetivo do aluno'}.
      Retorne estritamente um array JSON de objetos conforme o esquema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              sets: { type: Type.NUMBER },
              reps: { type: Type.STRING },
              rest: { type: Type.NUMBER }
            },
            required: ["name", "category", "sets", "reps", "rest"]
          }
        }
      }
    });

    // response.text is a property, not a method
    return JSON.parse(response.text || "[]");
  } catch (err: any) {
    console.error("Erro Gemini:", err);
    throw err;
  }
};

export const generateMealPlan = async (studentInfo: string) => {
  // Correctly initialized using a named parameter and direct process.env reference
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Com base no aluno: ${studentInfo}, sugira uma meta calórica e divisão de macros (Proteína, Carbo, Gordura) para um dia.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER }
          },
          required: ["calories", "protein", "carbs", "fat"]
        }
      }
    });
    // response.text is a property, not a method
    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("Erro Dieta Gemini:", err);
    throw err;
  }
};
