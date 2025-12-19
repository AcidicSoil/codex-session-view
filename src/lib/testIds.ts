export const DATA_TEST_IDS = {
  viewerHeroTitle: 'viewer-hero-title',
  viewerTitle: 'viewer-title',
  sessionUploadDropzone: 'session-upload-dropzone',
  sessionUploadInput: 'session-upload-input',
  chatTextarea: 'chat-textarea',
  chatModeToggle: 'chat-mode-toggle',
  chatModeSession: 'chat-mode-session',
  chatModeGeneral: 'chat-mode-general',
  viewerLogContainer: 'viewer-log-container',
} as const

export type DataTestId = (typeof DATA_TEST_IDS)[keyof typeof DATA_TEST_IDS]
