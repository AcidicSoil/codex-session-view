export function filterAcceptedFiles(files: File[], acceptExts: string[]) {
  if (!files.length) return [];
  if (!acceptExts.length) return files;
  const lowerExts = acceptExts.map((ext) => ext.toLowerCase());
  return files.filter((file) => {
    const name = file.name.toLowerCase();
    return lowerExts.some((ext) => name.endsWith(ext));
  });
}
