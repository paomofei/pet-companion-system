export const sanitizeTextInput = (value: string) => value.replace(/[<>]/g, "").trim();
