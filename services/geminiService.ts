import { GoogleGenAI, Type } from "@google/genai";
import { ICON_KEYS } from '../constants';
import type { MCQQuestion, DynamicPageLayout } from '../types';

// Assume process.env.API_KEY is configured in the environment
const getApiKey = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // In a real app, you might want to handle this more gracefully.
        // For this example, we'll throw an error if the key is missing.
        console.error("API_KEY environment variable not set.");
        return "MISSING_API_KEY";
    }
    return apiKey;
};

// Do not initialize here if key can change (e.g., Veo models)
// let ai = new GoogleGenAI({ apiKey: getApiKey() });


export const summarizeVideoWithAI = async (videoFile: File, prompt: string): Promise<string> => {
    console.log("summarizeVideoWithAI called with file:", videoFile.name, "and prompt:", prompt);
    // This is a placeholder. A real implementation would require a backend to process the video file
    // and then make a call to a multimodal Gemini model.
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });

        // The following is conceptual. Direct video file processing is not supported client-side this way.
        // You would typically extract frames and audio, send them to a server, and then to Gemini.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // A powerful model for complex tasks
            contents: `Summarize the key points of the video described as: ${prompt}. The video content is not available here, but act as if you have analyzed it.`,
        });
        
        return response.text;
    } catch (error) {
        console.error("Error summarizing video with AI:", error);
        return "Error: Could not summarize the video. This is a simulated response.";
    }
};

export const conductAIInterview = async (userResponse: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userResponse,
            config: {
                systemInstruction: "You are an expert interviewer for Loksewa exams in Nepal. Ask relevant questions and provide constructive feedback.",
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error with AI interview:", error);
        return "I'm sorry, I encountered an error. Let's try that again.";
    }
};

export const suggestIconForCategory = async (title: string): Promise<string> => {
    try {
        if (!title.trim()) {
            return ICON_KEYS[0]; // Return a default if title is empty
        }
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const validKeys = ICON_KEYS.join(', ');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `From the following list of available icon keys, choose the single best and most appropriate key for a category named "${title}". Respond with ONLY the icon key text, with no extra formatting, explanation, or punctuation.
            
            Available Keys: ${validKeys}`,
        });
        
        const suggestedKey = response.text.trim();

        // Validate the response
        if (ICON_KEYS.includes(suggestedKey)) {
            return suggestedKey;
        } else {
            console.warn(`Gemini suggested an invalid icon key: "${suggestedKey}". Falling back to default.`);
            return 'BookIcon'; // A safe default
        }

    } catch (error) {
        console.error("Error suggesting icon with AI:", error);
        return 'BookIcon'; // Return a default icon on error
    }
};

export const generateFeatureFromPrompt = async (
    prompt: string,
    type: 'upcoming' | 'additional'
): Promise<{ name: string; iconKey: string; path?: string }> => {
    try {
        if (!prompt.trim()) {
            throw new Error("Prompt cannot be empty.");
        }
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const validIconKeys = ICON_KEYS.join(', ');

        const baseSchema = {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: 'A short, catchy name for the feature. Max 3 words.',
                },
                iconKey: {
                    type: Type.STRING,
                    description: `The most suitable icon key from the provided list. Must be one of: ${validIconKeys}`,
                },
            },
            required: ['name', 'iconKey'],
        };
        
        const schema = type === 'additional' ? {
            ...baseSchema,
            properties: {
                ...baseSchema.properties,
                path: {
                    type: Type.STRING,
                    description: "A URL-friendly path for the feature, starting with a slash. e.g., /currency-converter",
                }
            },
            required: [...baseSchema.required, 'path']
        } : baseSchema;

        const systemInstruction = `You are an expert UI/UX designer creating features for a mobile app. Based on the user's prompt, generate a feature object in JSON format. The 'iconKey' MUST be one of the provided valid keys. The 'path' must be a simple, lowercase, hyphenated string starting with '/'.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a feature for an app based on this idea: "${prompt}".`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        const jsonString = response.text.trim();
        const generatedFeature = JSON.parse(jsonString);

        // Final validation
        if (!ICON_KEYS.includes(generatedFeature.iconKey)) {
             console.warn(`Gemini returned an invalid icon key: ${generatedFeature.iconKey}. Falling back to a default.`);
             generatedFeature.iconKey = 'SparklesIcon';
        }
        if (type === 'additional' && (!generatedFeature.path || !generatedFeature.path.startsWith('/'))) {
            console.warn(`Gemini returned an invalid path: ${generatedFeature.path}. Fixing it.`);
            generatedFeature.path = `/${generatedFeature.name.toLowerCase().replace(/\s+/g, '-')}`;
        }

        return generatedFeature;

    } catch (error) {
        console.error("Error generating feature with AI:", error);
        // Provide a fallback error object to avoid crashing the app
        throw new Error("The AI failed to generate a valid feature. Please try a different prompt.");
    }
};

export const generateQuizQuestionsFromTopic = async (
  topic: string,
  questionCount: number = 5
): Promise<Omit<MCQQuestion, 'id'>[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: 'The question text.' },
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of exactly 4 possible answers.' },
                    correctOptionIndex: { type: Type.INTEGER, description: 'The 0-based index of the correct answer in the options array.' },
                    explanation: { type: Type.STRING, description: 'A brief explanation for why the correct answer is correct.' }
                },
                required: ['question', 'options', 'correctOptionIndex']
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate ${questionCount} multiple-choice questions (MCQs) for a Loksewa exam based on the following topic. The questions should be relevant to the Nepali context if the topic is related to Nepal. Each question must have exactly 4 options.

            Topic: "${topic}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are an expert in creating high-quality multiple-choice questions for competitive exams in Nepal (Loksewa)."
            }
        });

        const jsonString = response.text.trim();
        const generatedQuestions = JSON.parse(jsonString);

        // Basic validation
        if (!Array.isArray(generatedQuestions)) {
            throw new Error("AI did not return a valid array of questions.");
        }
        
        return generatedQuestions.filter(q => 
            q.question && 
            Array.isArray(q.options) && 
            q.options.length === 4 && 
            typeof q.correctOptionIndex === 'number' &&
            q.correctOptionIndex >= 0 && q.correctOptionIndex < 4
        );

    } catch (error) {
        console.error("Error generating quiz questions with AI:", error);
        throw new Error("Failed to generate questions. The AI may be experiencing issues or the topic was too complex. Please try again with a more specific topic.");
    }
};

export const generateQuizDetailsFromTopic = async (
    topic: string,
    subCategoryName: string
): Promise<{ title: string; description:string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: `A concise and relevant quiz title for the topic, formatted like "${subCategoryName} - Set [Number]" or similar.` },
                description: { type: Type.STRING, description: 'A brief, one-sentence marketing-style description of what the quiz covers, to entice users.' }
            },
            required: ['title', 'description']
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a quiz title and a short, one-sentence description for a Loksewa exam quiz. The quiz is for the "${subCategoryName}" category and covers the topic: "${topic}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are an expert in creating content for competitive exams in Nepal (Loksewa)."
            }
        });

        const jsonString = response.text.trim();
        const generatedDetails = JSON.parse(jsonString);

        if (!generatedDetails.title || !generatedDetails.description) {
            throw new Error("AI did not return valid title and description.");
        }
        
        return generatedDetails;

    } catch (error) {
        console.error("Error generating quiz details with AI:", error);
        throw new Error("Failed to generate quiz details. The AI may be experiencing issues or the topic was too complex. Please try again with a more specific topic.");
    }
};

export const generatePageLayoutFromPrompt = async (prompt: string, imageBase64: string | null = null): Promise<DynamicPageLayout> => {
    try {
        if (!prompt.trim()) {
            throw new Error("Prompt cannot be empty.");
        }
        const ai = new GoogleGenAI({ apiKey: getApiKey() });

        const schema = {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    description: "An array of UI components that make up the page layout.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: {
                                type: Type.STRING,
                                description: "Component type. Must be: 'heading', 'paragraph', 'input', 'button', 'spacer'.",
                            },
                            props: {
                                type: Type.OBJECT,
                                properties: {
                                    content: {
                                        type: Type.STRING,
                                        description: "Text content for heading, paragraph, or button label.",
                                    },
                                    placeholder: {
                                        type: Type.STRING,
                                        description: "Placeholder text for an 'input' component.",
                                    },
                                    size: {
                                        type: Type.STRING,
                                        description: "Size for a 'spacer'. Can be 'small', 'medium', or 'large'.",
                                    },
                                    bindToState: {
                                        type: Type.STRING,
                                        description: "A unique key for an 'input' to bind its value to the page's state. e.g., 'userName', 'emailAddress'.",
                                    },
                                    onClickAction: {
                                        type: Type.STRING,
                                        description: "An action for a 'button'. Must be: 'alert' or 'reset'.",
                                    },
                                    actionPayload: {
                                        type: Type.STRING,
                                        description: "Payload for an action. For 'alert', this is the message. You can use state keys in curly braces, e.g., 'Welcome, {userName}!'",
                                    },
                                },
                            },
                        },
                        required: ['type', 'props'],
                    },
                },
            },
            required: ['items'],
        };
        
        const systemInstruction = `You are an expert UI/UX designer. Based on the user's prompt and optional image, generate a JSON object representing a simple, functional page layout. The layout should be an array of components. Only use the allowed component types and properties. Create interactive forms where appropriate.`;
        
        const contents = [];
        if (imageBase64) {
             contents.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                },
            });
        }
        contents.push({ text: `Generate a page layout based on this description: "${prompt}"` });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: contents },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonString = response.text.trim();
        const generatedLayout = JSON.parse(jsonString);

        if (!generatedLayout.items || !Array.isArray(generatedLayout.items)) {
            throw new Error("AI did not return a valid layout structure.");
        }

        return generatedLayout;

    } catch (error) {
        console.error("Error generating page layout with AI:", error);
        throw new Error("The AI failed to generate a valid page layout. Please try a different prompt.");
    }
};

export const generatePaymentNotificationMessage = async (
    status: 'approved' | 'rejected',
    userName: string,
    planName: string
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const prompt = status === 'approved' 
            ? `Generate a friendly and professional notification message in English for a user named "${userName}". Inform them that their payment for the "${planName}" subscription plan has been successfully approved and their subscription is now active. Mention they can now enjoy all premium features.`
            : `Generate a polite and clear notification message in English for a user named "${userName}". Inform them that their payment proof for the "${planName}" subscription plan has been rejected. Ask them to upload a clearer screenshot or contact support if they believe this is a mistake. Keep it concise.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a helpful assistant for an admin of an educational app called Loksewa Guru. You write clear and concise user notifications."
            }
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error generating notification message:", error);
        return status === 'approved' 
            ? `Dear ${userName},\n\nYour payment for the ${planName} plan has been approved. Your subscription is now active.`
            : `Dear ${userName},\n\nThere was an issue with your payment proof for the ${planName} plan. Please upload a new one or contact support.`;
    }
};

export const generateSubscriptionNotificationMessage = async (
    type: 'remaining' | 'finished',
    userName: string
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const prompt = type === 'remaining'
            ? `Generate a friendly but urgent notification in English for a user named "${userName}". Inform them their subscription is about to expire and advise them to renew by contacting support or via WhatsApp at 9810768297.`
            : `Generate a polite notification in English for a user named "${userName}". Inform them their subscription has expired. Encourage them to subscribe again for continued access and to contact support or WhatsApp at 9810768297 for a faster process.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a helpful assistant for an educational app. You write clear, concise user notifications about subscriptions. Include the WhatsApp number provided."
            }
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error generating subscription notification:", error);
        return type === 'remaining'
            ? `Dear ${userName}, your subscription is expiring soon. Please renew to continue enjoying our services. Contact us on WhatsApp: 9810768297.`
            : `Dear ${userName}, your subscription has expired. Please subscribe again. For help, contact us on WhatsApp: 9810768297.`;
    }
};

export const generateCustomNotificationMessage = async (
    topic: string,
    userName: string
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const prompt = `Generate a friendly and professional notification message in English for a user named "${userName}" about the following topic: "${topic}". Keep the message concise and clear.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a helpful assistant for an admin of an educational app called Loksewa Guru. You write clear and concise user notifications based on a given topic."
            }
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error generating custom notification message:", error);
        return `Dear ${userName},\n\nWe have an update regarding: ${topic}.\n\nPlease check the app for more details.`;
    }
};

export const generateSiteInfoFromUrl = async (
    url: string
): Promise<{ heading: string; description: string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Analyze the website at this URL: "${url}". Based on its content, generate a suitable heading and a short description for a link to this site. Respond with ONLY a single, valid JSON object with two keys: "heading" and "description". Do not include any other text, markdown formatting like \`\`\`json, or explanations. The description should be a single sentence, max 150 characters.`,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "You are an expert digital marketer. Your goal is to create compelling, short-form copy for website links, returned as a clean JSON object."
            }
        });

        let jsonString = response.text.trim();
        
        // Clean the response to ensure it's valid JSON
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        } else {
            throw new Error("AI did not return a valid JSON object.");
        }

        const generatedDetails = JSON.parse(jsonString);

        if (!generatedDetails.heading || !generatedDetails.description) {
            throw new Error("AI did not return valid heading and description keys in the JSON object.");
        }

        return generatedDetails;

    } catch (error) {
        console.error("Error generating site info with AI:", error);
        throw new Error("Failed to generate site details from the URL. Please check the link or try again.");
    }
};

export const generateTeamMemberDescription = async (
    name: string,
    position: string
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const prompt = `Generate a short, professional, one-sentence description for a team member named "${name}" whose position is "${position}" at an educational app called "Loksewa Guru". The description should be inspiring and suitable for an 'Our Team' section of the app.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a creative copywriter for a tech company. You write concise and engaging team member bios."
            }
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error generating team member description:", error);
        throw new Error("Failed to generate description with AI. Please try again.");
    }
};

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove the data URI prefix
    };
    reader.onerror = error => reject(error);
});

export const generateWelcomeSliderDescription = async (imageUrl: string): Promise<string> => {
    try {
        if (!imageUrl || !imageUrl.trim()) {
            throw new Error("Image URL is empty.");
        }
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}. Check the URL and CORS policy.`);
        }
        
        const blob = await response.blob();
        const base64Data = await blobToBase64(blob);
        const mimeType = blob.type;

        if (!mimeType.startsWith('image/')) {
            throw new Error("The provided URL does not point to a valid image.");
        }

        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        
        const imagePart = {
            inlineData: {
                mimeType,
                data: base64Data,
            },
        };

        const textPart = {
            text: "Analyze this image. Write a short, inspiring description (max 15 words) for a welcome screen slider in an educational app called 'Loksewa Guru'. The description should be catchy and highlight a key benefit related to the image."
        };

        const genAIResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return genAIResponse.text.trim().replace(/"/g, '');

    } catch (error) {
        console.error("Error generating welcome slider description:", error);
        throw new Error("Failed to generate description from image. Please check the image URL or try again.");
    }
};

export const generateAppNotificationFromTopic = async (topic: string): Promise<{ title: string, message: string }> => {
    try {
        const ai = new GoogleGenAI({ apiKey: getApiKey() });
        const schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "A concise, attention-grabbing title for the notification." },
                message: { type: Type.STRING, description: "The full message body, including greetings and closing remarks." }
            },
            required: ['title', 'message']
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a notification based on this topic: "${topic}"`,
            config: {
                systemInstruction: "You are an assistant for an educational app called 'Loksewa Guru'. Your task is to write a friendly and informative notification for our users. You must strictly return a JSON object with 'title' and 'message' keys. The message should start with a warm greeting like 'Dear Loksewa Guru User,' and end with a positive closing like 'Happy learning!, The Loksewa Guru Team'.",
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        if (!result.title || !result.message) {
            throw new Error("AI did not return a valid title and message.");
        }

        return result;
    } catch (error) {
        console.error("Error generating app notification:", error);
        throw new Error("Failed to generate notification with AI. Please check the topic or try again.");
    }
};