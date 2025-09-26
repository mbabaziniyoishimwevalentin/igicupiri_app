import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');

interface FileUploadProps {
  onFileSelect: (file: FileInfo) => void;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
  disabled?: boolean;
}

export interface FileInfo {
  uri: string;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  // Web-only: original File object to preserve binary data
  webFile?: any;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSizeInMB = 10,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

  const validateFile = (file: any): string | null => {
    // Check file type
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.mimeType || file.type)) {
      return `File type not supported. Please upload: ${acceptedTypes.map(type => {
        if (type.includes('pdf')) return 'PDF';
        if (type.includes('word')) return 'Word';
        if (type.includes('powerpoint')) return 'PowerPoint';
        return type;
      }).join(', ')} files.`;
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `File size too large. Maximum size is ${maxSizeInMB}MB.`;
    }

    return null;
  };

  const handleFileSelect = useCallback(async () => {
    if (disabled || isUploading) return;

    try {
      setIsUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          Alert.alert('Invalid File', validationError);
          return;
        }

        const fileInfo: FileInfo = {
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
          type: file.mimeType || 'application/octet-stream',
        };

        setSelectedFile(fileInfo);
        onFileSelect(fileInfo);
      }
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [acceptedTypes, maxSizeInMB, disabled, isUploading, onFileSelect]);

  // Web-specific drag and drop handlers
  const handleDragOver = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: any) => {
    if (Platform.OS !== 'web') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        Alert.alert('Invalid File', validationError);
        return;
      }

      const fileInfo: FileInfo = {
        uri: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        webFile: file,
      };

      setSelectedFile(fileInfo);
      onFileSelect(fileInfo);
    }
  }, [disabled, isUploading, onFileSelect, validateFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('powerpoint')) return '📊';
    if (type.includes('excel')) return '📈';
    return '📎';
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <View style={styles.container}>
      {selectedFile ? (
        // File selected state
        <View style={styles.selectedFileContainer}>
          <View style={styles.fileInfo}>
            <Text style={styles.fileIcon}>{getFileIcon(selectedFile.type)}</Text>
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <Text style={styles.fileSize}>
                {formatFileSize(selectedFile.size)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={removeFile}
              disabled={disabled}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // Upload area
        <TouchableOpacity
          style={[
            styles.uploadArea,
            isDragOver && styles.uploadAreaDragOver,
            disabled && styles.uploadAreaDisabled,
          ]}
          onPress={handleFileSelect}
          disabled={disabled || isUploading}
          {...(Platform.OS === 'web' && {
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
          })}
        >
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.uploadingText}>Selecting file...</Text>
            </View>
          ) : (
            <View style={styles.uploadContent}>
              <Text style={styles.uploadIcon}>📁</Text>
              <Text style={styles.uploadTitle}>
                {Platform.OS === 'web' ? 'Drop files here or click to browse' : 'Tap to select file'}
              </Text>
              <Text style={styles.uploadSubtitle}>
                Supported: PDF, Word documents (max {maxSizeInMB}MB)
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafbfc',
    minHeight: 200,
  },
  uploadAreaDragOver: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  uploadAreaDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 16,
    color: '#3498db',
    marginTop: 12,
    fontWeight: '500',
  },
  selectedFileContainer: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  fileIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FileUpload;