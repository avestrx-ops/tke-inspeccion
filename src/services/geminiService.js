import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Actúas como un inspector técnico de ascensores experto.
Tu tarea es analizar 6 imágenes proporcionadas por un técnico y extraer la información para rellenar la "Ficha de Inspección TKE".

Debes identificar el estado y las características del ascensor basándote en lo visual. 
Genera un JSON con los campos que probablemente correspondan al formulario oficial.

Campos clave a buscar/inferir visualmente:
- Datos generales (si hay placa visible): N.º Aparato, Carga (kg), personas, velocidad.
- Cabina: Estado de botonera, luz de emergencia, espejo, suelo, techo.
- Hueco: Guías, cables, contrapeso, limitador.
- Foso: Polea tensora, limpieza, amortiguadores.
- Cuarto de máquinas: Máquina tractora, cuadro de maniobra, cables.
- Puertas: Estado de hojas, cerraduras, pisaderas.

Salida JSON esperada:
{
  "general": {
    "num_aparato": "string o null", 
    "carga_kg": "string o null",
    "personas": "string o null",
    "velocidad": "string o null"
  },
  "items": [
    { "id": "cabina_luz", "estado": "OK/DEFECTO/NA", "observaciones": "string" },
    { "id": "cabina_suelo", "estado": "OK/DEFECTO/NA", "observaciones": "string" },
    { "id": "puertas_pisadera", "estado": "OK/DEFECTO/NA", "observaciones": "string" },
    ... (añade cuantos detectes relevantes)
  ],
  "summary": "Resumen breve del estado general basado en las fotos"
}

Sé conservador infiriendo datos numéricos. Si no se ve claro, pon null.
En estado, usa "OK" si parece correcto, "DEFECTO" si hay daño visible.
`;

export async function analyzeImagesWithGemini(apiKey, files) {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Convert all files to base64 parts
        const imageParts = await Promise.all(
            files.map(file => fileToGenerativePart(file))
        );

        const result = await model.generateContent([
            SYSTEM_PROMPT,
            ...imageParts.map(part => ({
                inlineData: {
                    data: part.data,
                    mimeType: part.mimeType
                }
            }))
        ]);

        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { raw_text: text, error: "No JSON found" };
        } catch (e) {
            console.warn("Could not parse JSON", e);
            return { raw_text: text, error: "JSON Parse Error" };
        }

    } catch (error) {
        console.error("Error analyzing images:", error);
        throw error;
    }
}

async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve({
                data: base64String,
                mimeType: file.type
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
