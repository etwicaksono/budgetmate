# 15. Google Drive Attachments for Transactions

## Overview
Complete implementation for attaching files (receipts, invoices, etc.) to transactions and storing them in the user's Google Drive, keeping the app lightweight while providing document management.

---

## 📦 Database Schema Extension

### Step 1: Add Attachment Tables

```prisma
// Add to schema.prisma
model TransactionAttachment {
  id                String   @id @default(cuid())
  transaction_id    String
  user_id           String
  
  // File Information
  file_name         String
  file_type         String   // image/jpeg, application/pdf, etc.
  file_size         Int      // bytes
  
  // Google Drive Information
  drive_file_id     String   @unique // Google Drive file ID
  drive_web_link    String?  // Direct link to view in Drive
  drive_download_link String? // Direct download link
  drive_thumbnail_link String? // Thumbnail for images
  
  // Metadata
  description       String?
  uploaded_at       DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  // Relations
  transaction       Transaction @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  user              User @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([transaction_id])
  @@index([user_id])
  @@index([drive_file_id])
}

// Update Transaction model to include attachments relation
model Transaction {
  // ... existing fields
  attachments       TransactionAttachment[]
}

// Optional: Store Google Drive integration settings
model GoogleDriveIntegration {
  id                String   @id @default(cuid())
  user_id           String   @unique
  
  // Drive Settings
  enabled           Boolean  @default(true)
  folder_id         String?  // Specific folder for finance attachments
  folder_name       String   @default("Finance Attachments")
  
  // Organization Settings
  organize_by_year  Boolean  @default(true) // Create year subfolders
  organize_by_month Boolean  @default(true) // Create month subfolders
  
  // Storage Settings
  max_file_size     Int      @default(10485760) // 10MB default
  allowed_types     Json     @default("[\"image/jpeg\",\"image/png\",\"application/pdf\"]")
  auto_compress     Boolean  @default(true) // Compress images before upload
  
  // Quota Management
  storage_used      BigInt   @default(0) // Track total storage
  file_count        Int      @default(0)
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

---

## 🔌 Google Drive Service Implementation

### Core Drive Service: `/src/services/google-drive/google-drive.service.ts`

```typescript
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { JWT } from 'google-auth-library';
import sharp from 'sharp'; // For image processing

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink?: string;
  createdTime: string;
  modifiedTime: string;
}

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderId?: string;
  description?: string;
  compress?: boolean;
}

export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private userId: string;
  
  constructor(credentials: any, userId: string) {
    // Initialize auth (same as Sheets implementation)
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata',
      ],
    });
    
    this.drive = google.drive({ version: 'v3', auth });
    this.userId = userId;
  }
  
  /**
   * Create or get finance attachments folder
   */
  async ensureAttachmentsFolder(
    folderName: string = 'Finance Attachments',
    parentId?: string
  ): Promise<string> {
    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      
      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id!;
      }
      
      // Create new folder
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      };
      
      const folder = await this.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id',
      });
      
      return folder.data.id!;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }
  
  /**
   * Create year/month subfolder structure
   */
  async ensureOrganizedFolder(
    baseFolderId: string,
    date: Date,
    organizeByYear: boolean = true,
    organizeByMonth: boolean = true
  ): Promise<string> {
    let currentFolderId = baseFolderId;
    
    if (organizeByYear) {
      const year = date.getFullYear().toString();
      currentFolderId = await this.ensureAttachmentsFolder(year, currentFolderId);
    }
    
    if (organizeByMonth) {
      const month = date.toLocaleString('en-US', { month: 'long' });
      currentFolderId = await this.ensureAttachmentsFolder(month, currentFolderId);
    }
    
    return currentFolderId;
  }
  
  /**
   * Compress image before upload
   */
  async compressImage(
    buffer: Buffer,
    mimeType: string,
    maxWidth: number = 1920,
    quality: number = 85
  ): Promise<Buffer> {
    if (!mimeType.startsWith('image/')) {
      return buffer; // Not an image, return as-is
    }
    
    if (mimeType === 'image/gif' || mimeType === 'image/svg+xml') {
      return buffer; // Don't compress GIFs or SVGs
    }
    
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      // Only resize if larger than maxWidth
      if (metadata.width && metadata.width > maxWidth) {
        return await image
          .resize(maxWidth, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .jpeg({ quality })
          .toBuffer();
      }
      
      // Just compress without resizing
      return await image
        .jpeg({ quality })
        .toBuffer();
    } catch (error) {
      console.error('Image compression failed:', error);
      return buffer; // Return original if compression fails
    }
  }
  
  /**
   * Upload file to Google Drive
   */
  async uploadFile(options: UploadOptions): Promise<DriveFile> {
    try {
      let fileBuffer = options.fileBuffer;
      
      // Compress if requested
      if (options.compress && options.mimeType.startsWith('image/')) {
        fileBuffer = await this.compressImage(
          fileBuffer,
          options.mimeType
        );
      }
      
      // Prepare file metadata
      const fileMetadata = {
        name: options.fileName,
        parents: options.folderId ? [options.folderId] : undefined,
        description: options.description,
      };
      
      // Upload file
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: options.mimeType,
          body: Readable.from(fileBuffer),
        },
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime',
      });
      
      // Make file accessible with link
      await this.drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          type: 'anyone',
          role: 'reader',
        },
      });
      
      return response.data as DriveFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<DriveFile | null> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime',
      });
      
      return response.data as DriveFile;
    } catch (error) {
      console.error('Error getting file:', error);
      return null;
    }
  }
  
  /**
   * List files in a folder
   */
  async listFiles(folderId?: string, limit: number = 100): Promise<DriveFile[]> {
    try {
      const q = folderId 
        ? `'${folderId}' in parents and trashed=false`
        : 'trashed=false';
      
      const response = await this.drive.files.list({
        q,
        fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime)',
        pageSize: limit,
        orderBy: 'createdTime desc',
      });
      
      return (response.data.files || []) as DriveFile[];
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
  
  /**
   * Get storage quota
   */
  async getStorageQuota(): Promise<{
    used: number;
    limit: number;
    usageInDrive: number;
    usageInDriveTrash: number;
  }> {
    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota',
      });
      
      const quota = response.data.storageQuota;
      return {
        used: parseInt(quota?.usage || '0'),
        limit: parseInt(quota?.limit || '0'),
        usageInDrive: parseInt(quota?.usageInDrive || '0'),
        usageInDriveTrash: parseInt(quota?.usageInDriveTrash || '0'),
      };
    } catch (error) {
      console.error('Error getting quota:', error);
      throw error;
    }
  }
}

// For stream handling
import { Readable } from 'stream';
```

---

## 🔌 Attachment API Endpoints

### 1. Upload Attachment: `/app/api/v1/attachments/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';
import { GoogleDriveService } from '@/services/google-drive/google-drive.service';
import { z } from 'zod';
import { decrypt } from '@/lib/crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transaction_id') as string;
    const description = formData.get('description') as string | null;
    
    if (!file || !transactionId) {
      return apiResponse.error('File and transaction ID required', 400);
    }
    
    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return apiResponse.error('File too large. Maximum size is 10MB', 400);
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiResponse.error('File type not allowed', 400);
    }
    
    // Verify transaction ownership
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        user_id: user.id,
      },
      include: {
        account: true,
      },
    });
    
    if (!transaction) {
      return apiResponse.error('Transaction not found', 404);
    }
    
    // Get Google Drive integration settings
    let driveIntegration = await prisma.googleDriveIntegration.findUnique({
      where: { user_id: user.id },
    });
    
    if (!driveIntegration) {
      // Create default integration settings
      driveIntegration = await prisma.googleDriveIntegration.create({
        data: {
          user_id: user.id,
          folder_name: 'Finance Attachments',
          organize_by_year: true,
          organize_by_month: true,
        },
      });
    }
    
    // Get Google credentials (from existing Google Sheets integration)
    const sheetsIntegration = await prisma.googleSheetsIntegration.findUnique({
      where: { user_id: user.id },
    });
    
    if (!sheetsIntegration?.encrypted_credentials) {
      return apiResponse.error('Google Drive not configured. Please setup Google Sheets integration first.', 400);
    }
    
    // Decrypt credentials
    const credentials = JSON.parse(
      await decrypt(sheetsIntegration.encrypted_credentials as string)
    );
    
    // Initialize Drive service
    const driveService = new GoogleDriveService(credentials, user.id);
    
    // Create folder structure
    const baseFolder = await driveService.ensureAttachmentsFolder(
      driveIntegration.folder_name
    );
    
    const targetFolder = await driveService.ensureOrganizedFolder(
      driveIntegration.folder_id || baseFolder,
      transaction.date,
      driveIntegration.organize_by_year,
      driveIntegration.organize_by_month
    );
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${transactionId}_${timestamp}_${sanitizedName}`;
    
    // Upload to Google Drive
    const uploadedFile = await driveService.uploadFile({
      fileName,
      mimeType: file.type,
      fileBuffer: buffer,
      folderId: targetFolder,
      description: `Receipt for transaction on ${transaction.date.toLocaleDateString()} - ${transaction.description || 'No description'}`,
      compress: driveIntegration.auto_compress,
    });
    
    // Save attachment record
    const attachment = await prisma.transactionAttachment.create({
      data: {
        transaction_id: transactionId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        drive_file_id: uploadedFile.id,
        drive_web_link: uploadedFile.webViewLink,
        drive_download_link: uploadedFile.webContentLink,
        drive_thumbnail_link: uploadedFile.thumbnailLink,
        description,
      },
    });
    
    // Update storage tracking
    await prisma.googleDriveIntegration.update({
      where: { id: driveIntegration.id },
      data: {
        storage_used: { increment: file.size },
        file_count: { increment: 1 },
      },
    });
    
    return apiResponse.success({
      attachment,
      message: 'File uploaded successfully',
    });
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return apiResponse.error('Failed to upload file', 500);
  }
}
```

### 2. Get Transaction Attachments: `/app/api/v1/attachments/[transactionId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }
    
    // Verify transaction ownership
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.transactionId,
        user_id: user.id,
      },
    });
    
    if (!transaction) {
      return apiResponse.error('Transaction not found', 404);
    }
    
    // Get attachments
    const attachments = await prisma.transactionAttachment.findMany({
      where: {
        transaction_id: params.transactionId,
        user_id: user.id,
      },
      orderBy: {
        uploaded_at: 'desc',
      },
    });
    
    return apiResponse.success(attachments);
    
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return apiResponse.error('Failed to fetch attachments', 500);
  }
}
```

### 3. Delete Attachment: `/app/api/v1/attachments/[id]/route.ts`

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }
    
    // Get attachment
    const attachment = await prisma.transactionAttachment.findFirst({
      where: {
        id: params.id,
        user_id: user.id,
      },
    });
    
    if (!attachment) {
      return apiResponse.error('Attachment not found', 404);
    }
    
    // Get Drive service
    const sheetsIntegration = await prisma.googleSheetsIntegration.findUnique({
      where: { user_id: user.id },
    });
    
    if (sheetsIntegration?.encrypted_credentials) {
      const credentials = JSON.parse(
        await decrypt(sheetsIntegration.encrypted_credentials as string)
      );
      
      const driveService = new GoogleDriveService(credentials, user.id);
      
      // Delete from Google Drive
      await driveService.deleteFile(attachment.drive_file_id);
    }
    
    // Delete database record
    await prisma.transactionAttachment.delete({
      where: { id: params.id },
    });
    
    // Update storage tracking
    await prisma.googleDriveIntegration.update({
      where: { user_id: user.id },
      data: {
        storage_used: { decrement: attachment.file_size },
        file_count: { decrement: 1 },
      },
    });
    
    return apiResponse.success({
      message: 'Attachment deleted successfully',
    });
    
  } catch (error) {
    console.error('Error deleting attachment:', error);
    return apiResponse.error('Failed to delete attachment', 500);
  }
}
```

---

## 🎨 UI Components

### Attachment Upload Component: `/src/components/transactions/AttachmentUpload.tsx`

```tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/context/ToastContext';
import { attachmentService } from '@/services/attachment.service';
import {
  Upload,
  FileText,
  Image,
  X,
  Loader2,
  Eye,
  Download,
  Trash2,
} from 'lucide-react';

interface AttachmentUploadProps {
  transactionId: string;
  onUploadComplete?: () => void;
}

export function AttachmentUpload({ 
  transactionId, 
  onUploadComplete 
}: AttachmentUploadProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Load existing attachments
  useEffect(() => {
    loadAttachments();
  }, [transactionId]);

  const loadAttachments = async () => {
    try {
      const data = await attachmentService.getTransactionAttachments(transactionId);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showToast({
        title: 'File too large',
        message: 'Maximum file size is 10MB',
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await attachmentService.uploadAttachment(
        transactionId,
        selectedFile,
        ''
      );

      showToast({
        title: 'Success',
        message: 'File uploaded successfully',
        type: 'success',
      });

      // Reset and reload
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await loadAttachments();
      onUploadComplete?.();

    } catch (error) {
      showToast({
        title: 'Upload failed',
        message: 'Failed to upload file. Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await attachmentService.deleteAttachment(attachmentId);
      
      showToast({
        title: 'Deleted',
        message: 'Attachment deleted successfully',
        type: 'success',
      });

      await loadAttachments();
      
    } catch (error) {
      showToast({
        title: 'Delete failed',
        message: 'Failed to delete attachment',
        type: 'error',
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
        />

        {!selectedFile ? (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Attach receipt or invoice
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              Max 10MB • JPG, PNG, PDF, DOC
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Preview */}
            {preview && (
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-32 rounded"
                />
              </div>
            )}

            {/* File info */}
            <div className="flex items-center justify-between bg-gray-50 rounded p-2">
              <div className="flex items-center space-x-2">
                {getFileIcon(selectedFile.type)}
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload button */}
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to Google Drive
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Attachments ({attachments.length})
          </h4>
          
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Thumbnail or icon */}
                {attachment.drive_thumbnail_link ? (
                  <img
                    src={attachment.drive_thumbnail_link}
                    alt={attachment.file_name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                    {getFileIcon(attachment.file_type)}
                  </div>
                )}
                
                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)} • 
                    {new Date(attachment.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(attachment.drive_web_link, '_blank')}
                  title="View in Google Drive"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(attachment.drive_download_link, '_blank')}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(attachment.id)}
                  title="Delete"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Storage Info */}
      <div className="text-xs text-gray-500 text-center">
        Files are stored in your Google Drive under "Finance Attachments"
      </div>
    </div>
  );
}
```

### Attachment Service: `/src/services/attachment.service.ts`

```typescript
import { apiClient } from './api-client';

export interface Attachment {
  id: string;
  transaction_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  drive_file_id: string;
  drive_web_link: string;
  drive_download_link: string;
  drive_thumbnail_link?: string;
  description?: string;
  uploaded_at: string;
}

export const attachmentService = {
  async uploadAttachment(
    transactionId: string,
    file: File,
    description?: string
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transaction_id', transactionId);
    if (description) {
      formData.append('description', description);
    }

    const response = await apiClient.post('/api/v1/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.attachment;
  },

  async getTransactionAttachments(transactionId: string): Promise<Attachment[]> {
    const response = await apiClient.get(`/api/v1/attachments/${transactionId}`);
    return response.data.data;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await apiClient.delete(`/api/v1/attachments/${attachmentId}`);
  },

  async getStorageInfo(): Promise<{
    used: number;
    limit: number;
    fileCount: number;
  }> {
    const response = await apiClient.get('/api/v1/attachments/storage');
    return response.data.data;
  },
};
```

---

## 🔑 Key Features

1. **Google Drive Storage**
   - Files stored in user's own Google Drive
   - Organized folder structure (Year/Month)
   - No app storage costs

2. **File Management**
   - Upload receipts/invoices
   - Preview images
   - Download files
   - Delete attachments

3. **Automatic Organization**
   - Creates folder structure automatically
   - Year/Month subfolders for organization
   - Custom folder naming

4. **Image Optimization**
   - Automatic compression for images
   - Maintains quality while reducing size
   - Configurable compression settings

5. **Security**
   - Files in user's own Google account
   - Transaction ownership verification
   - Secure credential handling

6. **File Types Support**
   - Images (JPEG, PNG, GIF, WebP)
   - PDFs
   - Documents (Word, etc.)
   - Configurable allowed types

---

## ✅ Implementation Checklist

- [ ] Database migration for attachment tables
- [ ] Google Drive API enabled in Google Cloud Console
- [ ] Drive service implementation
- [ ] Upload API endpoint
- [ ] Delete API endpoint
- [ ] Attachment UI component
- [ ] Image compression with Sharp
- [ ] File type validation
- [ ] Size limit enforcement
- [ ] Folder organization logic
- [ ] Storage quota tracking
- [ ] Transaction detail integration
- [ ] Error handling for API limits
- [ ] Cleanup on transaction deletion

---

## 🔒 Security Considerations

1. **User Isolation** - Each user's files in their own Drive
2. **Transaction Ownership** - Verify user owns transaction
3. **File Validation** - Type and size checks
4. **Credential Security** - Encrypted storage
5. **Access Control** - Files shared as read-only links

---

## 🎯 User Benefits

- **Receipt Management** - Attach receipts to transactions
- **Tax Preparation** - All documents organized
- **Warranty Tracking** - Store purchase receipts
- **Expense Reports** - Easy document retrieval
- **Cloud Backup** - Files safe in Google Drive
- **No Storage Limits** - Uses user's Google Drive quota
- **Mobile Friendly** - Upload from phone camera

This feature integrates seamlessly with the existing Google ecosystem while keeping the app lightweight!
