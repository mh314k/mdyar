/** Keeps each filename on its own line so mixed LTR/RTL text does not reorder the prompt. */
export function closeUnsavedMessage(prompt: string, names: string[]): string {
  return `${prompt}\n\n${names.join("\n")}`;
}
