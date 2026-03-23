// AI Learning Assistant - Quiz & Chat Support
import { Anthropic } from "@anthropic-ai/sdk";

export interface QuizHint {
  hint: string;
  explanation: string;
  resources: string[];
}

export interface LearningFeedback {
  isCorrect: boolean;
  explanation: string;
  nextSteps: string[];
  relatedTopics: string[];
}

export class AILearningAssistant {
  private client: Anthropic;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private maxTokens = 1024;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Provide hints for incorrect quiz answers
   */
  async provideQuizHint(
    question: string,
    userAnswer: string,
    correctAnswer: string,
    questionType: string
  ): Promise<QuizHint> {
    const prompt = `
You are an educational AI assistant. A student answered a quiz question incorrectly.

Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Question Type: ${questionType}

Provide:
1. A helpful hint (without giving away the answer)
2. A clear explanation of why the correct answer is right
3. Related learning resources or topics they should review

Format your response as JSON with keys: hint, explanation, resources (array)
`;

    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: this.maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    try {
      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        hint: parsedResponse.hint || "Try reviewing the fundamentals of this topic.",
        explanation:
          parsedResponse.explanation || "The correct answer demonstrates key concepts.",
        resources: parsedResponse.resources || [],
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        hint: "Review the course materials related to this topic.",
        explanation: "Please study the correct answer and related concepts.",
        resources: [],
      };
    }
  }

  /**
   * Provide feedback on quiz performance
   */
  async provideFeedback(quizData: {
    quizTitle: string;
    userScore: number;
    totalScore: number;
    correctAnswers: number;
    totalQuestions: number;
    weakAreas: string[];
  }): Promise<LearningFeedback> {
    const scorePercentage = (quizData.userScore / quizData.totalScore) * 100;

    const prompt = `
Provide encouragement and learning guidance for a student who completed a quiz.

Quiz: ${quizData.quizTitle}
Score: ${quizData.userScore}/${quizData.totalScore} (${scorePercentage.toFixed(1)}%)
Correct Answers: ${quizData.correctAnswers}/${quizData.totalQuestions}
Weak Areas: ${quizData.weakAreas.join(", ")}

Provide:
1. Whether they passed (50%+), and encouraging feedback
2. Clear explanation of their performance
3. Specific next steps for improvement
4. Related topics they should explore

Format as JSON with keys: isCorrect (boolean for pass/fail), explanation, nextSteps (array), relatedTopics (array)
`;

    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: this.maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    try {
      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        isCorrect: scorePercentage >= 50,
        explanation:
          parsedResponse.explanation || `You scored ${scorePercentage.toFixed(1)}%.`,
        nextSteps: parsedResponse.nextSteps || ["Review weak areas", "Practice more questions"],
        relatedTopics: parsedResponse.relatedTopics || [],
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        isCorrect: scorePercentage >= 50,
        explanation: `You scored ${scorePercentage.toFixed(1)}%. Keep practicing!`,
        nextSteps: ["Review weak areas", "Practice more questions"],
        relatedTopics: [],
      };
    }
  }

  /**
   * Summarize class/chat conversations
   */
  async summarizeConversation(messages: Array<{ user: string; content: string }>): Promise<string> {
    const conversationText = messages
      .map((m) => `${m.user}: ${m.content}`)
      .join("\n");

    const prompt = `
Summarize the following class discussion or chat conversation in 2-3 key points:

${conversationText}

Provide a concise summary highlighting:
1. Main topics discussed
2. Key questions asked
3. Conclusions or next steps
`;

    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: this.maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.content[0].type === "text"
      ? response.content[0].text
      : "Unable to summarize conversation";
  }

  /**
   * Answer subject-specific questions in class context
   */
  async answerClassQuestion(
    question: string,
    classSubject: string,
    context: string = ""
  ): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: question,
    });

    const systemPrompt = `You are an expert tutor in ${classSubject}. 
${context ? `Additional context: ${context}` : ""}
Provide clear, educational answers appropriate for a learning platform.
Keep responses concise and engaging.`;

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      });

      const assistantResponse =
        response.content[0].type === "text" ? response.content[0].text : "";

      this.conversationHistory.push({
        role: "assistant",
        content: assistantResponse,
      });

      // Keep conversation history manageable
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return assistantResponse;
    } catch (error) {
      console.error("Error getting AI response:", error);
      return "I'm unable to answer that question right now. Please try again.";
    }
  }

  /**
   * Moderate content based on platform guidelines
   */
  async moderateContent(content: string, context: "chat" | "post" | "comment"): Promise<{
    approved: boolean;
    reason?: string;
    suggestedAction: "allow" | "warn" | "block" | "review";
  }> {
    const prompt = `
Review this ${context} content for the platform guidelines. Check for:
- Inappropriate language or hate speech
- Harassment or bullying
- Misinformation or spam
- Adult content
- Harm or violence

Content: "${content}"

Respond with JSON: { approved: boolean, reason: string (if not approved), suggestedAction: "allow"|"warn"|"block"|"review" }
`;

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        approved: parsed.approved !== false,
        reason: parsed.reason,
        suggestedAction: parsed.suggestedAction || "allow",
      };
    } catch (error) {
      console.error("Error moderating content:", error);
      return { approved: true, suggestedAction: "review" };
    }
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }
}

export default AILearningAssistant;
