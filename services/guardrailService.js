import AppError from '../utils/error.js';

class GuardrailService {
    constructor() {
        // Patterns that suggest prompt injection attempts
        this.INJECTION_PATTERNS = [
            /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
            /you\s+are\s+now\s+(a|an|in)\s+/i,
            /system\s*prompt/i,
            /reveal\s+(your|the)\s+(instructions|prompt|rules)/i,
            /pretend\s+(you|to\s+be)/i,
            /act\s+as\s+(if|a)/i,
            /forget\s+(everything|all|your)/i,
            /override\s+(your|the|all)/i,
            /jailbreak/i,
            /DAN\s+mode/i,
        ];

        // Topics that should be refused (customize per use case)
        this.BLOCKED_TOPICS = [];
    }

    /**
     * Validate user input before processing.
     * Returns { safe: boolean, reason?: string }
     */
    validateInput = async (message) => {
        // Check 1: Prompt injection patterns
        for (const pattern of this.INJECTION_PATTERNS) {
            if (pattern.test(message)) {
                return {
                    safe: false,
                    reason: 'I can only help with questions related to your knowledge base. Could you rephrase your question?',
                };
            }
        }

        // Check 2: Message length (extremely long messages can be attacks)
        if (message.length > 10000) {
            return {
                safe: false,
                reason: 'Your message is too long. Please keep it under 10,000 characters.',
            };
        }

        // Check 3: Empty or whitespace-only messages
        if (!message.trim()) {
            return {
                safe: false,
                reason: 'Please enter a message.',
            };
        }

        return { safe: true };
    };

    /**
     * Sanitize text extracted from user-uploaded documents.
     * Strips hidden instructions that could cause indirect injection.
     */
    sanitizeDocumentText = (text) => {
        let sanitized = text;

        // Remove text that looks like system instructions hidden in documents
        sanitized = sanitized.replace(
            /\[SYSTEM\].*?\[\/SYSTEM\]/gs, ''
        );
        sanitized = sanitized.replace(
            /<!-- ?(ignore|forget|override|system).*?-->/gs, ''
        );

        // Remove zero-width characters (can be used to hide instructions)
        sanitized = sanitized.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

        return sanitized;
    };

    /**
     * Validate LLM output before sending to user.
     * Catches cases where the model reveals system prompt or behaves unexpectedly.
     */
    validateOutput = (response) => {
        const leakPatterns = [
            /CRITICAL RULES:/i,
            /ONLY answer based on/i,
            /you are a helpful assistant that/i,
        ];

        for (const pattern of leakPatterns) {
            if (pattern.test(response)) {
                return {
                    safe: false,
                    reason: 'Response filtered for safety.',
                    filteredResponse: "I'm here to help with questions about your knowledge base. What would you like to know?",
                };
            }
        }

        return { safe: true };
    };
}

export default new GuardrailService();
