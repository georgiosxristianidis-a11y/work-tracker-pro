import jsQR from 'jsqr';

export interface ParsedWorkRecord {
  date: string; // YYYY-MM-DD
  hours: number;
  month: string; // YYYY-MM
  rate?: number;
  earned?: number;
  category?: 'core' | 'clients' | 'retainer' | 'consulting';
  notes?: string;
}

export interface ParseResult {
  records: ParsedWorkRecord[];
  totalHours: number;
  startDate?: string;
  endDate?: string;
  detectedFormat: 'json' | 'markdown' | 'text' | 'docx' | 'pdf' | 'qr' | 'unknown';
  warnings: string[];
}

export class SmartDocumentParser {
  /**
   * Universal offline entry point for any uploaded file.
   */
  static async parseFile(file: File): Promise<ParseResult> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      if (extension === 'json') {
        const text = await file.text();
        return this.parseJSON(text);
      }

      if (extension === 'md' || extension === 'markdown') {
        const text = await file.text();
        return this.parseMarkdown(text);
      }

      if (extension === 'txt' || extension === 'csv' || extension === 'tsv') {
        const text = await file.text();
        return this.parsePlainText(text);
      }

      if (extension === 'docx') {
        const buffer = await file.arrayBuffer();
        return await this.parseDocx(buffer);
      }

      if (extension === 'pdf') {
        const buffer = await file.arrayBuffer();
        return await this.parsePdf(buffer);
      }

      if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        return await this.parseImageQR(file);
      }

      // Fallback: try reading as plain text
      const fallbackText = await file.text();
      return this.parsePlainText(fallbackText);
    } catch (err: any) {
      return {
        records: [],
        totalHours: 0,
        detectedFormat: 'unknown',
        warnings: [`Failed to parse ${file.name}: ${err?.message || 'Unknown error'}`]
      };
    }
  }

  /**
   * Parses JSON files containing work records or backup snapshots.
   */
  static parseJSON(jsonText: string): ParseResult {
    try {
      const data = JSON.parse(jsonText);
      const records: ParsedWorkRecord[] = [];
      const warnings: string[] = [];

      const rawItems = Array.isArray(data) 
        ? data 
        : Array.isArray(data.entries) 
          ? data.entries 
          : Array.isArray(data.records) 
            ? data.records 
            : [];

      for (const item of rawItems) {
        if (!item || typeof item !== 'object') continue;
        const rawDate = item.date || item.timestamp || item.day;
        const normalizedDate = this.normalizeDate(String(rawDate || ''));
        const rawHours = Number(item.hours ?? item.duration ?? item.time);

        if (normalizedDate && !isNaN(rawHours) && rawHours >= 0) {
          records.push({
            date: normalizedDate,
            hours: Math.min(24, Math.round(rawHours * 10) / 10),
            month: normalizedDate.slice(0, 7),
            rate: item.rate ? Number(item.rate) : undefined,
            earned: item.earned ? Number(item.earned) : undefined,
            category: this.normalizeCategory(item.category || item.project),
            notes: item.notes || item.description
          });
        }
      }

      return this.summarizeResults(records, 'json', warnings);
    } catch {
      return {
        records: [],
        totalHours: 0,
        detectedFormat: 'json',
        warnings: ['Invalid JSON syntax']
      };
    }
  }

  /**
   * Parses Markdown files, handling tables and bullet lists.
   */
  static parseMarkdown(mdText: string): ParseResult {
    const lines = mdText.split(/\r?\n/);
    const records: ParsedWorkRecord[] = [];
    const warnings: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check for Markdown table row: | 2024-05-12 | 8 | Core | ...
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cols = trimmed.split('|').slice(1, -1).map(c => c.trim());
        if (cols.length >= 2) {
          const date = this.normalizeDate(cols[0]);
          const hours = this.extractNumericHours(cols[1]);
          if (date && hours !== null) {
            records.push({
              date,
              hours,
              month: date.slice(0, 7),
              category: cols.length >= 3 ? this.normalizeCategory(cols[2]) : undefined,
              notes: cols.length >= 4 ? cols[3] : undefined
            });
            continue;
          }
        }
      }

      // Check for line item: - 2024-05-12: 8h (Client Work)
      const lineRecord = this.extractRecordFromTextLine(trimmed);
      if (lineRecord) {
        records.push(lineRecord);
      }
    }

    return this.summarizeResults(records, 'markdown', warnings);
  }

  /**
   * Parses plain text, CSV or TSV logs.
   */
  static parsePlainText(text: string): ParseResult {
    const lines = text.split(/\r?\n/);
    const records: ParsedWorkRecord[] = [];
    const warnings: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Handle CSV comma/semicolon/tab delimiter
      const delimiter = trimmed.includes(',') ? ',' : trimmed.includes(';') ? ';' : trimmed.includes('\t') ? '\t' : null;
      if (delimiter) {
        const cols = trimmed.split(delimiter).map(c => c.replace(/["']/g, '').trim());
        if (cols.length >= 2) {
          const date = this.normalizeDate(cols[0]);
          const hours = this.extractNumericHours(cols[1]);
          if (date && hours !== null) {
            records.push({
              date,
              hours,
              month: date.slice(0, 7),
              category: cols.length >= 3 ? this.normalizeCategory(cols[2]) : undefined,
              notes: cols.length >= 4 ? cols[3] : undefined
            });
            continue;
          }
        }
      }

      // Freeform text line regex match
      const lineRecord = this.extractRecordFromTextLine(trimmed);
      if (lineRecord) {
        records.push(lineRecord);
      }
    }

    return this.summarizeResults(records, 'text', warnings);
  }

  /**
   * Parses .docx files completely offline by reading the internal word/document.xml.
   */
  static async parseDocx(buffer: ArrayBuffer): Promise<ParseResult> {
    const xmlContent = await this.extractDocxXml(buffer);
    if (!xmlContent) {
      return {
        records: [],
        totalHours: 0,
        detectedFormat: 'docx',
        warnings: ['Could not extract document.xml from DOCX archive']
      };
    }

    // Extract text from <w:t> tags
    const textFragments: string[] = [];
    const tagRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(xmlContent)) !== null) {
      textFragments.push(match[1]);
    }

    const fullText = textFragments.join(' ');
    const result = this.parsePlainText(fullText);
    result.detectedFormat = 'docx';
    return result;
  }

  /**
   * Parses .pdf files completely offline by extracting text streams and TJ/Tj operators.
   */
  static async parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
    const bytes = new Uint8Array(buffer);
    const textDecoder = new TextDecoder('latin1');
    const rawPdf = textDecoder.decode(bytes);

    const extractedChunks: string[] = [];

    // Find PDF text blocks: BT ... ET
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch: RegExpExecArray | null;

    while ((btMatch = btRegex.exec(rawPdf)) !== null) {
      const block = btMatch[1];

      // Match string show operators: (string) Tj or [(string) 120 (string)] TJ
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        extractedChunks.push(this.decodePdfString(tjMatch[1]));
      }

      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjArrMatch: RegExpExecArray | null;
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const innerArray = tjArrMatch[1];
        const innerStrRegex = /\(([^)]*)\)/g;
        let strMatch: RegExpExecArray | null;
        while ((strMatch = innerStrRegex.exec(innerArray)) !== null) {
          extractedChunks.push(this.decodePdfString(strMatch[1]));
        }
      }
    }

    const joinedText = extractedChunks.join('\n');
    const result = this.parsePlainText(joinedText);
    result.detectedFormat = 'pdf';
    return result;
  }

  /**
   * Scans uploaded images / photos using embedded jsQR for encoded work data.
   */
  static async parseImageQR(file: File): Promise<ParseResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              records: [],
              totalHours: 0,
              detectedFormat: 'qr',
              warnings: ['Canvas context unavailable']
            });
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

          if (qrCode && qrCode.data) {
            const parsed = this.parseJSON(qrCode.data);
            parsed.detectedFormat = 'qr';
            resolve(parsed);
          } else {
            resolve({
              records: [],
              totalHours: 0,
              detectedFormat: 'qr',
              warnings: ['No valid QR data detected in image. Use mobile keyboard Live-Text for OCR scanning.']
            });
          }
        } catch (e: any) {
          resolve({
            records: [],
            totalHours: 0,
            detectedFormat: 'qr',
            warnings: [e?.message || 'Image processing error']
          });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          records: [],
          totalHours: 0,
          detectedFormat: 'qr',
          warnings: ['Failed to load image file']
        });
      };
      img.src = url;
    });
  }

  // --- Internal Helper Utilities ---

  private static extractRecordFromTextLine(line: string): ParsedWorkRecord | null {
    // Matches YYYY-MM-DD or DD.MM.YYYY followed by hours e.g. "2024-05-12 8h" or "12.05.2024 - 7.5 hours"
    const dateMatch = line.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
    if (!dateMatch) return null;

    const normalizedDate = this.normalizeDate(dateMatch[1]);
    if (!normalizedDate) return null;

    const rest = line.replace(dateMatch[0], '');
    const hours = this.extractNumericHours(rest);
    if (hours === null) return null;

    return {
      date: normalizedDate,
      hours,
      month: normalizedDate.slice(0, 7),
      category: this.normalizeCategory(rest),
      notes: line.trim()
    };
  }

  private static normalizeDate(raw: string): string | null {
    const clean = raw.trim().replace(/[/\.]/g, '-');
    // ISO format: YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // EU/RU format: DD-MM-YYYY
    const euMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (euMatch) {
      const d = euMatch[1].padStart(2, '0');
      const m = euMatch[2].padStart(2, '0');
      const y = euMatch[3];
      return `${y}-${m}-${d}`;
    }

    return null;
  }

  private static extractNumericHours(str: string): number | null {
    const match = str.match(/([-+]?\d+(?:[.,]\d+)?)\s*(?:h|hrs|hours|ч|час)?/i);
    if (!match) return null;
    const val = parseFloat(match[1].replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 24) return null;
    return Math.round(val * 10) / 10;
  }

  private static normalizeCategory(str?: string): 'core' | 'clients' | 'retainer' | 'consulting' {
    if (!str) return 'core';
    const lower = str.toLowerCase();
    if (lower.includes('client') || lower.includes('заказчик') || lower.includes('прямой')) return 'clients';
    if (lower.includes('retainer') || lower.includes('ретейнер') || lower.includes('подписка')) return 'retainer';
    if (lower.includes('consult') || lower.includes('консульт') || lower.includes('аудит')) return 'consulting';
    return 'core';
  }

  private static decodePdfString(raw: string): string {
    return raw
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([nrtbf\\])/g, (_, esc) => {
        switch (esc) {
          case 'n': return '\n';
          case 'r': return '\r';
          case 't': return '\t';
          default: return esc;
        }
      });
  }

  /**
   * Minimalist PKZip reader to extract word/document.xml without heavy external dependencies.
   */
  private static async extractDocxXml(buffer: ArrayBuffer): Promise<string | null> {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let offset = 0;

    // Search for Local File Header: PK\x03\x04 (0x04034b50)
    while (offset < bytes.length - 30) {
      if (view.getUint32(offset, true) === 0x04034b50) {
        const compressionMethod = view.getUint16(offset + 8, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const fileNameLength = view.getUint16(offset + 26, true);
        const extraFieldLength = view.getUint16(offset + 28, true);

        const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength);
        const fileName = new TextDecoder().decode(fileNameBytes);

        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

        if (fileName === 'word/document.xml') {
          const compressedData = bytes.subarray(dataOffset, dataOffset + compressedSize);

          // If uncompressed (method 0)
          if (compressionMethod === 0) {
            return new TextDecoder().decode(compressedData);
          }

          // If deflated (method 8), use browser native DecompressionStream
          if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
            try {
              const stream = new Response(compressedData).body?.pipeThrough(
                new DecompressionStream('deflate-raw')
              );
              if (stream) {
                const decompressed = await new Response(stream).text();
                return decompressed;
              }
            } catch {
              // Fallback for environments lacking raw deflate stream
            }
          }
        }

        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }

    return null;
  }

  private static summarizeResults(
    records: ParsedWorkRecord[],
    format: ParseResult['detectedFormat'],
    warnings: string[]
  ): ParseResult {
    // Deduplicate by date keeping latest
    const map = new Map<string, ParsedWorkRecord>();
    for (const r of records) {
      map.set(r.date, r);
    }

    const uniqueRecords = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    const totalHours = uniqueRecords.reduce((sum, r) => sum + r.hours, 0);

    return {
      records: uniqueRecords,
      totalHours: Math.round(totalHours * 10) / 10,
      startDate: uniqueRecords[0]?.date,
      endDate: uniqueRecords[uniqueRecords.length - 1]?.date,
      detectedFormat: format,
      warnings
    };
  }
}
