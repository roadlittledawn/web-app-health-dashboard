'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Button, ButtonGroup, Paper } from '@mui/material';
import { Visibility, Edit as EditIcon } from '@mui/icons-material';
import MarkdownContent from './MarkdownContent';
import '@uiw/react-md-editor/markdown-editor.css';

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  required?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter markdown text...',
  minHeight = 200,
  required = false,
}: MarkdownEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <Box>
      <ButtonGroup size="small" sx={{ mb: 1 }}>
        <Button
          variant={!previewMode ? 'contained' : 'outlined'}
          startIcon={<EditIcon />}
          onClick={() => setPreviewMode(false)}
        >
          Edit
        </Button>
        <Button
          variant={previewMode ? 'contained' : 'outlined'}
          startIcon={<Visibility />}
          onClick={() => setPreviewMode(true)}
        >
          Preview
        </Button>
      </ButtonGroup>

      {previewMode ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            minHeight,
            backgroundColor: 'background.paper',
          }}
        >
          {value ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              {placeholder}
            </Box>
          )}
        </Paper>
      ) : (
        <Box data-color-mode="light">
          <MDEditor
            value={value}
            onChange={(val) => onChange(val || '')}
            height={minHeight}
            preview="edit"
            hideToolbar={false}
            enableScroll={true}
            visibleDragbar={false}
            textareaProps={{
              placeholder,
              required,
            }}
            commands={[
              {
                name: 'bold',
                keyCommand: 'bold',
                buttonProps: { 'aria-label': 'Bold' },
                icon: <strong>B</strong>,
              },
              {
                name: 'italic',
                keyCommand: 'italic',
                buttonProps: { 'aria-label': 'Italic' },
                icon: <em>I</em>,
              },
              {
                name: 'code',
                keyCommand: 'code',
                buttonProps: { 'aria-label': 'Code' },
                icon: <>{'</>'}</>,
              },
              {
                name: 'link',
                keyCommand: 'link',
                buttonProps: { 'aria-label': 'Link' },
                icon: <>🔗</>,
              },
              {
                name: 'unordered-list',
                keyCommand: 'unordered-list',
                buttonProps: { 'aria-label': 'Unordered list' },
                icon: <>• List</>,
              },
              {
                name: 'ordered-list',
                keyCommand: 'ordered-list',
                buttonProps: { 'aria-label': 'Ordered list' },
                icon: <>1. List</>,
              },
            ]}
          />
        </Box>
      )}
    </Box>
  );
}
