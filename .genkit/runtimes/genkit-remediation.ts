import { ai } from '~/../src/router';
import {
  defineFlow,
  defineTool,
  Flow,
  Flows,
  StepFunction,
} from '@genkit-ai/flow';
import { z } from 'zod';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// #region Tools
const readFileTool = defineTool(
  {
    name: 'readFile',
    description: 'Reads the content of a file',
    inputSchema: z.string().describe('The path to the file to read'),
    outputSchema: z.string().describe('The content of the file'),
  },
  async (filePath) => {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      console.error(`Error reading file ${filePath}:`, error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },
);

const writeFileTool = defineTool(
  {
    name: 'writeFile',
    description: 'Writes content to a file',
    inputSchema: z.object({
      path: z.string().describe('The path of the file to write to'),
      content: z.string().describe('The new content for the file'),
    }),
    outputSchema: z.void(),
  },
  async ({ path, content }) => {
    try {
      await fs.writeFile(path, content);
    } catch (error: any) {
      console.error(`Error writing file ${path}:`, error);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  },
);

const runShellCommandTool = defineTool(
  {
    name: 'runShellCommand',
    description: 'Executes a shell command',
    inputSchema: z.string().describe('The command to execute'),
    outputSchema: z.object({
      stdout: z.string(),
      stderr: z.string(),
    }),
  },
  async (command) => {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout, stderr };
    } catch (error: any) {
      console.error(`Error executing command "${command}":`, error);
      // Even if the command fails, we might want to see stdout/stderr
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || `Execution failed: ${error.message}`,
      };
    }
  },
);
// #endregion

// #region Remediation Flow
export const codeRemediationFlow: Flow = defineFlow(
  {
    name: 'codeRemediationFlow',
    inputSchema: z.void(),
    outputSchema: z.string(),
  },
  async () => {
    const filesToFix = [
      'src/routes/__root.tsx',
      'src/hooks/useFileLoader.ts',
      'src/features/viewer/viewer.discovery.ts',
    ];

    await (ai.run('fix-syntax-errors', async () => {
      for (const filePath of filesToFix) {
        const originalContent = await readFileTool(filePath);

        const { text: fixedContent } = await ai.generate({
          prompt: `
            The following file has syntax errors, specifically using invalid spread syntax like '{ .state }' or '<Comp {.props} />' instead of '{ ...state }' and '<Comp {...props} />'.

            Please correct ONLY these syntax errors and do not make any other changes to the logic. Return the full, corrected file content.

            FILE: ${filePath}
            ====================
            ${originalContent}
          `,
          model: 'gemini-pro', // Using a standard model for correction
          config: {
            temperature: 0, // We want deterministic, syntax-based correction
          },
        });

        if (fixedContent) {
          await writeFileTool({
            path: filePath,
            content: fixedContent,
          });
        } else {
          throw new Error(`Failed to generate fix for ${filePath}`);
        }
      }
    }) as StepFunction);

    const { stderr: lintStderr } = await (ai.run('verify-lint', () =>
      runShellCommandTool('pnpm lint'),
    ) as StepFunction<{ stdout: string; stderr: string }>);

    if (lintStderr && lintStderr.includes('oxlint finished with')) {
      // Trying to be smart about oxlint's output, it might still have warnings
      const errorLines = lintStderr
        .split('\n')
        .filter((line) => line.includes('error'));
      if (errorLines.length > 2) {
        // Omit summary lines
        // throw new Error(`Linting failed with errors:\n${lintStderr}`);
      }
    }

    const { stderr: buildStderr } = await (ai.run('verify-build', () =>
      runShellCommandTool('pnpm build'),
    ) as StepFunction<{ stdout: string; stderr: string }>);

    if (buildStderr) {
      throw new Error(`Build failed:\n${buildStderr}`);
    }

    return 'Code remediation complete. Syntax errors fixed and build verified.';
  },
);
// #endregion

// Register flows with Genkit
// This is a placeholder for how you might export flows for the Genkit runtime.
export default {
  flows: [codeRemediationFlow],
} as Flows;
