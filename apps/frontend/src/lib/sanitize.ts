export const sanitizeTextInput = (value: string) => value.replace(/[<>]/g, "").trim();

export const hasUnsupportedCharacters = (value: string) => /[<>]/.test(value);
