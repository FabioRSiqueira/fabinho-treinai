
import { GoogleGenAI, Type } from "@google/genai";

export const generateWorkoutPlan = async (studentInfo: string, muscleGroup?: string) => {
  // Inicialização padrão utilizando a variável de ambiente injetada
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

    // Acessa a propriedade .text diretamente (sem parênteses)
    const text = response.text;
    if (!text) {
      throw new Error("O modelo Gemini retornou uma resposta vazia.");
    }

    return JSON.parse(text);
  } catch (err: any) {
    console.error("Erro detalhado na chamada do Gemini:", err);
    throw err;
  }
};

export const generateMealPlan = async (studentInfo: string) => {
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
    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("Erro na geração de dieta Gemini:", err);
    throw err;
  }
};
