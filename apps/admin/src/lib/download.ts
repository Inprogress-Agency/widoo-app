/** Hands a text to the browser as a file to save. */
export function downloadTextFile(fileName: string, text: string, type: string): void {
  const address = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = address;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(address);
}
