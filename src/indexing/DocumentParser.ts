/**
 * DocumentParser - Extracts text content from binary document formats
 * Supports PDF and DOCX files for indexing and embedding generation
 */

import * as mammoth from 'mammoth';

export class DocumentParser {
  /**
   * Extract plain text from PDF or DOCX files
   * @param buffer File content as Buffer
   * @param extension File extension (.pdf, .docx)
   * @returns Extracted plain text content
   * @throws Error if format is unsupported or extraction fails
   */
  async extractText(buffer: Buffer, extension: string): Promise<string> {
    try {
      if (extension === '.pdf') {
        return await this.extractPdfText(buffer);
      } else if (extension === '.docx') {
        return await this.extractDocxText(buffer);
      } else {
        throw new Error(`Unsupported document format: ${extension}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to extract text from ${extension}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   * @param buffer PDF file buffer
   * @returns Extracted text content
   */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    // pdf-parse exports PDFParse as a named export
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    
    // getText() returns TextResult object with text property
    if (!textResult.text || textResult.text.trim().length === 0) {
      throw new Error('PDF contains no extractable text content');
    }
    
    return textResult.text;
  }

  /**
   * Extract text from DOCX using mammoth
   * @param buffer DOCX file buffer
   * @returns Extracted text content
   */
  private async extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    
    // mammoth returns { value: string, messages: [] }
    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX contains no extractable text content');
    }
    
    // Log warnings if any (e.g., unsupported features)
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages);
    }
    
    return result.value;
  }

  /**
   * Check if a file extension is supported for document parsing
   * @param extension File extension (e.g., '.pdf', '.docx')
   * @returns true if format is supported
   */
  isSupportedFormat(extension: string): boolean {
    return ['.pdf', '.docx'].includes(extension.toLowerCase());
  }
}
