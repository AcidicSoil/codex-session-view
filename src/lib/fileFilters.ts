export function filterAcceptedFiles(files: File[], acceptExts: string[]) {
  if (!files.length) return [];
  if (!acceptExts.length) return files;
  return files.filter((file) => isExtensionAccepted(file.name, acceptExts));
}

export function isExtensionAccepted(fileName: string, acceptExts: string[]) {
  if (!acceptExts.length) return true
  const lowerExts = acceptExts.map((ext) => ext.toLowerCase().trim())
  const name = fileName.toLowerCase()
  return lowerExts.some((ext) => name.endsWith(ext))
}
