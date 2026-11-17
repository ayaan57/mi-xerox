import { NextRequest, NextResponse } from 'next/server';
import { storeFile } from '@/lib/store';
import type { PrintFile } from '@/lib/types';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum is ${MAX_FILES}.` },
        { status: 400 }
      );
    }

    const printFiles: PrintFile[] = [];

    for (const entry of files) {
      if (!(entry instanceof File)) {
        return NextResponse.json(
          { error: 'Invalid file entry' },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.has(entry.type)) {
        return NextResponse.json(
          {
            error: `File type "${entry.type}" is not allowed for "${entry.name}". Accepted: PDF, images, DOC/DOCX, TXT.`,
          },
          { status: 400 }
        );
      }

      if (entry.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${entry.name}" exceeds the 50 MB size limit.`,
          },
          { status: 400 }
        );
      }

      // Preserve file extension in the ID so the file-serving route can infer MIME type
      const ext = entry.name.includes('.') ? entry.name.split('.').pop()?.toLowerCase() : '';
      const id = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();
      const buffer = Buffer.from(await entry.arrayBuffer());
      storeFile(id, buffer);

      printFiles.push({
        id,
        name: entry.name,
        size: entry.size,
        type: entry.type,
      });
    }

    return NextResponse.json({ files: printFiles });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
